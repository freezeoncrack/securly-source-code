import WindowKeepAliveManager from '/js/mjs/windowKeepAliveManager.js';
import WindowKeepAlive from '/js/mjs/windowKeepAlive.js';
import chrome from "/test/mocks/chrome.js";
import Logger from '/test/mocks/logger.js';
import _ from "/js/lib/underscore.js";

describe('WindowKeepAliveManager', function () {
    var getResolvedPromise = function (obj) {
        var promise = new Promise(function (resolve, reject) {
            if (obj !== undefined) {
                resolve(obj);
            } else {
                resolve();
            }
        });
        return promise;
    },
    getRejectedPromise = function (obj) {
        var promise = new Promise(function (resolve, reject) {
            if (obj !== undefined) {
                reject(obj);
            } else {
                reject();
            }
        });
        return promise;
    };
    
    beforeEach(function () {
        Logger.debug = $.noop;
        Logger.info = $.noop;
        Logger.warn = $.noop;
        Logger.error = $.noop;
        
        WindowKeepAliveManager.keepAlives = [];
    });
    
    it("addKeepAlive pushes keepAlive on and subscribes and opens if shouldKeepAlive is true", async function () {
        var done = false,
            wasResolved = false,
            keepAlive = new WindowKeepAlive();
        spyOn(keepAlive, 'subscribe');
        spyOn(keepAlive, 'shouldKeepAlive').and.returnValue(getResolvedPromise());
        spyOn(keepAlive, 'open').and.returnValue(getResolvedPromise());

        await WindowKeepAliveManager.addKeepAlive(keepAlive).then(function() {
            done = true;
            wasResolved = true;
        }, function () {
            done = true;
        });
        expect(keepAlive.subscribe).toHaveBeenCalled();
        expect(keepAlive.shouldKeepAlive).toHaveBeenCalled();
        expect(keepAlive.open).toHaveBeenCalled();
        expect(wasResolved).toBe(true);
        expect(WindowKeepAliveManager.keepAlives.length).toBe(1);
    });
    
    it("addKeepAlive pushes keepAlive on and subscribes and does not open if shouldKeepAlive is false", async function () {
        var done = false,
            wasResolved = false,
            keepAlive = new WindowKeepAlive();
        spyOn(keepAlive, 'subscribe');
        spyOn(keepAlive, 'shouldKeepAlive').and.returnValue(getRejectedPromise());
        spyOn(keepAlive, 'open').and.returnValue(getResolvedPromise());
                
        await WindowKeepAliveManager.addKeepAlive(keepAlive).then(function() {
            done = true;
            wasResolved = true;
        }, function () {
            done = true;
        });
        expect(keepAlive.subscribe).toHaveBeenCalled();
        expect(keepAlive.shouldKeepAlive).toHaveBeenCalled();
        expect(keepAlive.open).not.toHaveBeenCalled();
        expect(wasResolved).toBe(true);
        expect(WindowKeepAliveManager.keepAlives.length).toBe(1);
    });
    
    
    it("addKeepAlive pushes keepAlive on and subscribes rejects if open fails", async function () {
        var done = false,
            wasRejected = false,
            keepAlive = new WindowKeepAlive();
        spyOn(keepAlive, 'subscribe');
        spyOn(keepAlive, 'shouldKeepAlive').and.returnValue(getResolvedPromise());
        spyOn(keepAlive, 'open').and.returnValue(getRejectedPromise());

        await WindowKeepAliveManager.addKeepAlive(keepAlive).then(function() {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        expect(keepAlive.subscribe).toHaveBeenCalled();
        expect(keepAlive.shouldKeepAlive).toHaveBeenCalled();
        expect(keepAlive.open).toHaveBeenCalled();
        expect(wasRejected).toBe(true);
        expect(WindowKeepAliveManager.keepAlives.length).toBe(1);
    });
    
    it("removeKeepAlive is rejected if keepAlive is not found (no keepalives)", async function() {
        var done = false,
            wasRejected = false,
            keepAlive = new WindowKeepAlive();
        spyOn(keepAlive, 'unsubscribe');
        spyOn(keepAlive, 'close').and.returnValue(getResolvedPromise());
        
        await WindowKeepAliveManager.removeKeepAlive(keepAlive).then(function() {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        
        expect(keepAlive.unsubscribe).not.toHaveBeenCalled();
        expect(keepAlive.close).not.toHaveBeenCalled();
        expect(wasRejected).toBe(true);
        expect(WindowKeepAliveManager.keepAlives.length).toBe(0);
    });
    
    it("removeKeepAlive is rejected if keepAlive is not found", async function() {
        var done = false,
            wasRejected = false,
            keepAlive1 = new WindowKeepAlive(),
            keepAlive2 = new WindowKeepAlive();
        spyOn(keepAlive1, 'shouldKeepAlive').and.returnValue(getResolvedPromise());
        spyOn(keepAlive1, 'open').and.returnValue(getResolvedPromise());
        spyOn(keepAlive2, 'unsubscribe');
        spyOn(keepAlive2, 'close').and.returnValue(getResolvedPromise());

        WindowKeepAliveManager.keepAlives.push(keepAlive1);
        await WindowKeepAliveManager.removeKeepAlive(keepAlive2).then(function() {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        
        expect(keepAlive2.unsubscribe).not.toHaveBeenCalled();
        expect(keepAlive2.close).not.toHaveBeenCalled();
        expect(wasRejected).toBe(true);
        expect(WindowKeepAliveManager.keepAlives.length).toBe(1);
    });
    
    it("removeKeepAlive is resolved if keepAlive is found and resolves when close is successful ", async function() {
        var done = false,
            wasResolved = false,
            keepAlive = new WindowKeepAlive();
        spyOn(keepAlive, 'unsubscribe');
        spyOn(keepAlive, 'close').and.returnValue(getResolvedPromise());
        
        WindowKeepAliveManager.keepAlives.push(keepAlive);
        await WindowKeepAliveManager.removeKeepAlive(keepAlive).then(function() {
            done = true;
            wasResolved = true;
        }, function () {
            done = true;
        });
        
        expect(keepAlive.unsubscribe).toHaveBeenCalled();
        expect(keepAlive.close).toHaveBeenCalled();
        expect(wasResolved).toBe(true);
        expect(WindowKeepAliveManager.keepAlives.length).toBe(0);
    });
    
    it("removeKeepAlive is resolved if keepAlive is found and rejects when close is fails", async function() {
        var done = false,
            wasRejected = false,
            keepAlive = new WindowKeepAlive();
        spyOn(keepAlive, 'unsubscribe');
        spyOn(keepAlive, 'close').and.returnValue(getRejectedPromise());
        
        WindowKeepAliveManager.keepAlives.push(keepAlive);
        await WindowKeepAliveManager.removeKeepAlive(keepAlive).then(function() {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        
        expect(keepAlive.unsubscribe).toHaveBeenCalled();
        expect(keepAlive.close).toHaveBeenCalled();
        expect(wasRejected).toBe(true);
        expect(WindowKeepAliveManager.keepAlives.length).toBe(0);
    });
});
