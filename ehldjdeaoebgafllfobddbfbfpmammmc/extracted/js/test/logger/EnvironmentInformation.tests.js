define(['amd/logger/EnvironmentInformation'], function(EnvironmentInformation) {
    describe('EnvironmentInformation', function () {
        var info;
        beforeEach(function (done) {
            info = new EnvironmentInformation();
        });

        it('parses out os version x64', function () {
            info.appVersion = "5.0 (X11; CrOS x86_64 13421.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.175 Safari/537.36";
            var osVersion = info.getOSVersion();
            expect(osVersion).toEqual("Chrome OS 86.0.4240.175 x64");
        });

        it('parses out os version x86', function () {
            info.appVersion = "5.0 (X11; CrOS x86_32 13421.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.175 Safari/537.36";
            var osVersion = info.getOSVersion();
            expect(osVersion).toEqual("Chrome OS 86.0.4240.175 x86");
        });

        it('parses out os version arm', function () {
            info.appVersion = "5.0 (X11; CrOS armv7l 13421.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.175 Safari/537.36";
            var osVersion = info.getOSVersion();
            expect(osVersion).toEqual("Chrome OS 86.0.4240.175 arm");
        });

    });
});