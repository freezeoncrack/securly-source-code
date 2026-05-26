define([
    'amd/cabra/helper/browserEvents', 'js/test/mocks/chrome'
], function(
    browserEvents, chrome
){
    describe("browserEvents", function () {
        beforeEach(function () {
            chrome.useMock();
            browserEvents._resetForTest();
            browserEvents.register();
        });

        afterEach(function () {
            chrome.resetMock();
            browserEvents._resetForTest();
        });

        it("emits on onCommitted", function (){
            var details;
            browserEvents.on("activeTabChanges", function(info){
                details = info;
            });
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 4,
                frameId: 0
            });
            chrome.tabs.get.mostRecentCall.args[1]({
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
});