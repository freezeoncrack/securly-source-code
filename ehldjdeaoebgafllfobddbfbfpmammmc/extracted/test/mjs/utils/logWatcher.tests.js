import lifecycleEventHandler from "/js/mjs/chromeOsServices/lifecycleEventHandler.js";
import MyInfo from "/js/mjs/utils/MyInfo.js";
import _ from "/js/lib/underscore.js";
import uuid from "/js/mjs/lib/uuid.js";
import chrome from "/test/mocks/chrome.js"
import Logger from "/js/mjs/logger/logger.js";
import LogWatcher from "/js/mjs/utils/logWatcher.js";
import deferred from "/js/mjs/utils/deferred.js";


function nextTick() {
    return Promise.resolve();
}

describe("logWatcher", function (){
    var now;
    var logWatcher;
    var dfds;
    var instance;
    beforeEach(function() {
        instance = null;
        dfds = [];
        now = 1658413199229;
        logWatcher = new LogWatcher();
        spyOn(logWatcher.apiClient, "get").and.callFake(function () { var dfd = deferred.get(); dfds.push(dfd); return dfd;});
        Logger.debug = $.noop;
        Logger.info = $.noop;
        Logger.warn = $.noop;
        Logger.error = $.noop;

        spyOn(_, "delay");
        spyOn(_, "now").and.callFake(function() { return now;});
        spyOn(lifecycleEventHandler, "getActivationState");
        spyOn(lifecycleEventHandler, "setActivationState");
        spyOn(MyInfo, "getInstance").and.callFake(function () {
            return instance;
        })
    });
    it("starts from default", function(){
        logWatcher.start();
        var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
        getActivationStateCallback(null);//default returns an empty object
        expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 1800000);
        expect(lifecycleEventHandler.setActivationState).toHaveBeenCalledWith("logWatcher", {
            state: "retry",
            time: now + 1800000
        });
    });

    it ("restores from recovery not yet achieved", function (){
        logWatcher.start();
        var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
        getActivationStateCallback({
            state: "retry",
            time: now + 1000//should come back in 1 second
        });//default returns an empty object
        expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 1000);

    });

    it ("restores from the ghost of recovery past", function (){
        instance = {
            info: {
                me: { account_id: 24601},
                token: "flaksdjfdlsjflsd"
            }
        };
        logWatcher.start();
        var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
        getActivationStateCallback({
            state: "retry",
            time: now - 1000 //should come back 1 second ago!
        });//default returns an empty object
        expect(_.delay).not.toHaveBeenCalled();
        expect(logWatcher.apiClient.get).toHaveBeenCalled();
    })
});