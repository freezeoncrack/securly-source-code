define([
    'amd/sandbox', 'amd/logger/logger', 'amd/utils/idn',
    'amd/utils/featureFlags',
    'jquery', 'underscore', 'js/test/mocks/chrome.runtime',
    'js/test/mocks/chrome.tabs', 'js/test/mocks/chrome.windows', 'js/test/mocks/chrome.extension',
    'js/test/mocks/chrome.storage'
], function(
        Sandbox, Logger, Idn,
        FeatureFlags,
        $, _, chrome,
        tabs, windows, extension,
        storage
){
    describe("idn", function () {
         var idn = new Idn();
         var gProm;
         var oauthProm;
         var apiProm;
         beforeEach(function () {
            window.dyknowExtension = {};
            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
            idn = new Idn();
            idn.authAgreementAccepted = true;
            gProm = $.Deferred();
            oauthProm = $.Deferred();
            apiProm = $.Deferred();
            spyOn(idn.gClient, "getEmail").andReturn(gProm);
            spyOn(idn.oauthClient, "authenticate").andReturn(oauthProm);
            spyOn(idn, "saveAuthDataToLocalStorage");
            spyOn(idn, "getMe").andReturn(apiProm);
            spyOn(_, "delay");
            spyOn(idn.bsm, 'init');
        });
        afterEach(function(){
            delete chrome.lastError;
        });

        it('delays authentication when not online', function() {
            spyOn(idn, 'retryAuthProcess');
            spyOn(idn, 'online').andReturn(false);
            idn.authenticate();
            expect(idn.retryAuthProcess).toHaveBeenCalled();
        });

        it('delays authentication when not online', function() {
            spyOn(idn, 'retryAuthProcess');
            spyOn(idn, 'online').andReturn(false);
            idn.authAgreementAccepted = false;
            idn._showAuthAgreement();
            expect(idn.retryAuthProcess).toHaveBeenCalled();
        });

        it('does not display auth notice when quietly authenticated with a interactive request', function() {
            gProm.resolve({});
            spyOn(idn, '_authenticate');
            spyOn(idn, '_authenticateWithEmail');
            spyOn(idn, 'showAuthAgreement');

            idn.authenticate();
            expect(idn._authenticate).not.toHaveBeenCalled();
            expect(idn._authenticateWithEmail).toHaveBeenCalled();
            expect(idn.showAuthAgreement).not.toHaveBeenCalled();
        });

        it('does not display auth notice when agreement accepted', function() {
            gProm.reject({});
            spyOn(idn, '_authenticate');
            spyOn(idn, 'showAuthAgreement');

            idn.authenticate();
            expect(idn._authenticate).toHaveBeenCalled();
            expect(idn.showAuthAgreement).not.toHaveBeenCalled();
        });

        it('does not display auth notice on rejection (now that we use the offline-enabled version)', function() {
            gProm.reject({});
            idn.authAgreementAccepted = false;
            spyOn(idn, '_authenticate');
            spyOn(idn, 'showAuthAgreement');

            idn.authenticate();
            expect(idn._authenticate).toHaveBeenCalled();
            expect(idn.showAuthAgreement).not.toHaveBeenCalled();
        });

        it('removes auth tabs on show', function() {
            tabs.remove.andCallFake(function(id, callback) { callback(); });
            var tDfd = new Promise(function(resolve, reject) {
                resolve([{id: 'fake'}]);
            });
            spyOn(idn, 'getAuthTabs').andReturn(tDfd);
            spyOn(idn, '_showAuthAgreement');

            var success = null;

            runs(function() {
                var promise = idn.showAuthAgreement();
                expect(promise.then).toBeTruthy();
                promise.then(
                    function(value) {
                        success = true;
                        expect(value).toBe(undefined);
                    },
                    function(reason) {
                        success = false;
                        expect(reason).toBe(undefined);
                    }
                );
            });

            waitsFor(function() {
                return success !== null;
            });

            runs(function() {
                expect(success).toBe(true);
                expect(idn.getAuthTabs).toHaveBeenCalled();
                expect(tabs.remove).toHaveBeenCalled();
                expect(idn._showAuthAgreement).toHaveBeenCalled();
            });
        });

        it('show auth agreement window starts pending agreement', function() {
            idn.authAgreementAccepted = false;
            windows.create.andCallFake(function(cfg, callback) {
                callback({windowId: 42});
            });
            extension.getURL.andCallFake(function(path) { return path; });
            spyOn(idn, 'startPendingAuthAgreement');

            var returnValue = idn._showAuthAgreement();
            expect(returnValue).toBe(undefined);
            expect(idn.startPendingAuthAgreement).toHaveBeenCalled();
        });

        it('check auth agreement returns undefined if agreement accepted', function() {
            spyOn(idn, 'endPendingAuthAgreement');
            expect(idn.checkAuthAgreement()).toBe(undefined);
            expect(idn.endPendingAuthAgreement).toHaveBeenCalled();
        });

        it('call auth notice requests auth agreement', function() {
            spyOn(idn, 'showAuthAgreement');
            var sandbox = new Sandbox().init();
            idn.initListeners();

            sandbox._processEvents({call_auth_notice_form: {}});
            expect(idn.showAuthAgreement).toHaveBeenCalled();
        });

        it('call auth accepted accepts agreement', function() {
            var tabsDfd = new Promise(function(accept, reject) { accept(); });
            spyOn(idn, 'getAuthTabs').andReturn(tabsDfd);
            spyOn(idn, 'endPendingAuthAgreement');
            spyOn(idn, 'authenticate');

            var sandbox = new Sandbox().init();
            idn.initListeners();

            sandbox._processEvents({auth_notice_accepted: {}});
            expect(idn.authAgreementAccepted).toBe(true);
            expect(idn.getAuthTabs).toHaveBeenCalled();
            expect(idn.endPendingAuthAgreement).toHaveBeenCalled();
            expect(idn.authenticate).toHaveBeenCalled();
        });

        it('check auth agreement does nothing for focused agreement', function() {
            idn.authAgreementAccepted = false;

            windows.get.andCallFake(function(id, callback) {
                callback({focused: true});
            });

            var tDfd = new Promise(function(resolve, reject) {
                resolve([{windowId: 'fake'}]);
            });
            spyOn(idn, 'getAuthTabs').andReturn(tDfd);
            spyOn(idn, 'endPendingAuthAgreement');
            spyOn(idn, 'showAuthAgreement');
            var success = null;

            runs(function() {
                var promise = idn.checkAuthAgreement();
                expect(promise && promise.then).toBeTruthy();
                expect(idn.getAuthTabs).toHaveBeenCalled();
                promise.then(
                    function(value) {
                        success = true;
                        expect(value).toBe(undefined);
                    },
                    function(reason) {
                        success = false;
                        expect(reason).toBe(undefined);
                    }
                );
            });

            waitsFor(function() {
                return success !== null;
            });

            runs(function() {
                expect(success).toBe(true);
                expect(idn.getAuthTabs).toHaveBeenCalled();
                expect(idn.endPendingAuthAgreement).toHaveBeenCalled();
                expect(idn.showAuthAgreement).not.toHaveBeenCalled();
            });
        });

        it('check auth agreement shows agreement when hidden', function() {
            idn.authAgreementAccepted = false;

            windows.get.andCallFake(function(id, callback) {
                callback({focused: false});
            });

            var tDfd = new Promise(function(resolve, reject) {
                resolve([{windowId: 'fake'}]);
            });
            spyOn(idn, 'getAuthTabs').andReturn(tDfd);
            spyOn(idn, 'endPendingAuthAgreement');
            spyOn(idn, 'showAuthAgreement');
            var success = null;

            runs(function() {
                var promise = idn.checkAuthAgreement();
                expect(promise && promise.then).toBeTruthy();
                expect(idn.getAuthTabs).toHaveBeenCalled();
                promise.then(
                    function(value) {
                        success = true;
                        expect(value).toBe(undefined);
                    },
                    function(reason) {
                        success = false;
                        expect(reason).toBe(undefined);
                    }
                );
            });

            waitsFor(function() {
                return success !== null;
            });

            runs(function() {
                expect(success).toBe(true);
                expect(idn.getAuthTabs).toHaveBeenCalled();
                expect(idn.endPendingAuthAgreement).toHaveBeenCalled();
                expect(idn.showAuthAgreement).toHaveBeenCalled();
            });
        });

        it('check auth agreement shows agreement when error thrown', function() {
            idn.authAgreementAccepted = false;

            windows.get.andCallFake(function(id, callback) {
                throw 'expection';
            });

            var tDfd = new Promise(function(resolve, reject) {
                resolve([{windowId: 'fake'}]);
            });
            spyOn(idn, 'getAuthTabs').andReturn(tDfd);
            spyOn(idn, 'endPendingAuthAgreement');
            spyOn(idn, 'showAuthAgreement');
            var success = null;

            runs(function() {
                var promise = idn.checkAuthAgreement();
                expect(promise && promise.then).toBeTruthy();
                expect(idn.getAuthTabs).toHaveBeenCalled();
                promise.then(
                    function(value) {
                        success = true;
                        expect(value).toBe(undefined);
                    },
                    function(reason) {
                        success = false;
                        expect(reason).toBe(undefined);
                    }
                );
            });

            waitsFor(function() {
                return success !== null;
            });

            runs(function() {
                expect(success).toBe(true);
                expect(idn.getAuthTabs).toHaveBeenCalled();
                expect(idn.endPendingAuthAgreement).toHaveBeenCalled();
                expect(idn.showAuthAgreement).toHaveBeenCalled();
            });
        });

        it('check auth agreement shows agreement when lastError set', function() {
            idn.authAgreementAccepted = false;

            windows.get.andCallFake(function(id, callback) {
                chrome.lastError = new Error('an error');
                callback({focused: false});
            });

            var tDfd = new Promise(function(resolve, reject) {
                resolve([{windowId: 'fake'}]);
            });
            spyOn(idn, 'getAuthTabs').andReturn(tDfd);
            spyOn(idn, 'endPendingAuthAgreement');
            spyOn(idn, 'showAuthAgreement');
            var success = null;

            runs(function() {
                var promise = idn.checkAuthAgreement();
                expect(promise && promise.then).toBeTruthy();
                expect(idn.getAuthTabs).toHaveBeenCalled();
                promise.then(
                    function(value) {
                        success = true;
                        expect(value).toBe(undefined);
                    },
                    function(reason) {
                        success = false;
                        expect(reason).toBe(undefined);
                    }
                );
            });

            waitsFor(function() {
                return success !== null;
            });

            runs(function() {
                expect(success).toBe(true);
                expect(idn.getAuthTabs).toHaveBeenCalled();
                expect(idn.endPendingAuthAgreement).toHaveBeenCalled();
                expect(idn.showAuthAgreement).toHaveBeenCalled();
            });
        });

        it('check auth agreement shows agreement when closed', function() {
            idn.authAgreementAccepted = false;

            var tDfd = new Promise(function(resolve, reject) { reject(); });
            spyOn(idn, 'getAuthTabs').andReturn(tDfd);
            spyOn(idn, 'endPendingAuthAgreement');
            spyOn(idn, 'showAuthAgreement');
            var success = null;

            runs(function() {
                var promise = idn.checkAuthAgreement();
                expect(promise && promise.then).toBeTruthy();
                expect(idn.getAuthTabs).toHaveBeenCalled();
                promise.then(
                    function(value) {
                        success = true;
                        expect(value).toBe(undefined);
                    },
                    function(reason) {
                        success = false;
                        expect(reason).toBe(undefined);
                    }
                );
            });

            waitsFor(function() {
                return success !== null;
            });

            runs(function() {
                expect(success).toBe(true);
                expect(idn.getAuthTabs).toHaveBeenCalled();
                expect(idn.endPendingAuthAgreement).toHaveBeenCalled();
                expect(idn.showAuthAgreement).toHaveBeenCalled();
            });
        });

        it("calls _.delay with 90 sec if we cant get the gmail address", function () {
            runs(function () {
                idn.authenticate(null);
                gProm.reject({});
            });
            waitsFor(function () {
               return _.delay.calls.length;
            });
            runs(function () {
                expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 30000);
            });
        });

        it("calls _.delay with 90 sec if we cant authie gProm resolves, oauth rejects", function () {
            runs(function () {
                idn.authenticate(null);
                gProm.resolve({});
                oauthProm.reject({});
            });
            waitsFor(function () {
               return _.delay.calls.length;
            });
            runs(function () {
                expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 90000);
            });
        });

        it("calls _.delay with 90 sec if we cant authie gProm resolves, oauth resolves, api rejects", function () {
            runs(function () {
                idn.authenticate(null);
                gProm.resolve({});
                oauthProm.resolve({});
                apiProm.reject({});
            });
            waitsFor(function () {
               return _.delay.calls.length;
            });
            runs(function () {
                expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 90000);
            });
        });

        it("calls _.delay with 90 sec if we cant authie gProm resolves, oauth resolves, api resolve null", function () {
            runs(function () {
                idn.authenticate(null);
                gProm.resolve({});
                oauthProm.resolve({});
                apiProm.resolve();
            });
            waitsFor(function () {
               return _.delay.calls.length;
            });
            runs(function () {
                expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 90000);
            });
        });

        it('authentication sets feature flags school', function() {
            spyOn(FeatureFlags, 'setSchool');
            var oauthDfd = new Promise(function(resolve, reject) {
                resolve({access_token: 'FAKE_TOKEN'});
            });
            spyOn(idn, 'callAuthClient').andReturn(oauthDfd);
            var userDfd = new Promise(function(resolve, reject) {
                resolve({customer_name: 'DyKnow'});
            });
            idn.getMe.andReturn(userDfd);
            var success = null;

            runs(function() {
                idn._authenticateWithEmail('fake@dyknow.me', false);
                Promise.all([oauthDfd, userDfd]).then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(FeatureFlags.setSchool).toHaveBeenCalledWith('DyKnow');
            });
        });

        it('retries when oauth is hit with a login wall', function() {
            runs(function () {
                idn.authenticate(null);
                gProm.resolve("meow@dyknow.com");
                oauthProm.resolve("<!DOCTYPE html><html><body>LOGIN FIRST</body></html>");
            });
            waitsFor(function () {
                return _.delay.calls.length;
            });
            runs(function () {
                expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 90000);
                expect(idn.getMe).not.toHaveBeenCalled();
            });
        });

        it('retries when oauth passes the login wall but users me is hit with the login wall', function() {
            runs(function () {
                idn.authenticate(null);
                gProm.resolve("meow@dyknow.com");
                oauthProm.resolve({access_token: "DEVICE_12345"});
                apiProm.resolve("<!DOCTYPE html><html><body>LOGIN FIRST</body></html>");
            });
            waitsFor(function () {
                return _.delay.calls.length;
            });
            runs(function () {
                expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 90000);
                expect(idn.bsm.init).not.toHaveBeenCalled();
            });
        });


        describe('timed tests', function() {
            beforeEach(function() {
                jasmine.Clock.useMock();
            });

            afterEach(function() {
                jasmine.Clock.reset();
            });

            it('retryAuthProcess waits', function() {
                _.delay.andCallThrough();
                spyOn(idn, 'startAuthProcess');
                idn.retryAuthProcess();

                jasmine.Clock.tick(80001);
                expect(idn.startAuthProcess).not.toHaveBeenCalled();

                jasmine.Clock.tick(10000);
                expect(idn.startAuthProcess).toHaveBeenCalled();
            });

            it('pending auth agreement will check auth agreement', function() {
                _.delay.andCallThrough();
                idn.authAgreementAccepted = false;
                spyOn(idn, 'checkAuthAgreement');

                idn.startPendingAuthAgreement();
                expect(idn.checkAuthAgreement).not.toHaveBeenCalled();
                jasmine.Clock.tick(idn.pendingAuthAgreementDelay);
                expect(idn.checkAuthAgreement).toHaveBeenCalled();
            });
        });
     });
});
