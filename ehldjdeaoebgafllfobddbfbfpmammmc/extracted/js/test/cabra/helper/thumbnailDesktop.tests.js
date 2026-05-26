define([
    'amd/logger/logger', 'amd/cabra/helper/thumbnailDesktop', 'js/test/mocks/chrome.desktopCapture'
], function(
       Logger, ThumbnailDesktop, capture
) {
    describe('ThumbnailDesktop', function () {
        var thumbnail = null;
        
        beforeEach(function () {
            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
            capture.reset();
            spyOn(navigator, "webkitGetUserMedia");
            spyOn(document, "getElementById").andReturn(jasmine.createSpyObj("video", ["play"]));
            spyOn(window.URL, "createObjectURL");
            thumbnail = new ThumbnailDesktop(); 
            thumbnail.init();
        });
        
        afterEach(function () {
            //reset initial everytime
            thumbnail._activeThumbnailCount = 0;
        });
        
        it("resets StopNow on addThumbnail", function() {
            thumbnail._isStopNow = true;
            thumbnail.addThumbnail();
            expect(thumbnail._isStopNow).toEqual(false);
        });
        
        it("requests desktop when called initially", function () {
            thumbnail.requestPermission();
            expect(chrome.desktopCapture.chooseDesktopMedia).toHaveBeenCalled();
        });
        
        it("debounces calls to requestPermission", function () {
            thumbnail.requestPermission();
            thumbnail.requestPermission();
            expect(chrome.desktopCapture.chooseDesktopMedia.calls.length).toEqual(1);
        });

        describe("isStreamReady", function () {
            it("initially is false", function () {
               expect(thumbnail.isStreamReady()).toEqual(false); 
            });
            
            it("is still false after requestPermission but before resolution", function () {
                thumbnail.requestPermission();
                expect(thumbnail.isStreamReady()).toEqual(false);
            });
            
            it("is still false if user hits cancel", function () {
                thumbnail.requestPermission();
                var callback = chrome.desktopCapture.chooseDesktopMedia.mostRecentCall.args[1];
                callback(0);
                expect(thumbnail.isStreamReady()).toEqual(false);
            });
            
            it("is still false if there is a failure in webkitGetUserMedia", function () {
                thumbnail.requestPermission();
                var callback = chrome.desktopCapture.chooseDesktopMedia.mostRecentCall.args[1];
                callback(9);
                var cancelCallback = navigator.webkitGetUserMedia.mostRecentCall.args[2];
                cancelCallback();
                expect(thumbnail.isStreamReady()).toEqual(false);                
            });
            
            it("is true if stream opens", function () {
                thumbnail.requestPermission();
                var callback = chrome.desktopCapture.chooseDesktopMedia.mostRecentCall.args[1];
                callback(9);
                var successCallback = navigator.webkitGetUserMedia.mostRecentCall.args[1];
                var stream = {};
                successCallback(stream);
                expect(thumbnail.isStreamReady()).toEqual(true);                
            });
            
            it("is false again if stream ends", function () {
                thumbnail.requestPermission();
                var callback = chrome.desktopCapture.chooseDesktopMedia.mostRecentCall.args[1];
                callback(9);
                var successCallback = navigator.webkitGetUserMedia.mostRecentCall.args[1];
                var stream = {};
                successCallback(stream);
                stream.onended();
                expect(thumbnail.isStreamReady()).toEqual(false);
            });
        });
        
        describe("streamProcessing", function () {
            var desktopCallback;
            beforeEach(function () {
                thumbnail.requestPermission();
                desktopCallback = chrome.desktopCapture.chooseDesktopMedia.mostRecentCall.args[1];
            });
            
            it("specifies screen as the only option", function () {
                expect(chrome.desktopCapture.chooseDesktopMedia.mostRecentCall.args[0]).toEqual(["screen"]); 
            });
            
            it("requests it again if user hits cancel", function (){
                desktopCallback(0);
                expect(chrome.desktopCapture.chooseDesktopMedia.calls.length).toEqual(2);
            });
            
            it("does not request again if we have no remaining thumbnail requests", function () {
                thumbnail.removeThumbnail();
                desktopCallback(0);
                expect(chrome.desktopCapture.chooseDesktopMedia.calls.length).toEqual(1);
            });
            
            it("does request again if we have remaining thumbnail requests (from multiple sessions)", function () {
                thumbnail.addThumbnail();
                thumbnail.removeThumbnail();
                desktopCallback(0);
                expect(chrome.desktopCapture.chooseDesktopMedia.calls.length).toEqual(2);
            });
        });
        
        describe("timeout chooseDesktopMedia", function () {
            var desktopCallback;
            beforeEach(function () {
                jasmine.Clock.useMock();
                jasmine.Clock.reset();
                thumbnail.requestPermission();
                desktopCallback = chrome.desktopCapture.chooseDesktopMedia.mostRecentCall.args[1];
            });
            
            it("cancels before timeout, shows ui again", function () {    
                jasmine.Clock.tick(14000);
                desktopCallback(0);
                expect(chrome.desktopCapture.cancelChooseDesktopMedia.calls.length).toEqual(0);
                expect(chrome.desktopCapture.chooseDesktopMedia.calls.length).toEqual(2);
            });
            
            it("cancels after timeout, shows ui again", function () { 
                jasmine.Clock.tick(16000);
                desktopCallback(0);
                expect(chrome.desktopCapture.cancelChooseDesktopMedia.calls.length).toEqual(1);
                expect(chrome.desktopCapture.chooseDesktopMedia.calls.length).toEqual(3);
            });
            
            it("accepts before timeout, skips ui", function () {    
                jasmine.Clock.tick(10000);
                desktopCallback(1);
                expect(chrome.desktopCapture.cancelChooseDesktopMedia.calls.length).toEqual(0);
                expect(chrome.desktopCapture.chooseDesktopMedia.calls.length).toEqual(1);
            });
            
            it("accepts before timeout, timeout never fired", function () {    
                jasmine.Clock.tick(10000);
                desktopCallback(1);
                jasmine.Clock.tick(10000);
                expect(chrome.desktopCapture.cancelChooseDesktopMedia.calls.length).toEqual(0);
                expect(chrome.desktopCapture.chooseDesktopMedia.calls.length).toEqual(1);
            });
            
            it("accepts after timeout, shows ui once more", function () {    
                jasmine.Clock.tick(16000);
                desktopCallback(1);
                expect(chrome.desktopCapture.cancelChooseDesktopMedia.calls.length).toEqual(1);
                expect(chrome.desktopCapture.chooseDesktopMedia.calls.length).toEqual(2);
            });
        });
    });
});