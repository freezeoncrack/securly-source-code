define([
    'amd/clients/api', 'amd/logger/logger', 'jquery',
    'underscore'
], function(
    ApiClient, Logger, $,
    _
) {
    describe('api', function () {
        var apiClient;
        var dfd;
        var defaultRetrySettings = {
            times:3,
            statusCodes: [500, 501, 502, 503, 504, 505]
        };
        
        beforeEach(function () {
            apiClient = new ApiClient();
            apiClient.baseUrl = "https://localhost:8181/";
            dfd = $.Deferred();
            //delete dfd.done;//fetch promises dont have this
            dfd.retry = function () { return dfd;};//not gonna be our way I dont think
            spyOn($, "ajax").andReturn(dfd);
            spyOn(window, "fetch").andCallFake(function () { return dfd;});
            spyOn(_, "delay");
            spyOn(AbortController.prototype, "abort").andCallFake(function () {
                //assumed the last delay is our timeout. ill make it all sophisticated 
                //some other time
                var err = new DOMException("The user aborted a request.","AbortError");
                dfd.reject(err);
            });
            spyOn($, "trigger");
            
            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
        });

        function response(textOrJson, status, statusText){
            var text = typeof textOrJson === "string" ? textOrJson : JSON.stringify(textOrJson);
            return {
                ok: !status || status === 200,
                status: !status ? 200 : status,
                statusText: !statusText? "" : statusText,//note experimentatlly, 200 has no statusText
                json: function () { 
                    return $.Deferred().resolve(JSON.parse(text));
                },
                text: function () { 
                    return $.Deferred().resolve(text);
                }
            };
        }

        function callDelay(index){ 
            //assumes the retry is 5 seconds internally still
            var retryCalls = _.delay.calls.filter(function (c){
                return c.args[1] === 5000;
            });
            expect(retryCalls.length).toBeGreaterThan(index);
            retryCalls[index].args[0]();
        }

        it("will pass the params through to fetch", function(){
            apiClient.get("someurl");
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/someurl", {
                method: "GET",
                cors: "no-cors",
                credentials:"same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                signal: jasmine.any(Object)
            });
            //some places are calling with false which is abhorent but not the time            
            apiClient.get("someurl2", false);
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/someurl2", {
                method: "GET",
                cors: "no-cors",
                credentials:"same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                signal: jasmine.any(Object)
            });
            apiClient.get("someurl3", {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic M1NOOHhDZmNMdlhBam5PYk8wYlI6RTR6czVvWkF6MXJ6QXZBeWVPaTM='
                }
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/someurl3", {
                method: "GET",
                cors: "no-cors",
                credentials:"same-origin",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': 'Basic M1NOOHhDZmNMdlhBam5PYk8wYlI6RTR6czVvWkF6MXJ6QXZBeWVPaTM='
                },
                signal: jasmine.any(Object)
            });

            apiClient.post("someurl4", {
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': 'Basic M1NOOHhDZmNMdlhBam5PYk8wYlI6RTR6czVvWkF6MXJ6QXZBeWVPaTM='
                },
                data: '{"thing":"sent"}'
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/someurl4", {
                method: "POST",
                cors: "no-cors",
                credentials:"same-origin",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': 'Basic M1NOOHhDZmNMdlhBam5PYk8wYlI6RTR6czVvWkF6MXJ6QXZBeWVPaTM='
                },
                body: '{"thing":"sent"}',
                signal: jasmine.any(Object)
            });
            expect($.ajax).not.toHaveBeenCalled();
        });
                
        it("400 with 4410 is a success", function(){
            var finalResponse;
            apiClient.post("1234", {}, {})
                .then(function(res){ 
                    finalResponse = res;
                }, function () {
                    finalResponse = "BIG FAIL";
                });
            dfd.resolve(response("{\"error_code\":4410, \"error_description\":\"blabla\"}", 400, "Bad request"));
            expect(finalResponse).toEqual({
                error_code: 4410,
                error_description: "blabla",
                status: 200,
                statusText: ""


            });
        });

        it("resolves the thumbnail upload just like you'd expect", function () {
            //200 ok and an empty string response
            var finalResponse;
            var blob = new Blob([1,2,3]);
            apiClient.put("https://localhost:8765/thing?stuff=things", { 
                data: blob,
                processData: false, 
                contentType: false,
                headers : { "Content-Type": "image/jpeg" }
            }, defaultRetrySettings).then(function (res){
                finalResponse = res;
            }, function() {
                finalResponse = "BIG OLD FAILURE";
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8765/thing?stuff=things", {
                method: "PUT",
                cors: "no-cors",
                credentials:"same-origin",
                headers: {
                    "Content-Type": "image/jpeg"
                },
                signal: jasmine.any(Object),
                body: blob
            });
            dfd.resolve(response("", 200, ""));

            expect(finalResponse).toBe("");
            //should be a resolve with the empty string $.Deferred().resolve("");
        });

        it("communicates a 401 as a fail", function () {
            var finalResponse;
            apiClient.get("https://localhost:8765/thing?stuff=things", { 
                data: new Blob([1,2,3]), 
                processData: false, 
                contentType: false,
                headers : { "Content-Type": "application/json" }
            }, defaultRetrySettings).then(function (res){
                finalResponse = "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;
            });
            dfd.resolve(response({ error_description: "not allowed"}, 401, "Unauthorized"));

            expect(finalResponse).toEqual({ statusText: "Unauthorized", status: 401, error_description: "not allowed"});
        });

        it("communciates a 404 as a fail", function () {
            var finalResponse;
            apiClient.get("https://localhost:8765/thing?stuff=things", { 
                data: new Blob([1,2,3]), 
                processData: false, 
                contentType: false,
                headers : { "Content-Type": "application/json"}
            }, defaultRetrySettings).then(function (res){
                finalResponse = "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;
            });
            dfd.resolve(response({ Message: "Not Found"}, 404, "Not found"));

            expect(finalResponse).toEqual({ Message: "Not Found", status: 404, statusText: "Not found"});

        });

        it("communicates a 403 as a fail", function () {
            var finalResponse;
            apiClient.get("https://localhost:8765/thing?stuff=things", { 
                data: new Blob([1,2,3]), 
                processData: false, 
                contentType: false,
                headers : { "Content-Type": "application/json" }
            }, defaultRetrySettings).then(function (res){
                finalResponse = "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;
            });
            dfd.resolve(response({ error_description: "not allowed"}, 403, "Forbidden"));

            expect(finalResponse).toEqual({ statusText: "Forbidden", status: 403, error_description: "not allowed"});
        });

        it("communicates a 500 as a fail", function () {
            //note not passing retry settings here
            var finalResponse;
            apiClient.get("https://localhost:8765/thing?stuff=things", { 
                data: new Blob([1,2,3]), 
                processData: false, 
                contentType: false,
                headers : { "Content-Type": "application/json" }
            }).then(function (res){
                finalResponse = "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;
            });
            dfd.resolve(response({ error_description: "Database error"}, 500, "Server error"));
            expect(finalResponse).toEqual({ statusText: "Server error", status: 500, error_description: "Database error"});        
        });

        it("communicates a 503 as a fail", function () {
            //note not passing retry settings here
            var finalResponse;
            apiClient.get("https://localhost:8765/thing?stuff=things", { 
                data: new Blob([1,2,3]), 
                processData: false, 
                contentType: false,
                headers : { "Content-Type": "application/json" }
            }).then(function (res){
                finalResponse = "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;
            });
            dfd.resolve(response('<html>\r\n<head><title>503 Service Temporarily Unavailable</title></head>\r\n<body></body></html>\r\n', 503, "Service Unavailable"));
            expect(finalResponse).toEqual({ statusText: "Service Unavailable", status: 503, error_description: '<html>\r\n<head><title>503 Service Temporarily Unavailable</title></head>\r\n<body></body></html>\r\n'});
        });

       it("will retry some errors", function () {
            var retrySettings = {
                times:9,
                statusCodes: [500, 501, 502, 503, 504, 505]
            };
            var finalResponse;
            apiClient.get("stuff",false, retrySettings).then(function (res){
                finalResponse = res;
            }, function(res) {
                finalResponse =  "BIG OLD FAILURE";
            });
            
            dfd.resolve(response("",500, "Server error"));
            dfd = $.Deferred();
            callDelay(0);
            dfd.resolve(response("",501, "Server error"));
            dfd = $.Deferred();
            callDelay(1);
            dfd.resolve(response("",502, "Server error"));
            dfd = $.Deferred();
            callDelay(2);
            dfd.resolve(response("",503, "Server error"));
            dfd = $.Deferred();
            callDelay(3);
            dfd.resolve(response("",504, "Server error"));
            dfd = $.Deferred();
            callDelay(4);
            dfd.resolve(response("",505, "Server error"));
            dfd = $.Deferred();
            callDelay(5);
            dfd.reject(new Error("AHH THE BURNING"));
            dfd = $.Deferred();
            callDelay(6);
            //timeout!
            _.delay.mostRecentCall.args[0]();//call the timeout
            dfd = $.Deferred();
            callDelay(7);
            dfd.resolve(response({hey:"friends"}, 200, ""));
            expect(finalResponse).toEqual({hey: "friends"});
            expect(fetch.calls.length).toEqual(9);
        });

        it("will fail after times retries with status", function () {
            var retrySettings = {
                times:2,
                statusCodes: [500, 501, 502, 503, 504, 505]
            };
            var finalResponse;
            apiClient.get("stuff",false, retrySettings).then(function (res){
                finalResponse =  "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;
            });
            
            dfd.resolve(response("",500, "Server error"));
            dfd = $.Deferred();
            callDelay(0);
            dfd.resolve(response("unhappy server",501, "Server error"));
            var retryCalls;
            expect(retryCalls = _.delay.calls.filter(function (c){
                return c.args[1] === 5000;
            }).length).toEqual(1);//there was only one retry given 
            expect(fetch.calls.length).toEqual(2);
            expect(finalResponse).toEqual({error_description: "unhappy server", status: 501, statusText: "Server error"});
        });

        it("will fail after times retries with timeout", function () {
            var retrySettings = {
                times:2,
                statusCodes: [500, 501, 502, 503, 504, 505]
            };
            var finalResponse;
            apiClient.get("stuff",false, retrySettings).then(function (res){
                finalResponse =  "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;
            });
            dfd.resolve(response("",504, "Server timeout"));
            dfd = $.Deferred();
            callDelay(0);
            //timeout!
            _.delay.mostRecentCall.args[0]();//call the timeout
            var retryCalls;
            expect(retryCalls = _.delay.calls.filter(function (c){
                return c.args[1] === 5000;
            }).length).toEqual(1);//there was only one retry given 
            expect(fetch.calls.length).toEqual(2);
            expect(finalResponse).toEqual({error_description: "Connection was cancelled"});
        });

        it("passes the error back on a timeout without retry", function () {
            var finalResponse;
            apiClient.get("stuff",false).then(function (res){
                finalResponse =  "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;
            });
            _.delay.mostRecentCall.args[0]();//call the timeout
            expect(finalResponse).toEqual({error_description: "Connection was cancelled"});
        });

        it("triggers a fatal error when you pass in callFatalOnErr and get an error", function () {
            var finalResponse;
            apiClient.get("stuff",false, false, true).then(function (res){
                finalResponse =  "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;
            });
            _.delay.mostRecentCall.args[0]();//call the timeout
            expect($.trigger).toHaveBeenCalledWith("fatal_error_occurred", jasmine.objectContaining({
                name: "Api Error",
                message: "Connection was cancelled"
            }));
        });

        it("uses retry semantics when passing in default_retry_options in the second slot", function () {
            //
            var finalResponse;
            apiClient.get("users/me/does/this", defaultRetrySettings).then(function (res){
                finalResponse = res;
            }, function(res) {
                finalResponse =  "BIG OLD FAILURE";
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/users/me/does/this",{
                method: "GET",
                cors: "no-cors",
                credentials:"same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                signal: jasmine.any(Object)
            });
            dfd.resolve(response("",500, "Server error"));
            dfd = $.Deferred();
            callDelay(0);
            dfd.resolve(response("",501, "Server error"));
            dfd = $.Deferred();
            callDelay(1);
            //third times the charm
            dfd.resolve(response({news: "good"}));
            expect(fetch.calls.length).toEqual(3);
            expect(finalResponse).toEqual({news: "good"});
        });


        it("uses retry semantics and triggers error when passing in default_retry_optoins and callFatalOnErr", function () {
            //im writing this test only to limit the things I'm changing.
            var finalResponse;
            apiClient.get("logwatcher/checkForLogRequests/does/this", defaultRetrySettings, true).then(function (res){
                finalResponse =  "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;            
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/logwatcher/checkForLogRequests/does/this",{
                method: "GET",
                cors: "no-cors",
                credentials:"same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                signal: jasmine.any(Object)
            });
            dfd.resolve(response("",500, "Server error"));
            dfd = $.Deferred();
            callDelay(0);
            dfd.resolve(response("",501, "Server error"));
            dfd = $.Deferred();
            callDelay(1);
            dfd.resolve(response("unhappy server",501, "Server error"));
            var retryCalls;
            expect(retryCalls = _.delay.calls.filter(function (c){
                return c.args[1] === 5000;
            }).length).toEqual(2);//there were two retries given 
            expect(fetch.calls.length).toEqual(3);
            expect(finalResponse).toEqual({error_description: "unhappy server", status: 501, statusText: "Server error"});
            expect($.trigger).toHaveBeenCalledWith("fatal_error_occurred", jasmine.objectContaining({
                name: "Api Error",
                message: "unhappy server"
            }));
        });

        it("support post with data, headers, and retryOptions", function () {
            var finalResponse;
            apiClient.post("something", {
                data: JSON.stringify({ something: "cool"}),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic M1NOOHhDZmNMdlhBam5PYk8wYlI6RTR6czVvWkF6MXJ6QXZBeWVPaTM='
                }
            }, defaultRetrySettings).then(function (res){
                finalResponse =  "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;               
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/something",{
                method: "POST",
                body: JSON.stringify({ something: "cool"}),
                cors: "no-cors",
                credentials:"same-origin",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic M1NOOHhDZmNMdlhBam5PYk8wYlI6RTR6czVvWkF6MXJ6QXZBeWVPaTM='
                },
                signal: jasmine.any(Object)
            });
            dfd.resolve(response("",500, "Server error"));
            dfd = $.Deferred();
            callDelay(0);
            dfd.resolve(response("",501, "Server error"));
            dfd = $.Deferred();
            callDelay(1);
            dfd.resolve(response("unhappy server", 501, "Server error"));
            var retryCalls;
            expect(retryCalls = _.delay.calls.filter(function (c){
                return c.args[1] === 5000;
            }).length).toEqual(2);//there were two retries given 
            expect($.trigger).not.toHaveBeenCalled();
            expect(finalResponse).toEqual({error_description: "unhappy server", status: 501, statusText: "Server error"});
        });

        it("supports post with url, false, and retryoptions", function () {
            var finalResponse;
            apiClient.post("something", false, defaultRetrySettings).then(function (res){
                finalResponse =  "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;              
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/something",{
                method: "POST",
                cors: "no-cors",
                credentials:"same-origin",
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: jasmine.any(Object)
            });
            dfd.resolve(response("",500, "Server error"));
            dfd = $.Deferred();
            callDelay(0);
            dfd.resolve(response("",501, "Server error"));
            dfd = $.Deferred();
            callDelay(1);
            dfd.resolve(response("unhappy server", 501, "Server error"));
            var retryCalls;
            expect(retryCalls = _.delay.calls.filter(function (c){
                return c.args[1] === 5000;
            }).length).toEqual(2);//there were two retries given 
            expect($.trigger).not.toHaveBeenCalled();
            expect(finalResponse).toEqual({error_description: "unhappy server", status: 501, statusText: "Server error"});
        });

        it("supports put with url, buffer for data, processDatafalse, contentType false, headers, and retryoptions", function () {
            var finalResponse;
            var buffer = new Uint8Array([1,2,3,4,5]);
            apiClient.put("activitycollector/activitydata", {
                data: buffer,
                processData: false, 
                contentType: false, 
                headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" } 
            }, defaultRetrySettings).then(function (res){
                finalResponse = res;                
            }, function(res) {
                finalResponse =  "BIG OLD FAILURE";
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/activitycollector/activitydata",{
                method: "PUT",
                body: buffer,
                cors: "no-cors",
                credentials:"same-origin",
                headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" },
                signal: jasmine.any(Object)
            });
            dfd.resolve(response({times: "good"}));
            expect(finalResponse).toEqual({times: "good"});
        });

        it("supports put with url, imgData for data, processDatafalse, contentType false, headers, and retryoptions", function () {
            var imgData = "wut?"; var finalResponse;
            apiClient.put("something", {
                data: imgData,
                processData: false, 
                contentType: false, 
                headers: { "Content-Type": "application/json" } 
            }, defaultRetrySettings).then(function (res){
                finalResponse = res;                
            }, function(res) {
                finalResponse =  "BIG OLD FAILURE";
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/something",{
                method: "PUT",
                body: imgData,
                cors: "no-cors",
                credentials:"same-origin",
                headers: { "Content-Type": "application/json" },
                signal: jasmine.any(Object)
            });
            dfd.resolve(response("",500, "Server error"));
            dfd = $.Deferred();
            callDelay(0);
            dfd.resolve(response({times: "good"}));
            expect(finalResponse).toEqual({times: "good"});
        });

        it("supports put with url and retryoptions", function () {
            var finalResponse;
            apiClient.put("something", defaultRetrySettings).then(function (res){
                finalResponse = res;                
            }, function(res) {
                finalResponse =  "BIG OLD FAILURE";
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/something",{
                method: "PUT",
                cors: "no-cors",
                credentials:"same-origin",
                headers: { "Content-Type": "application/json" },
                signal: jasmine.any(Object)
            });
            dfd.resolve(response("",500, "Server error"));
            dfd = $.Deferred();
            callDelay(0);
            dfd.resolve(response({times: "good"}));
            expect(finalResponse).toEqual({times: "good"});
        });

        it("supports head with url", function () {
            var finalResponse;
            apiClient.head("something").then(function (res){
                finalResponse = res;                
            }, function(res) {
                finalResponse =  "BIG OLD FAILURE";
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/something",{
                method: "HEAD",
                cors: "no-cors",
                credentials:"same-origin",
                headers: { "Content-Type": "application/json" },
                signal: jasmine.any(Object)
            });
            dfd.resolve(response("", 200, ""));
            expect(finalResponse).toEqual("");
        });

        it("returns error from head as expected for activityCollector", function () {
            var finalResponse;
            apiClient.head("something").then(function (res){
                finalResponse =  "BIG OLD FAILURE";
            }, function(res) {
                finalResponse = res;                
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/something",{
                method: "HEAD",
                cors: "no-cors",
                credentials:"same-origin",
                headers: { "Content-Type": "application/json" },
                signal: jasmine.any(Object)
            });
            dfd.resolve(response("", 404, "Not found"));
            expect(finalResponse).toEqual({
                status: 404,//this is the critical part here
                statusText: "Not found",
                error_description: ""
            });
        });

        it("supports delete even though we dont call it", function () {
            var finalResponse;
            apiClient.delete("something").then(function (res){
                finalResponse =  res;
            }, function(res) {
                finalResponse = "BIG OLD FAILURE";               
            });
            expect(fetch).toHaveBeenCalledWith("https://localhost:8181/something",{
                method: "DELETE",
                cors: "no-cors",
                credentials:"same-origin",
                headers: { "Content-Type": "application/json" },
                signal: jasmine.any(Object)
            });
            dfd.resolve(response({}, 200, ""));
            expect(finalResponse).toEqual({});
        });

        it("will use the custom-passed in timeout instead of the default", function () {
            apiClient.get("something", { timeout: 100});
            expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 100);
        });
        
        it("fail without error_code is a fail", function (){
            var failCalled = false;
            apiClient.post("1234", {}, {})
                .then($.noop, function(){ failCalled = true;});
            dfd.reject({
                responseText: "{\"error_description\":\"blabla\"}"                
            });
            expect(failCalled).toEqual(true);            
        });
      
        it("properly communicates back when the content filter sends non-json", function(){
            //this is weird, but we push the responsibiltiy of finding this one onto the consumers
            //whatever man

            //I'm reconsidering this one bc its so unintuitive and requires all calls to check it explicitly 
            //vs always throwing into the err case which would be much more sane to me. 
            //even if this requires rewriting a bit externally, it might be a good investment. 
            //so I'm leaving this failing for now
            var finalResponse;
            apiClient.get("something").then(function (res){
                finalResponse = "BIG FAIL";                         
            }, function (res){
                finalResponse = res;       
            });
            var htmlReturnedFromContentFilter = "<!--samlchecks_get.html --><!DOCTYPE html><html><head><body>welcome to the jungle content(tm) filter, baby</body></html>";
            dfd.resolve(response(htmlReturnedFromContentFilter,200, ""));
            expect(finalResponse).toEqual({
                error_description: htmlReturnedFromContentFilter
            });
        });

        it("properly communicates back when the content filter sends non-json and a 401", function(){
            var finalResponse;
            apiClient.get("something").then(function (res){
                finalResponse = "BIG FAIL";
            }, function (res){
                finalResponse = res;
            });
            var htmlReturnedFromContentFilter = "<!--samlchecks_get.html --><!DOCTYPE html><html><head><body>welcome to the jungle content(tm) filter, baby</body></html>";
            dfd.resolve(response(htmlReturnedFromContentFilter,401, "Forbidden"));
            expect(finalResponse).toEqual({
                status: 401,
                statusText: "Forbidden",
                error_description: htmlReturnedFromContentFilter
            });
        });

        it("retries and errors when network blows up", function () {
            //the DDOS protection and the network just being trash 
            //look the same to us for better or worse

            var retrySettings = {
                times:2,
                statusCodes: [500, 501, 502, 503, 504, 505]
            };
            var finalResponse;
            apiClient.get("something", retrySettings).then(function (res){
                finalResponse = "BIG FAIL";
            }, function (res){
                finalResponse = res;
            });
            var err = new TypeError("Failed to fetch");
            dfd.reject(err);
            dfd = $.Deferred();
            callDelay(0);
            err = new TypeError("Failed to fetch");
            dfd.reject(err);
            expect(finalResponse).toEqual({
                error_description: "TypeError: Failed to fetch"
            });
        });

        it("sets an empty times to 1", function(){
            var successCalled = false;
            apiClient.post("1234", {}, {}).then(function(){ successCalled = true;});
            dfd.resolve(response({res: "yay"}, 200, ""));
            expect(successCalled).toEqual(true);
        });

    });
});