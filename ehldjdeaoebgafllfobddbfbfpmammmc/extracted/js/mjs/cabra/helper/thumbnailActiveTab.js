
import ThumbnailGeneral from "/js/mjs/cabra/helper/thumbnailGeneral.js"; 
import Logger from "/js/mjs/logger/logger.js"; 
import browserEvents from "/js/mjs/chromeOsServices/browserEvents.js";
import SETTINGS from "/js/mjs/settings.js";
import safeChrome from "/js/mjs/cabra/helper/safeChromeCommand.js";
import { extend } from "/js/globals.js";

var ThumbnailActiveTab = function () {

    var thumbnailActiveTab = this;
    var tryFilter = true;
    thumbnailActiveTab.init = function () {
        browserEvents.register();
    };

    thumbnailActiveTab.stop = function () {
        browserEvents.unregister();
    };

    thumbnailActiveTab._getWindow = function (callback){
        var params = {populate: true};
        try{
            chrome.windows.getLastFocused(params, callback);
        }
        catch(e){
            //filter is only for 88+
            if (e && e.message && e.message.indexOf("Unexpected property") != -1){
                tryFilter = false;
                thumbnailActiveTab._getWindow(callback);
            }
            throw e;
        }
    };

    thumbnailActiveTab._getScreenshot = function (width, height) {
        return new Promise(function (resolve, reject) {
            try {
                thumbnailActiveTab._getWindow(function(window){
                    if (chrome.runtime.lastError) {
                        // chrome.runtime.lastError should have `message`,
                        // however it is optional so the JSON serialized
                        // error is used instead.
                        Logger.error('runtime error capturing image: ' +
                            JSON.stringify(chrome.runtime.lastError));
                            thumbnailActiveTab.getImageBlob(false, width, height, resolve, reject);
                        return;
                    }
                    if (!window.focused){
                        thumbnailActiveTab.getImageBlob(false, width, height, resolve, reject);
                        return;
                    }
                    //check to see if the focused window is one of ours and fallback if so
                    var windowId = window.id;
                    if (thumbnailActiveTab.shouldIgnore(window)){
                        if (browserEvents.lastWasOutofBrowser){
                            //return out of browser
                            thumbnailActiveTab.getImageBlob(false, width, height, resolve, reject);
                            return;    
                        } else if (!browserEvents.lastGoodWindow){
                            //hmm... how should we be reacting to this? what does it mean???
                            //I guess just fall back to waht was happening before
                        } else{
                            windowId = browserEvents.lastGoodWindow;
                        }
                    }
                    safeChrome.tabs.captureVisibleTab( windowId, {}, function (dataUrl) {
                        if (chrome.runtime.lastError) {
                            // chrome.runtime.lastError should have `message`,
                            // however it is optional so the JSON serialized
                            // error is used instead.
                            if (chrome.runtime.lastError.message === "The 'activeTab' permission is not in effect because this extension has not been in invoked."){
                                Logger.error("runtime error capturing image: chromeprotected");
                                thumbnailActiveTab.getImageBlob(SETTINGS.THUMBNAIL.SOURCE.CHROMEPROTECTED, width, height, resolve, reject);    
                                return;
                            } else if (chrome.runtime.lastError.message === "Taking screenshots has been disabled"){
                                Logger.error("runtime error capturing image: chromeblocked");
                                thumbnailActiveTab.getImageBlob(SETTINGS.THUMBNAIL.SOURCE.CHROMEBLOCKED, width, height, resolve, reject);
                                return;
                            }
    
                            Logger.error('runtime error capturing image: ' +
                                JSON.stringify(chrome.runtime.lastError));
                        }
                        if (dataUrl) {
                            thumbnailActiveTab.getImageBlob(dataUrl, width, height, resolve, reject);
                        } else {
                            thumbnailActiveTab.getImageBlob(false, width, height, resolve, reject);
                        }
                    });
                });
            } catch (e) {
                thumbnailActiveTab.getImageBlob(false, width, height, resolve, reject);
                Logger.error(e.message, e.stack);
            }
        });
    };

    thumbnailActiveTab.shouldIgnore = function (window){
        if (window && window.tabs && window.tabs.length === 1 && 
            browserEvents.tabIsUsAndShouldBeIgnored(window.tabs[0])
        ){
            return true;
        } else {
            return false;
        }
    };
};

extend(ThumbnailActiveTab, ThumbnailGeneral);

export default ThumbnailActiveTab;

