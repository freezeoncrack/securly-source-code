import WindowHelper from '/js/mjs/windowHelper.js';
import Sandbox from "/js/mjs/sandbox.js";
import WindowKeepAlive from '/js/mjs/windowKeepAlive.js';
import chrome from "/test/mocks/chrome.js";
import logger from '/test/mocks/logger.js';
import _ from "/js/lib/underscore.js";

describe('WindowKeepAlive', function () {
    var getResolvedPromise = function (obj) {
        var promise = new Promise(function (resolve, reject) {
            if (obj !== undefined) {
                resolve(obj);
            } else {
                resolve();
            }
        });
        return promise;
    };
    var getRejectedPromise = function (obj) {
        var promise = new Promise(function (resolve, reject) {
            if (obj !== undefined) {
                reject(obj);
            } else {
                reject();
            }
        });
        return promise;
    };
    var vm = {
        open: function () {},
        keepOpen: function () {}
    };

    beforeEach(function() {
        chrome.useMock();
        logger.useMock();
    });

    afterEach(function() {
        chrome.resetMock();
    });

    it("open rejects if windowId already exists", async function () {
        spyOn(vm, 'open').and.returnValue(getResolvedPromise());

        var done = false,
            wasRejected = false,
            keepAlive = new WindowKeepAlive(vm.open);

        keepAlive.windowId = 123;
        await keepAlive.open().then(function (windowId) {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        expect(vm.open).not.toHaveBeenCalled();
        expect(wasRejected).toBe(true);
    });

    it("open calls provided open promise if window id is undefined", async function () {
        spyOn(vm, 'open').and.returnValue(getResolvedPromise({ id: 123 }));

        var done = false,
            resolvedWindow = false,
            keepAlive = new WindowKeepAlive(vm.open);


        var resolvedWindow = await keepAlive.open();

        expect(vm.open).toHaveBeenCalled();
        expect(resolvedWindow).toEqual({ id: 123 });
    });

    it("open calls provided open promise if window id is undefined, fails to open", async function () {
        spyOn(vm, 'open').and.returnValue(getRejectedPromise());

        var done = false,
            wasRejected = false,
            keepAlive = new WindowKeepAlive(vm.open);

        try{
            await keepAlive.open();
        }catch{
            wasRejected = true;
        }   
        expect(vm.open).toHaveBeenCalled();
        expect(wasRejected).toEqual(true);
    });

    it("close resolves if window is undefined", async function () {
        var done = false,
            resolvedWindowId = false,
            keepAlive = new WindowKeepAlive();
        keepAlive.windowId = false;
        spyOn(keepAlive.windowHelper, 'closeWindow').and.returnValue(getResolvedPromise());
        spyOn(keepAlive, 'isOpened').and.returnValue(getRejectedPromise());

        var resolvedWindowId = await keepAlive.close();

        expect(keepAlive.isOpened).not.toHaveBeenCalled();
        expect(keepAlive.windowHelper.closeWindow).not.toHaveBeenCalled();
        expect(resolvedWindowId).toEqual(false);
        expect(keepAlive.windowId).toBe(false);
    });

    it("close resolves if window was open and close succeeds", async function () {
        var done = false,
            resolvedWindowId = false,
            keepAlive = new WindowKeepAlive();
        keepAlive.windowId = 123;
        spyOn(keepAlive.windowHelper, 'closeWindow').and.returnValue(getResolvedPromise());
        spyOn(keepAlive, 'isOpened').and.returnValue(getResolvedPromise());


        var resolvedWindowId = await keepAlive.close();

        expect(keepAlive.isOpened).toHaveBeenCalled();
        expect(keepAlive.windowHelper.closeWindow).toHaveBeenCalledWith(123);
        expect(resolvedWindowId).toEqual(123);
        expect(keepAlive.windowId).toBe(false);
    });

    it("close rejects if window was open and close failed", async function () {
        var done = false,
            resolvedWindowId = false,
            keepAlive = new WindowKeepAlive();
        keepAlive.windowId = 123;
        spyOn(keepAlive.windowHelper, 'closeWindow').and.returnValue(getRejectedPromise());
        spyOn(keepAlive, 'isOpened').and.returnValue(getResolvedPromise());

        await keepAlive.close().then(function (windowId) {
            resolvedWindowId = windowId;
            done = true;
        }, function () {
            done = true;
        });
        expect(keepAlive.isOpened).toHaveBeenCalled();
        expect(keepAlive.windowHelper.closeWindow).toHaveBeenCalledWith(123);
        expect(keepAlive.windowId).toBe(123);
    });

    it("close resolves if window was closed", async function () {
        var done = false,
            resolvedWindowId = false,
            keepAlive = new WindowKeepAlive();
        keepAlive.windowId = 123;
        spyOn(keepAlive.windowHelper, 'closeWindow').and.returnValue(getResolvedPromise());
        spyOn(keepAlive, 'isOpened').and.returnValue(getRejectedPromise());
        await keepAlive.close().then(function (windowId) {
            resolvedWindowId = windowId;
            done = true;
        }, function () {
            done = true;
        });

        expect(keepAlive.isOpened).toHaveBeenCalled();
        expect(keepAlive.windowHelper.closeWindow).not.toHaveBeenCalled();
        expect(resolvedWindowId).toEqual(123);
        expect(keepAlive.windowId).toBe(false);
    
    });

    it("isOpened rejects if windowId is undefined", async function () {
            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive();
        spyOn(keepAlive.windowHelper, 'isWindowOpen').and.returnValue(getResolvedPromise());

        await keepAlive.isOpened().then(function () {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        expect(keepAlive.windowHelper.isWindowOpen).not.toHaveBeenCalled();
        expect(wasRejected).toBe(true);
    });

    it("isOpened resolves if windowHelper determines window is open", async function () {
            var done = false,
                wasResolved = false,
                keepAlive = new WindowKeepAlive();
        spyOn(keepAlive.windowHelper, 'isWindowOpen').and.returnValue(getResolvedPromise());

        keepAlive.windowId = 123;
        await keepAlive.isOpened().then(function () {
            done = true;
            wasResolved = true;
        }, function () {
            done = true;
        });
        expect(keepAlive.windowHelper.isWindowOpen).toHaveBeenCalled();
        expect(wasResolved).toBe(true);
    });

    it("isOpened rejects if windowHelper determines window is closed", async function () {
            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive();
        spyOn(keepAlive.windowHelper, 'isWindowOpen').and.returnValue(getRejectedPromise());

        keepAlive.windowId = 123;
        await keepAlive.isOpened().then(function () {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        expect(keepAlive.windowHelper.isWindowOpen).toHaveBeenCalled();
        expect(wasRejected).toBe(true);
    });

    it("isFocused  rejects if windowId is undefined", async function () {
            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive();

        await keepAlive.isFocused ().then(function () {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        expect(wasRejected).toBe(true);
    });

    it("isFocused resolves if windowHelper fails to get a window", async function () {
            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive();
        spyOn(keepAlive.windowHelper, 'getWindow').and.returnValue(getRejectedPromise());

        keepAlive.windowId = 123;
        await keepAlive.isFocused().then(function () {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        expect(keepAlive.windowHelper.getWindow).toHaveBeenCalled();
        expect(wasRejected).toBe(true);
    });

    it("isFocused resolves if windowHelper returns window that is focused", async function () {
            var done = false,
                wasResolved = false,
                keepAlive = new WindowKeepAlive();
        spyOn(keepAlive.windowHelper, 'getWindow').and.returnValue(getResolvedPromise({ focused: true }));

        keepAlive.windowId = 123;
        await keepAlive.isFocused().then(function () {
            done = true;
            wasResolved = true;
        }, function () {
            done = true;
        });
        expect(keepAlive.windowHelper.getWindow).toHaveBeenCalled();
        expect(wasResolved).toBe(true);
    });

    it("isFocused reject if windowHelper returns window that is not focused", async function () {
            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive();
        spyOn(keepAlive.windowHelper, 'getWindow').and.returnValue(getResolvedPromise({ focused: false }));

        keepAlive.windowId = 123;
        await keepAlive.isFocused().then(function () {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        expect(keepAlive.windowHelper.getWindow).toHaveBeenCalled();
        expect(wasRejected).toBe(true);
    });

    it("processWindowRemovedEvent resets windowId if removed window is the watched window", function () {
        var keepAlive = new WindowKeepAlive();
        keepAlive.windowId = 123;
        keepAlive._processWindowRemovedEvent(123);

        expect(keepAlive.windowId).toEqual(false);
    });

    it("processWindowRemovedEvent does nothing if removed window is not the watched window", function () {
        var keepAlive = new WindowKeepAlive();
        keepAlive.windowId = 123;
        keepAlive._processWindowRemovedEvent(456);

        expect(keepAlive.windowId).toEqual(123);
    });

    it("processWindowRemovedEvent does nothing if removed window is not the watched window", function () {
        var keepAlive = new WindowKeepAlive();
        keepAlive.windowId = 123;
        keepAlive._processWindowRemovedEvent(-1);

        expect(keepAlive.windowId).toEqual(123);
    });

    it("shouldKeepAlive calls provided shouldBeOpen promise and resolves", async function () {
        spyOn(vm, 'keepOpen').and.returnValue(getResolvedPromise());

        var done = false,
            wasResolved = false,
            keepAlive = new WindowKeepAlive(false, vm.keepOpen);

        await keepAlive.shouldKeepAlive().then(function () {
            done = true;
            wasResolved = true;
        }, function () {
            done = true;
        });
        expect(vm.keepOpen).toHaveBeenCalled();
        expect(wasResolved).toEqual(true);
    });

    it("shouldKeepAlive calls provided shouldBeOpen promise and is rejected", async function () {
        spyOn(vm, 'keepOpen').and.returnValue(getRejectedPromise());

        var done = false,
            wasRejected = false,
            keepAlive = new WindowKeepAlive(false, vm.keepOpen);

        await keepAlive.shouldKeepAlive().then(function () {
            done = true;
        }, function () {
            done = true;
            wasRejected = true;
        });
        expect(vm.keepOpen).toHaveBeenCalled();
        expect(wasRejected).toEqual(true);
    });
});

describe('subscriptions', function() {
    var keepAlive;
    beforeEach(function() {
        chrome.useMock();
        logger.useMock();
        keepAlive = new WindowKeepAlive();
    });

    afterEach(function() {
        chrome.resetMock();
    });

    it('can subscribe to chrome events', function() {
        keepAlive.subscribe();
        expect(chrome.windows.onRemoved.addListener).toHaveBeenCalled();
        expect(chrome.windows.onRemoved.addListener.calls.all().length).toEqual(1);
    });

    it('will not subscribe if already subscribed', function() {
        keepAlive._subscribed = true;
        keepAlive.subscribe();
        expect(chrome.windows.onRemoved.addListener).not.toHaveBeenCalled();
    });

    it('will not re-subscribe to chrome events', function() {
        keepAlive.subscribe();
        keepAlive.subscribe();
        expect(chrome.windows.onRemoved.addListener).toHaveBeenCalled();
        expect(chrome.windows.onRemoved.addListener.calls.all().length).toEqual(1);
    });

    it('can unsubscribe to chrome events', function() {
        keepAlive.subscribe();
        keepAlive.unsubscribe();
        expect(chrome.windows.onRemoved.removeListener).toHaveBeenCalled();
        expect(chrome.windows.onRemoved.removeListener.calls.all().length).toEqual(1);
    });

    it('will not unsubscribe if not subscribed', function() {
        keepAlive._subscribed = false;
        keepAlive.unsubscribe();
        expect(chrome.windows.onRemoved.removeListener).not.toHaveBeenCalled();
    });

    it('will only unsubscribe once', function() {
        keepAlive.subscribe();
        keepAlive.unsubscribe();
        keepAlive.unsubscribe();
        expect(chrome.windows.onRemoved.removeListener).toHaveBeenCalled();
        expect(chrome.windows.onRemoved.removeListener.calls.all().length).toEqual(1);
    });
});

describe('WindowKeepAlive helpers', function() {
    var request, sandbox, windowHelper;
    var lastWindow = null, windowId = 0;

    // Helper used to mock opening a window.
    var opener = function(failOpen, callback) {
        windowId = windowId + 1;
        this.opened = null;
        var mockWindow = failOpen ? undefined : {
            id: windowId
        };
        lastWindow = mockWindow;
        if (failOpen) {
            chrome.runtime.lastError = {error: 'fail'};
        }
        callback(mockWindow);
        this.opened = !failOpen;
        delete chrome.runtime.lastError;
    };

    // Helper to fire window ready.
    var windowReady = function() {
        sandbox._processEvents({dyknowWindowReady: windowId});
    };

    // Convenience function to return a closure that returns a value.
    var identity = function(value) {
        return function() { return value; };
    };

    beforeEach(function() {
        chrome.useMock();
        logger.useMock();
        request = {hello: 'world'};
        sandbox = new Sandbox().init();
        windowHelper = WindowKeepAlive.windowHelper;
        spyOn(sandbox, 'subscribe').and.callThrough();
        spyOn(sandbox, 'unsubscribe').and.callThrough();
        spyOn(sandbox, 'publish');
        spyOn(_, 'delay');
    });

    afterEach(function() {
        chrome.resetMock();
        lastWindow = null;
        sandbox._reset();
    });

    it('can pass open promise', async function() {
        var args = [false];
        var context = {};
        var success = null;
        var response = null;
        var onOpen = WindowKeepAlive.openPromise('test', request, opener, context, args)
        .then(
            function(resolved) { response = resolved; success = true; },
            function(rejected) { response = rejected; success = false; }
        );
        windowReady();
        await onOpen;
        expect(context.opened).toBe(true);
        expect(response).toBe(lastWindow);
        expect(_.delay).toHaveBeenCalled();
        expect(sandbox.publish).toHaveBeenCalledWith(
            'testRequest', request);
        expect(sandbox.subscribe).toHaveBeenCalledWith(
            'dyknowWindowReady', jasmine.any(Function));
        expect(sandbox.unsubscribe).toHaveBeenCalledWith(
            'dyknowWindowReady', jasmine.any(Function));
    });

    it('can fail open promise', async function() {
        var args = [true];
        var context = {};
        var success = null;
        var openProm = WindowKeepAlive.openPromise('test', request, opener, context, args)
        .then(
            function() { success = true; },
            function() { success = false; }
        );
        await openProm;
        expect(success).toBe(false);
        expect(context.opened).toBe(false);
        expect(_.delay).not.toHaveBeenCalled();
        expect(sandbox.publish).not.toHaveBeenCalled();
        expect(sandbox.subscribe).not.toHaveBeenCalled();
    });

    it('can catch open error', async function() {
        var throwError = jasmine.createSpy().and.callFake(function() {
            throw 'whoops';
        });
        var success = null;
        await WindowKeepAlive.openPromise('test', request, throwError)
        .then(
            function() { success = true; },
            function() { success = false; }
        );
        expect(success).toBe(false);
        expect(_.delay).not.toHaveBeenCalled();
        expect(sandbox.publish).not.toHaveBeenCalled();
        expect(sandbox.subscribe).not.toHaveBeenCalled();
    });

    it('can timeout open', async function() {
        _.delay.and.callFake(function(callback, delay) {
            setTimeout(function() { callback(); }, 1);
        });
        var args = [false];
        var context = {};
        var success = null;
        var response = null;
        await WindowKeepAlive.openPromise('test', request, opener, context, args)
        .then(
            function(resolved) { response = resolved; success = true; },
            function(rejected) { response = rejected; success = false; }
        );
        expect(success).toBe(false);
        expect(context.opened).toBe(true);
        expect(response).toBe('test window was not ready fast enough');
        expect(_.delay).toHaveBeenCalled();
        expect(sandbox.publish).not.toHaveBeenCalled();
        expect(sandbox.subscribe).toHaveBeenCalledWith(
            'dyknowWindowReady', jasmine.any(Function));
        expect(sandbox.unsubscribe).toHaveBeenCalledWith(
            'dyknowWindowReady', jasmine.any(Function));
    });

    it('uses open promise for open popup', async function() {
        spyOn(WindowKeepAlive, 'openPromise').and.returnValue('done');
        chrome.windows.getAll.and.returnValue(Promise.resolve([]));
        chrome.system.display.getInfo.and.returnValue(Promise.resolve([{
            workArea: {
                width: 1024,
                height: 768
            }
        }]));
        expect(await WindowKeepAlive.openPopupPromise(
            'test', request, 'foo/bar', 320, 240)).toBe('done');
        expect(WindowKeepAlive.openPromise).toHaveBeenCalledWith(
            'test', request, windowHelper.openWindow, windowHelper,
            jasmine.any(Array));
        expect(WindowKeepAlive.openPromise.calls.all()[0].args[4])
            .toEqual(['foo/bar', 'popup', 240, 320, 0,
            jasmine.any(Number), true]);
    });

    it('should be open should resolve promise', async function() {
        var success = null;
        await WindowKeepAlive.shouldBeOpenPromise(identity(true)).then(
            function() { success = true; },
            function() { success = false; }
        );
        expect(success).toBe(true);
    });

    it('should be open should reject promise', async function() {
        var success = null;
        await WindowKeepAlive.shouldBeOpenPromise(identity(false)).then(
            function() { success = true; },
            function() { success = false; }
        );
        expect(success).toBe(false);
    });
});
