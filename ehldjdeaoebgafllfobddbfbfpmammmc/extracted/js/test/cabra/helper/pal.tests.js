define([
    'amd/cabra/helper/pal', 'js/test/mocks/chrome.management', 'js/test/mocks/chrome.windows', 
    'js/test/mocks/chrome.webNavigation', 'amd/cabra/helper/browserEvents'
], function(
       Pal, chrome_man, chrome_windows, 
       chrome_webnav, browserEvents
) {
    describe('pal (aka activity tracker)', function () {
        var pal;
        beforeEach(function () {
            browserEvents._resetForTest();
            pal = new Pal();
            jasmine.Clock.useMock();
        });
        
        afterEach(function() {
           //jasmine 1.x doesnt uninstall clock
            browserEvents._resetForTest();
        });
        
        it("calls setInterval on start with _processPeriodicCheck", function() {
            spyOn(browserEvents, "_processPeriodicCheck");
            pal.start();
            jasmine.Clock.tick(1000);
            expect(browserEvents._processPeriodicCheck).toHaveBeenCalled();
        });
        
        describe("tick", function () {
            var lastActivity;
            var called;

            beforeEach(function () {
                lastActivity = null;
                called = false;
                pal.on("activity", function (activity){
                    called = true;
                    lastActivity = activity;
                });
                pal.start(); 
            });
            it("calls chrome.windows.getLastFocused on each check", function () {
                jasmine.Clock.tick(1000);
                expect(chrome.windows.getLastFocused).toHaveBeenCalled();
            });
            it("emits unknown application if getLastFocused returns null", function () {
                jasmine.Clock.tick(1000);
                var callback = chrome.windows.getLastFocused.mostRecentCall.args[1];
                callback(null);
                expect(called).toEqual(true);
                expect(lastActivity).toEqual({"name": "unknown", "identifier": "unknown", "url": "", "title": ""});
            });
            it("returns activity for active tab", function () {
                jasmine.Clock.tick(1000);
                var callback = chrome.windows.getLastFocused.mostRecentCall.args[1];
                callback({ 
                    focused: true, 
                    tabs: [
                        {
                            id: 100,
                            active: true, 
                            url: "https://www.yolo.gov/state-secrets",
                            title: "stuff you shouldnt see",
                            frameId: 0
                        }
                    ] 
                });
                         
                expect(called).toEqual(true);
                expect(lastActivity).toEqual({
                    "name": "Chrome", 
                    "identifier": "Chrome", 
                    "url": "https://www.yolo.gov/state-secrets", 
                    "title": "stuff you shouldnt see",
                    tab_id: 100
                });
            });
            it("ignores itself", function () {
                jasmine.Clock.tick(1000);
                var callback = chrome.windows.getLastFocused.mostRecentCall.args[1];
                callback({ 
                    focused: true, 
                    tabs: [
                        {
                            active: true, 
                            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html",
                            title: "",
                            frameId: 0
                        }
                    ]
                });
                         
                expect(called).toEqual(false);//hasnt gone back to the fallback yet
                //its gonna call for non-popups just to try and have a fallback now
                callback = chrome.windows.getLastFocused.mostRecentCall.args[1];
                callback({ 
                    focused: false, 
                    tabs: [
                        {
                            id: 100,
                            active: true, 
                            url: "https://www.yolo.gov/state-secrets",
                            title: "stuff you shouldnt see",
                            frameId: 0
                        }
                    ] 
                });                         
                expect(called).toEqual(true);
                expect(lastActivity).toEqual({
                    "name": "Chrome", 
                    "identifier": "Chrome", 
                    "url": "https://www.yolo.gov/state-secrets", 
                    "title": "stuff you shouldnt see",
                    tab_id: 100
                });
            });
        });
    });
});
