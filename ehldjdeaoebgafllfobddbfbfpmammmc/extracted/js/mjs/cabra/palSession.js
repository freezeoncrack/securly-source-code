import CabraSession from "/js/mjs/cabra/session.js"; 
import cabraEvents from "/js/mjs/cabra/cabraSession.events.js"; 
import Pal from "/js/mjs/chromeOsServices/pal.js"; 
import Sandbox from "/js/mjs/sandbox.js"; 
import Logger from "/js/mjs/logger/logger.js"; 
import blockingEvents from "/js/mjs/cabra/helper/blocking.events.js";
import { extend } from "/js/globals.js";
import deferred from "/js/mjs/utils/deferred.js";

var ACTIVITY = {
    NAME : {
        UNKNOWN : "unknown",
        BROWSER : "Chrome",
        SELF: "Dyknow"
    },
    IDENTIFIER : {
        UNKNOWN : "unknown",
        BROWSER : "Chrome",
        SELF: "kmpjlilnemjciohjckjadmgmicoldglf"
    }
};
var PalCabraSession = function () {
    var sandbox = new Sandbox().init();
    var palSession = this;
    this.pal = null;
    this._previousActivity = null;
    this.overrideActivity = false;
    this._PALActivityDidChangeEvent = null;
    this._queue = [];

    this.init = function (name, cabraId, rules, satelliteAPIClient, instance) {
        this.pal = new Pal();
        return PalCabraSession.prototype.init.apply(this, arguments);
    };

    this.didEnterCabra = function (cabraInfo) {
        PalCabraSession.prototype.didEnterCabra.apply(this, arguments);
        
        var self = this;
        
        this._PALActivityDidChangeEvent = this.publishActivityChangeWithActivity.bind(this);
        this.pal.start();
        this.pal.on("activity", this._PALActivityDidChangeEvent);
        
        //ask for the state of the attention cabra if it exists.
        sandbox.publish(this.broadcastId + "/" + cabraEvents.CabraSessionRequestStateEvent, { "name": "dyknow.me/attention_monitor" });
    };
    
    this.willLeaveCabra = function () {
        this.pal.off("activity", this._PALActivityDidChangeEvent);
        this.pal.stop();
        this._PALActivityDidChangeEvent = null;
        this.pal = null;
        this._previousActivity = null;
        this.overrideActivity = false;
        this._queue = [];
        PalCabraSession.prototype.willLeaveCabra.apply(this, arguments);
    };
    
    this._CabraSessionStateChangeEvent = null;

    this.stateChangedEvent = function (event) {
        var self = this;
        if (event.name == "dyknow.me/attention_monitor") {
            if (!self.maybePublishAttentionActivityWithAttentionState(event.frame)) {
                self.publishPreviousActivity();
            }
        }
    };
    
    this.subscribe = function () {
        PalCabraSession.prototype.subscribe.apply(this, arguments);
        this._CabraSessionStateChangeEvent = this.stateChangedEvent.bind(this);
        
        sandbox.subscribe(this.broadcastId + "/" + cabraEvents.CabraSessionStateChangeEvent,  this._CabraSessionStateChangeEvent);
        sandbox.subscribe(blockingEvents.block_url, this._blockUrl);
        sandbox.subscribe(blockingEvents.block_app, this._blockApp);
        sandbox.subscribe(blockingEvents.close_tab, this._blockCloseTab);
    };
    
    this.unsubscribe = function () {
        PalCabraSession.prototype.unsubscribe.apply(this, arguments);
        
        sandbox.unsubscribe(this.broadcastId + "/" + cabraEvents.CabraSessionStateChangeEvent,  this._CabraSessionStateChangeEvent);
        sandbox.unsubscribe(blockingEvents.block_url, this._blockUrl);
        sandbox.unsubscribe(blockingEvents.block_app, this._blockApp);
        sandbox.unsubscribe(blockingEvents.close_tab, this._blockCloseTab);
        this._CabraSessionStateChangeEvent = null;
    };
    
    this.maybePublishAttentionActivityWithAttentionState = function (state) {
        var self = this,
            lockRequest = null;
        if (state && state.payload && Object.keys(state.payload).length > 0) {
            var lockedAttentionState = null,
                lockedFrame = state.payload.locked_message;
            if (lockedFrame) {
                lockedAttentionState = lockedFrame;
            } else {
                //Last chance the state may not be an attention state frame but a realtime frame
                lockedAttentionState = state;
            }
            
            var lock = lockedAttentionState.payload.lock;
            if (lock && lock == 'locked') {
                lockRequest = lockedAttentionState.payload;
            }
        } 
        
        if (lockRequest) {
            Logger.info("Pal activity overriden by attention lock.");
            self.overrideActivity = true;
            self.publishActivityChangeWithApplicationName("Locked Message", "com.dyknow.attention", null, lockRequest.message);
            return true;
        }
        self.overrideActivity = false;
        return false;
    };
    
    this.savePreviousActivityWithActivity = function (activity) {
        this._previousActivity = activity;
    };
    
    //previous activity when exiting a synthetic activity
    this.publishPreviousActivity = function () {
        var self = this;
        if (!self.overrideActivity && self._previousActivity) {
            self.sendActivityChangeWithActivity(self._previousActivity);
        }
    };
    
    //Activity Change from pal.js
    this.publishActivityChangeWithActivity = function (activity) {
        if (!this.overrideActivity) {
            this.sendActivityChangeWithActivity(activity);
        }
    };

    //synthetic activitys
    this.publishActivityChangeWithApplicationName = function (name, identifier, url, title) {
        this.sendActivityChangeWithActivity({
            "name": (name) ? name : "", //Display Name of the App
            "identifier": (identifier) ? identifier : "", //Internal Name of the App
            "url": (url) ? url : "", //Full URL of the Website if in Browser
            "title": (title) ? title : "" //Title of the Website or Window Title of App
        });
    };

    this.sendActivityChangeWithActivity = function (activity) {
        Logger.info("PAL will update current activity to ", activity);
        if (activity.identifier != "com.dyknow.attention") {
            this.savePreviousActivityWithActivity(activity);
        }
        this.processFrame(activity);
    };

    //im gonna wait till ive got a unit test to verify this 
    //so right now lets just pretend that they all do things right and there's lik
    //no problems lololololololol
    this._sending = false;
    this.processFrame = function (activity){
        if (!activity){ throw new Error("activity must not be null");}
        if (palSession._sending){
            palSession._queue.push(activity);
            //we assume perhaps incorrectly if there is a queue
            //that there is likewise an in-flight request
        } else {
            palSession._sending = true;
            palSession.drainQueue(activity);
        }
    };

    this.drainQueue = function(activity){
        try
        {
            palSession._client.addCabraFrame(palSession.cabraId, palSession.rules.first(), null,activity)
            .then(function (data) {
                Logger.debug("Activity successfully post to the server.", activity);
                return true;
            }, 
            function (data, textStatus, errorThrown) {
                Logger.error("Activity post request failed.", errorThrown);
                return deferred.get().resolve();//return a success 
            }).then(function (){
                var nextActivity = palSession._queue.shift();
                if (nextActivity) {
                    palSession.drainQueue(nextActivity);
                } else {
                    palSession._sending = false;
                }
            });
        } catch(err)
        {
            var nextActivity = palSession._queue.shift();
            if (nextActivity) {
                palSession.drainQueue(nextActivity);
            } else {
                palSession._sending = false;
            }
            throw err;
        }
    };

    this._blockUrl = function (info){
        palSession.processFrame({
            name: ACTIVITY.NAME.BROWSER,
            identifier: ACTIVITY.IDENTIFIER.BROWSER,
            url: info.url || "", 
            title: info.title || "",
            blocked: "blocked",
            tab_id: info.tab_id
        });
    };

    this._blockApp = function (info) {
        /* DUE TO DEADLINES NEEDING MET, DO NOT SEND UP CHROME APPS 
        ** IN ORDER TO PREVENT NOISE FROM ALLOW ONLY PLANS
        ** https://dyknowcloud.atlassian.net/browse/DYK-432
        */

        // palSession.processFrame({
        //     name: info.name || "",
        //     identifier: info.identifier || "",
        //     title: info.title || "",
        //     blocked: "blocked"
        // });
    };

    this._blockCloseTab = function (info){
        palSession.processFrame({
            name: ACTIVITY.NAME.BROWSER,
            identifier: ACTIVITY.IDENTIFIER.BROWSER,
            url: info.url || "", 
            title: info.title || "",
            blocked: "close_tab",
            tab_id: info.tab_id
        });
    };
};

extend( PalCabraSession, CabraSession );

export default PalCabraSession;