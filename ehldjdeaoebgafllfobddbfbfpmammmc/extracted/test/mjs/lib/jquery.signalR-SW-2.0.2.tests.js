import $ from "/js/mjs/lib/jquery.signalR-SW-2.0.2.js";
import deferred from "/js/mjs/utils/deferred.js";

async function resolve(dfd, json){
    await dfd.resolve({
        ok: true,
        text: function () {
            return JSON.stringify(json);
        }
    });
    await nextTick();   
}

function callEventSourceListener(source, name, event){
    var listeners = source.addEventListener.calls.all().filter(a=>a.args[0] === name);
    listeners.forEach(function(listener){
        listener.args[1].call(source, event);
    });
}

async function nextTick(){
    await Promise.resolve();
}

describe("signalr", function (){
    var now;
    beforeEach(async function (){
        jasmine.clock().install();
    });
    afterEach(function () {
        jasmine.clock().uninstall();
    });

    describe("negotiate", function (){
        var dfdList;
        beforeEach(async function (){
            dfdList = [];
            spyOn(globalThis, "fetch").and.callFake(function (){
                var dfd = deferred.get();
                dfdList.push(dfd);
                return dfd;
            });
        }); 

        it("handles a fail in negotiate as a fail", async function () {
            var isDisconnected, isStarting, error;
            var connection = $.hubConnection( "http://localhost/mock/")
                .starting(()=> isStarting = true)    
                .disconnected(()=> isDisconnected = true)
                .error(()=> error = true);
            var promise = connection.start();
            expect(dfdList.length).toEqual(1);
            dfdList[0].reject(new Error('AHH THE BURNING'));
            try{
                await promise;
                fail("should not have gotten here");
            } catch{
                expect(isStarting).toEqual(true);
                expect(error).toEqual(true);
                expect(isDisconnected).toEqual(true);
            }

        });
    });

    describe("autoconfig fallback behavior", function (){
        var sockets;       
        var dfdList;
        var random;
        var eventSources;
        beforeEach(async function (){
            random = .7;
            dfdList = [];
            spyOn(globalThis, "fetch").and.callFake(function (){
                var dfd = deferred.get();
                dfdList.push(dfd);
                return dfd;
            });
            sockets = [];
            eventSources = [];
            spyOn(globalThis, "WebSocket").and.callFake(function () {
                var socket = jasmine.createSpyObj("WebSocket", ["send", "close"]);
                sockets.push(socket);
                return socket;
            });
            spyOn(globalThis, "EventSource").and.callFake(function () {
                var es = jasmine.createSpyObj("EventSource", ["addEventListener", "close"])
                eventSources.push(es);
                es.readyState = globalThis.EventSource.CONNECTING;
                return es;                
            });

            globalThis.EventSource.CONNECTING = 0;
            globalThis.EventSource.OPEN = 1;
            globalThis.EventSource.CLOSED = 2;

            spyOn(Math, "random").and.callFake(function () { return random; })
        });
        it("conneects to websockets", async function () {
            var isDisconnected, isStarting, error;
            var connection = $.hubConnection( "https://localhost/mock/")
                .starting(()=> isStarting = true)    
                .disconnected(()=> isDisconnected = true)
                .error(()=> error = true);
            var promise = connection.start();
            expect(dfdList.length).toEqual(1);
            await resolve(dfdList[0], {
                Url: "/mock",
                ConnectionId: "12345",
                ConnectionToken: "99999999",
                ConnectionTimeout: 110,
                TransportConnectTimeout:5,
                DisconnectTimeout: 30,
                KeepAliveTimeout: 20,
                ProtocolVersion: "1.3",
                TryWebSockets: true,
            });           
            sockets[0].onopen();//call callback for on open
            sockets[0].onmessage({ data: {"C":"d-2DEC8B4-B,0|BnC,0|BnD,1","S":1,"M":[]}});
            //sockets[0].onmessage({ data: {"C":"d-2DEC8B4-B,0|BnC,0|BnD,2|BnI,0", "G":"GrOuPJiBbEriSh"}});
            await promise;
            expect(isStarting).toEqual(true);
            expect(error).toEqual(undefined);
            expect(isDisconnected).toEqual(undefined);
            expect(WebSocket).toHaveBeenCalledWith("wss://localhost/mock/connect?transport=webSockets&connectionToken=99999999&tid=7");
           
        });

        it("falls back to SSE", async function () {
            var isDisconnected, isStarting, error;
            var connection = $.hubConnection( "https://localhost/mock/")
                .starting(()=> isStarting = true)    
                .disconnected(()=> isDisconnected = true)
                .error(()=> error = true);
            var promise = connection.start();
            expect(dfdList.length).toEqual(1);
            await resolve(dfdList[0], {
                Url: "/mock",
                ConnectionId: "12345",
                ConnectionToken: "99999999",
                ConnectionTimeout: 110,
                TransportConnectTimeout:5,
                DisconnectTimeout: 30,
                KeepAliveTimeout: 20,
                ProtocolVersion: "1.3",
                TryWebSockets: true,
            });
            //if we never successfully open, we fallback right away           
            //sockets[0].onopen();//call callback for on open
            sockets[0].onclose.call(sockets[0], { wasClean: true });
            callEventSourceListener(eventSources[0], "open", {});
            callEventSourceListener(eventSources[0], "message", { data: "initialized"});
            callEventSourceListener(eventSources[0], "message", { data: {"C":"d-29165002-B,0|m,0|n,2|o,0|l,0","G":"GrOuPJiBbEriSh","M":[]}});
            callEventSourceListener(eventSources[0], "message", { data: {"C":"d-2956A1C-B,0|2,0|3,3|S,0|F,0","S":1,"M":[]}});

            await promise; //passing this means success
            expect(isStarting).toEqual(true);
            expect(error).toEqual(undefined);
            expect(isDisconnected).toEqual(undefined);
            expect(WebSocket).toHaveBeenCalledWith("wss://localhost/mock/connect?transport=webSockets&connectionToken=99999999&tid=7");
            expect(EventSource).toHaveBeenCalledWith("https://localhost/mock/connect?transport=serverSentEvents&connectionToken=99999999&tid=7");
        });

        it("starts up with hubProxy created", async function  () {
            var isDisconnected, isStarting, error,chatMsg;
            var connection = $.hubConnection( "https://localhost/mock/")
                .starting(()=> isStarting = true)    
                .disconnected(()=> isDisconnected = true)
                .error(()=> error = true);
            var hubName = "hubbahubba";
            var hubProxy = connection.createHubProxy(hubName);
            hubProxy.on("chatMsg", function (msg){
                chatMsg = msg;
            });
            var promise = connection.start();
            expect(dfdList.length).toEqual(1);
            await resolve(dfdList[0], {
                Url: "/mock",
                ConnectionId: "12345",
                ConnectionToken: "99999999",
                ConnectionTimeout: 110,
                TransportConnectTimeout:5,
                DisconnectTimeout: 30,
                KeepAliveTimeout: 20,
                ProtocolVersion: "1.3",
                TryWebSockets: true,
            });           
            sockets[0].onopen();//call callback for on open
            sockets[0].onmessage({ data: {"C":"d-2DEC8B4-B,0|BnC,0|BnD,1","S":1,"M":[]}});
            //sockets[0].onmessage({ data: {"C":"d-2DEC8B4-B,0|BnC,0|BnD,2|BnI,0", "G":"GrOuPJiBbEriSh"}});
            await promise;
            expect(isStarting).toEqual(true);
            expect(error).toEqual(undefined);
            expect(isDisconnected).toEqual(undefined);
            expect(WebSocket).toHaveBeenCalledWith("wss://localhost/mock/connect?transport=webSockets&connectionToken=99999999&connectionData=%5B%7B%22name%22%3A%22hubbahubba%22%7D%5D&tid=7");
           
        });
    });

});