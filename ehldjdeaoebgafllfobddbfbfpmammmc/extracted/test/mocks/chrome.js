import _ from "/js/lib/underscore.js";
import deferred from "/js/mjs/utils/deferred.js";

var chrome = {    
    runtime: {
        id: "thisistheidfortheextension",
        onMessage: {
            addListener: function () {},
            removeListener: function () {},
        },
        onRestartRequired: {
            addListener: function () {},
            removeListener: function () {},
        },
        onSuspend: {
            addListener: function () {},
            removeListener: function () {},
        },
        onSuspendCanceled: {
            addListener: function () {},
            removeListener: function () {},
        },
        onUpdateAvailable: {
            addListener: function () {},
            removeListener: function () {},
        },
        getPlatformInfo : function (){},
        sendMessage: function () { return Promise.resolve();},
        getManifest: function (){},
        reload: function (){},
    },
    action:{
        disable: function () {},
        setIcon: function () {}
    },
    management: {
        getAll: function () {},
        setEnabled: function (){},
        onInstalled: {
            addListener: function () {},
            removeListener: function () {},
        },
        onUninstalled: {
            addListener: function () {},
            removeListener: function () {},
        },
        onEnabled: {
            addListener: function () {},
            removeListener: function () {},
        },
        onDisabled: {
            addListener: function () {},
            removeListener: function () {},
        }
    },
    webNavigation: {
        onCommitted: {
            addListener: function () {},
            removeListener: function () {},
        },
        onCompleted: {
            addListener: function () {},
            removeListener: function () {},
        }
    },
    tabs:{
        query: function (){},
        remove: function (){},
        captureVisibleTab: function (){},
        update: function (){},
        get: function (){},
        discard: function (){},
        onCreated: {
            addListener: function () {},
            removeListener: function () {},
        },
        onRemoved: {
            addListener: function () {},
            removeListener: function () {},
        },
        onHighlighted: {
            addListener: function () {},
            removeListener: function () {},
        },
        onActivated: {
            addListener: function () {},
            removeListener: function () {},
        }
    },
    windows: {
        create: function (){},
        remove: function (){},
        get: function (){},
        getCurrent: function (){},
        getLastFocused: function (){},
        getAll: function (){},
        update: function (){},
        onFocusChanged: {
            addListener: function () {},
            removeListener: function () {},
        },
        onRemoved: {
            addListener: function () {},
            removeListener: function () {},
        }
    },
    alarms:{
        create: function (){},
        onAlarm: {
            addListener: function () {},
            removeListener: function () {},
        },
    },
    storage: {
        session: {
            get: function(){},
            set: function(){},
            remove: function(){},
            clear: function(){}
        },
        local: {
            get: function(){},
            set: function(){},
            remove: function(){},
            clear: function(){},
            mock: function() {
                var storage = chrome.storage;
                var runtime = chrome.runtime;
                spyOn(storage.local, "get");
                spyOn(storage.local, "set");
                spyOn(storage.local, "remove");
                spyOn(storage.local, "clear");
                storage.local._store = {};
                storage.local.failGet = false;
                storage.local.failSet = false;
    
                storage.local.get.and.callFake(function(key, callback) {
                    if (storage.local.failGet === true) {
                        runtime.lastError = {
                            message: 'Unable to get storage.'
                        };
                        callback({});
                        delete runtime.lastError;
                        return;
                    }
                    if(key === null) {
                        callback(storage.local._store);
                    }
                    else if(storage.local._store[key]) {
                        var ret = {};
                        ret[key] = storage.local._store[key];
                        callback(ret);
                    }
                    else {
                        callback({});
                    }
                });
    
                storage.local.set.and.callFake(function(obj, callback) {
                    if (storage.local.failSet === true) {
                        runtime.lastError = {
                            message: 'Unable to set storage.'
                        };
                        callback();
                        delete runtime.lastError;
                        return;
                    }
                    _.extend(storage.local._store, obj);
                    if(callback) {
                        callback();
                    }
                });
    
                storage.local.clear.and.callFake(function() {
                  storage.local._store = {};
                });
    
                storage.local.remove.and.callFake(function(key, callback) {
                    if(_.isArray(key)){
                        _.each(key,function(item, key2, list){
                           delete storage.local._store[item];
                        });
                        if(callback) {
                            callback();
                        }
                    } else {
                        delete storage.local._store[key];
                        if(callback) {
                            callback();
                        }
                    }
                });
            }
        }
    },
    system: {
        memory: {
            getInfo: function () {} 
        },
        display: {
            getInfo: function () {} 
        },
    },
    useMock: function () {
        //management, runtime, tabs, webNavigation, windows
        Object.keys(chrome.management).forEach(function (key){
            if (chrome.management[key].addListener){
                spyOn(chrome.management[key],"addListener");
                spyOn(chrome.management[key],"removeListener");
            } else if(chrome.management[key].call) {
                spyOn(chrome.management, key);
            }
        });
        Object.keys(chrome.runtime).forEach(function (key){
            if (key === "lastError"){ return;}
            if (chrome.runtime[key].addListener){
                spyOn(chrome.runtime[key],"addListener");
                spyOn(chrome.runtime[key],"removeListener");
            } else if(chrome.runtime[key].call) {
                spyOn(chrome.runtime, key);
            }
        });
        chrome.runtime.sendMessage.and.callFake(function () {
            return deferred.get();
        })
        Object.keys(chrome.tabs).forEach(function (key){
            if (chrome.tabs[key].addListener){
                spyOn(chrome.tabs[key],"addListener");
                spyOn(chrome.tabs[key],"removeListener");
            } else if(chrome.tabs[key].call) {
                spyOn(chrome.tabs, key);
            }
        });
        Object.keys(chrome.webNavigation).forEach(function (key){
            if (chrome.webNavigation[key].addListener){
                spyOn(chrome.webNavigation[key],"addListener");
                spyOn(chrome.webNavigation[key],"removeListener");
            } else if(chrome.webNavigation[key].call) {
                spyOn(chrome.webNavigation, key);
            }
        });
        Object.keys(chrome.windows).forEach(function (key){
            if (chrome.windows[key].addListener){
                spyOn(chrome.windows[key],"addListener");
                spyOn(chrome.windows[key],"removeListener");
            } else if(chrome.windows[key].call) {
                spyOn(chrome.windows, key);
            }
        });

        spyOn(chrome.system.display, "getInfo");
        spyOn(chrome.system.memory, "getInfo");
        globalThis.chrome = chrome;
    },
    resetMock: function () {},//dont need to do anything special
    mockLocalStorage : function () {//convenience method to for storage-heavy flows
        storage.local._store = {};
        storage.local.failGet = false;
        storage.local.failSet = false;

        storage.local.get.andCallFake(function(key, callback) {
            if (storage.local.failGet === true) {
                runtime.lastError = {
                    message: 'Unable to get storage.'
                };
                callback({});
                delete runtime.lastError;
                return;
            }
            if(key === null) {
                callback(storage.local._store);
            }
            else if(storage.local._store[key]) {
                var ret = {};
                ret[key] = storage.local._store[key];
                callback(ret);
            }
            else {
                callback({});
            }
        });

        storage.local.set.andCallFake(function(obj, callback) {
            if (storage.local.failSet === true) {
                runtime.lastError = {
                    message: 'Unable to set storage.'
                };
                callback();
                delete runtime.lastError;
                return;
            }
            _.extend(storage.local._store, obj);
            if(callback) {
                callback();
            }
        });

        storage.local.clear.andCallFake(function() {
            storage.local._store = {};
        });

        storage.local.remove.andCallFake(function(key, callback) {
            if(_.isArray(key)){
                _.each(key,function(item, key2, list){
                    delete storage.local._store[item];
                });
                if(callback) {
                    callback();
                }
            } else {
                delete storage.local._store[key];
                if(callback) {
                    callback();
                }
            }
        });
    }
};

globalThis.chrome = chrome;

export default chrome;