import _ from "/js/lib/underscore.js";
import $ from "/js/mjs/lib/jquery.signalR-SW-2.0.2.js";
import JQXHRForSignalR from "/js/mjs/lib/JQXHRForSignalR.js";
import AutoTransport from '/js/mjs/clients/signalr-autotransport2.js';   
import Hub from '/test/mocks/connectionHub.js';
import deferred from "/js/mjs/utils/deferred.js";

/* IMPORTANT PSA!!!!IMPORTANT PSA!!!!IMPORTANT PSA!!!!
*  $.ajax is not jquery but our shim for signalr. 
*  so go check that out to know more.
*/

function afterCalled(spy){
    var dfd = deferred.get();
    spy.and.callFake(function () {
        dfd.resolve();
    });
    return dfd;
}

describe("autotransport", function() {
    var connection;
    var auto;
    var lastTimer = 0;
    beforeEach(function () {

        jasmine.clock().install();    
        //flail to stop the bleeding 
      //  JQXHRForSignalR.prototype.runFetch = () => deferred.get();
        connection = new Hub();
        auto = AutoTransport.create();
        auto.connection = connection;
        spyOn(_, "delay").and.callFake(function () { return lastTimer++;});
        spyOn($, "ajax");
        spyOn(globalThis, "fetch");//backup
    });
    afterEach(function () {
        jasmine.clock().uninstall();
    });
    describe("negotiate", function () {
        it("fails the whole thing if we error during negotiate", async function () {
            //$.ajax is the shim for signalr above not jquery. act accordingly
            $.ajax.and.returnValue(deferred.get().reject({}, "500"));
            await auto.start().then(function(){
                fail("should have failed the whole thing");
            }, function (err){
                expect(err.message).toEqual("Error during negotiation request.");
            });
        });

        it("gracefully handles a stop request during a negotiate", async function () {
            var dfd = deferred.get();
            $.ajax.and.callThrough();
            fetch.and.returnValue(dfd);
            connection = $.hubConnection("http://localhost");
            auto.connection = connection;

            var startDfd = auto.start().then(function(){
                fail("should have failed the whole thing");
            }, function (err){
                expect(err.message).toEqual("The connection was stopped during the negotiate request.");
            });
            //some important pieces here now:
            //1. we need to be sure that our negotiate request is placed on connection._.negotiateRequest
            //because this detail is required for connection.stop to do the right thing
            //2. in the event that we do abort the negotiate, this gets propagated with the correct
            //info like before
            expect(connection._.negotiateRequest).toBeTruthy();
            connection.stop();
            dfd.reject(new DOMException("shouldnt_be_used", "AbortError"));//abort controller triggers this
            await startDfd;
        });

        it("throws if a content filter returns html", async function () {
            $.ajax.and.returnValue(deferred.get().resolve("<html><body>NOT ALLOWED</body></html>"));
            await auto.start().then(function(){
                fail("should have failed the whole thing");
            }, function (err){
                expect(err.message).toEqual("Error during negotiation request.");
            });
        });
    });

    describe("fallback behavior", function(){
        beforeEach(function(){
            spyOn($.signalR.transports.webSockets, "start");
            spyOn($.signalR.transports.serverSentEvents, "start");
            spyOn($.signalR.transports.longPolling, "start");
            spyOn($.signalR.transports.webSockets, "stop");
            spyOn($.signalR.transports.serverSentEvents, "stop");
            spyOn($.signalR.transports.longPolling, "stop");            
        });

        it("does not fallback if there is a success", async function () {
            var negotiateDfd = deferred.get();
            $.ajax.and.returnValue(negotiateDfd);
            
            var startDfd = auto.start().then(function(){
                return true;
            }, function (err){
                fail("should have succeeded");
            });
            var wsCheck = afterCalled($.signalR.transports.webSockets.start);
            negotiateDfd.resolve({
                TryWebSockets: true,
                ProtocolVersion:"1.3"
            });
            await wsCheck;
            $.signalR.transports.webSockets.start.calls.mostRecent().args[1]();

            await startDfd;
            expect($.signalR.transports.serverSentEvents.start).not.toHaveBeenCalled();
        });

        it("skips websockets if negotiate says to", async function () {
            var negotiateDfd = deferred.get();
            $.ajax.and.returnValue(negotiateDfd);
            
            var startDfd = auto.start().then(function(){
                return true;
            }, function (err){
                fail("should have succeeded");
            });

            var sseCheck = afterCalled($.signalR.transports.serverSentEvents.start)
            negotiateDfd.resolve({
                TryWebSockets: false,
                ProtocolVersion:"1.3"
            });
            await sseCheck;
            $.signalR.transports.serverSentEvents.start.calls.mostRecent().args[1]();

            await startDfd;
            expect($.signalR.transports.webSockets.start).not.toHaveBeenCalled();
        });
       
        it("falls back all the way to longPolling if others reject", async function () {
            var negotiateDfd = deferred.get();
            $.ajax.and.returnValue(negotiateDfd);
            
            var startDfd = auto.start().then(function(){
                return true;
            }, function (err){
                fail("should have succeeded");
            });
            //after negoriate comes websockets
            var wsCheck = afterCalled($.signalR.transports.webSockets.start);

            negotiateDfd.resolve({
                TryWebSockets: true,
                ProtocolVersion:"1.3"
            });
            await wsCheck;
            //next we'll expect to see sse
            var sseCheck = afterCalled($.signalR.transports.serverSentEvents.start);
            $.signalR.transports.webSockets.start.calls.mostRecent().args[2]();//reject
            
            await sseCheck;
            expect($.signalR.transports.webSockets.stop).toHaveBeenCalled();
            var lpCheck = afterCalled($.signalR.transports.longPolling.start);
            $.signalR.transports.serverSentEvents.start.calls.mostRecent().args[2]();//reject                    
            await lpCheck;
            expect($.signalR.transports.serverSentEvents.stop).toHaveBeenCalled();
            $.signalR.transports.longPolling.start.calls.mostRecent().args[1]();//resolve/success!
            await startDfd;
        });

        it("falls back all the way to longPolling if others timeout", async function () {
            var negotiateDfd = deferred.get();
            $.ajax.and.returnValue(negotiateDfd);
            
            var startDFd = auto.start().then(function(){
                return true;
            }, function (err){
                fail("should have succeeded");
            });
            var wsCheck = afterCalled($.signalR.transports.webSockets.start);
            var sseCheck = afterCalled($.signalR.transports.serverSentEvents.start);
            var lpCheck = afterCalled($.signalR.transports.longPolling.start );

            negotiateDfd.resolve({
                TryWebSockets: true,
                ProtocolVersion:"1.3"
            });
            
            await wsCheck;//websockets transport was started
            //but instead of resolving, we timeout
            _.delay.calls.mostRecent().args[0].call();
            
            await sseCheck;//sse transport was started            
            expect($.signalR.transports.webSockets.stop).toHaveBeenCalled();
            //but instead of resolving, we timeout
            _.delay.calls.mostRecent().args[0].call();
            await lpCheck;//longPolling transport was started
            expect($.signalR.transports.serverSentEvents.stop).toHaveBeenCalled();
            $.signalR.transports.longPolling.start.calls.mostRecent().args[1]();//resolve/success!
            await startDFd;
        });

    });
});