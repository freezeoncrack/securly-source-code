
import Sandbox from "/js/mjs/sandbox.js"; 
import Logger from "/js/mjs/logger/logger.js";
import guid from "/js/mjs/lib/uuid.js"; 
import AttentionManager from "/js/mjs/qsr/attentionManager.js";
import MockBroadcastSession from "/test/mocks/broadcastSession.js"; 
import MockStateFrame from "/test/mocks/stateFrame.js";
import MockLockedAttentionFrame from "/test/mocks/lockedAttentionFrame.js"; 
import MockRealtimeLockedAttentionFrame from "/test/mocks/realtimeLockedAttentionFrame.js";
import management from "/test/mocks/chrome.management.js"; 
import windows from "/test/mocks/chrome.windows.js"; 
import webNavigation from "/test/mocks/chrome.webNavigation.js";

describe('ActivityTracker + AttentionSession', function () {
    var sandbox;
    beforeEach(function (done) {
        chrome.runtime.onMessage = {
            addListener: function(){}
        };

        sandbox = new Sandbox().init();

        Logger.debug = $.noop;
        Logger.info = $.noop;
        Logger.warn = $.noop;
        Logger.error = $.noop;
    });
    afterEach(function(){
        sandbox._reset();
    });

    describe('Enter/State', function () {
        it("testEnterActivityTrackerAfterAttention_AttentionHasEmptyState", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": guid(),
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({}),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            activityTrackerSession.pal.stop();
        });

        it("testEnterActivityTrackerBeforeAttention_AttentionHasEmptyState", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": guid(),
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({}),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/participant_activity_monitor",
                    "dyknow.me/attention_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            activityTrackerSession.pal.stop();
        });
    });

    describe('Enter/State Locked Messages', function () {
        it("testEnterActivityTrackerAfterAttention_AttentionHasEmptyLockedMessageState", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {})
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            activityTrackerSession.pal.stop();
        });

        it("testEnterActivityTrackerBeforeAttention_AttentionHasEmptyLockedMessageState", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {})
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/participant_activity_monitor",
                    "dyknow.me/attention_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            activityTrackerSession.pal.stop();
        });

        it("testEnterActivityTrackerAfterAttention_AttentionHasUnlockedLockedMessageState", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "unlocked"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            activityTrackerSession.pal.stop();
        });

        it("testEnterActivityTrackerBeforeAttention_AttentionHasUnlockedLockedMessageState", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                    "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                        "lock": "unlocked"
                    })
                }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/participant_activity_monitor",
                    "dyknow.me/attention_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            activityTrackerSession.pal.stop();
        });

        it("testEnterActivityTrackerAfterAttention_AttentionHasLockedLockedMessageStateWithMessage", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message": "Attention Please"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).not.toHaveBeenCalled();
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalledWith("Locked Message", "com.dyknow.attention", null, "Attention Please");
        });

        it("testEnterActivityTrackerBeforeAttention_AttentionHasLockedLockedMessageStateWithMessage", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message": "Attention Please"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/participant_activity_monitor",
                    "dyknow.me/attention_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalledWith("Locked Message", "com.dyknow.attention", null, "Attention Please");
        });

        it("testEnterActivityTrackerAfterAttention_AttentionHasLockedLockedMessageStateWithoutMessage", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).not.toHaveBeenCalled();
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalledWith("Locked Message", "com.dyknow.attention", null, undefined);
        });

        it("testEnterActivityTrackerBeforeAttention_AttentionHasLockedLockedMessageStateWithoutMessage", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/participant_activity_monitor",
                    "dyknow.me/attention_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalledWith("Locked Message", "com.dyknow.attention", null, undefined);
        });
    });

    describe('Enter/State Unlocked Messages', function () {

    });

    describe('Enter/State Locked And Unlocked Messages', function () {

    });

    describe('Realtime Locked Messages', function () {
        it("testEnterActivityTrackerAfterAttentionRealtime_ClearsWithEmptyState", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message": "Attention Please!"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        var realtime = new MockRealtimeLockedAttentionFrame(attentionCabraId, guid(), {});
                        //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                        $.trigger(realtime.cabra_id  + realtime.payload_id, { "broadcastObject" : realtime });
                    },
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).not.toHaveBeenCalled();
            activityTrackerSession.pal.stop();
        });

        it("testEnterActivityTrackerBeforeAttentionRealtime_ClearsWithEmptyState", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message": "Attention Please!"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishPreviousActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        var realtime = new MockRealtimeLockedAttentionFrame(attentionCabraId, guid(), {});
                        //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                        $.trigger(realtime.cabra_id  + realtime.payload_id, { "broadcastObject" : realtime });
                    },
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/participant_activity_monitor",
                    "dyknow.me/attention_monitor",
                ]);

            //report initial activity
            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            //report attention
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalled();
            //report previous activity
            expect(activityTrackerSession.publishPreviousActivity).toHaveBeenCalled();
            activityTrackerSession.pal.stop();
        });

        it("testEnterActivityTrackerAfterAttentionRealtime_ClearsWithLockedAsUnlocked", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message": "Attention Please!"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        var realtime = new MockRealtimeLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "unlocked"
                        });
                        //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                        $.trigger(realtime.cabra_id  + realtime.payload_id, { "broadcastObject" : realtime });
                    },
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).not.toHaveBeenCalled();
            activityTrackerSession.pal.stop();
        });

        it("testEnterActivityTrackerBeforeAttentionRealtime_ClearsWithLockedAsUnlocked", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message": "Attention Please!"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishPreviousActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        var realtime = new MockRealtimeLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "unlocked"
                        });
                        //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                        $.trigger(realtime.cabra_id  + realtime.payload_id, { "broadcastObject" : realtime });
                    },
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/participant_activity_monitor",
                    "dyknow.me/attention_monitor",
                ]);

            //report initial activity
            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            //report attention
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalled();
            //report previous activity
            expect(activityTrackerSession.publishPreviousActivity).toHaveBeenCalled();
            activityTrackerSession.pal.stop();
        });

        it("testEnterActivityTrackerAfterAttentionRealtime_StartsWithEmptyStateThenLocks", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({ }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        var realtime = new MockRealtimeLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message" :"Attention Please"
                        });
                        //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                        $.trigger(realtime.cabra_id  + realtime.payload_id, { "broadcastObject" : realtime });
                    },
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).not.toHaveBeenCalled();
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalledWith("Locked Message", "com.dyknow.attention", null, "Attention Please");
        });

        it("testEnterActivityTrackerBeforeAttentionRealtime_StartsWithEmptyStateThenLocks", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({ }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishPreviousActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        var realtime = new MockRealtimeLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message" :"Attention Please"
                        });
                        //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                        $.trigger(realtime.cabra_id  + realtime.payload_id, { "broadcastObject" : realtime });
                    },
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/participant_activity_monitor",
                    "dyknow.me/attention_monitor",
                ]);

            //report initial activity
            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            //report previous activity
            expect(activityTrackerSession.publishPreviousActivity).toHaveBeenCalled();
            //report attention
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalled();
        });

        it("testEnterActivityTrackerAfterAttentionRealtime_StartsWithEmptyLockedMessageStateThenLocks", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {})
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        var realtime = new MockRealtimeLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message" :"Attention Please"
                        });
                        //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                        $.trigger(realtime.cabra_id  + realtime.payload_id, { "broadcastObject" : realtime });
                    },
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).not.toHaveBeenCalled();
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalledWith("Locked Message", "com.dyknow.attention", null, "Attention Please");
        });

        it("testEnterActivityTrackerBeforeAttentionRealtime_StartsWithEmptyLockedMessageStateThenLocks", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {})
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishPreviousActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        var realtime = new MockRealtimeLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message" :"Attention Please"
                        });
                        //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                        $.trigger(realtime.cabra_id  + realtime.payload_id, { "broadcastObject" : realtime });
                    },
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/participant_activity_monitor",
                    "dyknow.me/attention_monitor",
                ]);

            //report initial activity
            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            //report previous activity
            expect(activityTrackerSession.publishPreviousActivity).toHaveBeenCalled();
            //report attention
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalled();
        });

        it("testEnterActivityTrackerAfterAttentionRealtime_StartsWithUnlockedLockedMessageStateThenLocks", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "unlocked"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        var realtime = new MockRealtimeLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message" :"Attention Please"
                        });
                        //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                        $.trigger(realtime.cabra_id  + realtime.payload_id, { "broadcastObject" : realtime });
                    },
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor",
                ]);

            expect(activityTrackerSession.sendActivityChangeWithActivity).not.toHaveBeenCalled();
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalledWith("Locked Message", "com.dyknow.attention", null, "Attention Please");
        });

        it("testEnterActivityTrackerBeforeAttentionRealtime_StartsWithUnlockedLockedMessageStateThenLocks", function () {
            var activityTrackerSession = null,
                attentionSession = null,
                attentionCabraId = guid(),
                session = new MockBroadcastSession(guid(), {
                    /*activeCabras*/
                    "dyknow.me/attention_monitor": attentionCabraId,
                    "dyknow.me/participant_activity_monitor": guid()
                },[
                    /*supportedCabra*/
                    "dyknow.me/attention_monitor",
                    "dyknow.me/participant_activity_monitor"
                ],{
                    /*cabraStateMap*/
                    "dyknow.me/attention_monitor": new MockStateFrame({
                        "locked_message": new MockLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "unlocked"
                        })
                    }),
                    "dyknow.me/participant_activity_monitor": {}
                },{
                    /*beforeEnterMap*/
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        activityTrackerSession = cabraSession;
                        spyOn(activityTrackerSession._client, "addCabraFrame").andReturn($.Deferred());
                        spyOn(activityTrackerSession, "sendActivityChangeWithActivity");
                        spyOn(activityTrackerSession, "publishPreviousActivity");
                        spyOn(activityTrackerSession, "publishActivityChangeWithApplicationName");
                    },
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        spyOn(AttentionManager.instance().attention, 'setBlocking');
                    }
                }, {
                    /*afterEnterMap*/
                    "dyknow.me/attention_monitor": function (cabraSession) {
                        var realtime = new MockRealtimeLockedAttentionFrame(attentionCabraId, guid(), {
                            "lock": "locked",
                            "message" :"Attention Please"
                        });
                        //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                        $.trigger(realtime.cabra_id  + realtime.payload_id, { "broadcastObject" : realtime });
                    },
                    "dyknow.me/participant_activity_monitor": function (cabraSession) {
                        //Set the initial activity
                        activityTrackerSession.pal.emitEvent("activity", [{ name:"fake", identifier: "com.fake.activity", url: "", title: "" }]);
                    }
                },[
                    /*enterOrder*/
                    "dyknow.me/participant_activity_monitor",
                    "dyknow.me/attention_monitor",
                ]);

            //report initial activity
            expect(activityTrackerSession.sendActivityChangeWithActivity).toHaveBeenCalled();
            //report previous activity
            expect(activityTrackerSession.publishPreviousActivity).toHaveBeenCalled();
            //report attention
            expect(activityTrackerSession.publishActivityChangeWithApplicationName).toHaveBeenCalled();
        });
    });

});
