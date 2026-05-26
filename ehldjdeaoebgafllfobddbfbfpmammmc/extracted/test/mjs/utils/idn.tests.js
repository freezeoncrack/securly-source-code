import Sandbox from "/js/mjs/sandbox.js";
import Logger from "/js/mjs/logger/logger.js";
import Idn from "/js/mjs/utils/idn.js";
import FeatureFlags from "/js/mjs/utils/featureFlags.js";
import $ from "/js/lib/jquery-2.1.1.min.js";
import _ from "/js/lib/underscore.js";
import chrome from "/test/mocks/chrome.js"
import deferred from "/js/mjs/utils/deferred.js";
import lifecycleEventHandler from "/js/mjs/chromeOsServices/lifecycleEventHandler.js";
import activityCollector from "/js/mjs/utils/activityCollector.js";
// impor Sandbox
//     'amd/sandbox', 'amd/logger/logger', 'amd/utils/idn',
//     'amd/utils/featureFlags',
//     'jquery', 'underscore', 'js/test/mocks/chrome.runtime',
//     'js/test/mocks/chrome.tabs', 'js/test/mocks/chrome.windows', 'js/test/mocks/chrome.extension',
//     'js/test/mocks/chrome.storage'
// ], function(
//         Sandbox, Logger, Idn,
//         FeatureFlags,
//         $, _, chrome,
//         tabs, windows, extension,
//         storage
// ){
describe("idn", function () {
    var idn;
    var gProm;
    var oauthProm;
    var apiProm;
    var now;
    function nextTick() {
        return Promise.resolve();
    }
    beforeEach(function () {
        jasmine.clock().install();  
    });
    afterEach(function(){
        jasmine.clock().uninstall();  
    });

    describe("base tests", function () {

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
            spyOn(idn.gClient, "getEmail").and.returnValue(gProm);
            spyOn(idn.oauthClient, "authenticate").and.returnValue(oauthProm);
            spyOn(idn, "saveAuthDataToLocalStorage");
            spyOn(idn, "getMe").and.returnValue(apiProm);
            spyOn(_, "delay");
            spyOn(idn.bsm, 'init');
        });
        afterEach(function(){
            delete chrome.lastError;
        });

        it('delays authentication when not online', function() {
            spyOn(idn, 'retryAuthProcess');
            spyOn(idn, 'online').and.returnValue(false);
            idn.authenticate();
            expect(idn.retryAuthProcess).toHaveBeenCalled();
        });

        it("calls _.delay with 90 sec if we cant get the gmail address", function () {
            idn.authenticate(null);
            gProm.reject({});        
            expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 30000);
        });

        it("calls _.delay with 90 sec if we cant authie gProm resolves, oauth rejects", async function () {
            idn.authenticate(null);
            gProm.resolve({});
            oauthProm.reject({});
            await nextTick();
            expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 90000);
        });

        it("calls _.delay with 90 sec if we cant authie gProm resolves, oauth resolves, api rejects", async function () {
            idn.authenticate(null);
            gProm.resolve({});
            oauthProm.resolve({});
            apiProm.reject({});
            await nextTick();
            expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 90000);
        });

        it("calls _.delay with 90 sec if we cant authie gProm resolves, oauth resolves, api resolve null", async function () {
            idn.authenticate(null);
            gProm.resolve({});
            oauthProm.resolve({});
            apiProm.resolve();
            await nextTick();
            expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 90000);
        });

        it('authentication sets feature flags school', async function() {
            var called = deferred.get();
            spyOn(FeatureFlags, 'setSchool').and.callFake(function(){
                called.resolve();
            });
            var oauthDfd = new Promise(function(resolve, reject) {
                resolve({access_token: 'FAKE_TOKEN'});
            });
            spyOn(idn, 'callAuthClient').and.returnValue(oauthDfd);
            var userDfd = new Promise(function(resolve, reject) {
                resolve({customer_name: 'DyKnow'});
            });
            idn.getMe.and.returnValue(userDfd);

            idn._authenticateWithEmail('fake@dyknow.me', false);
            await Promise.all([oauthDfd, userDfd]);
            expect(FeatureFlags.setSchool).toHaveBeenCalledWith('DyKnow');
            await called;
        });

        it('retries when oauth is hit with a login wall', async function() {
            idn.authenticate(null);
            gProm.resolve("meow@dyknow.com");
            oauthProm.resolve("<!DOCTYPE html><html><body>LOGIN FIRST</body></html>");
            await nextTick();
            expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 90000);
            expect(idn.getMe).not.toHaveBeenCalled();
        });

        it('retries when oauth passes the login wall but users me is hit with the login wall', async function() {
            idn.authenticate(null);
            gProm.resolve("meow@dyknow.com");
            oauthProm.resolve({access_token: "DEVICE_12345"});
            apiProm.resolve("<!DOCTYPE html><html><body>LOGIN FIRST</body></html>");
            await nextTick();
            expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 90000);
            // expect(idn.bsm.init).not.toHaveBeenCalled();
        });

        describe('timed tests', function() {
            it('retryAuthProcess waits', function() {
                _.delay.and.callThrough();
                spyOn(idn, 'startAuthProcess');
                idn.retryAuthProcess();

                jasmine.clock().tick(80001);
                expect(idn.startAuthProcess).not.toHaveBeenCalled();

                jasmine.clock().tick(10000);
                expect(idn.startAuthProcess).toHaveBeenCalled();
            });

        });
    });

    describe("lifecycleEventHandler", function () {
        var online;
        beforeEach(function () {
            now = 1659493199229;
            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
            idn = new Idn();
            idn.authAgreementAccepted = true;
            gProm = $.Deferred();
            oauthProm = $.Deferred();
            apiProm = $.Deferred();
            spyOn(idn.gClient, "getEmail").and.returnValue(gProm);
            spyOn(idn.oauthClient, "authenticate").and.returnValue(oauthProm);
            spyOn(idn, "saveAuthDataToLocalStorage");
            spyOn(idn, "getMe").and.returnValue(apiProm);
            spyOn(idn.bsm, "init");
            spyOn(_, "delay");
            spyOn(_, "now").and.callFake(function() { return now;});
            spyOn(lifecycleEventHandler, "getActivationState");
            spyOn(lifecycleEventHandler, "getClassroomState");
            spyOn(chrome.storage.local, "get");
            spyOn(chrome.storage.local, "set");
            spyOn(chrome.storage.session, "get");
            spyOn(chrome.storage.session, "set");
            spyOn(activityCollector, "setToken");
            spyOn(activityCollector, "setUser");
            spyOn(activityCollector, "startFromInactive");
            online = false;
            spyOnProperty(globalThis.navigator, 'onLine').and.callFake(function (){
                return online;
            });
            idn.start();
        });
        afterEach(function(){
            delete chrome.lastError;
        });

        it("proceeds normally with no activationState", async function () {
            //callback with nothing
            online = true;
            var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
            getActivationStateCallback(null);//default returns an empty object
            expect(chrome.storage.local.get).toHaveBeenCalled();
            chrome.storage.local.get.calls.mostRecent().args[1]();
            await nextTick();
            expect(idn.gClient.getEmail).toHaveBeenCalled();
            gProm.resolve({ email: "jdart@dyknow.com"});
            expect(idn.oauthClient.authenticate).toHaveBeenCalledWith("jdart@dyknow.com", undefined, undefined, undefined);
            oauthProm.resolve({
                access_token: "12345"
            });
            await nextTick();
            expect(idn.getMe).toHaveBeenCalledWith("12345");
            apiProm.resolve({
                customer_name: "dyknow"
            });
            expect(chrome.storage.session.set).toHaveBeenCalledWith({                
                idn: { state: "success", access_token:"12345", user: { customer_name: "dyknow"}, email: "jdart@dyknow.com" }
            }, jasmine.any(Function));
            expect(activityCollector.setToken).toHaveBeenCalledWith("12345");
            expect(activityCollector.setUser).toHaveBeenCalledWith({ customer_name: "dyknow"});
            await nextTick();//flush async buffer to avoid prematurely removing the spy
        });

        it("saves the 90 second sleep after offline", async function () {
            online = false;
            var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
            getActivationStateCallback(null);//nothing here
            chrome.storage.local.get.calls.mostRecent().args[1]();
            await nextTick();
            expect(chrome.storage.session.set).toHaveBeenCalledWith({
                idn: { state: "retry", time: 1659493199229 + 90000 }
            }, jasmine.any(Function));
        });

        it("finishes the 90 second sleep after offline", async function () {
            online = true;
            var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
            now = 1659493199229 + 80000;
            getActivationStateCallback({ 
                state: "retry", 
                time: 1659493199229 + 90000 
            });
            expect(chrome.storage.local.get).not.toHaveBeenCalled();
            expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 10000);
            _.delay.calls.mostRecent().args[0]();
            expect(chrome.storage.local.get).toHaveBeenCalled();
        });

        it("continues immediately if it is after the 90 second sleep after offline", async function () {
            online = true;
            var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
            now = 1659493199229 + 90000;
            getActivationStateCallback({ 
                state: "retry", 
                time: 1659493199229 + 90000 
            });
            expect(_.delay).not.toHaveBeenCalled();//didnt schedule a delay
            expect(chrome.storage.local.get).toHaveBeenCalled();
        });

        it("saves the 15 second sleep after noInternetConnection", async function () {
            online = true;
            lifecycleEventHandler.getActivationState.calls.mostRecent().args[1]();
            expect(chrome.storage.local.get).toHaveBeenCalled();
            chrome.storage.local.get.calls.mostRecent().args[1]();
            await nextTick();
            expect(idn.gClient.getEmail).toHaveBeenCalled();
            gProm.resolve({ email: "jdart@dyknow.com"});
            expect(idn.oauthClient.authenticate).toHaveBeenCalledWith("jdart@dyknow.com", undefined, undefined, undefined);
            oauthProm.resolve({
                access_token: "12345"
            });
            await nextTick();
            expect(idn.getMe).toHaveBeenCalledWith("12345");
            apiProm.reject({
                status: 0
            });
            expect(chrome.storage.session.set).toHaveBeenCalledWith({
                idn: { 
                    state: "retry", 
                    time: 1659493199229 + 15000
                }
            }, jasmine.any(Function));
        });


        it("finishes the 15 second sleep after noInternetConnection", async function () {
            online = true;
            var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
            now = 1659493199229 + 14000;
            getActivationStateCallback({ 
                state: "retry", 
                time: 1659493199229 + 15000 
            });
            expect(chrome.storage.local.get).not.toHaveBeenCalled();
            expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 1000);
            _.delay.calls.mostRecent().args[0]();
            expect(chrome.storage.local.get).toHaveBeenCalled();
        });

        it("continues immediately if it is after the 15 second sleep after noInternetConnection", async function () {
            online = true;
            var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
            now = 1659493199229 + 15000;
            getActivationStateCallback({ 
                state: "retry", 
                time: 1659493199229 + 15000 
            });
            expect(_.delay).not.toHaveBeenCalled();
            expect(chrome.storage.local.get).toHaveBeenCalled();
        });

        it("saves the notime start", async function(){
            var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
            getActivationStateCallback(null);//nothing, but this moves us to startAuthProcess
            expect(chrome.storage.session.set).toHaveBeenCalledWith({
                idn: { state: "retry" }//no time
            }, jasmine.any(Function));
        });
        
        it("restores to start with variables", async function(){
            var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
            getActivationStateCallback({ state: "retry" });//nothing, but this moves us to startAuthProcess
            expect(_.delay).not.toHaveBeenCalled();
            //restarts startAuthProcess
            expect(chrome.storage.local.get).toHaveBeenCalled();
        });

        it("restores to success-IDN state with initialized variables", async function (){        
            var callback = deferred.get();
            activityCollector.startFromInactive.and.callFake(()=> callback.resolve());    
            online = true;
            var getActivationStateCallback = lifecycleEventHandler.getActivationState.calls.mostRecent().args[1];
            now = 1659493199229 + 14000;
            getActivationStateCallback({ 
                state: "success",
                access_token:"12345", 
                user: { customer_name: "dyknow"}, 
                email: "jdart@dyknow.com" 
            });
            expect(activityCollector.setToken).toHaveBeenCalledWith("12345");
            expect(activityCollector.setUser).toHaveBeenCalledWith({ customer_name: "dyknow"});
            expect(activityCollector.startFromInactive).toHaveBeenCalledWith();
            await callback;//ensure we consume all the rest of the async stack pending
        });
        

    });
});