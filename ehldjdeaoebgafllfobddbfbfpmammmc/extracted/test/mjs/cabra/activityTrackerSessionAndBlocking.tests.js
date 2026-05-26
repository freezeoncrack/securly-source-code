
import Sandbox from "/js/mjs/sandbox.js";
import guid from "/js/mjs/lib/uuid.js";
import logger from "/test/mocks/logger.js";
import MockBroadcastSession from "/test/mocks/broadcastSession.js";
import MockStateFrame from "/test/mocks/stateFrame.js";
import browserEvents from "/js/mjs/chromeOsServices/browserEvents.js";
import chrome from "/test/mocks/chrome.js";
import BlockingManager from "/js/mjs/qsr/blockingManager.js";


describe('ActivityTracker + AppBlockingSession', function () {
    var sandbox;
    beforeEach(function () {
        sandbox = new Sandbox().init();
        sandbox._reset();
        chrome.useMock();
        logger.useMock();
        browserEvents._resetForTest();
        BlockingManager._resetForTest();
        //test-only concern where we have to resync this field
        var blockingManager = BlockingManager.instance();
        blockingManager.coreApplicationWhiteList[0].identifier = chrome.runtime.id;
    });
    afterEach(function(){
        sandbox._reset();
        browserEvents._resetForTest();
        chrome.resetMock();
    });

    describe('blocked at start', function () {
        var activityTrackerSession = null,
            blockingSession = null,
            session;
        beforeEach(function () {
            session = new MockBroadcastSession(guid(), {
                /*activeCabras*/
                "dyknow.me/application_blocking": guid(),
                "dyknow.me/participant_activity_monitor": guid()
            },[
                /*supportedCabra*/
                "dyknow.me/application_blocking",
                "dyknow.me/participant_activity_monitor"
            ],{
                /*cabraStateMap*/
                "dyknow.me/application_blocking": new MockStateFrame({}),
                "dyknow.me/participant_activity_monitor": {}
            },{
                /*beforeEnterMap*/
                "dyknow.me/participant_activity_monitor": function (cabraSession) {
                    activityTrackerSession = cabraSession;
                    spyOn(activityTrackerSession._client, "addCabraFrame").and.returnValue($.Deferred().resolve());
                },
                "dyknow.me/application_blocking": function (cabraSession){
                    blockingSession = cabraSession;
                }
            }, {
                /*afterEnterMap*/
                "dyknow.me/participant_activity_monitor": function (cabraSession) {
                    //Do not set the initial activity, we set that up in our tests
                    // activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                }
            },[
                /*enterOrder*/
                "dyknow.me/application_blocking",
                "dyknow.me/participant_activity_monitor",
            ]);
            blockingSession.applyFromRealtime({
                broadcastObject: {payload: {payload: {
                    type: 'whitelist',
                    bundles: [{applications: [
                        {
                            name: 'khanacademy',
                            identifier: 'khanacademy.org',
                            os: {
                                type: "web"
                            }
                        }
                    ]},{applications:[
                        {
                            name: 'testnav',
                            identifier: 'mdmkkicfmmkgmpkmkdikhlbggogpicma',
                            os: {
                                type: "chrome"
                            }
                        }
                    ]}]}}
                }
            });
        });

        it("sends up blocked urls and apps (apps reverted due to DYK-432)", function () {
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.facebook.com/something-off-task"},
                {id: 2, url: "https://www.khanacademy.org/something-allowed"}
            ]}]);
            var getAllCallback = chrome.management.getAll.calls.all()[0].args[0];
            getAllCallback([
                {name: "Dyknow", id: "kmpjlilnemjciohjckjadmgmicoldglf"},
                {name: "TestNav", id: "mdmkkicfmmkgmpkmkdikhlbggogpicma"},
                {name: "Something Off-Task", id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}
            ]);
            expect(activityTrackerSession._client.addCabraFrame.calls.all().length).toEqual(1);
            expect(activityTrackerSession._client.addCabraFrame.calls.all()[0].args[3])
                .toEqual({
                    name: "Chrome", 
                    identifier: "Chrome", 
                    url: "https://www.facebook.com/something-off-task", 
                    title: "", 
                    blocked: "blocked",
                    tab_id: 1
                });
            // expect(activityTrackerSession._client.addCabraFrame.calls.all()[1].args[3])
            //     .toEqual({
            //         blocked: "blocked",
            //         identifier: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            //         name: "Something Off-Task",
            //         title: ""
            //     });
        });
    });

    describe('blocked later', function () {
        var activityTrackerSession = null,
            blockingSession = null,
            session;
        beforeEach(function () {
            session = new MockBroadcastSession(guid(), {
                /*activeCabras*/
                "dyknow.me/application_blocking": guid(),
                "dyknow.me/participant_activity_monitor": guid()
            },[
                /*supportedCabra*/
                "dyknow.me/application_blocking",
                "dyknow.me/participant_activity_monitor"
            ],{
                /*cabraStateMap*/
                "dyknow.me/application_blocking": new MockStateFrame({}),
                "dyknow.me/participant_activity_monitor": {}
            },{
                /*beforeEnterMap*/
                "dyknow.me/participant_activity_monitor": function (cabraSession) {
                    activityTrackerSession = cabraSession;
                    spyOn(activityTrackerSession._client, "addCabraFrame").and.returnValue($.Deferred().resolve());
                },
                "dyknow.me/application_blocking": function (cabraSession){
                    blockingSession = cabraSession;
                }
            }, {
                /*afterEnterMap*/
                "dyknow.me/participant_activity_monitor": function (cabraSession) {
                    //Do not set the initial activity, we set that up in our tests
                    //activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                }
            },[
                /*enterOrder*/
                "dyknow.me/application_blocking",
                "dyknow.me/participant_activity_monitor",
            ]);
            blockingSession.applyFromRealtime({
                broadcastObject: {payload: {payload: {
                    type: 'whitelist',
                    bundles: [{applications: [
                        {
                            name: 'khanacademy',
                            identifier: 'khanacademy.org',
                            os: {
                                type: "web"
                            }
                        }
                    ]},{applications:[
                        {
                            name: 'testnav',
                            identifier: 'mdmkkicfmmkgmpkmkdikhlbggogpicma',
                            os: {
                                type: "chrome"
                            }
                        }
                    ]}]}}
                }
            });
        });

        it("sends up blocked urls", function () {
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.khanacademy.org/something-allowed"}
            ]}]);
            var willNavigate = chrome.webNavigation.onCommitted.addListener.calls.all()[0].args[0];
            willNavigate({ tabId: 1, frameId: 0, url: "http://www.offtask.com/something-off-task" });
            var getCallback = chrome.tabs.get.calls.all()[0].args[1];
            getCallback({ 
                active: true, url: "http://www.offtask.com/something-off-task", id: 1 
            });

            expect(activityTrackerSession._client.addCabraFrame.calls.all().length).toEqual(2);
            expect(activityTrackerSession._client.addCabraFrame.calls.all()[0].args[3])
            .toEqual({
                name: "Chrome", 
                identifier: "Chrome", 
                url: "http://www.offtask.com/something-off-task", 
                title: "",
                tab_id: 1
            });
            expect(activityTrackerSession._client.addCabraFrame.calls.all()[1].args[3])
                .toEqual({
                    name: "Chrome", 
                    identifier: "Chrome", 
                    url: "http://www.offtask.com/something-off-task", 
                    title: "", 
                    blocked: "blocked",
                    tab_id: 1
                });
        });

        it("sends up blocked apps (reverted due to DYK-432)", function () {
            var getAllCallback = chrome.management.getAll.calls.all()[0].args[0];
            getAllCallback([
                {name: "Dyknow", id: "kmpjlilnemjciohjckjadmgmicoldglf"},
                {name: "TestNav", id: "mdmkkicfmmkgmpkmkdikhlbggogpicma"}
            ]);

            var onEnabled = chrome.management.onEnabled.addListener.calls.all()[0].args[0];
            onEnabled({name: "Something Off-Task", id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"});
            expect(activityTrackerSession._client.addCabraFrame.calls.all().length).toEqual(0);
            // expect(activityTrackerSession._client.addCabraFrame.calls.all()[0].args[3])
            //     .toEqual({
            //         blocked: "blocked",
            //         identifier: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            //         name: "Something Off-Task",
            //         title: ""
            //     });
        });
    });
});
