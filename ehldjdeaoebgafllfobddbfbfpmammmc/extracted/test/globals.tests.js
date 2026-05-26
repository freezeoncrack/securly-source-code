import {detectOS} from "../js/globals.js";

describe("detectOS", function () {
    var appVersion;
    beforeEach(function (){
        appVersion = "stuff stuff CrOS stuff stuff";
        spyOnProperty(window.navigator, "appVersion").and.callFake(function () { return appVersion;});
    });
    it("detects chromeOS", function () {
        expect(detectOS()).toEqual("Chrome OS");
    });
    it("detects windows", function () {
        appVersion = "stuff stuff Windows stuff stuff";
        expect(detectOS()).toEqual("Windows");
    });
    it("detects macos", function () {
        appVersion = "stuff stuff Mac OSX 12 stuff stuff";
        expect(detectOS()).toEqual("MacOS");
    });

});