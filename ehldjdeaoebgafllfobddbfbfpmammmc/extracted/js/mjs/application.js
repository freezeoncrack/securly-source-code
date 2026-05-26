import Logger from "/js/mjs/logger/logger.js";
import SETTINGS from "/js/mjs/settings.js";
import Sandbox from "/js/mjs/sandbox.js";
import IDN from "/js/mjs/utils/idn.js";
import { detectOS  } from "/js/globals.js";
import restarter from "/js/mjs/utils/extensionRestarter.js";
import isDebug from "/js/isDebug.js";
import LogWatcher from "/js/mjs/utils/logWatcher.js";
import HealthCheckResponder from "/js/mjs/utils/healthCheckResponder.js";
import activityCollector from "/js/mjs/utils/activityCollector.js";
import alwaysBlock from "/js/mjs/cabra/helper/alwaysBlock.js";
import QSR from "/js/mjs/qsr/qsr.js";


function App(){
    globalThis.addEventListener("unhandledrejection", function (event){
        Logger.warn("Unhandled promise", `${event && event.reason} : ${ event && event.reason && event.reason.stack}`);
    });
    
    var _this = this;
    var sandbox = new Sandbox().init();
    var idn = new IDN();
    var qsr = new QSR(idn);
    var logWatcher = new LogWatcher();
    this.start = function () {
        var os = detectOS();
        Logger.debug("OS - " + os);
        //TODO: do we need to verify this?
        chrome.runtime.onRestartRequired.addListener(function (reason) {
            Logger.warn("Chrome Runtime wants a restart", reason);
        });

        chrome.runtime.onSuspend.addListener(function () {
            Logger.warn("Chrome Runtime is suspended");
        });

        chrome.runtime.onSuspendCanceled.addListener(function () {
            Logger.warn("Chrome Runtime has canceled suspend");
        });

        chrome.runtime.onUpdateAvailable.addListener(function (details) {
            Logger.info("Chrome Runtime Update is available", details);
            Logger.info("Will Restart Chrome Extension");
            restarter.restart();
        });


        if (os === "Chrome OS" || isDebug.debug) {
            logWatcher.start();
            idn.start();
            HealthCheckResponder.init();
            qsr.start();
            Logger.info("activitycollector starting");
            activityCollector.start(); 
            alwaysBlock.start();
            
        } else {
            Logger.error("Dyknow is not supported on this os");
            chrome.action.setIcon({
                path: {
                    "19": "images/disabled_icon19.png",
                    "38": "images/disabled_icon38.png"
                }
            });
            chrome.action.disable();
        }
    };
}

export default App;