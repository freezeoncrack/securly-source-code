define([
    'js/test/mocks/chrome.runtime',
    'underscore'
], function(
    runtime,
    _
) {
    if (!window.chrome.storage) {
        window.chrome.storage = {};
    }
    if (!window.chrome.storage.local) {
        window.chrome.storage.local = jasmine.createSpyObj(
            'window.chrome.storage.local',
            ['get', 'set', 'remove', 'clear']
        );

        var storage = window.chrome.storage;
        storage.local.mock = function() {
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
        };
    }

    return window.chrome.storage;
});
