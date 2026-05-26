import ThumbnailCabra from "/js/mjs/cabra/thumbnailSession.js";
import Logger from "/js/mjs/logger/logger.js";
import Sandbox from "/js/mjs/sandbox.js";
import SETTINGS from "/js/mjs/settings.js";
import eventAggregator from "/js/mjs/utils/eventAggregator.js";
import deferred from "/js/mjs/utils/deferred.js";
import chrome from "/test/mocks/chrome.js";
import cabraEvents from "/js/mjs/cabra/cabraSession.events.js";
function noop(){}

describe('ThumbnailCabra', function () {
    var thumbnailSession;
    
    var constants = {
        payloads : {
        }
    };
    var conversationid1 = "11111111-1111-1111-1111-111111111111";
    var conversationid2 = "22222222-2222-2222-2222-222222222222";
    describe("with scale stuff", function () {
        beforeEach(function () {
            chrome.useMock();
            globalThis.sandbox._reset();
            spyOn(sandbox, "publish");//need to avoid chrome runtime here
            thumbnailSession = new ThumbnailCabra();
            thumbnailSession.Thumbnail = function (){ return { init: function(){ return this;}, withScale: noop };};
            thumbnailSession.init("dyknow.me/screen_shot", 15, [], {addCabraFrame:noop, enterCabra: noop, thumbnailResponse: noop});
            thumbnailSession.rules = [{to: "broadcaster"}];
            thumbnailSession._hasEntered = true;
            spyOn(thumbnailSession.thumbnail, "withScale").and.returnValue($.Deferred());
            spyOn(thumbnailSession._client, "addCabraFrame").and.returnValue($.Deferred());
            spyOn(thumbnailSession._client, "thumbnailResponse").and.returnValue($.Deferred().resolve());
            
            Logger.debug = noop;
            Logger.info = noop;
            Logger.warn = noop;
            Logger.error = noop;
        });

        it("passes on scale and empty request_fullscreen to withScale", function() {
            thumbnailSession.applyFromRealtime({
                broadcastObject: {
                    payload: {
                        conversation_id: conversationid1,
                        payload: {
                            scale: 3,
                            url: "https://localhost/mockthis"
                        }
                    }
                }
            });
            expect(thumbnailSession.thumbnail.withScale).toHaveBeenCalledWith(3, undefined);
        });
        
        it("passes on scale and request_fullscreen to withScale", function() {
            thumbnailSession.applyFromRealtime({
                broadcastObject: {
                    payload: {
                        conversation_id: conversationid1,
                        payload: {
                            scale: 3,
                            request_fullscreen: true,
                            url: "https://localhost/mockthis"
                        }
                    }
                }
            });
            expect(thumbnailSession.thumbnail.withScale).toHaveBeenCalledWith(3, true);
        });
    });
    describe("initializing event order", function () {
        var enterDfd;
        beforeEach(function(){
            globalThis.sandbox._reset();
            thumbnailSession = new ThumbnailCabra();
            thumbnailSession.Thumbnail = function (){ return { init: function(){ return this;}, withScale: noop };};
            thumbnailSession.init("dyknow.me/screen_shot", 15, [], {addCabraFrame:noop, enterCabra: noop, thumbnailResponse: noop});
            thumbnailSession.rules = [{to: "broadcaster"}];
            enterDfd = $.Deferred();
            spyOn(thumbnailSession.thumbnail, "withScale").and.returnValue($.Deferred());
            spyOn(thumbnailSession._client, "enterCabra").and.returnValue(enterDfd);

            spyOn(thumbnailSession._client, "addCabraFrame").and.returnValue($.Deferred());//wont be used
            spyOn(thumbnailSession._client, "thumbnailResponse").and.returnValue($.Deferred().resolve());//wont be used
            
            Logger.debug = noop;
            Logger.info = noop;
            Logger.warn = noop;
            Logger.error = noop;
        });
        afterEach(function () {
            thumbnailSession.unsubscribe();
            globalThis.sandbox._reset();
        });
        it("realtime between state enter req and resp will still process realtime", function () {
            //this calls enter but doesnt resolve
            thumbnailSession.enter();
            //receive 
            eventAggregator.trigger(thumbnailSession.cabraId + SETTINGS.EVENTS.NEW_OBJECT, [{ broadcastObject: {"payload_id":"new_object","broadcast_id":thumbnailSession.broadcastId,"cabra_id":thumbnailSession.cabraId,"cabra_name":"dyknow.me/screen_shot","payload":{"payload_id":"75e132cf-8371-49b5-bdaa-69785ff4c998","broadcast_cabra_id":"901c5a0b-8ab1-429d-bb2f-b7b4b52c36b9","payload":{"account_id":8,"url":"https://big-url.gov/thumb.jpg","scale":3,"request_fullscreen":false},"to":"1","conversation_id":"862d6b76-cd5a-4882-b3ce-dc5c6d9cf7ed","object_id":"42baf172-6189-4374-ba1d-17398324a4df","frame_id":81452,"account_id":8},"user":{"account_id":8}}}]);
            enterDfd.resolve({"broadcast_cabra_id":thumbnailSession.cabraId,"cabra_id":15,"status":"open","user":{"device_cabra_uuid":"901c5a0b-8ab1-429d-bb2f-b7b4b52c36b9","device_id":18,"status":"open","connections":[{"device_id":18,"status":"ok","os":{"id":5,"name":"Chrome","type":"chrome"}}],"account_id":8,"broadcast_id":thumbnailSession.broadcastId},"state":{"payload":{}}});
            expect(thumbnailSession.thumbnail.withScale).toHaveBeenCalled();
        });
    });
    describe("enter", function(){
        beforeEach(function () {
            globalThis.sandbox._reset();
            spyOn(sandbox, "publish");//need to avoid chrome runtime here
            thumbnailSession = new ThumbnailCabra();
            thumbnailSession.Thumbnail = function (){ return { init: function(){ return this;}, withScale: noop };};
            thumbnailSession.init("dyknow.me/screen_shot", 15, [], {addCabraFrame:noop, enterCabra: noop, thumbnailResponse: noop});
            thumbnailSession.rules = [{to: "broadcaster"}];
            thumbnailSession._hasEntered = true;
            spyOn(thumbnailSession.thumbnail, "withScale").and.returnValue(deferred.get());
            spyOn(thumbnailSession._client, "addCabraFrame").and.returnValue(deferred.get());
            spyOn(thumbnailSession._client, "thumbnailResponse").and.returnValue(deferred.get());
            spyOn(thumbnailSession._client, "enterCabra").and.returnValue(deferred.get());
            
            Logger.debug = noop;
            Logger.info = noop;
            Logger.warn = noop;
            Logger.error = noop;
        });


        it("happy path", async function(){
            // var cabraSession = CabraSessionFactory.getCabraSession(
            //     broadcastObject.cabra_name,
            //     broadcastObject.cabra_id,
            //     filteredSupportedCabra.cabra_rules,
            //     this._client
            // );
            //mimics what's done in broadcastsession

            thumbnailSession.broadcastId = "99999999-9999-9999-9999-999999999999";
            thumbnailSession.course = { roster_id: 4};
            var result = new Promise(function (resolve, reject){
                thumbnailSession.once(cabraEvents.CabraSessionDidEnterEvent, resolve);
                thumbnailSession.once(cabraEvents.CabraSessionDidFailToEnterEvent, reject);
            });
            thumbnailSession.enter();
            thumbnailSession._client.enterCabra.calls.mostRecent().returnValue.resolve({
                "broadcast_cabra_id":"11111111-1111-1111-1111-111111111111",
                "cabra_id":15,"status":"open",
                "state": {
                    "payload":{
                        "account_id":24601,
                        "url":"https://localhost/thumbnailnowplz",
                        "scale":3,
                        "request_fullscreen":false
                    },
                    "to":"participants",
                    "conversation_id":"ffffffff-ffff-ffff-ffff-ffffffffffff",
                    "object_id":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
                    "frame_id":99,
                    "from":"42",
                    "from_option":"broadcaster",
                    "created":"2022-12-19T19:38:45.521538"
                }
            });
            await result;
            var lobLawBlog = new Blob([1,1,1]);
            await thumbnailSession.thumbnail.withScale.calls.mostRecent().returnValue.resolve({
                blob: lobLawBlog,
                source: "tab"
            });
            expect(thumbnailSession._client.thumbnailResponse).toHaveBeenCalledWith("https://localhost/thumbnailnowplz", lobLawBlog, "image/jpeg"); 
            await thumbnailSession._client.thumbnailResponse.calls.mostRecent().returnValue.resolve({});
            var addFrameDfd = deferred.get();
            thumbnailSession._client.addCabraFrame.and.callFake(function () { return addFrameDfd.resolve()});
            await addFrameDfd;//wait till we've added 
            expect(thumbnailSession._client.addCabraFrame).toHaveBeenCalledWith(
                15, //thumbnail
                {to: "broadcaster"},
                "ffffffff-ffff-ffff-ffff-ffffffffffff",//conversationsid
                {source: "tab"}
            );
        });
    });
});