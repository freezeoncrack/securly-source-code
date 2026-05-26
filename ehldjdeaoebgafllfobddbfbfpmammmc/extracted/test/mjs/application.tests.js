import Application from "/js/mjs/application.js";
import chrome from "/test/mocks/chrome.js";
import isDebug from "/js/isDebug.js";
import Logger from "/js/mjs/logger/logger.js";

describe("application", function () {
    describe("not-chromeos", function () {
        beforeEach(function () {
            isDebug.debug = true;
            spyOn(Logger, 'debug');
            spyOn(Logger, 'info');
            spyOn(Logger, 'warn');
            spyOn(Logger, 'error');
            chrome.useMock();
        });
        it("disables the icon", function () {
            var appVersion = "stuff stuff Windows stuff stuff";
            isDebug.debug = false;
            spyOnProperty(globalThis.navigator, "appVersion").and.returnValue(appVersion);
            spyOn(chrome.action, "setIcon");
            spyOn(chrome.action, "disable");
            var app = new Application();
            app.start();
            expect(chrome.action.setIcon).toHaveBeenCalledWith({
                path: {
                    "19": "images/disabled_icon19.png",
                    "38": "images/disabled_icon38.png"
                }
            });
            expect(chrome.action.disable).toHaveBeenCalled();
        });
    });
});