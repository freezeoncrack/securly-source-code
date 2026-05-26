import browserEvents from "/js/mjs/chromeOsServices/browserEvents.js";
import chrome from "/test/mocks/chrome.js";
import Logger from "/js/mjs/logger/logger.js";

describe("browserEvents", function () {
    beforeEach(function () {
        spyOn(Logger, 'debug');
        spyOn(Logger, 'info');
        spyOn(Logger, 'warn');
        spyOn(Logger, 'error');
        jasmine.clock().install();  
        chrome.useMock();
        browserEvents._resetForTest();
        browserEvents.register();
    });

    afterEach(function () {
        chrome.resetMock();
        browserEvents._resetForTest();
        jasmine.clock().uninstall();  
    });

    it("emits on onCommitted", function (){
        var details;
        browserEvents.on("activeTabChanges", function(info){
            details = info;
        });
        chrome.webNavigation.onCommitted.addListener.calls.mostRecent().args[0]({
            tabId: 4,
            frameId: 0
        });
        chrome.tabs.get.calls.mostRecent().args[1]({
            id: 4, 
            url: "facebook.com",
            title: "fb",
            active: true
        });
        expect(details).toEqual({
            id: 4, 
            url: "facebook.com",
            title: "fb",
            active: true
        });
    });
});