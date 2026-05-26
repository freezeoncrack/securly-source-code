define([
    'amd/clients/google', 'amd/logger/logger', 'jquery', 
    'js/test/mocks/chrome.identity', 'underscore', 'js/test/mocks/chrome.runtime'
], function(
       GoogleClient, Logger, $, 
        identity, _, runtime
) {
    describe('google', function () {
        var gClient;
        var dfd;
        
        beforeEach(function () {
            delete runtime.lastError;
            identity.getProfileUserInfo = jasmine.createSpy("getProfileUserInfo");
            spyOn(_, "delay");
            identity.getProfileUserInfo.reset();
            gClient = new GoogleClient();
            dfd = $.Deferred();
            dfd.retry = function () { return dfd;};
            spyOn($, "ajax").andReturn(dfd);
            
            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
        });
        
        afterEach(function () {            
            delete runtime.lastError;//be kind to those following after us
            identity.getProfileUserInfo = jasmine.createSpy("getProfileUserInfo");//be kind to those following after us
        });
                
        it("getEmail calls getProfileUserInfo", function(){
            runs(function () {
                gClient.getEmail();
            });
            waitsFor(function () {
                return identity.getProfileUserInfo.callCount > 0;
            });
            runs(function () {
               expect(identity.getProfileUserInfo.mostRecentCall.args[0]).toEqual(jasmine.any(Function));
            });
        });
        
        it("getEmail times out if getProfileUserInfo never calls back", function(){
            var promise;
            var result, error;
            runs(function () {
                promise = gClient.getEmail(false);
                promise.then(function (email){
                    result = email;
                }, function (err){
                    error = err;
                });
            });
            waitsFor(function () {
                return identity.getProfileUserInfo.callCount > 0;
            });
            runs(function () {
               _.delay.mostRecentCall.args[0]();//call the timeout callback
            });
            waitsFor(function () {
               return !!error ;//wait for error to be populated/promise to be resolved
            });
            runs(function () {
                expect(error.message).toEqual("Chrome browser doesn't link to any accounts");
            });
        });
        
        it("getEmail resolves if getProfileUserInfo returns an email", function(){
            var promise;
            var result, error;
            runs(function () {
                promise = gClient.getEmail(false);
                promise.then(function (email){
                    result = email;
                }, function (err){
                    error = err;
                });
            });
            waitsFor(function () {
                return identity.getProfileUserInfo.callCount > 0;
            });
            runs(function () {
               identity.getProfileUserInfo.mostRecentCall.args[0]({email: "meow@yolo.gov"});//call the getProfileUserInfo callback
            });
            waitsFor(function () {
               return !!result ;//wait for error to be populated/promise to be resolved
            });
            runs(function () {
                expect(result.email).toEqual("meow@yolo.gov");
            });
        });
        
        it("getEmail rejects if getProfileUserInfo returns no email", function(){
            var promise;
            var result, error;
            runs(function () {
                promise = gClient.getEmail(false);
                promise.then(function (email){
                    result = email;
                }, function (err){
                    error = err;
                });
            });
            waitsFor(function () {
                return identity.getProfileUserInfo.callCount > 0;
            });
            runs(function () {
               identity.getProfileUserInfo.mostRecentCall.args[0]({email: ""});//call the getProfileUserInfo callback
            });
            waitsFor(function () {
               return !!error ;//wait for error to be populated/promise to be rejected
            });
            runs(function () {
                expect(error.message).toEqual("Can't reach the data. User not signed in (likely) or manifest permission not specified (unlikely)");
            });
        });
        
        it("getEmail rejects if lastError is set for getProfileUserInfo", function(){
            var promise;
            var result, error;
            runs(function () {
                promise = gClient.getEmail(false);
                promise.then(function (email){
                    result = email;
                }, function (err){
                    error = err;
                });
            });
            waitsFor(function () {
                return identity.getProfileUserInfo.callCount > 0;
            });
            runs(function () {
               runtime.lastError = "User not logged in";
               identity.getProfileUserInfo.mostRecentCall.args[0]({email: "shouldnt-find@yolo.gov"});//call the getProfileUserInfo callback
            });
            waitsFor(function () {
               return !!error ;//wait for error to be populated/promise to be rejected
            });
            runs(function () {
                expect(error.message).toEqual("User not logged in");
            });
        });
        
        it("getEmail rejects if getProfileUserInfo throws", function(){
            var promise;
            var result, error;
            runs(function () {
                identity.getProfileUserInfo = jasmine.createSpy("getProfileUserInfo").andCallFake(function () { 
                    throw new Error("err thrown");
                });
                promise = gClient.getEmail(false);
                promise.then(function (email){
                    result = email;
                }, function (err){
                    error = err;
                });
            });
            waitsFor(function () {
               return !!error ;//wait for error to be populated/promise to be rejected
            });
            runs(function () {
                expect(error.message).toEqual("err thrown");
            });
        });
        
        it("getEmail doesnt try to reject after a timeout if resolved", function (){
             var promise;
            var result, error;
            runs(function () {
                promise = gClient.getEmail(false);
                promise.then(function (email){
                    result = email;
                }, function (err){
                    error = err;
                });
            });
            waitsFor(function () {
                return identity.getProfileUserInfo.callCount > 0;
            });
            runs(function () {
               identity.getProfileUserInfo.mostRecentCall.args[0]({email: "found@yolo.gov"});//call the getProfileUserInfo callback
                _.delay.mostRecentCall.args[0]();
            });
            waitsFor(function () {
               return !!result ;//wait for error to be populated/promise to be rejected
            });
            runs(function () {
                expect(error).toBeFalsy();
                expect(result.email).toEqual("found@yolo.gov");
            });
        });
    });
});