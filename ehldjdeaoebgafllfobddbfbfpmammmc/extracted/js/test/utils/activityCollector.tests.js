define([
    'amd/utils/activityCollector', 'underscore', 'jquery',
    'amd/lib/pako', 'amd/clients/delaySwitchboardTracker', 'amd/logger/logger',
    'amd/utils/extensionRestarter',
    'js/test/mocks/chrome.runtime', 'js/test/mocks/chrome.storage'
], function(
    activityCollector, _, $,
    pako, delaySwitchboardTracker, Logger, 
    restarter
){
    describe("activityCollector", function(){
        describe("handles the user/start race conditions", function (){
            beforeEach(function () {
                chrome.storage.local.mock();
                chrome.storage.local.failSet = false;
                chrome.runtime.getManifest.andReturn({ version: "7.1.2.3"});
                activityCollector.info.appVersion = "5.0 (X11; CrOS x86_64 13421.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.175 Safari/537.36";
                activityCollector._resetForTest();
                restarter._resetForTests();
                spyOn(activityCollector.pal, "start");
                spyOn(activityCollector.pal, "on");
                spyOn(_, "delay");
            });
            it("does not subscribe/start to pal from only start", function (){
                var timedOut = false;
                runs(function (){
                    activityCollector.start();
                    setTimeout(function (){
                        timedOut = true;
                    }, 100);
                });
                waitsFor(function (){
                    return timedOut;
                });
                runs(function () {
                    expect(activityCollector.pal.on).not.toHaveBeenCalled();
                    expect(activityCollector.pal.start).not.toHaveBeenCalled();    
                });
            });

            it("does not subscribe/start to pal from only setUser", function (){
                var timedOut = false;
                runs(function (){
                    activityCollector.setUser({account_id: 24601});
                    setTimeout(function (){
                        timedOut = true;
                    }, 100);
                });
                waitsFor(function (){
                    return timedOut;
                });
                runs(function () {
                    expect(activityCollector.pal.on).not.toHaveBeenCalled();
                    expect(activityCollector.pal.start).not.toHaveBeenCalled();    
                });
            });
            it("subscribes/starts pal from a start then a setUser", function (){
                runs(function () {
                    activityCollector.start();
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function () {
                    expect(activityCollector.pal.on).toHaveBeenCalled();
                    expect(activityCollector.pal.start).toHaveBeenCalled();
                    expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 60000);
                });
            });
        });

        var ANHOUR=60000 *60;
        describe("hourly sends data to s3", function () {
            var configDfds=[];
            var uploadDfds = [];
            var headDfds = [];
            var now;//
            beforeEach(function (){
                now = 1586401200000;//apr 8 2020 @ 11:00pm (eastern daylight)
                configDfds =[];
                uploadDfds = [];
                headDfds =[];
                activityCollector._resetForTest();
                restarter._resetForTests();
                chrome.storage.local.mock();
                chrome.storage.local.failSet = false;
                chrome.runtime.getManifest.andReturn({ version: "7.1.2.3"});
                activityCollector.info.appVersion = "5.0 (X11; CrOS x86_64 13421.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.175 Safari/537.36";
                spyOn(activityCollector.pal, "start");
                spyOn(activityCollector.pal, "on");
                spyOn(_, "delay");
                spyOn(_, "now").andCallFake(function(){
                    return now;
                });
                spyOn(activityCollector.api, "getActivityConfig").andCallFake(function(){
                    var dfd = $.Deferred();
                    configDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "uploadToUrl").andCallFake(function(){
                    var dfd = $.Deferred();
                    uploadDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "checkHeadOfUrl").andCallFake(function(){
                    //for these tests we will always assume the first load
                    return $.Deferred().reject({ error_description: "Not found", status:404});                    
                });
                runs(function () {
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
            });

            it("does not send off the first minute but calls it again", function (){
                now = now + 60000;//add another minute to now
                _.delay.mostRecentCall.args[0]();//it's been a minute now!
                expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                expect(_.delay.calls.length).toEqual(2);//but it calls delay again 
            });

            it("sends up gzipped activities after an hour with no skipped timeframes", function (){
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //every minute it verifies this faithfully but we need an extra minute of space after
                //that to avoid race conditions. note the last activity wont be called up bc it happens
                //after the timeframe
                for(var i = 0; i < 61; i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + i, title:"math practice"});//got another activity at some point in that last minute
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    if (i< 59) {expect(_.delay.calls.length).toEqual(i+2);}//and it calls it again unless it's time to update
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                //successfully gets the urls to upload
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                //now we sort out all the items, gzip em up, and upload them at 
                //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
                    objects: jasmine.any(Array)
                });
                expect(savedObjs.created).toEqual("2020-04-09T03:00:00.000");
                expect(savedObjs.completed).toEqual("2020-04-09T04:00:00.000");
                
                expect(savedObjs.objects.length).toEqual(60);
                for(var i=0; i<60; i++) {
                    expect(savedObjs.objects[i].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/" + i);
                    expect(savedObjs.objects[i].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                }
                //note to avoid race conditions and the like, we DONT call delay again yet
                expect(_.delay.calls.length).toEqual(61);
                uploadDfds[0].resolve();//hey it was successful! lets call our timer again
                expect(_.delay.calls.length).toEqual(62);
            });

            it("if it goes to sleep and comes back it calculates all that too", function (){
                //of note, that despite the reuse, the semantics of ok/offline are different 
                //than in session. with activityCollector, you'd be online if your wifi was off. this 
                //would not be true in class
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 0, title:"math practice"});//got another activity at some point in that last minute
                _.delay.mostRecentCall.args[0]();
                now = now + 60000;//add another minute to now
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 1, title:"math practice"});//got another activity at some point in that last minute
                now = now + ANHOUR *0.5;//add a half hour of the machine being asleep
                //take careful note here, the activity didnt happen in a minute, so this indicates
                //sleepy time happened but is over
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 2, title:"math practice"});//got another activity at some point in that last minute
                _.delay.mostRecentCall.args[0]();//it's been a minute of sleepwait time, but yikes that clock time has been 1:31 min!
                //now fast forward a quick 10 minutes of normal activity
                for(var i=0;i<10;i++){
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                }
                //oops back to sleep for another 10 minutes
                now = now + 60000*10;
                //take careful note here, the activity didnt happen in a minute, so this indicates
                //sleepy time happened but is over
                _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                //now fast forward a quick 10 minutes to finish our hour
                for(var i=0;i<10;i++){
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                //successfully gets the urls to upload
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                //now we sort out all the items, gzip em up, and upload them at 
                //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
                    objects: jasmine.any(Array)
                });
                //we expect this to look like 8 objects
                //[zearn0, zearn1, offline, online, zearn2, offline, online, zearn2`]
                expect(savedObjs.objects.length).toEqual(8);
                expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/" + 0);
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T03:00:00.000");
                expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/" + 1);
                expect(savedObjs.objects[1].time).toEqual("2020-04-09T03:01:00.000");
                expect(savedObjs.objects[2].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                expect(savedObjs.objects[2].payload.status).toEqual("offline");
                expect(savedObjs.objects[2].time).toEqual("2020-04-09T03:02:00.000");//controversial. technically we would have expected the timer ANY millisecond, so it makes sense to do be 01, but meh
                expect(savedObjs.objects[3].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                expect(savedObjs.objects[3].payload.status).toEqual("ok");
                expect(savedObjs.objects[3].time).toEqual("2020-04-09T03:31:00.000");
                expect(savedObjs.objects[4].payload.url).toEqual("https://www.zearn.com/" + 2);
                expect(savedObjs.objects[4].time).toEqual("2020-04-09T03:31:00.000");
                expect(savedObjs.objects[5].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                expect(savedObjs.objects[5].payload.status).toEqual("offline");
                expect(savedObjs.objects[5].time).toEqual("2020-04-09T03:42:00.000");
                expect(savedObjs.objects[6].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                expect(savedObjs.objects[6].payload.status).toEqual("ok");
                expect(savedObjs.objects[6].time).toEqual("2020-04-09T03:51:00.000");
                expect(savedObjs.objects[7].payload.url).toEqual("https://www.zearn.com/" + 2);
                expect(savedObjs.objects[7].time).toEqual("2020-04-09T03:51:00.000");
                expect(savedObjs.objects[7].stale).toEqual("stale");
            });
            //online:{"time":"2020-04-09T14:46:07.6676474","account_id":12992,"payload_uuid":"c4bec4c2-725b-40f9-b484-e45061e8463c","payload":{"device_id":225294513,"status":"ok","os":{"id":1,"name":"Microsoft Windows","type":"windows"}},"conversation_uuid":"fad513ed-7b9b-4ed5-9d16-fdcdc87b8eb6","object_id":"d035f41c-71e3-46a0-ace3-3d4e4176435c"}
            //offline: {"time":"2020-04-09T15:08:56.9412237","account_id":12992,"payload_uuid":"c4bec4c2-725b-40f9-b484-e45061e8463c","payload":{"device_id":225294513,"status":"offline","os":{"id":1,"name":"Microsoft Windows","type":"windows"}},"conversation_uuid":"b9076415-ca19-4218-8965-c94c74a5b715","object_id":"fc865271-5b5f-4cba-8da2-5e930d94d8cb"}

            it("doesnt double send if we get an activitiy WHILE we're saving", function (){
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 0, title:"math practice"});//got another activity at some point in that last minute
                //quickly elapse 59 minutes min
                for(var i=0;i<59;i++){
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                }
                now = now + 60000 -1;//add just short of our hour
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 1, title:"math practice"});//this will happen just before the window closes
                now = now + 1;//add the exact hour
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 2, title:"math practice"});//this will happen just after the window closes
                _.delay.mostRecentCall.args[0]();//to avoid our race condition, it doesnt post here
                expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();//not yet, we need it to delay 
                now = now + 60000;//add another minute to get into our secondary window
                _.delay.mostRecentCall.args[0]();//now it's time
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();//not yet, we need it to delay 
                //successfully gets the urls to upload
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                //right after the resolve, we got ourselves another one, wow what are the odds
                //in the same timeframe. it's as if time has stopped
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 3, title:"math practice"});
                //now we sort out all the items, gzip em up, and upload them at 
                //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(2);
                expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/" + 0);
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T03:00:00.000");
                expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/" + 1);
                expect(savedObjs.objects[1].time).toEqual("2020-04-09T03:59:59.999");
            });

            it("anchors on the actual hour breaks instead of an hour since the start", function (){
                //instead of on the hour, we'll wake up at 20 minutes after
                now = 1586400000000;//apr 8 2020 @ 10:40pm (eastern daylight)
                configDfds =[];
                uploadDfds = [];
                headDfds =[];
                activityCollector._resetForTest();
                restarter._resetForTests();
                spyOn(activityCollector.pal, "start");
                spyOn(activityCollector.pal, "on");
                spyOn(activityCollector.api, "getActivityConfig").andCallFake(function(){
                    var dfd = $.Deferred();
                    configDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "uploadToUrl").andCallFake(function(){
                    var dfd = $.Deferred();
                    uploadDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "checkHeadOfUrl").andCallFake(function(){
                    //for this test we will always assume the first load
                    return $.Deferred().reject({ error_description: "Not found", status:404});                    
                });
                runs(function () {
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });

                runs(function () {
                    //when we start out, there will be an established timeframe that should end in 20 minutes
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 0, title:"math practice"});//got another activity at some point in that last minute
                    //quickly elapse 19 min
                    for(var i=0;i<19;i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                    }
                    now = now + 60000 -1;//make that just short of our 20 minutes
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 1, title:"math practice"});//this will happen just before the window closes
                    now = now + 1;//add the exact hour
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 2, title:"math practice"});//this will happen just after the window closes
                    _.delay.mostRecentCall.args[0]();//to avoid our race condition, it doesnt post here
                    expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();//not yet, we need it to delay 
                    now = now + 60000;//add another minute to get into our secondary window
                    _.delay.mostRecentCall.args[0]();//now it's time
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();//not yet, we need it to delay 
                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //right after the resolve, we got ourselves another one, wow what are the odds
                    //in the same timeframe. it's as if time has stopped
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 3, title:"math practice"});
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
    objects: jasmine.any(Array)
                    });
                    expect(savedObjs.objects.length).toEqual(3);
                    expect(savedObjs.objects[0].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[0].payload.status).toEqual("offline");
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T02:00:00.000");    
                    expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/" + 0);
                    expect(savedObjs.objects[1].time).toEqual("2020-04-09T02:40:00.000");
                    expect(savedObjs.objects[2].payload.url).toEqual("https://www.zearn.com/" + 1);
                    expect(savedObjs.objects[2].time).toEqual("2020-04-09T02:59:59.999");
                });                
            });

            it("specifies the data so that being inactive across a boundary doesnt lose tracking", function (){
                //story: look at zearn, hour break, wait 30 minutes, look at facebook, hour break,
                //should have reference to zearn in the opening timeframe
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/", title:"math practice"});
                //quickly elapse our hour +1min
                for(var i=0;i<61;i++){
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                }
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                uploadDfds[0].resolve();//hey it was successful! lets call our timer again
                //quickly elapse another 29 min
                for(var i=0;i<29;i++){
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                }
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.facebook.com/", title:"waste that time"});//got another activity at some point in that last minute

                //quickly elapse the remaining 31 min
                for(var i=0;i<31;i++){
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                }
                //resolve the config request
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(2);
                expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/");
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
                expect(savedObjs.objects[0].stale).toEqual("stale");
                expect(savedObjs.objects[1].payload.url).toEqual("https://www.facebook.com/" );
                expect(savedObjs.objects[1].time).toEqual("2020-04-09T04:30:00.000");
                expect(savedObjs.objects[1].stale).toBeFalsy();
            });

            it("calculates properly if you didnt change anything in the last hour", function (){
                //story: look at zearn
                //stay on zearn for two hours without changing 
                //let 2 hours elapse
                //should have 2 calls made to the upload
                //and the second one should have a reference to zearn 
                //despite no activities explicitly happening in that timeframe
                
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/", title:"math practice"});
                //quickly elapse our hour +1min
                for(var i=0;i<61;i++){
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                }
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                uploadDfds[0].resolve();//hey it was successful! lets call our timer again
                //quickly elapse our hour (note we're already on our one-minute offset from above)
                for(var i=0;i<60;i++){
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                }
                //note this is the second config resolve
                expect(configDfds.length).toEqual(2);
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(1);
                expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/");
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
                expect(savedObjs.objects[0].stale).toEqual("stale");
            });

            it("does not add the starting activity to the hour first if we were asleep that whole time",function () {
                //story: look at zearn
                //sleep for 3 hours
                //should have 2 calls made to the upload
                //and the last one should not have reference to zearn
                //because it was asleep durign that entire time
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/", title:"math practice"});
                //sleep for 2 hours
                now = now + 60000*60*3;//sleep for two hours
                _.delay.mostRecentCall.args[0]();//callback time!    
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                uploadDfds[0].resolve();//hey it was successful! lets call our timer again
                _.delay.mostRecentCall.args[0]();//callback time again  
                //note this is the second config resolve
                expect(configDfds.length).toEqual(2);
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(1);
                expect(savedObjs.objects[0].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                expect(savedObjs.objects[0].payload.status).toEqual("offline");
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
            });

            it("doesnt put the offline before the activity", function () {
                //just an edge case to check in on
                //thinking about it being like a millisecond before the timer hits
                //and wondering if that's going to say offline is before the activity
                //since it is having to be estimated
                //to rep, we are going to set the time to a millisecond before the 
                //tick and get our activity. 
                //but then go to sleep for 1.5 min
                //and tick. then we'll verify that our offline timestamps are still maintaining
                //the >= invariant
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                now = now + 59999;//so close to a minute
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/", title:"math practice"});
                //sleep for 30 seconds now
                now = now +60000*1.5+1;//over a minute and a half later
                //wakey wakey!
                _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                //and we fast forward to the end of our timeframe
                for(var i=0;i<60;i++){
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                }
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(5);
                //first one is the offline placeholder
                expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/");
                expect(savedObjs.objects[1].time).toEqual("2020-04-09T03:00:59.999");
                expect(savedObjs.objects[2].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                expect(savedObjs.objects[2].payload.status).toEqual("offline");
                expect(savedObjs.objects[2].time).toEqual("2020-04-09T03:01:59.999");

            });

            it("doesnt crash if we have no activities", function (){
                for(var i=0;i<61;i++){
                    now = now + 60000;
                    _.delay.mostRecentCall.args[0]();//it's been a minute now!
                }
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                //i dont really know what we want here, but mostly i want this use case
                //to not blow up
            });

            it("catches up without missplacing extra hours of data", function () {
                now = 1589224020000;//"2020-05-11T15:07" EST
                configDfds =[];
                uploadDfds = [];
                headDfds =[];
                activityCollector._resetForTest();
                restarter._resetForTests();
                spyOn(activityCollector.pal, "start");
                spyOn(activityCollector.pal, "on");
                spyOn(activityCollector.api, "getActivityConfig").andCallFake(function(){
                    var dfd = $.Deferred();
                    configDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "uploadToUrl").andCallFake(function(){
                    var dfd = $.Deferred();
                    uploadDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "checkHeadOfUrl").andCallFake(function(){
                    //for this test we will always assume the first load
                    return $.Deferred().reject({ error_description: "Not found", status:404});                    
                });
                runs(function () {
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });

                runs(function () {
                    //when we start out, there will be an established timeframe that should end in 20 minutes
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 0, title:"math practice"});//got another activity at some point in that last minute
                    //and now we go to sleep 
                    now = 1589295840000;//2020-05-12T11:04 EST
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-05-11T19:00:00.000Z", 0);
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    uploadDfds[0].resolve();//hey it was successful! lets call our timer again
                    //TODO: test if this is different if we start with an activitiy first
                    //onACtiviy(when?)
                    //boring stuff as we fast catch up on our offline times
                    for(var i = 1; i<= 4; i++){
                        now += 60000;
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                        expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-05-11T" + (19 + i) +":00:00.000Z", 0);//20-23
                        configDfds[i].resolve({
                            upload_url: "https://example.com/upload?presigned",
                            head_url: "https://example.com/head?presigned"
                        });
                        uploadDfds[i].resolve();//hey it was successful! lets call our timer again
                    }
                    //look we're on a different day now
                    for(i = 5; i<= 7; i++){
                        now += 60000;
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!    
                        expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-05-12T0" + (i-5) +":00:00.000Z", 0);//00-02
                        configDfds[i].resolve({
                            upload_url: "https://example.com/upload?presigned",
                            head_url: "https://example.com/head?presigned"
                        });
                        uploadDfds[i].resolve();//hey it was successful! lets call our timer again
                    }
                    //ooh but now we're going to get told that we need to throw data away!
                    now += 60000;
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!   
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-05-12T03:00:00.000Z", 0);
                    configDfds[8].resolve({
                        "reason":"time-restricted",
                        "start_time":"2020-05-12T11:30:00.000Z",
                        "end_time":"2020-05-12T02:00:00.000Z"
                    }); //note, no upload shoudl happen here, so we'll have a discconnect between conigDfds.length and uploadDfds.length
                    //so we should now start up on T11
                    now += 60000;
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!   
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-05-12T11:00:00.000Z", 0);
                    configDfds[9].resolve({
                        "reason":"time-restricted",
                        "start_time":"2020-05-12T11:30:00.000Z",
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    uploadDfds[8].resolve();//remember we skipped an upload so 7 is 1 behind 8
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs.objects.length).toEqual(1);//a single offline
                    expect(savedObjs.objects[0].payload.status).toEqual("offline");
                    expect(savedObjs.objects[0].time).toEqual("2020-05-12T11:30:00.000");
                    //now we should have offline hours until T15
                    //where we expect there to be an offline at 1500
                    //an ok at 1504 and a stale zearn/0 at 1504
                    for(i=12;i<=14;i++){
                        now += 60000;
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!   
                        expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-05-12T" + i.toString() +":00:00.000Z", 0);
                        configDfds[i-2].resolve({
                            upload_url: "https://example.com/upload?presigned",
                            head_url: "https://example.com/head?presigned"
                        });
                        gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                        //lets unzip this and verify it's what we expect
                        savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                        expect(savedObjs.objects.length).toEqual(1);//a single offline
                        expect(savedObjs.objects[0].payload.status).toEqual("offline");
                        expect(savedObjs.objects[0].time).toEqual("2020-05-12T" + i.toString()+ ":00:00.000");
                        uploadDfds[i-3].resolve();//hey it was successful! lets call our timer again
                    }
                    //time for live data now
                    for(var i=16;i<=60;i++){//finish advancing, with an activity every time
                        now += 60000;
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!   
                         onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/" + 1, title:"math practice"});//got another activity at some point in that last minute
                    }
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-05-12T15:00:00.000Z", 0);
                    configDfds[13].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //we now expect there to be an offline at 1500
                    //an ok at 1504, a stale zearn/0 at 1504
                    //a zearn/1 at 1517
                    gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs.objects.length).toEqual(46);//our 3 to start and the new activities after
                    expect(savedObjs.objects[0].payload.status).toEqual("offline");
                    expect(savedObjs.objects[0].time).toEqual("2020-05-12T15:00:00.000");
                    //our ok at 1504
                    expect(savedObjs.objects[1].payload.status).toEqual("ok");
                    expect(savedObjs.objects[1].time).toEqual("2020-05-12T15:04:00.000");
                    //our stale zearn/0 at 1504
                    expect(savedObjs.objects[2].stale).toEqual("stale");
                    expect(savedObjs.objects[2].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[2].time).toEqual("2020-05-12T15:04:00.000");
                    //and now zearn/1 at 1517
                    expect(savedObjs.objects[3].payload.url).toEqual("https://www.zearn.com/1");
                    expect(savedObjs.objects[3].time).toEqual("2020-05-12T15:17:00.000");

                });
            });
//  {
//      "cabra_name":"dyknow.me/participant_activity_monitor",
//      "objects":[
//          {
//              "time":"2020-03-23T16:21:17.7871901",
//              "account_id":457780,
//              "payload_uuid":"c4bec4c2-725b-40f9-b484-e45061e8463c",
//              "payload":{"status":"ok","os":{"id":4,"name":"Website","type":"web"}},
//              "conversation_uuid":"6cc1a99b-c9ce-4143-b32d-66a692d61eed",
//              "object_id":"47cc7598-3da3-456e-b37c-2b5ac9c44e9c"
//             },
//             {
//                 "time":"2020-04-09T14:46:08.2950771",
//                 "account_id":12992,
//                 "payload_uuid":"39c4f580-5f5b-417f-8b55-b432802aa1d9",
//                 "payload":{
//                     "name":"Google Chrome",
//                     "identifier":"chrome_exe",
//                     "url":"google.com",
//                     "title":"search results - Google Chrome",
//                     "search":"how to program in javascript"},
//                     "conversation_uuid":"cf677ca7-78c5-49f9-93f3-6945d8f8f862",
//                     "object_id":"200a93a3-be29-4055-8236-8c39c40c548c"
//                 }
//             ]
//     }
        });

        describe("asks for specific url based on data and head requests", function () {
            var configDfds=[];
            var uploadDfds = [];
            var headDfds = [];
            var now;//
            beforeEach(function (){
                now = 1586401200000;//apr 8 2020 @ 11:00pm (eastern daylight)
                configDfds =[];
                uploadDfds = [];
                headDfds =[];
                activityCollector._resetForTest();
                restarter._resetForTests();
                chrome.storage.local.mock();
                chrome.storage.local.failSet = false;
                chrome.runtime.getManifest.andReturn({ version: "7.1.2.3"});
                activityCollector.info.appVersion = "5.0 (X11; CrOS x86_64 13421.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.175 Safari/537.36";
                spyOn(activityCollector.pal, "start");
                spyOn(activityCollector.pal, "on");
                spyOn(_, "delay");
                spyOn(_, "now").andCallFake(function(){
                    return now;
                });
                spyOn(activityCollector.api, "getActivityConfig").andCallFake(function(){
                    var dfd = $.Deferred();
                    configDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "uploadToUrl").andCallFake(function(){
                    var dfd = $.Deferred();
                    uploadDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "checkHeadOfUrl").andCallFake(function(){
                    var dfd = $.Deferred();
                    headDfds.push(dfd);
                    return dfd;
                });
                runs(function () {
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
            });

            it("sends the window start date/time if we advance normally", function (){
                for(var i=0;i<61;i++){
                    now = now + 60000;
                    _.delay.mostRecentCall.args[0]();//it's been a minute now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-04-09T03:00:00.000Z", 0);
            });

            it("sends the window start date/time if we advance after sleep", function (){
                now = now + 60000*60*2;//advance 2 hours
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-04-09T03:00:00.000Z", 0);
            });

            it("sends the window start date/time when making up old times", function (){
                now = now + 60000*(60*2 + 2);//advance 2 hours and 2 minutes
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-04-09T03:00:00.000Z", 0);
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[0].reject({status:404});//a successful resolve means that it exists
                uploadDfds[0].resolve();//hey it was successful! lets call our timer again
                _.delay.mostRecentCall.args[0]();//callback time again  
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-04-09T04:00:00.000Z", 0);
            });

            it("asks for a new url if file already uploaded in that spot", function (){
                now = now + 60000*60*2;//advance 2 hours
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-04-09T03:00:00.000Z", 0);
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[0].resolve();//a successful resolve means that it exists
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-04-09T03:00:00.000Z", 1);
            });
        });

        describe("reason codes", function(){
            var configDfds=[];
            var uploadDfds = [];
            var headDfds = [];
            var now;//
            beforeEach(function (){
                now = 1586401200000;//apr 8 2020 @ 11:00pm (eastern daylight)
                configDfds =[];
                uploadDfds = [];
                headDfds =[];
                activityCollector._resetForTest();
                restarter._resetForTests();
                chrome.storage.local.mock();
                chrome.storage.local.failSet = false;
                chrome.runtime.getManifest.andReturn({ version: "7.1.2.3"});
                activityCollector.info.appVersion = "5.0 (X11; CrOS x86_64 13421.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.175 Safari/537.36";
                spyOn(activityCollector.pal, "start");
                spyOn(activityCollector.pal, "on");
                spyOn(_, "delay");
                spyOn(_, "now").andCallFake(function(){
                    return now;
                });
                spyOn(activityCollector.api, "getActivityConfig").andCallFake(function(){
                    var dfd = $.Deferred();
                    configDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "uploadToUrl").andCallFake(function(){
                    var dfd = $.Deferred();
                    uploadDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "checkHeadOfUrl").andCallFake(function(){
                    //for these tests we will always assume the first load
                    return $.Deferred().reject({ error_description: "Not found", status:404});                    
                });
                runs(function () {
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
            });

            it("doesnt try an upload if disabled", function () {
                now = now + 60000*(60*2 + 2);//advance 2 hours and 2 minutes
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "disabled"
                });
                expect(activityCollector.api.checkHeadOfUrl).not.toHaveBeenCalled();
                expect(activityCollector.api.uploadToUrl).not.toHaveBeenCalled();
                //now 
                for(var i=0;i<58;i++){
                    now = now + 60000;
                    _.delay.mostRecentCall.args[0]();//callback time again  
                    expect(configDfds.length).toEqual(1);
                }
            });

            it("dumps the old activites if disabled", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "disabled"
                });
                expect(activityCollector.api.checkHeadOfUrl).not.toHaveBeenCalled();
                expect(activityCollector.api.uploadToUrl).not.toHaveBeenCalled();
                //fast forward an hour
                for(var i=61;i<121;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                //oh hey look they changed things up now
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(61);
                //first one is the stale one from before
                //then the next one starts at 60
                for(var i=1;i<61;i++){
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/"+(i+59).toString());
                }
            });

            it("doesnt try an upload if expired", function () {
                now = now + 60000*(60*2 + 2);//advance 2 hours and 2 minutes
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "expired"
                });
                expect(activityCollector.api.checkHeadOfUrl).not.toHaveBeenCalled();
                expect(activityCollector.api.uploadToUrl).not.toHaveBeenCalled();
                //now 
                for(var i=0;i<58;i++){
                    now = now + 60000;
                    _.delay.mostRecentCall.args[0]();//callback time again  
                    expect(configDfds.length).toEqual(1);
                }
            });

            it("dumps the old activites if expired", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "expired"
                });
                expect(activityCollector.api.checkHeadOfUrl).not.toHaveBeenCalled();
                expect(activityCollector.api.uploadToUrl).not.toHaveBeenCalled();
                //fast forward an hour
                for(var i=61;i<121;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                //oh hey look they changed things up now
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(61);
                //first one is the stale one from before
                //then the next one starts at 60
                for(var i=1;i<61;i++){
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/"+(i+59).toString());
                }
            });

            it("doesnt try an upload if time-restricted", function () {
                now = now + 60000*(60*2 + 2);//advance 2 hours and 2 minutes
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "time-restricted"
                });
                expect(activityCollector.api.checkHeadOfUrl).not.toHaveBeenCalled();
                expect(activityCollector.api.uploadToUrl).not.toHaveBeenCalled();
                //now 
                for(var i=0;i<58;i++){
                    now = now + 60000;
                    _.delay.mostRecentCall.args[0]();//callback time again  
                    expect(configDfds.length).toEqual(1);
                }
            });

            it("dumps the old activites if time-restricted", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "time-restricted",
                    start_time: "2020-04-09T04:15:00.000Z",
                    end_time: "2020-04-09T03:00:00.000Z"//weird hours
                });
                expect(activityCollector.api.checkHeadOfUrl).not.toHaveBeenCalled();
                expect(activityCollector.api.uploadToUrl).not.toHaveBeenCalled();
                //fast forward an hour
                for(var i=61;i<121;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                //oh hey look they changed things up now. too late, we threw that stuff away
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(60);
                //first one is the stale one from before
                //then the next one starts at 60
                expect(savedObjs.objects[0].payload.status).toEqual("offline");
                for(var i=1;i<60;i++){
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/"+(i+60).toString());
                }
            });

            it("doesnt try an upload if an unknown reason encountered", function () {
                now = now + 60000*(60*2 + 2);//advance 2 hours and 2 minutes
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "something-unknown"
                });
                expect(activityCollector.api.checkHeadOfUrl).not.toHaveBeenCalled();
                expect(activityCollector.api.uploadToUrl).not.toHaveBeenCalled();
                //now 
                for(var i=0;i<58;i++){
                    now = now + 60000;
                    _.delay.mostRecentCall.args[0]();//callback time again  
                    expect(configDfds.length).toEqual(1);
                }
            });

            it("dumps the old activites if an unknown reason encountered", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "something-madeup"
                });
                expect(activityCollector.api.checkHeadOfUrl).not.toHaveBeenCalled();
                expect(activityCollector.api.uploadToUrl).not.toHaveBeenCalled();
                //fast forward an hour
                for(var i=61;i<121;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                //oh hey look they changed things up now
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(61);
                //first one is the stale one from before
                //then the next one starts at 60
                for(var i=1;i<61;i++){
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/"+(i+59).toString());
                }
            });

            it("dumps the pre-start activites if time-restricted", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "time-restricted",
                    start_time: "2020-04-09T03:30:00.000Z",
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.created).toEqual("2020-04-09T03:30:00.000");
                expect(savedObjs.objects.length).toEqual(31);
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T03:30:00.000");
                expect(savedObjs.objects[0].stale).toBeTruthy();
                expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/29");
                expect(savedObjs.objects[1].time).toEqual("2020-04-09T03:30:00.000");
                expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/30");
                
                for(var i=1;i<31;i++){
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/"+(i+29).toString());
                }
            });

            it("updates the offline time if time-restricted", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                now = now + 60000 *45;//sleepy 45 minutes
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/45", title:"math practice"});                    

                //fast forward 1 hour + 1 minute
                for(var i=46;i<62;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "time-restricted",
                    start_time: "2020-04-09T03:30:00.000Z",
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(18);
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T03:30:00.000");
                expect(savedObjs.objects[0].payload.status).toEqual("offline");
                expect(savedObjs.objects[1].time).toEqual("2020-04-09T03:45:00.000");
                expect(savedObjs.objects[1].payload.status).toEqual("ok");
                
                for(var i=2;i<16;i++){
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/"+(i+43).toString());
                }
            });

            it("dumps the post-end activites if time-restricted", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "time-restricted",
                    end_time: "2020-04-09T03:30:00.000Z",
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.completed).toEqual("2020-04-09T03:30:00.000");
                expect(savedObjs.objects.length).toEqual(30);
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T03:00:00.000");
                for(var i=0;i<30;i++){
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/"+i);
                }
            });

            it("communicates ip restricted if ip-restricted", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "ip-restricted",
                    ip_address: "1.1.1.1",
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(1);
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T03:00:00.000");
                expect(savedObjs.objects[0].payload.status).toEqual("ip-restricted: 1.1.1.1");
            });

            it("communicates ip restricted if timeandip-restricted", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    reason: "ip-restricted",
                    ip_address: "1.1.1.1",
                    start_time: "2020-04-09T03:30:00.000Z",
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(1);
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T03:30:00.000");
                expect(savedObjs.objects[0].payload.status).toEqual("ip-restricted: 1.1.1.1");
            });

            xit("throws away unneeded windows when sleeping overnight", function () {
                throw new Error("not implemented");
            });

            xit("catches up needed data after switchboard delay", function () {
                throw new Error("not implemented");
            });

        });

        describe("handles errors", function () {
            var configDfds=[];
            var uploadDfds = [];
            var headDfds = [];
            var now;//
            beforeEach(function (){
                now = 1586401200000;//apr 8 2020 @ 11:00pm (eastern daylight)
                configDfds =[];
                uploadDfds = [];
                headDfds =[];
                activityCollector._resetForTest();
                restarter._resetForTests();
                chrome.storage.local.mock();
                chrome.storage.local.failSet = false;
                chrome.runtime.getManifest.andReturn({ version: "7.1.2.3"});
                activityCollector.info.appVersion = "5.0 (X11; CrOS x86_64 13421.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.175 Safari/537.36";
                spyOn(activityCollector.pal, "start");
                spyOn(activityCollector.pal, "on");
                spyOn(_, "delay");
                spyOn(_, "now").andCallFake(function(){
                    return now;
                });
                spyOn(activityCollector.api, "getActivityConfig").andCallFake(function(){
                    var dfd = $.Deferred();
                    configDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "uploadToUrl").andCallFake(function(){
                    var dfd = $.Deferred();
                    uploadDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "checkHeadOfUrl").andCallFake(function(){
                    var dfd = $.Deferred();
                    headDfds.push(dfd);
                    return dfd;
                });
                runs(function () {
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
            });

            it("like the config being rejected by retrying next minute", function(){
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                 for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].reject();//AHH THE BURNING!!!
                expect(activityCollector.api.checkHeadOfUrl).not.toHaveBeenCalled();
                expect(activityCollector.api.uploadToUrl).not.toHaveBeenCalled();
                //but its okay one minute later...
                now = now + 60000;
                _.delay.mostRecentCall.args[0]();//callback time again  
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[0].reject({ error_description: "Not found", status:404});
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(60);
                for(var i=0; i<60; i++) {
                    expect(savedObjs.objects[i].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/" + i);
                }
            });
            it("like the head being http rejected by retrying next minute", function(){
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[0].reject();//AHH THE BURNING!!!!
                expect(activityCollector.api.uploadToUrl).not.toHaveBeenCalled();
                //but its okay one minute later...
                now = now + 60000;
                _.delay.mostRecentCall.args[0]();//callback time again  
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[1].reject({ error_description: "Not found", status:404});
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(60);
                for(var i=0; i<60; i++) {
                    expect(savedObjs.objects[i].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/" + i);
                }
            });
            it("like the put being rejected by retrying next minute", function(){
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[0].reject({ error_description: "Not found", status:404});
                uploadDfds[0].reject();//AHH THE BURNING!!!!
                //but its okay one minute later...
                now = now + 60000;
                _.delay.mostRecentCall.args[0]();//callback time again  
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                //for this test we will interpret this as not having saved successfully
                headDfds[1].reject({ error_description: "Not found", status:404});
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(60);
                for(var i=0; i<60; i++) {
                    expect(savedObjs.objects[i].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/" + i);
                }
            });

            it("delaySwitchboard active dumps data outside the guaranteed timeframe", function () {
                delaySwitchboardTracker.delaySwitchboard = true;
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+(100+i), title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    if (i > 32){
                        delaySwitchboardTracker.reset();
                        //bc it's not gonna be exact necessarily and that's okay!
                        //we'll clean it up in post production
                    }
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+(200+i), title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                    if (i === 33){
                        //so it gets complicated bc we have to check up on all these other timeframes now. 
                        expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-04-09T03:00:00.000Z",0);
                        configDfds[0].resolve({
                            reason: "time-restricted",
                            end_time: "2020-04-09T03:00:00.000Z",
                            start_time: "2020-04-09T05:30:00.000Z"
                        });
                    }
                }
                now = now + 60000;//advance 1 minute
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!

                //it will be just like a time delay
                configDfds[1].resolve({
                    reason: "time-restricted",
                    start_time: "2020-04-09T05:30:00.000Z",
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                //no upload already there
                headDfds[0].reject({ error_description: "Not found", status:404});
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.created).toEqual("2020-04-09T05:30:00.000");
                expect(savedObjs.objects.length).toEqual(31);
                //im not totally sold on this configuration. I can certainly imagine
                //scenarios where this is not the exact representation. for example 
                //therem is no stale? that doesnt seem right here
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T05:30:00.000");
                expect(savedObjs.objects[0].payload.status).toEqual("offline");
                expect(savedObjs.objects[1].time).toEqual("2020-04-09T05:30:00.000");
                expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/228");
                
                for(var i=2;i<31;i++){
                    expect(savedObjs.objects[i].payload.url).toEqual("https://www.zearn.com/"+(200+i+27).toString());
                }
            });

            it("specifically the put will retry only twice", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                //fast forward 1 hour + 1 minute
                for(var i=0;i<61;i++){
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/"+i, title:"math practice"});                    
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[0].reject({ error_description: "Not found", status:404});
                uploadDfds[0].reject();//AHH THE BURNING!!!!
                //but its okay one minute later...
                now = now + 60000;
                _.delay.mostRecentCall.args[0]();//callback time again  
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[1].reject({ error_description: "Not found", status:404});
                uploadDfds[1].reject();//AHH THE BURNING!!!!
                //but its okay one minute later...
                now = now + 60000;
                _.delay.mostRecentCall.args[0]();//callback time again  
                //what's this? it didnt call it again? Why yes! That's correct
                expect(activityCollector.api.getActivityConfig.calls.length).toEqual(2);
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/200", title:"math practice"});
                //little back of the napkin math here, we're at 1 hour + 3 minutes. so lets fast forward
                //another 58 minutes to get us past the target timeframe
                for(var i=0;i<58;i++){
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                configDfds[2].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[2].reject({ error_description: "Not found", status:404});
                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(3);
                expect(savedObjs.objects[0].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/59");
                expect(savedObjs.objects[0].stale).toBeTruthy();
                expect(savedObjs.objects[2].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                expect(savedObjs.objects[2].payload.url).toEqual("https://www.zearn.com/200");
                //lets check one more thing that if we do a new window without a success that we dont
                //try there. not sure why it would be any better
                uploadDfds[2].reject();//AHH THE BURNING!!!!
                //but its okay one minute later...
                now = now + 60000;
                _.delay.mostRecentCall.args[0]();//callback time again  
                //what's this? it didnt call it again? Why yes! That's correct
                expect(activityCollector.api.getActivityConfig.calls.length).toEqual(3);
            });

            it("resets put fail if it succeeds", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/1", title:"math practice"});                    
                //fast forward 3 hours + 3 minutes just to get 3 windows ready
                //we already know that we retry and dump data
                now = now + ANHOUR * 3 + 60000*3;
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                configDfds[0].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[0].reject({ error_description: "Not found", status:404});
                uploadDfds[0].reject();//AHH THE BURNING!!!!
                now = now + 60000;//advance 1 minute
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                configDfds[1].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[1].reject({ error_description: "Not found", status:404});
                uploadDfds[1].reject();//AHH THE BURNING!!!!
                //rejection gives up per prior test now. 
                now = now + 60000;//advance 1 minute
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                //there was another window queued up though so we expect it to try 
                //again on the next window of time. 
                //I'm cheating with this assumption but keep
                //following here as here's a new window being uploaded now
                configDfds[2].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[2].reject({ error_description: "Not found", status:404});
                uploadDfds[2].resolve();//oh hey! a success! This should reset our put counter
                now = now + 60000;//advance 1 minute 
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                //once again cheating 
                //there was another window queued up though so we expect it to try 
                //again on the next window of time. 
                //I'm cheating with this assumption but keep
                //following here as here's a new window being uploaded now
                configDfds[3].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[3].reject({ error_description: "Not found", status:404});
                uploadDfds[3].reject();//AHH THE BURNING!!!!
                now = now + 60000;//advance 1 minute
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                //assert this time that is wants to rerty despite all this thanks to the reset
                expect(activityCollector.api.getActivityConfig.calls.length).toEqual(5);
            });

            it("continuous fails do not double up", function () {
                var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                now = now + 60000;//advance 1 minute
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});                    
                //fast forward 1 hour + 1 minute
                for (var i = 0; i < 61; i++)
                {
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                configDfds[0].reject();//AHH THE BURNING!!!!
                //we expect at this point it has put our data back on the activities list for the retry
                now = now + 60000;//advance 1 minute
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now! 
                configDfds[1].reject();//AHH THE BURNING!!!!
                //we expect at this point it has put our data back on the activities list for the retry
                now = now + 60000;//advance 1 minute
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                configDfds[2].reject();//AHH THE BURNING!!!!
                //we expect at this point it has put our data back on the activities list for the retry
                now = now + 60000;//advance 1 minute
                _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                configDfds[3].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[0].reject({ error_description: "Not found", status:404});
                uploadDfds[0].resolve();
                 //we're 4 min past the hour, fast forward 56 more
                for (var i = 0; i < 56; i++)
                {
                    now = now + 60000;//advance 1 minute
                    _.delay.mostRecentCall.args[0]();//it's been a minute of computer time now!
                }
                configDfds[4].resolve({
                    upload_url: "https://example.com/upload?presigned",
                    head_url: "https://example.com/head?presigned"
                });
                headDfds[1].reject({ error_description: "Not found", status:404});

                var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                //lets unzip this and verify it's what we expect
                var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                expect(savedObjs).toEqual({
                    cabra_name:"dyknow.me/participant_activity_monitor",
                    created: jasmine.any(String),
                    completed:jasmine.any(String),
                    os_type: "chromebook",
                    os_version: "Chrome OS 86.0.4240.175 x64",
                    client_version: "7.1.2.3",
objects: jasmine.any(Array)
                });
                expect(savedObjs.objects.length).toEqual(1);
                expect(savedObjs.objects[0].stale).toEqual("stale");
                expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/0");
                expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
            });
        });

        describe("recovers from crashes and restarts", function () {
            var configDfds=[];
            var uploadDfds = [];
            var headDfds = [];
            var now;//
            beforeEach(function (){
                now = 1586401200000;//apr 8 2020 @ 11:00pm (eastern daylight)
                configDfds =[];
                uploadDfds = [];
                headDfds =[];
                activityCollector._resetForTest();
                restarter._resetForTests();
                chrome.storage.local.mock();
                chrome.storage.local.failSet = false;
                chrome.runtime.getManifest.andReturn({ version: "7.1.2.3"});
                activityCollector.info.appVersion = "5.0 (X11; CrOS x86_64 13421.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.175 Safari/537.36";
                spyOn(activityCollector.pal, "start");
                spyOn(activityCollector.pal, "on");
                spyOn(_, "delay");
                spyOn(_, "now").andCallFake(function(){
                    return now;
                });
                spyOn(activityCollector.api, "getActivityConfig").andCallFake(function(){
                    var dfd = $.Deferred();
                    configDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "uploadToUrl").andCallFake(function(){
                    var dfd = $.Deferred();
                    uploadDfds.push(dfd);
                    return dfd;
                });
                spyOn(activityCollector.api, "checkHeadOfUrl").andCallFake(function(){
                    //for these tests we will always assume the first load
                    return $.Deferred().reject({ error_description: "Not found", status:404});                    
                });        
                spyOn(Logger, "error");
                spyOn(Logger, "info");
            });

            it("saves backup data to disk every so often", function (){
                runs(function () {
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    //every minute it verifies this faithfully but we need an extra minute of space after
                    //that to avoid race conditions. note the last activity wont be called up bc it happens
                    //after the timeframe
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 30; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }
                    expect(chrome.storage.local.set).toHaveBeenCalledWith({
                        "activitycollector_cache": {
                            collectionWindowTime: (+new Date("2020-04-09T04:00:00.000Z")),
                            lastTime: (+new Date("2020-04-09T03:04:00.000Z")),
                            targetTime: (+new Date("2020-04-09T04:01:00.000Z")),
                            activities: [{
                                payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                                time: "2020-04-09T03:00:00.000",
                                payload: { 
                                    name:"Google Chrome", 
                                    identifier: "chrome_exe", 
                                    url: "https://www.zearn.com/0", 
                                    title:"math practice"
                                }
                            }]
                        }
                    }, jasmine.any(Function));
                });
            });

            it("updates the backup on successful upload", function (){
                runs(function () {
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    //every minute it verifies this faithfully but we need an extra minute of space after
                    //that to avoid race conditions. note the last activity wont be called up bc it happens
                    //after the timeframe
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 61; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    uploadDfds[0].resolve();
                    expect(chrome.storage.local.set).toHaveBeenCalledWith({
                        "activitycollector_cache": {
                            collectionWindowTime: null,
                            lastTime:  (+new Date("2020-04-09T04:01:00.000Z")),
                            targetTime: null,
                            activities: [{
                                payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                                time: "2020-04-09T04:00:00.000",
                                stale: "stale",
                                payload: { 
                                    name:"Google Chrome", 
                                    identifier: "chrome_exe", 
                                    url: "https://www.zearn.com/0", 
                                    title:"math practice"
                                }
                            }]
                        }
                    }, jasmine.any(Function));
                });
            });

            it("updates the backup on extensionRestart", function (){
                runs(function () {
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    //every minute it verifies this faithfully but we need an extra minute of space after
                    //that to avoid race conditions. note the last activity wont be called up bc it happens
                    //after the timeframe
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    restarter.restart();
                    expect(chrome.storage.local.set).toHaveBeenCalledWith({
                        "activitycollector_cache": {
                            collectionWindowTime: (+new Date("2020-04-09T04:00:00.000Z")),
                            lastTime: (+new Date("2020-04-09T03:02:00.000Z")),
                            targetTime: (+new Date("2020-04-09T04:01:00.000Z")),
                            activities: [{
                                payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                                time: "2020-04-09T03:00:00.000",
                                payload: { 
                                    name:"Google Chrome", 
                                    identifier: "chrome_exe", 
                                    url: "https://www.zearn.com/0", 
                                    title:"math practice"
                                }
                            }]
                        }
                    }, jasmine.any(Function));
                });
            });

            it("handles out of disk errors", function (){
                chrome.storage.local.failSet = true;
                runs(function () {
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    //every minute it verifies this faithfully but we need an extra minute of space after
                    //that to avoid race conditions. note the last activity wont be called up bc it happens
                    //after the timeframe
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 30; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }
                    expect(chrome.storage.local.remove).toHaveBeenCalledWith(
                        "activitycollector_cache", 
                        jasmine.any(Function)
                    );
                });
            });

            it("loads backup data from disk on startup when user comes after", function (){
                runs(function () {
                    now = (+new Date("2020-04-09T03:15:00.000Z"));
                    chrome.storage.local._store.activitycollector_cache = {
                        collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        lastTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                        activities: [{
                            payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                            time: "2020-04-09T02:10:00.000",
                            payload: { 
                                name:"Google Chrome", 
                                identifier: "chrome_exe", 
                                url: "https://www.zearn.com/0", 
                                title:"math practice"
                            }
                        }]
                    };
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T02:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T03:00:00.000");
                
                    expect(savedObjs.objects.length).toEqual(2);
                    //there will be the automatically added offline at 
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T02:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[0].payload.status).toEqual("offline");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //there's the activity that we loaded
                    expect(savedObjs.objects[1].time).toEqual("2020-04-09T02:10:00.000");
                    expect(savedObjs.objects[1].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[1].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //note, bc lastTime was outside the window, we wont have any more in this timeframe                    
                });
            });

            it("loads backup data from disk on startup when user comes first", function (){
                var callback;
                runs(function () {
                    now = (+new Date("2020-04-09T03:15:00.000Z"));
                    chrome.storage.local.get.andCallFake(function (key, cb){
                        callback = cb;
                    });
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});                    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    //as opposed to the other ordering, there's not an immediate reordering 
                    //bc runTimer ran with the original information and had to be redone
                    expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();

                    //well that took a while but we're finally ready to go
                    //this is fine as long as it didnt take an hour
                    callback({
                        activitycollector_cache : {
                            collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                            lastTime: (+new Date("2020-04-09T03:00:00.000Z")),
                            targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                            activities: [{
                                payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                                time: "2020-04-09T02:10:00.000",
                                payload: { 
                                    name:"Google Chrome", 
                                    identifier: "chrome_exe", 
                                    url: "https://www.zearn.com/0", 
                                    title:"math practice"
                                }
                            }]
                        }
                    });

                    now = now + 60000;//add another minute to now
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!

                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T02:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T03:00:00.000");
                
                    expect(savedObjs.objects.length).toEqual(2);
                    //there will be the automatically added offline at 
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T02:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[0].payload.status).toEqual("offline");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //there's the activity that we loaded
                    expect(savedObjs.objects[1].time).toEqual("2020-04-09T02:10:00.000");
                    expect(savedObjs.objects[1].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[1].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //note, bc lastTime was outside the window, we wont have any more in this timeframe                    
                });
            });

            it("recovers from corrupted activities-null", function (){
                //if activities is not an array, we've got a problem
                runs(function () {
                    now = (+new Date("2020-04-09T04:00:00.000Z"));
                    chrome.storage.local._store.activitycollector_cache = {
                        collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        lastTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                        activities: null
                    };
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                    //now lets verify that 
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 61; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }

                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T05:00:00.000");
                
                    //since we dumped the saved data, this will be the first thing
                    expect(savedObjs.objects.length).toEqual(1);
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //note, bc lastTime was outside the window, we wont have any more in this timeframe                    
                });

            });

            it("recovers from corrupted activities-number", function (){
                //if activities is not an array, we've got a problem
                runs(function () {
                    now = (+new Date("2020-04-09T04:00:00.000Z"));
                    chrome.storage.local._store.activitycollector_cache = {
                        collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        lastTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                        activities: 4
                    };
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                    //now lets verify that 
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 61; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }

                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T05:00:00.000");
                
                    //since we dumped the saved data, this will be the first thing
                    expect(savedObjs.objects.length).toEqual(1);
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //note, bc lastTime was outside the window, we wont have any more in this timeframe                    
                });

            });

            it("recovers from corrupted activities-object", function (){
                //if activities is not an array, we've got a problem
                runs(function () {
                    now = (+new Date("2020-04-09T04:00:00.000Z"));
                    chrome.storage.local._store.activitycollector_cache = {
                        collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        lastTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                        activities: {}
                    };
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                    //now lets verify that 
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 61; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }

                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T05:00:00.000");
                
                    //since we dumped the saved data, this will be the first thing
                    expect(savedObjs.objects.length).toEqual(1);
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //note, bc lastTime was outside the window, we wont have any more in this timeframe                    
                });

            });

            it("recovers from corrupted collectionWindow", function (){
                //if collectionWindowTime is not null or a number, we've got a problem
                runs(function () {
                    now = (+new Date("2020-04-09T04:00:00.000Z"));
                    chrome.storage.local._store.activitycollector_cache = {
                        //while i get why this might happen, it's a huge smell
                        //and we shouldnt allow it!
                        collectionWindowTime: "2020-04-09T03:00:00.000",
                        lastTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                        activities: [{
                            payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                            time: "2020-04-09T02:10:00.000",
                            payload: { 
                                name:"Google Chrome", 
                                identifier: "chrome_exe", 
                                url: "https://www.zearn.com/0", 
                                title:"math practice"
                            }
                        }]
                    };
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                    //now lets verify that 
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 61; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }

                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T05:00:00.000");
                
                    //since we dumped the saved data, this will be the first thing
                    expect(savedObjs.objects.length).toEqual(1);
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //note, bc lastTime was outside the window, we wont have any more in this timeframe                    
                });

            });

            it("recovers from corrupted targetTime", function (){
                //if collectionWindowTime is not null or a number, we've got a problem
                runs(function () {
                    now = (+new Date("2020-04-09T04:00:00.000Z"));
                    chrome.storage.local._store.activitycollector_cache = {
                        collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        lastTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        //while i get why this might happen, it's a huge smell
                        //and we shouldnt allow it!
                        targetTime: "2020-04-09T03:01:00.000Z",
                        activities: [{
                            payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                            time: "2020-04-09T02:10:00.000",
                            payload: { 
                                name:"Google Chrome", 
                                identifier: "chrome_exe", 
                                url: "https://www.zearn.com/0", 
                                title:"math practice"
                            }
                        }]
                    };
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                    //now lets verify that 
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 61; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }

                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T05:00:00.000");
                
                    //since we dumped the saved data, this will be the first thing
                    expect(savedObjs.objects.length).toEqual(1);
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //note, bc lastTime was outside the window, we wont have any more in this timeframe                    
                });

            });

            it("recovers from corrupted lastTime-null", function (){
                //if collectionWindowTime is not null or a number, we've got a problem
                runs(function () {
                    now = (+new Date("2020-04-09T04:00:00.000Z"));
                    chrome.storage.local._store.activitycollector_cache = {
                        collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        //while i get why this might happen, it's a huge smell
                        //and we shouldnt allow it!
                        lastTime: null,
                        targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                        activities: [{
                            payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                            time: "2020-04-09T02:10:00.000",
                            payload: { 
                                name:"Google Chrome", 
                                identifier: "chrome_exe", 
                                url: "https://www.zearn.com/0", 
                                title:"math practice"
                            }
                        }]
                    };
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                    //now lets verify that 
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 61; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }

                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T05:00:00.000");
                
                    //since we dumped the saved data, this will be the first thing
                    expect(savedObjs.objects.length).toEqual(1);
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //note, bc lastTime was outside the window, we wont have any more in this timeframe                    
                });

            });

            it("recovers from corrupted lastTime-string", function (){
                //if collectionWindowTime is not null or a number, we've got a problem
                runs(function () {
                    now = (+new Date("2020-04-09T04:00:00.000Z"));
                    chrome.storage.local._store.activitycollector_cache = {
                        collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        //while i get why this might happen, it's a huge smell
                        //and we shouldnt allow it!
                        lastTime: "2020-04-09T03:00:00.000Z",
                        targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                        activities: [{
                            payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                            time: "2020-04-09T02:10:00.000",
                            payload: { 
                                name:"Google Chrome", 
                                identifier: "chrome_exe", 
                                url: "https://www.zearn.com/0", 
                                title:"math practice"
                            }
                        }]
                    };
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                    //now lets verify that 
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 61; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }

                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T05:00:00.000");
                
                    //since we dumped the saved data, this will be the first thing
                    expect(savedObjs.objects.length).toEqual(1);
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //note, bc lastTime was outside the window, we wont have any more in this timeframe                    
                });

            });

            it("recovers from lastTime-too old", function (){
                //if the times are too old, it's a problem trying to catch up 
                runs(function () {
                    now = (+new Date("2020-04-09T04:00:00.000Z"));
                    chrome.storage.local._store.activitycollector_cache = {
                        collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                        //this is just a problem for catching up data
                        lastTime: (+new Date("2020-04-04T00:00:00.000Z")),
                        targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                        activities: [{
                            payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                            time: "2020-04-09T02:10:00.000",
                            payload: { 
                                name:"Google Chrome", 
                                identifier: "chrome_exe", 
                                url: "https://www.zearn.com/0", 
                                title:"math practice"
                            }
                        }]
                    };
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).not.toHaveBeenCalled();
                    //now lets verify that 
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute

                    //technically so often is 4 minutes currently
                    for(var i = 0; i < 61; i++){
                        now = now + 60000;//add another minute to now
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }

                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T05:00:00.000");
                
                    //since we dumped the saved data, this will be the first thing
                    expect(savedObjs.objects.length).toEqual(1);
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T04:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //note, bc lastTime was outside the window, we wont have any more in this timeframe                    
                });

            });

            it("grafts into current data if we take a long time to load", function (){
                var callback;
                runs(function () {
                    now = (+new Date("2020-04-09T02:15:00.000Z"));
                    chrome.storage.local.get.andCallFake(function (key, cb){
                        callback = cb;
                    });
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});                    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    now = now + 60000;//add another minute to now 2:15
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute
                    now = now + 60000;//add another minute to now 2:16
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute
                    //cool so weve got data now. except its also for this hour...
                    callback({
                        activitycollector_cache : {
                            collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                            lastTime: (+new Date("2020-04-09T02:10:00.000Z")),
                            targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                            activities: [{
                                payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                                time: "2020-04-09T02:10:00.000",
                                payload: { 
                                    name:"Google Chrome", 
                                    identifier: "chrome_exe", 
                                    url: "https://www.zearn.com/0", 
                                    title:"math practice"
                                }
                            }]
                        }
                    });
                    //fast forward to end
                    for(now = now + 60000;//start out a minute later 
                        now <= +new Date("2020-04-09T03:01:00.000Z"); 
                        now = now + 60000){                        
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }

                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T02:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T03:00:00.000");
                
                    expect(savedObjs.objects.length).toEqual(6);
                    //there will be the automatically added offline at 
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T02:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[0].payload.status).toEqual("offline");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //there's the activity that we loaded
                    expect(savedObjs.objects[1].time).toEqual("2020-04-09T02:10:00.000");
                    expect(savedObjs.objects[1].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[1].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:11 we went offline
                    expect(savedObjs.objects[2].time).toEqual("2020-04-09T02:11:00.000");
                    expect(savedObjs.objects[2].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[2].payload.status).toEqual("offline");
                    expect(savedObjs.objects[2].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:15 we came online (no stale activity bc we just cant know
                    //if we rebooted the machine)
                    expect(savedObjs.objects[3].time).toEqual("2020-04-09T02:16:00.000");
                    expect(savedObjs.objects[3].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[3].payload.status).toEqual("ok");
                    expect(savedObjs.objects[3].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:16 also got an activity 
                    expect(savedObjs.objects[4].time).toEqual("2020-04-09T02:16:00.000");
                    expect(savedObjs.objects[4].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[4].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[4].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:17 also got an activity 
                    expect(savedObjs.objects[5].time).toEqual("2020-04-09T02:17:00.000");
                    expect(savedObjs.objects[5].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[5].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[5].stale).toBeFalsy();//make sure we dont incorrectly assign stale

                });
            });

            it("grafts into current data if we take a long time to load and fell asleep", function (){
                var callback;
                runs(function () {
                    now = (+new Date("2020-04-09T02:15:00.000Z"));
                    chrome.storage.local.get.andCallFake(function (key, cb){
                        callback = cb;
                    });
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});                    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    now = now + 60000;//add another minute to now 2:15
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute
                    //goes to sleep until 2:30
                    now = (+new Date("2020-04-09T02:30:00.000Z"));
                    //cool so weve got data now. except its also for this hour
                    //and we were asleep until then! what will happen??
                    callback({
                        activitycollector_cache : {
                            collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                            lastTime: (+new Date("2020-04-09T02:10:00.000Z")),
                            targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                            activities: [{
                                payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                                time: "2020-04-09T02:10:00.000",
                                payload: { 
                                    name:"Google Chrome", 
                                    identifier: "chrome_exe", 
                                    url: "https://www.zearn.com/0", 
                                    title:"math practice"
                                }
                            }]
                        }
                    });
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    //fast forward to end
                    for(now = now + 60000;//start out a minute later 
                        now <= +new Date("2020-04-09T03:01:00.000Z"); 
                        now = now + 60000){                        
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }

                    //it immediately called bc we're after the startup
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();
                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T02:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T03:00:00.000");
                
                    expect(savedObjs.objects.length).toEqual(8);
                    //there will be the automatically added offline at 
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T02:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[0].payload.status).toEqual("offline");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //there's the activity that we loaded
                    expect(savedObjs.objects[1].time).toEqual("2020-04-09T02:10:00.000");
                    expect(savedObjs.objects[1].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[1].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:11 we went offline
                    expect(savedObjs.objects[2].time).toEqual("2020-04-09T02:11:00.000");
                    expect(savedObjs.objects[2].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[2].payload.status).toEqual("offline");
                    expect(savedObjs.objects[2].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:15 we came online (no stale activity bc we just cant know
                    //if we rebooted the machine)
                    expect(savedObjs.objects[3].time).toEqual("2020-04-09T02:16:00.000");
                    expect(savedObjs.objects[3].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[3].payload.status).toEqual("ok");
                    expect(savedObjs.objects[3].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:16 also got an activity 
                    expect(savedObjs.objects[4].time).toEqual("2020-04-09T02:16:00.000");
                    expect(savedObjs.objects[4].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[4].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[4].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:17 went offline again
                    expect(savedObjs.objects[5].time).toEqual("2020-04-09T02:17:00.000");
                    expect(savedObjs.objects[5].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[5].payload.status).toEqual("offline");
                    expect(savedObjs.objects[5].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:30 come back online
                    expect(savedObjs.objects[6].time).toEqual("2020-04-09T02:30:00.000");
                    expect(savedObjs.objects[6].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[6].payload.status).toEqual("ok");
                    expect(savedObjs.objects[6].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:30 this time we have a stale bc we were running that whole time
                    expect(savedObjs.objects[7].time).toEqual("2020-04-09T02:30:00.000");
                    expect(savedObjs.objects[7].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[7].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[7].stale).toEqual("stale");
                });
            });

            it("cancels the load if we have started uploading data", function (){
                var callback;
                runs(function () {
                    now = (+new Date("2020-04-09T02:15:00.000Z"));
                    chrome.storage.local.get.andCallFake(function (key, cb){
                        callback = cb;
                    });
                    activityCollector.start();
                    activityCollector.setToken("meow");
                    activityCollector.setUser({account_id: 24601});                    
                });
                waitsFor(function () {
                    return Boolean(activityCollector._user);
                });
                runs(function(){
                    var onActivity = activityCollector.pal.on.mostRecentCall.args[1];
                    now = now + 60000;//add another minute to now 2:15
                    _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    onActivity({ name:"Google Chrome", identifier: "chrome_exe", url: "https://www.zearn.com/0", title:"math practice"});//got another activity at some point in that last minute
                    //fast forward to end
                    for(now = now + 60000;//start out a minute later 
                        now <= +new Date("2020-04-09T03:01:00.000Z"); 
                        now = now + 60000){                        
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalled();

                    //cool so weve got data now. except its we've already started the upload
                    //so that will be hard to graft in. instead 
                    callback({
                        activitycollector_cache : {
                            collectionWindowTime: (+new Date("2020-04-09T03:00:00.000Z")),
                            lastTime: (+new Date("2020-04-09T02:10:00.000Z")),
                            targetTime: (+new Date("2020-04-09T03:01:00.000Z")),
                            activities: [{
                                payload_uuid: "39c4f580-5f5b-417f-8b55-b432802aa1d9",
                                time: "2020-04-09T02:10:00.000",
                                payload: { 
                                    name:"Google Chrome", 
                                    identifier: "chrome_exe", 
                                    url: "https://www.zearn.com/0", 
                                    title:"math practice"
                                }
                            }]
                        }
                    });

                    //successfully gets the urls to upload
                    configDfds[0].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    //now we sort out all the items, gzip em up, and upload them at 
                    //the specified upload url (todo: does this need to be fetch? also should this be streaming?)
                    expect(activityCollector.api.uploadToUrl).toHaveBeenCalledWith("https://example.com/upload?presigned", jasmine.any(Object));
                    var gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    var savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T02:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T03:00:00.000");
                    //ensure we only did this past hours data
                    expect(savedObjs.objects.length).toEqual(2);
                    //there will be the automatically added offline at 
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T02:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("c4bec4c2-725b-40f9-b484-e45061e8463c");
                    expect(savedObjs.objects[0].payload.status).toEqual("offline");
                    expect(savedObjs.objects[0].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    //at 2:16 we got an activity and came online (no stale activity bc we just started
                    expect(savedObjs.objects[1].time).toEqual("2020-04-09T02:16:00.000");
                    expect(savedObjs.objects[1].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[1].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[1].stale).toBeFalsy();//make sure we dont incorrectly assign stale
                    uploadDfds[0].resolve();
                    //fast forward to end
                    for(;//start out no different 
                        now <= +new Date("2020-04-09T04:01:00.000Z"); 
                        now = now + 60000){                        
                        _.delay.mostRecentCall.args[0]();//it's been a minute now, callback time!
                    }
                    expect(activityCollector.api.getActivityConfig).toHaveBeenCalledWith("2020-04-09T03:00:00.000Z", 0);
                    configDfds[1].resolve({
                        upload_url: "https://example.com/upload?presigned",
                        head_url: "https://example.com/head?presigned"
                    });
                    gzippedObj = activityCollector.api.uploadToUrl.mostRecentCall.args[1];
                    //lets unzip this and verify it's what we expect
                    savedObjs = JSON.parse(pako.ungzip(gzippedObj, { to: 'string' }));
                    expect(savedObjs).toEqual({
                        cabra_name:"dyknow.me/participant_activity_monitor",
                        created: jasmine.any(String),
                        completed:jasmine.any(String),
                        os_type: "chromebook",
                        os_version: "Chrome OS 86.0.4240.175 x64",
                        client_version: "7.1.2.3",
                        objects: jasmine.any(Array)
                    });
                    expect(savedObjs.created).toEqual("2020-04-09T03:00:00.000");
                    expect(savedObjs.completed).toEqual("2020-04-09T04:00:00.000");
                    //ensure we only did this past hours data
                    expect(savedObjs.objects.length).toEqual(1);
                    //there will be the automatically added offline at 
                    expect(savedObjs.objects[0].time).toEqual("2020-04-09T03:00:00.000");
                    expect(savedObjs.objects[0].payload_uuid).toEqual("39c4f580-5f5b-417f-8b55-b432802aa1d9");
                    expect(savedObjs.objects[0].payload.url).toEqual("https://www.zearn.com/0");
                    expect(savedObjs.objects[0].stale).toEqual("stale");
   
                });
            });            
        });

    });
});
