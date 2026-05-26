import DirectControlSession  from "/js/mjs/cabra/directControlSession.js"; 
import logger from "/test//mocks/logger.js"; 
import Sandbox from "/js/mjs/sandbox.js"; 
import $ from "/js/lib/jquery-2.1.1.min.js";//used for $.Deferred
import MockCabraInfo  from "/test//mocks/cabraInfo.js"; 
import chrome from "/test//mocks/chrome.js";
import deferred from "/js/mjs/utils/deferred.js";

function nextTick(){ return deferred.get().resolve();}

async function waitFor(func){
    while(!func()){
        await deferred.get().resolve();//tight loop
    }
}

describe('directControlSession', function () {
    var session;
    var sandbox;
    var frameQueue;
    var constants = {
        
    };
    
    beforeEach(function () {
        frameQueue = [];
        sandbox = new Sandbox().init();
        sandbox._reset();
        chrome.useMock();
        logger.useMock();
        session = new DirectControlSession();
        
        session.init("dyknow.me/direct_control_monitor", 22, [], {addCabraFrame:$.noop, enterCabra: $.noop});
        spyOn(session._client, "addCabraFrame").and.callFake(function (){ 
            var dfd = $.Deferred();
            frameQueue.push(dfd);
            return dfd;    
        });
        spyOn(session._client, "enterCabra").and.returnValue($.Deferred().resolve());
    });
    
    afterEach(function(){
        sandbox._reset();
        chrome.resetMock();
    });
    describe("state", function (){
        it("sends tabs when control_mode is tabs ", async function () {
            session.didEnterCabra(new MockCabraInfo(22,"uuid", {
                payload: {
                    control_state: {
                        conversation_id: "1234", 
                        payload: {
                            control_mode: "tabs"
                        }
                    }
                }
            }));

            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 1,
                        focused: true,
                        tabs:[{
                            id: 100, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/muppets",
                            title: "muppets"
                        }, {
                            id: 101, 
                            url: "https://www.khanacademy.org/cs",
                            title: "cs"
                        }]
                    }
                ]
            );
            await waitFor(function () {
                return frameQueue.length;
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1234", {
                type: "tab_refresh",
                tabs: [
                    {
                        window_id: 1,
                        tab_id: 100, 
                        url: "https://www.youtube.com/channel/muppets",
                        active: "active-focused",
                        audible: "audible",
                        title: "muppets"
                    },
                    {
                        window_id: 1,
                        tab_id: 101, 
                        url: "https://www.khanacademy.org/cs",
                        title: "cs"                        
                    }
                ]
            });
        });

        it("catches up on unack'd close requests ", async function () {
            session.didEnterCabra(new MockCabraInfo(22,"uuid", {
                payload: {
                    control_state: {
                        conversation_id: "1234", 
                        payload: {
                            control_mode: "tabs"
                        }
                    },
                    commands: [
                        {
                            conversation_id: "1235",
                            payload: {
                                command: "tab_close",
                                window_id: 1,
                                tab_id: 100
                            }
                        }
                    ]
                }
            }));
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2](
                {
                    id: 1,
                    focused: true,
                    tabs:[{
                        id: 101, 
                        active: true, 
                        url: "https://www.khanacademy.org/cs",
                        title: "cs"
                    }]
                }
            );
            await waitFor(function () {
                return frameQueue.length;
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1235", {
                type: "tab_close",
                target_windowid: 1, 
                target_tabid: 100,
                result_windowid: 1,
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });

        it("catches up on unack'd change requests ", async function () {
            session.didEnterCabra(new MockCabraInfo(22,"uuid", {
                payload: {
                    control_state: {
                        conversation_id: "1234", 
                        payload: {
                            control_mode: "tabs"
                        }
                    },
                    commands: [
                        {
                            conversation_id: "1235",
                            payload: {
                                command: "tab_change",
                                window_id: 1,
                                tab_id: 101
                            }
                        }
                    ]
                }
            }));
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.windows.update.calls.mostRecent().args[2]();
            await waitFor(function () {
                return frameQueue.length;
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1235", {
                type: "tab_change",
                target_windowid: 1, 
                target_tabid: 101
            });
        });

        it("will sequence multiple requests in state", async function () {
            session.didEnterCabra(new MockCabraInfo(22,"uuid", {
                payload: {
                    control_state: {
                        conversation_id: "1234", 
                        payload: {
                            control_mode: "tabs"
                        }
                    },
                    commands: [
                        {
                            conversation_id: "1235",
                            payload: {
                                command: "tab_close",
                                window_id: 1,
                                tab_id: 100
                            }
                        },
                        {
                            conversation_id: "1236",
                            payload: {
                                command: "tab_close",
                                window_id: 1,
                                tab_id: 101
                            }
                        },
                        {
                            conversation_id: "1237",
                            payload: {
                                command: "tab_change",
                                window_id: 1,
                                tab_id: 102
                            }
                        }
                    ]
                }
            }));
            expect(chrome.tabs.update).not.toHaveBeenCalled();
            expect(chrome.windows.update).not.toHaveBeenCalled();
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2](
                {
                    id: 1,
                    focused: true,
                    tabs:[{
                        id: 101, 
                        active: true, 
                        url: "https://www.youtube.com/stuff",
                        title: "stuff and junk"
                    },
                    {
                        id: 102, 
                        active: false, 
                        url: "https://www.khanacademy.org/math",
                        title: "math"
                    }]
                }
            );
            //have to nextTick for the next phase
            await waitFor(function () {
                return frameQueue.length;
            });
            frameQueue[0].resolve();
            //resolve and wait for nexttick 
            await waitFor(function () {
                return chrome.tabs.get.calls.all().length === 2;
            });
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 101, 
                active: true, 
                url: "https://www.youtube.com/stuff",
                title: "stuff and junk"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2](
                {
                    id: 1,
                    focused: true,
                    tabs:[
                    {
                        id: 102, 
                        active: true, 
                        url: "https://www.khanacademy.org/math",
                        title: "math"
                    }]
                }
            );
            await waitFor(function () {
                return frameQueue.length > 1;
            });
            frameQueue[1].resolve();
            await waitFor(function () {
                //promise resolved, so waiting on nexttick to move through
                return chrome.windows.update.calls.all().length === 1;
            });
            chrome.windows.update.calls.mostRecent().args[2]();
            chrome.tabs.update.calls.mostRecent().args[2]();
            await waitFor(function (){
                return frameQueue.length > 2;
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1235", {
                type: "tab_close",
                target_windowid: 1, 
                target_tabid: 100,
                result_windowid: 1,
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1236", {
                type: "tab_close",
                target_windowid: 1, 
                target_tabid: 101,
                result_windowid: 1,
                result_tabid: 102,
                result_active: "active-focused",
                target_url: "https://www.youtube.com/stuff",
                target_title: "stuff and junk"
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1237", {
                type: "tab_change",
                target_windowid: 1, 
                target_tabid: 102
            });
        });

    });

    describe("realtime", function() {
        beforeEach(function () {
            session.didEnterCabra(new MockCabraInfo());
        });
        
        it("sends a tab refresh when asked", async function () {
            session.applyFromRealtime({
                broadcastObject: {
                    payload: {
                        payload_id: "897caa1c-43e8-46de-b159-e54efd495187",
                        conversation_id: "1234", 
                        payload: {
                            control_mode: "tabs"
                        }
                    }
                }
            });
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 1,
                        focused: true,
                        tabs:[{
                            id: 100, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/muppets",
                            title: "muppets"
                        }, {
                            id: 101, 
                            url: "https://www.khanacademy.org/cs",
                            title: "cs"
                        }]
                    }
                ]
            );
            await waitFor(function () {
                return frameQueue.length;
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1234", {
                type: "tab_refresh",
                tabs: [
                    {
                        window_id: 1,
                        tab_id: 100, 
                        url: "https://www.youtube.com/channel/muppets",
                        active: "active-focused",
                        audible: "audible",
                        title: "muppets"
                    },
                    {
                        window_id: 1,
                        tab_id: 101, 
                        url: "https://www.khanacademy.org/cs",
                        title: "cs"                        
                    }
                ]
            });
        });

        it("closes a tab when asked", async function () {
            session.applyFromRealtime({
                broadcastObject: {
                    payload: {
                        payload_id: "adc7d240-ad92-4e5c-95cb-99162fa76fd9",
                        conversation_id: "1235", 
                        payload: {
                            command: "tab_close",
                            window_id: 1,
                            tab_id: 100
                        }
                    }
                }
            });
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2](
                {
                    id: 1,
                    focused: true,
                    tabs:[{
                        id: 101, 
                        active: true, 
                        url: "https://www.khanacademy.org/cs",
                        title: "cs"
                    }]
                }
            );

            await waitFor(function () {
                return frameQueue.length;
            });
            
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1235", {
                type: "tab_close",
                target_windowid: 1, 
                target_tabid: 100,
                result_windowid: 1,
                result_tabid: 101,
                result_active: "active-focused",
                target_url : 'https://www.facebook.com', 
                target_title : 'facebook'
            });
        });

        it("changes a tab when asked", async function () {
            session.applyFromRealtime({
                broadcastObject: {
                    payload: {
                        payload_id: "adc7d240-ad92-4e5c-95cb-99162fa76fd9",
                        conversation_id: "1235", 
                        payload: {
                            command: "tab_change",
                            window_id: 1,
                            tab_id: 101
                        }
                    }
                }
            });
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.windows.update.calls.mostRecent().args[2]();

            await waitFor(function () {
                return frameQueue.length;
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1235", {
                type: "tab_change",
                target_windowid: 1, 
                target_tabid: 101
            });
        });

        it("publishes a tab close so that palSession can process", async function(){
            spyOn(sandbox, "publish");
            session.applyFromRealtime({
                broadcastObject: {
                    payload: {
                        payload_id: "adc7d240-ad92-4e5c-95cb-99162fa76fd9",
                        conversation_id: "1235", 
                        payload: {
                            command: "tab_close",
                            window_id: 1,
                            tab_id: 100
                        }
                    }
                }
            });
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2](
                {
                    id: 1,
                    focused: true,
                    tabs:[{
                        id: 101, 
                        active: true, 
                        url: "https://www.khanacademy.org/cs",
                        title: "cs"
                    }]
                }
            );

            await waitFor(function () {
                return frameQueue.length;
            });
            expect(sandbox.publish).toHaveBeenCalledWith("blocking_close_tab", {
                url: "https://www.facebook.com",
                title: "facebook",
                tab_id: 100
            });
        });

        it("will sequence multiple requests when sent all at once", async function () {
            session.applyFromRealtime({
                broadcastObject: {
                    payload: {
                        payload_id: "adc7d240-ad92-4e5c-95cb-99162fa76fd9",
                        conversation_id: "1235", 
                        payload: {
                            command: "tab_close",
                            window_id: 1,
                            tab_id: 100
                        }
                    }
                }
            });
            session.applyFromRealtime({
                broadcastObject: {
                    payload: {
                        payload_id: "adc7d240-ad92-4e5c-95cb-99162fa76fd9",
                        conversation_id: "1236", 
                        payload: {
                            command: "tab_close",
                            window_id: 1,
                            tab_id: 101
                        }
                    }
                }
            });
            session.applyFromRealtime({
                broadcastObject: {
                    payload: {
                        payload_id: "adc7d240-ad92-4e5c-95cb-99162fa76fd9",
                        conversation_id: "1237", 
                        payload: {
                            command: "tab_change",
                            window_id: 1,
                            tab_id: 102
                        }
                    }
                }
            });

            expect(chrome.tabs.update).not.toHaveBeenCalled();
            expect(chrome.windows.update).not.toHaveBeenCalled();
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2](
                {
                    id: 1,
                    focused: true,
                    tabs:[{
                        id: 101, 
                        active: true, 
                        url: "https://www.youtube.com/stuff",
                        title: "stuff and junk"
                    },
                    {
                        id: 102, 
                        active: false, 
                        url: "https://www.khanacademy.org/math",
                        title: "math"
                    }]
                }
            );
            //have to nextTick for the next phase
            await waitFor(function () {
                return frameQueue.length;
            });
            frameQueue[0].resolve();
            //resolve and wait for nexttick 
            await waitFor(function () {
                return chrome.tabs.get.calls.all().length === 2;
            });
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 101, 
                active: true, 
                url: "https://www.youtube.com/stuff",
                title: "stuff and junk"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2](
                {
                    id: 1,
                    focused: true,
                    tabs:[
                    {
                        id: 102, 
                        active: true, 
                        url: "https://www.khanacademy.org/math",
                        title: "math"
                    }]
                }
            );
            await waitFor(function () {
                return frameQueue.length > 1;
            });
            frameQueue[1].resolve();
            await waitFor(function () {
                //promise resolved, so waiting on nexttick to move through
                return chrome.windows.update.calls.all().length === 1;
            });
            chrome.windows.update.calls.mostRecent().args[2]();
            chrome.tabs.update.calls.mostRecent().args[2]();
            await waitFor(function (){
                return frameQueue.length > 2;
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1235", {
                type: "tab_close",
                target_windowid: 1, 
                target_tabid: 100,
                result_windowid: 1,
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1236", {
                type: "tab_close",
                target_windowid: 1, 
                target_tabid: 101,
                result_windowid: 1,
                result_tabid: 102,
                result_active: "active-focused",
                target_url: "https://www.youtube.com/stuff",
                target_title: "stuff and junk"
            });
            expect(session._client.addCabraFrame).toHaveBeenCalledWith(22, undefined, "1237", {
                type: "tab_change",
                target_windowid: 1, 
                target_tabid: 102
            });
        });
    });
});
