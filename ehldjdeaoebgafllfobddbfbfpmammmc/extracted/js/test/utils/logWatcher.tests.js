define([
    'amd/sandbox','amd/logger/logger', 'amd/utils/logWatcher',
    'jquery', 'underscore', 'js/test/mocks/chrome.runtime',
    'amd/utils/MyInfo'
], function(
        Sandbox,Logger, LogWatcher,
        $, _, chrome,
        MyInfo
){
    describe("logWatcher", function () {
        var logWatcher;
        var myInfo;
        beforeEach(function () {
            myInfo = { };
            spyOn(_, "delay");
            spyOn(MyInfo, "getInstance").andCallFake(function () { return myInfo;});
            logWatcher =  new LogWatcher();
            spyOn(Logger, "log");spyOn(Logger, "debug");spyOn(Logger, "info");
        });
        
        it("inits an apiClient", function () {
             expect(logWatcher.apiClient).toBeTruthy();
        });
        it("inits an Logsender", function () {
             expect(logWatcher.LogSender).toBeTruthy();
        });
        it("calls delay on start", function () {
            logWatcher.start();
            expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 1800000);
        });
        describe("checkForLogRequests - normal", function () {
            beforeEach(function () {
                spyOn(_, "now").andReturn(1510583162722);//9am
            });
            it("does not call checkForLogRequests if not idn'd", function () {
                spyOn(logWatcher, "checkForLogRequests");
                //leave myInfo empty
                logWatcher.start();
                _.delay.mostRecentCall.args[0]();//call the callback
                expect(logWatcher.checkForLogRequests).not.toHaveBeenCalled();
            });
            it("calls delay again if not idn'd", function () {
                spyOn(logWatcher, "checkForLogRequests");
                //leave myInfo empty
                logWatcher.start();
                expect(_.delay.calls.length).toEqual(1);
                _.delay.mostRecentCall.args[0]();//call the callback
                expect(_.delay.calls.length).toEqual(2);
            });
            it("calls checkForLogRequests if idn'd", function () {
                spyOn(logWatcher, "checkForLogRequests").andReturn(new Promise(function (){}));
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};
                logWatcher.start();
                _.delay.mostRecentCall.args[0]();//call the callback
                expect(logWatcher.checkForLogRequests).toHaveBeenCalled();
            });
            it("does not call delay again if checkForLogRequests hasnt returned", function () {
                spyOn(logWatcher, "checkForLogRequests").andReturn(new Promise(function (){}));
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};
                logWatcher.start();
                expect(_.delay.calls.length).toEqual(1);
                _.delay.mostRecentCall.args[0]();//call the callback
                expect(_.delay.calls.length).toEqual(1);
            });
            it("calls delay again once checkForLogRequests has resolved", function () {
                var resolve, reject;
                var promise = new Promise(function (resolveIn, rejectIn){
                    resolve = resolveIn;
                    reject = rejectIn;
                });
                spyOn(logWatcher, "checkForLogRequests").andReturn(promise);
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};
                logWatcher.start();
                expect(_.delay.calls.length).toEqual(1);
                
                var hasResolved = false;
                promise.then(function () { hasResolved = true;});
                runs(function () {
                    _.delay.mostRecentCall.args[0]();//call the callback
                    resolve();
                });
                waitsFor(function ( ){
                    return hasResolved;
                });
                runs(function () {
                    expect(_.delay.calls.length).toEqual(2);
                });
            });
            it("calls delay again once checkForLogRequests has rejected", function () {
                var resolve, reject;
                var promise = new Promise(function (resolveIn, rejectIn){
                    resolve = resolveIn;
                    reject = rejectIn;
                });
                spyOn(logWatcher, "checkForLogRequests").andReturn(promise);
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};
                logWatcher.start();
                expect(_.delay.calls.length).toEqual(1);
                
                var hasRejected = false;
                promise.then(function () { }, function () { hasRejected = true;});
                runs(function () {
                    _.delay.mostRecentCall.args[0]();//call the callback
                    reject();
                });
                waitsFor(function ( ){
                    return hasRejected;
                });
                runs(function () {
                    expect(_.delay.calls.length).toEqual(2);
                });
            });

            it("doesnt cause a teardown if checkForLogRequests has rejected", function () {
                var resolve, reject;
                var promise = new Promise(function (resolveIn, rejectIn){
                    resolve = resolveIn;
                    reject = rejectIn;
                });
                spyOn(logWatcher.apiClient, "get").andReturn(promise);
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};
                logWatcher.start();
                expect(_.delay.calls.length).toEqual(1);
                
                _.delay.mostRecentCall.args[0]();//call the callback
                expect(logWatcher.apiClient.get).toHaveBeenCalledWith(
                    "RequestLogs?id=4&access_token=meow-im-a-cat", 
                    { times : 3, statusCodes : [ 500, 501, 502, 503, 504, 505 ] }, 
                    false
                );
            });
            
            //now that we've established what happens before checkForLogRequests, lets see what happens
            //in it
            
            it("rejects checkForLogRequests if apiClient.get rejects", function () {
                var promise = $.Deferred();//apiclient returns jquery dfds
                spyOn(logWatcher.apiClient, "get").andReturn(promise);
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};

                var hasRejected = false;
                runs(function () {
                    var ret = logWatcher.checkForLogRequests();            
                    ret.then(function () { }, function () { 
                        hasRejected = true;
                    });
                    promise.reject();
                });
                waitsFor(function ( ){
                    return hasRejected;
                });
                runs(function () {
                    expect(hasRejected).toEqual(true);
                });
            });

            it("does not call sendlogs if sent html string", function () {
                var promise = $.Deferred();//apiclient returns jquery dfds
                spyOn(logWatcher.apiClient, "get").andReturn(promise);
                spyOn(logWatcher.LogSender, "sendLogsWithStartDate").andReturn($.Deferred().resolve());
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};

                var hasResolved = false;
                runs(function () {
                    var ret = logWatcher.checkForLogRequests();            
                    ret.then(function () { 
                        hasResolved = true;
                    }, function () { });
                    promise.resolve("<! --samlchecks get.html ...");
                });
                waitsFor(function ( ){
                    return hasResolved;
                });
                runs(function () {
                    expect(logWatcher.LogSender.sendLogsWithStartDate.calls.length).toEqual(0);
                });
            });
        });

        describe("checkForLogRequests - after/before hours", function () {
            it("does not calls checkForLogRequests if idn'd but after hours", function () {
                spyOn(_, "now").andReturn(1510628443107);//9pm
                spyOn(logWatcher, "checkForLogRequests").andReturn(new Promise(function (){}));
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};
                logWatcher.start();
                _.delay.mostRecentCall.args[0]();//call the callback
                expect(logWatcher.checkForLogRequests).not.toHaveBeenCalled();
            });
            it("does call delay again if idn'd but after hours", function () {
                spyOn(_, "now").andReturn(1510628443107);//9pm
                spyOn(logWatcher, "checkForLogRequests").andReturn(new Promise(function (){}));
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};
                logWatcher.start();
                _.delay.mostRecentCall.args[0]();//call the callback
                expect(_.delay.calls.length).toEqual(2);
            });
            it("does not calls checkForLogRequests if idn'd but before hours", function () {
                spyOn(_, "now").andReturn(1510560584237);//3am i must be lonely
                spyOn(logWatcher, "checkForLogRequests").andReturn(new Promise(function (){}));
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};
                logWatcher.start();
                _.delay.mostRecentCall.args[0]();//call the callback
                expect(logWatcher.checkForLogRequests).not.toHaveBeenCalled();
            });
            it("does call delay again if idn'd but before hours", function () {
                spyOn(_, "now").andReturn(1510560584237);//3am i must be lonely
                spyOn(logWatcher, "checkForLogRequests").andReturn(new Promise(function (){}));
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};
                logWatcher.start();
                _.delay.mostRecentCall.args[0]();//call the callback
                expect(_.delay.calls.length).toEqual(2);
            });

        });
        
        describe("logsender", function () {
            var apiCheckDfd;
            var logSenderDfd;
            var apiPutDfd;
            var checkForRequestsDfd;//result of calling checkForLogRequests
            var apiGetResolved, logSenderResolved,logSenderRejected,apiPutResolved,apiPutRejected;
            beforeEach(function(){
                myInfo.info = { me: {account_id: 4}, token: "meow-im-a-cat"};
                apiCheckDfd = $.Deferred();
                logSenderDfd = $.Deferred();
                apiPutDfd = $.Deferred();
                spyOn(logWatcher.apiClient, "get").andReturn(apiCheckDfd);
                spyOn(logWatcher.LogSender, "sendLogsWithStartDate").andReturn(logSenderDfd);
                spyOn(logWatcher.apiClient, "put").andReturn(apiPutDfd);                
                apiGetResolved = false;
                logSenderResolved = false; logSenderRejected = false;
                apiPutResolved = false; apiPutRejected = false;
                apiCheckDfd.then(function () { apiGetResolved = true;});
                logSenderDfd.then(function () { logSenderResolved = true;}, function () { logSenderRejected = true;});
                apiPutDfd.then(function () { apiPutResolved = true;}, function () { apiPutRejected = true;});
                checkForRequestsDfd = logWatcher.checkForLogRequests();
            });
            
            it("does not call LogSender.sendLogsWithStartDate if apiClient resolves null", function () {
                runs(function () {
                    apiCheckDfd.resolve();//resolve empty                    
                });
                waitsFor(function () { return apiGetResolved;});
                runs(function () {
                    expect(logWatcher.LogSender.sendLogsWithStartDate).not.toHaveBeenCalled();                    
                });
            });
            
            it("it calls LogSender.sendLogsWithStartDate with supplied information", function () {
                runs(function () {
                    apiCheckDfd.resolve({notes: "testing 123", request_id: 4});//resolve with specific notes
                });
                waitsFor(function () { return apiGetResolved;});
                runs(function () {
                    expect(logWatcher.LogSender.sendLogsWithStartDate).toHaveBeenCalled();
                    var request = logWatcher.LogSender.sendLogsWithStartDate.mostRecentCall.args[2];
                    expect(request.notes).toEqual("testing 123");
                });
            });
            
            it("does not update the status as error if sendLogsWithStartDate rejects", function () {
                var mainRejected;
                checkForRequestsDfd.then(function () {}, function () {mainRejected = true;});
                runs(function () {
                    apiCheckDfd.resolve({notes: "testing 123", request_id: 4});//oh look logs to be sent!
                    logSenderDfd.reject(new Error("missing a thing"));//oh noes the send failed
                });
                waitsFor(function () { return mainRejected;});
                runs(function () {
                    expect(logWatcher.apiClient.put).not.toHaveBeenCalled();
                });
            });
            
            it("updates the status as success if sendLogsWithStartDate resolves", function () {
                runs(function () {
                    apiCheckDfd.resolve({notes: "testing 123", request_id: 4});//oh look logs to be sent!
                    logSenderDfd.resolve();//(new Error("missing a thing"));//oh noes the send failed
                });
                waitsFor(function () { return logSenderResolved;});
                runs(function () {
                    var expectedUrl = "RequestLogs?request_id=4&status=success&access_token=meow-im-a-cat";
                    expect(logWatcher.apiClient.put).toHaveBeenCalled();
                    expect(logWatcher.apiClient.put.mostRecentCall.args[0]).toEqual(expectedUrl);
                });
            });
            
            it("rejects the main promise if sendLogsWithStartDate rejects and doesn't call put", function () {
                var mainRejected;
                checkForRequestsDfd.then(function () {}, function () {mainRejected = true;});
                runs(function () {
                    apiCheckDfd.reject();//({notes: "testing 123", request_id: 4});//oh look logs to be sent!
                    logSenderDfd.reject(new Error("missing a thing"));//oh noes the send failed
                    //apiPutDfd.reject(new Error("bad connection"));//and we couldnt update! what an awful day
                });
                waitsFor(function () { return mainRejected;});
                runs(function () {
                    expect(mainRejected).toEqual(true);
                    expect(logWatcher.LogSender.sendLogsWithStartDate).not.toHaveBeenCalled();
                    expect(logWatcher.apiClient.put).not.toHaveBeenCalled();
                });
            });
            
            it("rejects the main promise if sendLogsWithStartDate rejects and doesn't call put", function () {
                var mainRejected;
                checkForRequestsDfd.then(function() {}, function () {mainRejected = true;});
                runs(function () {
                    apiCheckDfd.resolve({notes: "testing 123", request_id: 4});//oh look logs to be sent!
                    logSenderDfd.reject(new Error("missing a thing"));//oh noes the send failed
                    //apiPutDfd.resolve();//at least we updated this... we can try again later?
                });
                waitsFor(function () { return mainRejected;});
                runs(function () {
                    expect(mainRejected).toEqual(true);
                    expect(logWatcher.apiClient.put).not.toHaveBeenCalled();
                });
            });
            
            it("rejects the main promise if sendLogsWithStartDate resolves and put rejects", function () {
                var mainRejected;
                checkForRequestsDfd.then(function() {}, function () {mainRejected = true;});
                
                runs(function () {
                    apiCheckDfd.resolve({notes: "testing 123", request_id: 4});//oh look logs to be sent!
                    logSenderDfd.resolve();
                    apiPutDfd.reject(new Error("meow"));
                });
                waitsFor(function () { return mainRejected;});
                runs(function () {
                    expect(logWatcher.apiClient.put).toHaveBeenCalled();
                    expect(mainRejected).toEqual(true);
                });
            });
            
            it("resolves the main promise if main resolves, sendLogsWithStartDate resolves, and put resolves", function(){
                var mainResolved;
                checkForRequestsDfd.then(function(){mainResolved = true;},function(){});
                runs(function() {
                   apiCheckDfd.resolve({notes: "testing 123", request_id: 4});
                   logSenderDfd.resolve();
                   apiPutDfd.resolve();
                });
                waitsFor(function() { return mainResolved;});
                runs(function () {
                    expect(mainResolved).toEqual(true);     
                });
            });

        });
    });
});