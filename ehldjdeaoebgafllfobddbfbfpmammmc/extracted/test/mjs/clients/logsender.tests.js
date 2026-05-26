import LogSender from "/js/mjs/clients/logsender.js";
import Logger from "/js/mjs/logger/logger.js";
import filesystem from "/js/mjs/filesystem.js";
import $ from "/js/lib/jquery-2.1.1.min.js";
import deferred from "/js/mjs/utils/deferred.js";
import chrome from "/test/mocks/chrome.js"

describe('LogSender send logs', function() {
    var logSender;
    beforeEach(function() {
        //this is a personal preference thing here, but I think it's easier to avoid having 
        //extra nextticks by using jquery deferreds instead of Promise-based deferred
        //if this ends up causing issues where we were relying on that behavior I'll convert
        //it all and apologize
        spyOn(deferred, "get").and.callFake(function(func) { var dfd = $.Deferred(); if (func){ func(dfd);} return dfd;});       
        logSender = new LogSender();
        spyOn(chrome.runtime, "getManifest");
        chrome.runtime.getManifest.and.returnValue({ version: "7.1.2.3"});
    });

    afterEach(function() {
        logSender = null;
    });

    function promiseFactory(success, message) {
        return $.Deferred(function(dfd) {
            dfd[success ? 'resolve' : 'reject'](message);
        });
    }

    function spyAndPromise(obj, method, success, message) {
        var dfd = promiseFactory(success, message);
        spyOn(obj, method).and.returnValue(dfd);
    }

    function promiseResult(promise) {
        var result = { success: null, failure: null };
        promise.then(
            function(response) { result.success = response; },
            function(response) { result.failure = response; }
        );
        return result;
    }

    it('sendsLogsWithStartDate will resolve promise', function() {
        spyAndPromise(logSender, '_sendEnvironmentReport', true, {
            UploadDir: 'fakepath'
        });
        spyAndPromise(filesystem, 'getFilesBetweenDates', true, ['foo']);
        spyAndPromise(logSender, '_markUploadStartWithDirectory', true);
        spyAndPromise(logSender, '_uploadFiles', true);
        spyOn(logSender, '_markUploadEndWithDirectory');

        var promise = logSender.sendLogsWithStartDate();
        var result = promiseResult(promise);
        expect(promise.state()).toBe('resolved');
        expect(result.success).toBe(undefined);
        expect(result.failure).toBe(null);

        expect(logSender._sendEnvironmentReport).toHaveBeenCalled();
        expect(filesystem.getFilesBetweenDates).toHaveBeenCalled();
        expect(logSender._markUploadStartWithDirectory).toHaveBeenCalled();
        expect(logSender._uploadFiles).toHaveBeenCalled();
        expect(logSender._markUploadEndWithDirectory).toHaveBeenCalled();
    });

    it('sendsLogsWithStartDate can fail sending environment report', function() {
        spyAndPromise(logSender, '_sendEnvironmentReport', false, 'SOME ERROR');
        spyOn(filesystem, 'getFilesBetweenDates');
        spyOn(logSender, '_markUploadStartWithDirectory');
        spyOn(logSender, '_uploadFiles');
        spyOn(logSender, '_markUploadEndWithDirectory');

        var promise = logSender.sendLogsWithStartDate();
        var result = promiseResult(promise);
        expect(promise.state()).toBe('rejected');
        expect(result.success).toBe(null);
        expect(result.failure.error).toBe('SOME ERROR');

        expect(logSender._sendEnvironmentReport).toHaveBeenCalled();
        expect(filesystem.getFilesBetweenDates).not.toHaveBeenCalled();
        expect(logSender._markUploadStartWithDirectory).not.toHaveBeenCalled();
        expect(logSender._uploadFiles).not.toHaveBeenCalled();
        expect(logSender._markUploadEndWithDirectory).not.toHaveBeenCalled();
    });

    it('sendsLogsWithStartDate can fail getting files', function() {
        spyAndPromise(logSender, '_sendEnvironmentReport', true, {
            UploadDir: 'fakepath'
        });
        spyAndPromise(filesystem, 'getFilesBetweenDates', false, 'SOME ERROR');
        spyOn(logSender, '_markUploadStartWithDirectory');
        spyOn(logSender, '_uploadFiles');
        spyOn(logSender, '_markUploadEndWithDirectory');

        var promise = logSender.sendLogsWithStartDate();
        var result = promiseResult(promise);
        expect(promise.state()).toBe('rejected');
        expect(result.success).toBe(null);
        expect(result.failure.error).toBe('SOME ERROR');

        expect(logSender._sendEnvironmentReport).toHaveBeenCalled();
        expect(filesystem.getFilesBetweenDates).toHaveBeenCalled();
        expect(logSender._markUploadStartWithDirectory).not.toHaveBeenCalled();
        expect(logSender._uploadFiles).not.toHaveBeenCalled();
        expect(logSender._markUploadEndWithDirectory).not.toHaveBeenCalled();
    });

    it('sendsLogsWithStartDate can fail upload start', function() {
        spyAndPromise(logSender, '_sendEnvironmentReport', true, {
            UploadDir: 'fakepath'
        });
        spyAndPromise(filesystem, 'getFilesBetweenDates', true, ['foo']);
        spyAndPromise(logSender, '_markUploadStartWithDirectory', false, 'SOME ERROR');
        spyOn(logSender, '_uploadFiles');
        spyOn(logSender, '_markUploadEndWithDirectory');

        var promise = logSender.sendLogsWithStartDate();
        var result = promiseResult(promise);
        expect(promise.state()).toBe('rejected');
        expect(result.success).toBe(null);
        expect(result.failure.error).toBe('SOME ERROR');

        expect(logSender._sendEnvironmentReport).toHaveBeenCalled();
        expect(filesystem.getFilesBetweenDates).toHaveBeenCalled();
        expect(logSender._markUploadStartWithDirectory).toHaveBeenCalled();
        expect(logSender._uploadFiles).not.toHaveBeenCalled();
        expect(logSender._markUploadEndWithDirectory).not.toHaveBeenCalled();
    });

    it('sendsLogsWithStartDate can fail upload files', function() {
        spyAndPromise(logSender, '_sendEnvironmentReport', true, {
            UploadDir: 'fakepath'
        });
        spyAndPromise(filesystem, 'getFilesBetweenDates', true, ['foo']);
        spyAndPromise(logSender, '_markUploadStartWithDirectory', true);
        spyAndPromise(logSender, '_uploadFiles', false, 'SOME ERROR');
        spyOn(logSender, '_markUploadEndWithDirectory');

        var promise = logSender.sendLogsWithStartDate();
        var result = promiseResult(promise);
        expect(promise.state()).toBe('rejected');
        expect(result.success).toBe(null);
        expect(result.failure.error).toBe('SOME ERROR');

        expect(logSender._sendEnvironmentReport).toHaveBeenCalled();
        expect(filesystem.getFilesBetweenDates).toHaveBeenCalled();
        expect(logSender._markUploadStartWithDirectory).toHaveBeenCalled();
        expect(logSender._uploadFiles).toHaveBeenCalled();
        expect(logSender._markUploadEndWithDirectory).not.toHaveBeenCalled();
    });

    it("will send a file that gets split by chunks", async function () {
        var dfd = deferred.get();
        spyOn(logSender._api, "post").and.callFake(()=>dfd);
        var getFilesDfd = deferred.get();
        spyOn(filesystem, "getFilesBetweenDates").and.callFake(()=>getFilesDfd);
        var readFileDfd = deferred.get();
        spyOn(filesystem, "readFile").and.callFake(()=>readFileDfd);
        var doneDfd = logSender.sendLogsWithStartDate(new Date("2022-08-01"), new Date("2022-08-06"), {});
        expect(logSender._api.post).toHaveBeenCalledWith(
            "https://diag.dyknow.com/dyknowlogservice60/dylogservice.svc/json/DyKnowLogMac", jasmine.any(Object)
        );
        dfd.resolve({
            RetCode: 0,
            UploadDir: "dirbeedo2"
        }); dfd = deferred.get();
        //it call filsystemlog.getfilesbetweendates
        getFilesDfd.resolve([
            {name: "2022-08-22T17:58:32.754Z.txt"}//only one file here            
        ]);
        expect(logSender._api.post).toHaveBeenCalledWith(
            "https://diag.dyknow.com/dyknowlogservice60/dylogservice.svc/json/CreateMarker", 
            {data: JSON.stringify({DirPath:"dirbeedo2", Type: 1})}
        );
        //marker uploaded
        dfd.resolve({RetCode:0});dfd = deferred.get();
        //upload files time!
        readFileDfd.resolve("A".repeat(102400 + 10));//10 chars more than the maxchunksize
//name DM2022822_135832.log

        dfd.resolve({RetCode:0});//so this is a little weird but it's gonna be the same promise for all these
        await doneDfd;

        expect(logSender._api.post).toHaveBeenCalledWith(
            "https://diag.dyknow.com/dyknowlogservice60/dylogservice.svc/json/UploadChunk", 
            {
                data: JSON.stringify({
                    "UploadDir":"dirbeedo2",
                    "FileName":"DM2022822_135832.log",
                    "ChunkData": btoa("A".repeat(102400)),
                    "ChunkNum":0,
                    "TotalChunks":2
                })
            }
        );
        expect(logSender._api.post).toHaveBeenCalledWith(
            "https://diag.dyknow.com/dyknowlogservice60/dylogservice.svc/json/UploadChunk", 
            {
                data: JSON.stringify({
                    "UploadDir":"dirbeedo2",
                    "FileName":"DM2022822_135832.log",
                    "ChunkData": btoa("A".repeat(10)),
                    "ChunkNum":1,
                    "TotalChunks":2
                })
            }
        );
        //finally now 
        expect(logSender._api.post).toHaveBeenCalledWith(
            "https://diag.dyknow.com/dyknowlogservice60/dylogservice.svc/json/CreateMarker", 
            {data: JSON.stringify({DirPath:"dirbeedo2", Type: 2})}
        );

    });

    it("emits out relevant events", function () {
        var obj;
        logSender.on("statusUpdate", function (inObj){
            obj = inObj;
        });
        //this is cheating but for the sake of ease for now gonna cheat
        logSender._updateProgress(1,4,"Going great");
        expect(obj).toEqual({
            current: 1,
            total: 4,
            message: "Going great"
        });
    });
});