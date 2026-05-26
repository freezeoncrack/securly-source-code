import Client from "/js/mjs/clients/satellite.js";
import SETTINGS from "/js/mjs/settings.js";
import Hub from "/test/mocks/connectionHub.js";
import deferred from "/js/mjs/utils/deferred.js";
import $ from "/js/mjs/lib/jquery.signalR-SW-2.0.2.js";
import eventAggregator from "/js/mjs/utils/eventAggregator.js";

function nextTick(){
    return Promise.resolve();
}
function onEvent(event){
    var dfd = deferred.get();
    eventAggregator.once(event, ()=>dfd.resolve());
    return dfd;
}


describe('satellite client', function() {
    var client, hub, dfd;

    beforeEach(function() {
        eventAggregator.removeAllListeners();
        dfd = deferred.get();
        spyOn(globalThis, "fetch").and.callFake(()=>dfd);
        client = new Client();
        hub = new Hub();
        jasmine.clock().install();    
    });

    afterEach(function() {
       jasmine.clock().uninstall();
    });

    it('can construct client', function() {
        expect(client).toBeTruthy();
    });

    it('can initialize hub for attach V2', function() {
        spyOn($, 'hubConnection').and.returnValue(hub);
        hub.createHubProxy.and.returnValue('proxy');
        spyOn(client, 'subscribe');
        spyOn(client, '_checkHubConnection');

        client.baseUrl = 'test';
        client.coreAccessToken = 'core:token';
        client.accessToken = null;

        client._initHubConnection();

        expect(client._hubConnection).toBe(hub);
        expect(client._hubProxyMonitor).toBe('proxy');
        expect(hub.start).toHaveBeenCalled();
    });

    it('will throw for init with V2 without core access token', function() {
        spyOn($, 'hubConnection').and.returnValue(hub);

        client.coreAccessToken = null;
        client.accessToken = 'token';

        expect(client._initHubConnection.bind(client)).toThrow();
    });

    it('can perform V2 attach', async function() {
        spyOn($, 'param').and.callFake(function(obj) {
            return 'token=' + obj.access_token;
        });
        spyOn(client, '_attachFragment').and.returnValue('');
        spyOn(client, 'get').and.returnValue(Promise.resolve({
            access_token: 'satellite_token'
        }));

        client.coreAccessToken = 'core';
        client.accessToken = 'token';
        await client._attach();
        expect(client.get).toHaveBeenCalledWith('?token=core', false,
            SETTINGS.DEFAULT_RETRY_OPTIONS);
        expect(client.accessToken).toBe('satellite_token');
    });

    it('will set access token from successful attach V2', function() {
        client.accessToken = null;

        client._attachSuccessful({ access_token: 'token' });

        expect(client.accessToken).toBe('token');
    });

    it('will throw if attach V2 does not provide a token', function() {
        client.accessToken = null;

        expect(client._attachSuccessful.bind(client, {})).toThrow();
        expect(client.accessToken).toBe(null);
    });

   it("will properly initialize on init if success", async function (){
        client.coreAccessToken = 'core:token';
        client.baseUrl = 'https://localhost';
        var startDfd = deferred.get();
        spyOn($.signalR.fn, "start").and.returnValue(startDfd);
        var initDfd = client.init(); 
        await startDfd.resolve();
        jasmine.clock().tick(30000);//doesnt have a problem here
        await initDfd;//this is a success
    });

    it("will error on init if error", async function (){
        client.coreAccessToken = 'core:token';
        client.baseUrl = 'https://localhost';
        var startDfd = deferred.get();
        spyOn($.signalR.fn, "start").and.returnValue(startDfd);
        var initDfd = client.init(); 
        try{
            startDfd.reject(new Error("AHH THE BURNING"));
            await initDfd;//this is a success
            jasmine.clock().tick(30000);//doesnt have a problem here
            fail("should have errored");
        } catch (err){
            //success nothing here though
        }
    });

    it("will error on init if timeout", async function (){
        client.coreAccessToken = 'core:token';
        client.baseUrl = 'https://localhost';
        var startDfd = deferred.get();
        spyOn($.signalR.fn, "start").and.returnValue(startDfd);
        var initDfd = client.init(); 
        try{
            jasmine.clock().tick(30000);//doesnt have a problem here
            await initDfd;//this is a success
            fail("should have errored");
        } catch (err){
            //success nothing here though
        }
    });

    describe("emits over eventAggregator", function () {
        var newObjectCalls;
        var broadcastEndCalls;
        var openObjectCalls;
        var newFrameCallback;
        beforeEach(function () {
            client.coreAccessToken = 'core:token';
            client.baseUrl = 'https://localhost';
            hub.start.and.returnValue(deferred.get());//never returns
            spyOn($, 'hubConnection').and.returnValue(hub);
            var hubProxy = {
                on: function () { return this; },
                off: function () { return this; } 
            };
            hub.createHubProxy.and.returnValue(hubProxy);
            spyOn(hubProxy, "on").and.callThrough();
            client.init(); 
            //set up our subscription 
            newObjectCalls = [];
            broadcastEndCalls = [];
            openObjectCalls = [];
            eventAggregator.on("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbbnew_object", data=>newObjectCalls.push(data));
            eventAggregator.on("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/broadcast_end", data=>broadcastEndCalls.push(data));
            eventAggregator.on("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/open_object", data=>openObjectCalls.push(data));
            //now force the data through
            newFrameCallback = hubProxy.on.calls.mostRecent().args[1];
        });

        it("emits NEW_OBJECT over eventAggregator", function () {
        
            newFrameCallback({
                "payload_id": "new_object",
                "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "cabra_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "cabra_name": "dyknow.me/screen_shot",
                "payload": {}
            });
            expect(newObjectCalls).toEqual([{
                broadcastObject: {
                    "payload_id": "new_object",
                    "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    "cabra_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    "cabra_name": "dyknow.me/screen_shot",
                    "payload": {}
                }
            }]);
        });


        it("emits NEW_OBJECT in array over eventAggregator", function () {
            newFrameCallback([{
                "payload_id": "new_object",
                "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "cabra_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "cabra_name": "dyknow.me/screen_shot",
                "payload": {}
            }]);
            expect(newObjectCalls).toEqual([{
                broadcastObject: {
                    "payload_id": "new_object",
                    "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    "cabra_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    "cabra_name": "dyknow.me/screen_shot",
                    "payload": {}
                }
            }]);
        });

        it("ignores USER_JOINED and USER_LEFT", function () {
            newFrameCallback([{
                "payload_id": "user_joined",
                "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "cabra_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "cabra_name": "dyknow.me/screen_shot",
                "payload": {}
            }]);
            newFrameCallback([{
                "payload_id": "user_left",
                "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "cabra_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "cabra_name": "dyknow.me/screen_shot",
                "payload": {}
            }]);
            expect(newObjectCalls).toEqual([]);
        });

        it("emits BROADCAST_END and OPEN_OBJECT over eventAggregator", function () {
            //we are going to cheat here. We SHOULD set braodcastid from the attach 
            //results. This does kind of indicate a potential race condition here.
            client.broadcastId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
            newFrameCallback({
                "payload_id": "broadcast_end",
                "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
            });
            expect(broadcastEndCalls).toEqual([
                {
                    "payload_id": "broadcast_end",
                    "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
                }
            ]);
            newFrameCallback({//of note, I didnt actually copy this out of the console so this shape may be wrong
                "payload_id": "open_object",
                "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "cabra_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "cabra_name": "dyknow.me/screen_shot"
            });
            expect(openObjectCalls).toEqual([
                {//of note, I didnt actually copy this out of the console so this shape may be wrong
                    "payload_id": "open_object",
                    "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    "broadcast_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    "cabra_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    "cabra_name": "dyknow.me/screen_shot"
                }
            ]);
        });
    });
});
