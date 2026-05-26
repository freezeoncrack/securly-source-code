import browserEvents from "/js/mjs/chromeOsServices/browserEvents.js";
import Sandbox from "/js/mjs/sandbox.js";
import _ from  "/js/lib/underscore.js";
import safeChrome from "/js/mjs/cabra/helper/safeChromeCommand.js";
import Logger from "/js/mjs/logger/logger.js";
//Dyknow classroom specific pieces (tightly coupling this)
import attentionEvents from "/js/mjs/cabra/attentionSession.events.js";
//END Dyknow classroom specific pieces (tightly coupling this)
var lifecycleEventHandler = {
    _oldEmit: null,
    sandbox: null,
    //Dyknow classroom specific pieces (tightly coupling this)
    messageInteractions: [],
    questionsInteractions: [],//todo
    statusInteractions: [],//todo
    //END Dyknow classroom specific pieces (tightly coupling this)

    stopEventsAndQueue: function () {
        if (this._oldEmit){ 
            throw new Error("unexpected reentrancy");
        }
        this._oldEmit = browserEvents.emitEvent;
        browserEvents.emitEvent = function (name, argsArray){
            var now = _.now();
            lifecycleEventHandler.queue.push({
                name: name, 
                time: now, 
                argsArray: argsArray
            });
            //im ambivalent about this. I THINK we should be stopping this 
            //until it's known
            //oldEmit.call(browserEvents, [name, argsArray]);
        };
    },
    unstopEvents: function () {
        if (this._oldEmit){
            browserEvents.emitEvent = this._oldEmit;
            this._oldEmit = null;
            this.queue = [];//clear the queue, we've handled everything we need
        }
        //the else might be a programming error, so it might make sense
        //to error here
    },
    isStopped: function () {
        return Boolean(this._oldEmit);//we store this when we're stopped
    },
    init: function () {
        //required that we call into this on first tick or else we have no guarantee that we will 
        chrome.alarms.create("chromeos-checkin", {
            when: Date.now() + 60000,
            periodInMinutes: 1
        });
        chrome.alarms.onAlarm.addListener(function (alarm){
            //fine speech... now what?
        });
        chrome.runtime.onMessage.addListener( (request, sender, sendResponse)=> {
            Object.keys(request).forEach((topic) =>{
                switch (topic) {
                    case attentionEvents.AttentionSessionAcknowledgeMessageEvent:
                    //and these from understanding/healthCheck are not refactored constants
                    case "codeNotify":
                    case "sendLogsAndRestart":
                    case "codeEntered":
                    case "statusUpdated":
    
                        if (this.isStopped()){
                            this.messageInteractions.push(request);//we're relying a bit
                        }
                    break;
                }
            });
        });
        
        browserEvents.register();
        this.sandbox = new Sandbox().init();//ensure sandbox-dependenies wake us up
       this.stopEventsAndQueue();
       //this.closeOrphanWindows();
    },
    closeOrphanWindows: function () {
        safeChrome.windows.getAll({
            populate: true,
            windowTypes:["popup"]
        }, function(windows){
            //close any tabs that are our extension windows
            for(var win of windows){
                if (win.tabs.length === 1 && win.tabs[0].url.startsWith("chrome-extension://" +chrome.runtime.id + "/ui/")){
                    chrome.windows.remove(win.id, function () {
                        //hooray
                    });
                }
            }
        });
    },
    queue: [],
    setActivationState: function (area, data, callback){
        var saveData = {};
        saveData[area] = data;
        chrome.storage.session.set(saveData, callback);
    },
    getActivationState: function (area, callback){
        var queuedEvents = lifecycleEventHandler.queue;//save this off in case we unstop before nexttick
        chrome.storage.session.get(area, function (obj){
            if (obj && obj[area]){
                var retObj = obj[area];
                if (retObj && queuedEvents && queuedEvents.length){
                    retObj.queuedEvents = queuedEvents;
                }
                callback(obj[area]);
            } else {
                callback(null);
            }
        });
    },
    _classroomState: {},
    setClassroomState: function (area, data, callback){
        lifecycleEventHandler._classroomState[area] = data;
        //🎵 at some point we'll have to go through local storage instaeeeeeeeeead
        chrome.storage.local.set({
            classroom_state: lifecycleEventHandler._classroomState
        }, callback);        
        //hmm this still needs to be fixed up here
        //lifecycleEventHandler.setActivationState("classroom_state", true, callback);
    },
    getClassroomState: function (callback){
        chrome.storage.local.get("classroom_state", callback);
    },
    replayQueuedMessageInteractions: function () {
        //note this can be called multiple times, so we cant really know when to clean this up
        //so it goes
        if(this.messageInteractions && this.messageInteractions.length){
            Logger.info(`messageInteractions queued at start ${this.messageInteractions.length}`);
            this.sandbox.replayEvents(this.messageInteractions);
        }
    }

};

export default lifecycleEventHandler;