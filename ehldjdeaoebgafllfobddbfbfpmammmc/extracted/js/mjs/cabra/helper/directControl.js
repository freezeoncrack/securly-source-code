
import Logger from "/js/mjs/logger/logger.js";
import _ from "/js/lib/underscore.js";
import browserEvents from "/js/mjs/chromeOsServices/browserEvents.js";
import safeChrome from "/js/mjs/cabra/helper/safeChromeCommand.js"


var directControl = {
    getTabs: function (){
        return new Promise(function(resolve, reject){
            //these calls will be retried not long from now
            //i wouldnt want them to pile up, so we wont use safe here
            chrome.windows.getAll({populate:true}, function(windows){
                if (chrome.runtime.lastError) {
                    Logger.error("DirectControl: Error getting windows " +  JSON.stringify(chrome.runtime.lastError));
                    reject();
                    return;
                }
                var needToReworkActiveFocused = false;
                var tabs = _.flatten(windows.map(function (w){
                    return w.tabs.map(function (tab){
                        var obj = {
                            window_id: w.id,
                            tab_id: tab.id, 
                            url: tab.url || tab.pendingUrl,
                            title: tab.title
                        };
                        if (tab.active){
                            obj.active = "active" + (w.focused? "-focused": "");
                        }
                        if (tab.audible){
                            obj.audible = "audible";
                        }
                        if (tab.active && w.focused && (
                            browserEvents.tabIsUsAndShouldBeIgnored(tab) || browserEvents.tabIsLockedMessage(tab)
                        )){
                            needToReworkActiveFocused = true;
                        }
                        return obj;
                    });
                })).filter(function (tab){
                    return !browserEvents.tabIsUsAndShouldBeIgnored(tab) && !browserEvents.tabIsLockedMessage(tab);
                });
                if (needToReworkActiveFocused && browserEvents.lastGoodWindow){
                    tabs.forEach(function (tab){
                        if (tab.active && tab.window_id === browserEvents.lastGoodWindow){
                            tab.active = "active-focused";
                        }
                    });
                }
                resolve(tabs);
            });    
        });
    },
    closeTab: function (windowId, tabId){
        return new Promise(function(resolve, reject){
            safeChrome.tabs.get(tabId, function (origTab){
                if (chrome.runtime.lastError && chrome.runtime.lastError.message && chrome.runtime.lastError.message.indexOf("No tab with id:") === 0) {
                    Logger.error("DirectControl: tab already closed " + tabId);
                    //fall through bc its closed either way
                } else if (chrome.runtime.lastError){
                    Logger.error("DirectControl: Error getting tab " + tabId +" of window "+ windowId +" " + JSON.stringify(chrome.runtime.lastError));
                    reject();
                    return;
                }
                //we send in windowid -1 when we dont know 
                //the windowid (ui will do this if we get an activity tracker activity)
                //but we have the real value to sub in right here!
                if (windowId === -1 && origTab){
                    windowId = origTab.windowId;
                }
                //now we have url and title for later
                safeChrome.tabs.remove(tabId, function () {
                    if (chrome.runtime.lastError && chrome.runtime.lastError.message && chrome.runtime.lastError.message.indexOf("No tab with id:") === 0) {
                        Logger.error("DirectControl: tab already closed " + tabId);
                        //fall through bc its closed either way
                    } else if (chrome.runtime.lastError){
                        Logger.error("DirectControl: Error removing tab " + tabId +" of window "+ windowId +" " + JSON.stringify(chrome.runtime.lastError));
                        reject();
                        return;
                    }
                    try{
                        safeChrome.windows.get(windowId, {populate:true}, function (win){
                            if ((chrome.runtime.lastError && chrome.runtime.lastError.message && 
                                chrome.runtime.lastError.message.indexOf("No window with id:") === 0) ||
                                (!chrome.runtime.lastError && win && win.tabs && !win.tabs.length) ||
                                (!chrome.runtime.lastError && !win)
                            ){
                                Logger.error("DirectControl: Window " + windowId + " closed after tab close. Looking up new active window");
                                safeChrome.windows.getAll({populate: true}, function(windows){
                                    if (chrome.runtime.lastError) {
                                        Logger.error("DirectControl: Error getting windows " +  JSON.stringify(chrome.runtime.lastError));
                                        reject();
                                        return;
                                    }
                                    if (!windows.length || windows.length === 1 && !windows[0].tabs.length){
                                        //two ways we've seen there being nothing left: no windows or a single window with no tabs (in the process of tearing down)
                                        resolve({
                                            type: "tab_close",
                                            target_windowid: windowId, 
                                            target_tabid: tabId,
                                            result_active: "unknown",
                                            target_url: origTab && origTab.url,
                                            target_title: origTab && origTab.title
                                        });
                                        return;
                                    }
                                    var windowOfNote;
                                    var focusedWindows = windows.filter(function (win){
                                        return win.focused;
                                    });
                                    var needToFocus = false;
                                    if (focusedWindows.length){
                                        windowOfNote = focusedWindows[0];
                                    } else {
                                        windowOfNote = windows[0];
                                        needToFocus = true;
                                    }
                                    var activeTab = windowOfNote.tabs.filter(function(tab){
                                        return tab.active;
                                    });
                                    if (activeTab.length) {
                                        var result = {
                                            type: "tab_close",
                                            target_windowid: windowId, 
                                            target_tabid: tabId,
                                            result_windowid: windowOfNote.id,
                                            result_tabid: activeTab[0].id,
                                            result_active: "active" + (windowOfNote.focused? "-focused": ""),
                                            target_url: origTab && origTab.url,
                                            target_title: origTab && origTab.title
                                        };
                                        if (needToFocus){
                                            //attempt to keep us out of the out of browser state
                                            safeChrome.windows.update(windowOfNote.id, {focused: true}, function (){
                                                if (chrome.runtime.lastError){
                                                    Logger.error("DirectControl: Error focusing tab " + windowOfNote.id +" " + JSON.stringify(chrome.runtime.lastError));
                                                    //hey we tried, right?
                                                } else {
                                                    //victory! 
                                                    result.result_active = "active-focused";
                                                }
                                                resolve(result);
                                            });
                                            return;
                                        }
                                        resolve(result);
                                        return;
                                    } else {
                                        Logger.error("DirectControl: No explicit errors but this window has no active tabs " + JSON.stringify(windowOfNote));
                                        reject();
                                    }
                                });
                                return;
                            } else if (chrome.runtime.lastError){
                                Logger.error("DirectControl: Error removing tab " + tabId +" of window "+ windowId +" " + JSON.stringify(chrome.runtime.lastError));
                                reject();
                                return;
                            }
                            var resultWindowsId = windowId;//TODO detect window closed case
                            var activeTab = win.tabs.filter(function (tab){
                                return tab.active;
                            });
                            if (!activeTab.length){
                                Logger.error("DirectControl: Unexpected missing activetab after removing tab " + tabId +" of window "+ windowId + " " + JSON.stringify(win));
                                reject();
                                return;
                            }                        
                            resolve({
                                type: "tab_close",
                                target_windowid: windowId, 
                                target_tabid: tabId,
                                result_windowid: resultWindowsId,
                                result_tabid: activeTab[0].id,
                                result_active: "active" + (win.focused ? "-focused" : ""),
                                target_url: origTab && origTab.url,
                                target_title: origTab && origTab.title
                            });
                        });
                    } catch(sigErr) {
                        //if its a throw like this, its sure to be signature error
                        Logger.error("DirectControl: window+get " + sigErr.toString());
                        reject();
                    }
                });
            });
        });
    }, 
    changeTab: function (windowId, tabId){
        return new Promise(function(resolve, reject){
            var callbacks = 0;
            var wasClosed = false;
            var result = {
                type: "tab_change",
                target_windowid: windowId,
                target_tabid: tabId
            };
            safeChrome.tabs.update(tabId, {active: true}, function (){
                if (chrome.runtime.lastError && chrome.runtime.lastError.message && chrome.runtime.lastError.message.indexOf("No tab with id:") === 0) {
                    Logger.error("DirectControl: tab already closed " + tabId);
                    wasClosed = true;
                } else if (chrome.runtime.lastError){
                    Logger.error("DirectControl: Error activing tab " + tabId +" of window "+ windowId +" " + JSON.stringify(chrome.runtime.lastError));
                    //TODO: detect the window closed now condition 
                    reject();
                    return;
                }
                callbacks++;
                if (callbacks === 2){
                    if (!wasClosed){
                        resolve(result);
                        return;
                    } else {
                        return directControl._getCurrentWindowForChangeTabResult(windowId, tabId, resolve, reject);
                    }
                }
            });
            var focusWindow = function (){
                safeChrome.windows.update(windowId, {focused: true}, function (){
                    if (chrome.runtime.lastError && chrome.runtime.lastError.message && chrome.runtime.lastError.message.indexOf("No window with id:") === 0) {
                        Logger.error("DirectControl: window already closed " + windowId);
                        wasClosed = true;
                    } else if (chrome.runtime.lastError){
                        Logger.error("DirectControl: Error focusing tab " + tabId +" of window "+ windowId +" " + JSON.stringify(chrome.runtime.lastError));
                        //TODO: detect the window closed now condition 
                        reject();
                        return;
                    }
                    callbacks++;
                    if (callbacks === 2){
                        if (!wasClosed){
                            resolve(result);
                            return;
                        } else {
                            return directControl._getCurrentWindowForChangeTabResult(windowId, tabId, resolve, reject);
                        }
                    }
                });
            };
            if (windowId === -1){
                safeChrome.tabs.get(tabId, function (tab){
                    if (chrome.runtime.lastError){
                        Logger.error("DirectControl: Error focusing tab " + tabId +" of window "+ windowId +" " + JSON.stringify(chrome.runtime.lastError));
                        //TODO: detect the window closed now condition 
                        reject();
                        return;
                    }
                    //set windowId back in our closure
                    windowId = tab.windowId;
                    result.target_windowid = tab.windowId;
                    focusWindow();
                });
            } else {
                focusWindow();

            }
        });
    },
    _getCurrentWindowForChangeTabResult: function (windowId, tabId, resolve, reject){
        safeChrome.windows.getAll({populate: true}, function(windows){
            if (chrome.runtime.lastError) {
                Logger.error("DirectControl: Error getting windows " +  JSON.stringify(chrome.runtime.lastError));
                reject();
                return;
            }
            if (!windows.length){
                resolve({
                    type: "tab_change",
                    target_windowid: windowId, 
                    target_tabid: tabId,
                    result_active: "unknown"
                });
                return;
            }
            var windowOfNote;
            var focusedWindows = windows.filter(function (win){
                return win.focused;
            });
            if (focusedWindows.length){
                windowOfNote = focusedWindows[0];
            } else {
                windowOfNote = windows[0];
            }
            var activeTab = windowOfNote.tabs.filter(function(tab){
                return tab.active;
            });
            if (activeTab.length) {
                resolve({
                    type: "tab_change",
                    target_windowid: windowId, 
                    target_tabid: tabId,
                    result_windowid: windowOfNote.id,
                    result_tabid: activeTab[0].id,
                    result_active: "active" + (windowOfNote.focused? "-focused": "")
                });
                return;
            } else {
                Logger.error("DirectControl: No explicit errors but this window has no active tabs " + JSON.stringify(windowOfNote));
                reject();
                return;
            }
        });            
    }
};
export default directControl;
