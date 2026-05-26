
import ThumbnailActiveTab from "/js/mjs/cabra/helper/thumbnailActiveTab.js"; 
import logger from "/test/mocks/logger.js";
import chrome from "/test/mocks/chrome.js";
import Logger from "/js/mjs/logger/logger.js"; 
import browserEvents from "/js/mjs/chromeOsServices/browserEvents.js";
import SETTINGS from "/js/mjs/settings.js";

function nextTick(){ return Promise.resolve();}

describe('ThumbnailActiveTab', function() {
    var thumbnail, shouldResolve;

    beforeEach(function() {
        jasmine.clock().install();
        chrome.runtime.lastError = null;//in case it's been reset
        chrome.useMock();
        logger.useMock();
        browserEvents._resetForTest();
        //spyOn(browserEvents, "register");//just so we dont accidentally do something
        thumbnail = new ThumbnailActiveTab();
        thumbnail.init();
        spyOn(thumbnail, 'getImageBlob').and.callFake(
            function(data, width, height, resolve, reject) {
                if (shouldResolve) { resolve(); } else { reject(); }
            });
        //weird case where eventemitter isnt null checking and ive got stuff to do
        //browserEvents.on(browserEvents.TABCHANGE, $.noop);
        //browserEvents.on(browserEvents.FAILACTIVEWINDOW, $.noop);
    });

    afterEach(function() {
        thumbnail.stop();
        browserEvents._resetForTest();
        chrome.runtime.lastError = null;
        chrome.resetMock();
        jasmine.clock().uninstall();
    });

    it("contains init")

    it('can resolve', async function() {
        shouldResolve = true;
        chrome.tabs.captureVisibleTab.and.callFake(function(windowId, cfg, callback) {
            callback('fake-data');
        });
        chrome.windows.getLastFocused.and.callFake(function(params, callback) {
            callback({id:99, focused: true});
        });

        await thumbnail._getScreenshot(1, 2);
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
        expect(thumbnail.getImageBlob).toHaveBeenCalledWith('fake-data', 1, 2, jasmine.any(Function), jasmine.any(Function));
        expect(Logger.error).not.toHaveBeenCalled();
    });

    it('catches thrown errors', async function() {
        shouldResolve = false;
        var err = {message: 'nope', stack: null};
        chrome.tabs.captureVisibleTab.and.callFake(function() { throw err; });
        chrome.windows.getLastFocused.and.callFake(function(params, callback) {
            callback({id:99, focused: true});
        });

        try{
            await thumbnail._getScreenshot(1, 2);
            fail("should not have passed");
        }catch{
            //yay
        }
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
        expect(thumbnail.getImageBlob).toHaveBeenCalledWith(false, 1, 2, jasmine.any(Function), jasmine.any(Function));
        expect(Logger.error).toHaveBeenCalledWith(err.message, err.stack);
    });

    it('catches runtime errors', async function() {
        shouldResolve = false;
        chrome.tabs.captureVisibleTab.and.callFake(function(windowId, cfg, callback) {
            chrome.runtime.lastError = {message: 'nope'};
            callback();
            delete chrome.runtime.lastError;
        });
        chrome.windows.getLastFocused.and.callFake(function(params, callback) {
            callback({id:99, focused: true});
        });

        try{
            await thumbnail._getScreenshot(1, 2);
            fail("should not have passed");
        }catch{
            //yay
        }
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
        expect(thumbnail.getImageBlob).toHaveBeenCalledWith(false, 1, 2, jasmine.any(Function), jasmine.any(Function));
        expect(Logger.error).toHaveBeenCalledWith('runtime error capturing image: {"message":"nope"}');
    });

    it('passes a chromeprotected runtime errors', async function() {
        shouldResolve = false;
        chrome.tabs.captureVisibleTab.and.callFake(function(windowId, cfg, callback) {
            //yeah tahts the message. typo and all
            chrome.runtime.lastError = {message: "The 'activeTab' permission is not in effect because this extension has not been in invoked."};
            callback();
            delete chrome.runtime.lastError;
        });
        chrome.windows.getLastFocused.and.callFake(function(params, callback) {
            callback({id:99, focused: true});
        });

        try{
            await thumbnail._getScreenshot(1, 2);
            fail("should not have passed");
        }catch{
            //yay
        }
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
        expect(thumbnail.getImageBlob).toHaveBeenCalledWith("chromeprotected", 1, 2, jasmine.any(Function), jasmine.any(Function));
        expect(Logger.error).toHaveBeenCalledWith('runtime error capturing image: chromeprotected');
    });

    it('passes a chromeblocked runtime errors', async function() {
        shouldResolve = false;
        chrome.tabs.captureVisibleTab.and.callFake(function(windowId, cfg, callback) {
            //yeah tahts the message. typo and all
            chrome.runtime.lastError = {message: "Taking screenshots has been disabled"};
            callback();
            delete chrome.runtime.lastError;
        });
        chrome.windows.getLastFocused.and.callFake(function(params, callback) {
            callback({id:99, focused: true});
        });

        try{
            await thumbnail._getScreenshot(1, 2);
            fail("should not have passed");
        }catch{
            //yay
        }
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
        expect(thumbnail.getImageBlob).toHaveBeenCalledWith("chromeblocked", 1, 2, jasmine.any(Function), jasmine.any(Function));
        expect(Logger.error).toHaveBeenCalledWith('runtime error capturing image: chromeblocked');
    });


    it("tracks past windows when there's an unlocked message", function (){
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            pendingUrl: "https://facebook.com",
            url: ""
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.onCreated.addListener.calls.mostRecent().args[0]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        thumbnail._getScreenshot(1, 2);
        chrome.windows.getLastFocused.calls.mostRecent().args[1]({
            id: 5,
            focused: true,
            tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"}]
        });
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(4, {}, jasmine.any(Function));
    });
    it("tracks past windows when there's a question", function (){
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            pendingUrl: "https://facebook.com",
            url: ""
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.onCreated.addListener.calls.mostRecent().args[0]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"
        });
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"
        });
        thumbnail._getScreenshot(1, 2);
        chrome.windows.getLastFocused.calls.mostRecent().args[1]({
            id: 5,
            focused: true,
            tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"}]
        });
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(4, {}, jasmine.any(Function));
    });
    it("tracks past windows when there's a status request", function (){
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            pendingUrl: "https://facebook.com",
            url: ""
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.onCreated.addListener.calls.mostRecent().args[0]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"
        });
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"
        });
        thumbnail._getScreenshot(1, 2);
        chrome.windows.getLastFocused.calls.mostRecent().args[1]({
            id: 5,
            focused: true,
            tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"}]
        });
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(4, {}, jasmine.any(Function));
    });
    
    //NOTE:  health check doesnt currently have an issue as it doesnt render as the
    //current window/last active window

    it("shows the locked message", function (){
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            pendingUrl: "https://facebook.com",
            url: ""
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.onCreated.addListener.calls.mostRecent().args[0]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"
        });
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"
        });
        thumbnail._getScreenshot(1, 2);
        chrome.windows.getLastFocused.calls.mostRecent().args[1]({
            id: 5,
            focused: true,
            tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"}]
        });
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(5, {}, jasmine.any(Function));
    });

    it("sends the out of browser response when the last thing prior to the message was out of browser", async function () {
        //we go to facebook.com 
        //we change to out of browser (something else was on top)
        //we send a message
        //verify that we dont call our captureVisibleTab and resolve the 
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            pendingUrl: "https://facebook.com",
            url: ""
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        //now, we've gone out of browser
        jasmine.clock().tick(1000);//you can tell bc on the periodic check, there's nothing enabled
        await nextTick();//
        chrome.windows.getLastFocused.calls.mostRecent().args[1]({
            id: 4,
            focused: false,//<--- see that? that means Out of Browser
            tabs: [ { url: "https://facebook.com"}]
        });
        await nextTick();//
        //oh but look we launched a message it seems
        chrome.tabs.onCreated.addListener.calls.mostRecent().args[0]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        var resolved = null, val;
        var screenShotDfd = thumbnail._getScreenshot(1, 2);
        chrome.windows.getLastFocused.calls.mostRecent().args[1]({
            id: 5,
            focused: true,
            tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"}]
        });
        try{
            await screenShotDfd;
            fail("should not have gotten here");
        } catch
        {
            //yaya!
        }
        //so we're not calling that api 
        expect(chrome.tabs.captureVisibleTab).not.toHaveBeenCalled();
    });
    it("estimates the underlying window if the last good got closed when there's an unlocked message", async function (){
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            pendingUrl: "https://facebook.com",
            url: ""
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            windowId: 4,
            tabId: 100,
            frameId: 0,
            url: "https://facebook.com"
        });
        chrome.tabs.onCreated.addListener.calls.mostRecent().args[0]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "",
            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.webNavigation.onCompleted.addListener.calls.mostRecent().args[0]({
            tabId: 102,
            frameId: 0,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            tabId: 101,
            windowId: 5,
            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
        });
        chrome.windows.onRemoved.addListener.calls.mostRecent().args[0](4);
        await nextTick();
        chrome.windows.getLastFocused.calls.mostRecent().args[1]({
            id: 5,
            focused: true,
            tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"}]
        });
        await nextTick();
        //it gets called again, filtering out the recent 
        chrome.windows.getLastFocused.calls.mostRecent().args[1]({
            id: 6,
            focused: false,
            tabs: [ { url: "https://www.google.com", active: true, windowId: 6}]
        });
        await nextTick();
        thumbnail._getScreenshot(1, 2);//note we dont care to wait for this so we're not capturing it
        chrome.windows.getLastFocused.calls.mostRecent().args[1]({
            id: 5,
            focused: true,
            tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"}]
        });
        await nextTick();
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(6, {}, jasmine.any(Function));
    });
});
