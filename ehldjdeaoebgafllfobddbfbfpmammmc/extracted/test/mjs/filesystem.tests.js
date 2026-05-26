import filesystemLog from "/js/mjs/filesystem.js";
import deferred from "/js/mjs/utils/deferred.js";
import lifecycleEventHandler from "/js/mjs/chromeOsServices/lifecycleEventHandler.js";
import timeLord from "/js/mjs/chromeOsServices/timeLord.js";
import uuid from "/js/mjs/lib/uuid.js";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 2147483647;
function nextTick(){
    return Promise.resolve();
}

describe("filesystem", function (){
    var now;
    beforeEach(async function (){
        now = 1661191112754;//2022-08-22T17:58:32.754Z
        filesystemLog.resetForUnitTests();
        spyOn(timeLord, "now").and.callFake(()=>now);
        spyOn(lifecycleEventHandler, "getActivationState");
        spyOn(lifecycleEventHandler, "setActivationState");
        filesystemLog._databasename = uuid();//make sure we're not conflicting      
    });
    afterEach(function (){
        //clean up just in case
        indexedDB.deleteDatabase(filesystemLog._databasename);
        filesystemLog._databasename = "rxl_lg";
    });

    describe("base", function(){
        beforeEach(async function (){
        });
        describe("getActualLogFilename and isFromToday", function  () {            
            it("today", function () {                
                var name = filesystemLog.getActualLogFilename();
                now += 10000;//10 seconds later, same day
                var actual = filesystemLog.isFromToday({
                    name: name
                });
                expect(actual).toEqual(true);
            });

            it("tomorrow", function () {                
                var name = filesystemLog.getActualLogFilename();
                now += 24* 60* 60000 ;//24 hours later, new day
                var actual = filesystemLog.isFromToday({
                    name: name
                });
                expect(actual).toEqual(false);
            });

            it("yesterday", function () {                
                var name = filesystemLog.getActualLogFilename();
                now -= 24* 60* 60000 ;//24 hours later, new day
                var actual = filesystemLog.isFromToday({
                    name: name
                });
                expect(actual).toEqual(false);
            });
        });

    });

    describe("indexeddb", function () {
        it("end to end will write and read the log file", async function () {
            var init = filesystemLog.init();
            lifecycleEventHandler.getActivationState.calls.mostRecent().args[1]();
            await init;//
            filesystemLog.write("test", {message: "msg1"});
            filesystemLog.write("test", "another message");
            now += 1000;
            filesystemLog.write("test", "message 3");
            //await nextTick();
            //okay, lets pull the file all the way back out now
            var text = await filesystemLog.readLastFileLogFile();
            expect(text).toEqual(
                "Mon Aug 22 2022 13:58:32 GMT-0400 (Eastern Daylight Time): test - {\"message\":\"msg1\"}\n"+
                "Mon Aug 22 2022 13:58:32 GMT-0400 (Eastern Daylight Time): test - another message\n"+
                "Mon Aug 22 2022 13:58:33 GMT-0400 (Eastern Daylight Time): test - message 3\n"
            );
        });

        it("end to end will get log files in range and be able to pull them back individually", async function () {
            var init = filesystemLog.init();
            lifecycleEventHandler.getActivationState.calls.mostRecent().args[1]();
            await init;
            //Aug 22
            filesystemLog.write("test", {message: "msg1"});
            now += 60000 *60 *24
            //Aug 23
            filesystemLog.write("test", "another message");
            now += 60000 *60 *24
            //Aug 24
            filesystemLog.write("test", "message 3");
            var files = await filesystemLog.getFilesBetweenDates(new Date("2022-08-22"), new Date("2022-08-23"));
            expect(files).toEqual([
                { name: "2022-08-22T17:58:32.754Z.txt"},
                { name: "2022-08-23T17:58:32.754Z.txt"}
            ]);
            var text1 = await filesystemLog.readFile(files[0]);
            expect(text1).toEqual(
                "Mon Aug 22 2022 13:58:32 GMT-0400 (Eastern Daylight Time): test - {\"message\":\"msg1\"}\n"
            );
            var text2 = await filesystemLog.readFile(files[1]);
            expect(text2).toEqual(
                "Tue Aug 23 2022 13:58:32 GMT-0400 (Eastern Daylight Time): test - another message\n"
            );
            var allFiles = await filesystemLog.getFilesBetweenDates(new Date("2022-08-22"), new Date("2022-08-24"));
            expect(allFiles).toEqual([
                { name: "2022-08-22T17:58:32.754Z.txt"},
                { name: "2022-08-23T17:58:32.754Z.txt"},
                { name: "2022-08-24T17:58:32.754Z.txt"}
            ]);
        });

        it("clear logs purges entries older than 7 days", async function () {
            //lets set things up for previously
            var init = filesystemLog.init();
            lifecycleEventHandler.getActivationState.calls.mostRecent().args[1]();
            await init;
            //Aug 22
            filesystemLog.write("test", {message: "msg1"});
            for(var i = 0; i< 9; i++) {
                now += 60000 *60 *24
                //Aug 23-31
                filesystemLog.write("test", "another message");
            }
            now += 60000 *60 *24
            //Sept 1
            var name = filesystemLog._databasename;
            filesystemLog.resetForUnitTests();
            filesystemLog._databasename = name;//set this back so its the same
            init = filesystemLog.init();
            lifecycleEventHandler.getActivationState.calls.mostRecent().args[1]();
            await init;
            var files = await filesystemLog.getFilesBetweenDates(new Date("2022-01-01"), new Date("2022-12-31"));
            //see how 
            expect(files).toEqual([
                { name: "2022-08-26T17:58:32.754Z.txt"},
                { name: "2022-08-27T17:58:32.754Z.txt"},
                { name: "2022-08-28T17:58:32.754Z.txt"},
                { name: "2022-08-29T17:58:32.754Z.txt"},
                { name: "2022-08-30T17:58:32.754Z.txt"},
                { name: "2022-08-31T17:58:32.754Z.txt"}
                //note, it is 09-01 but we havent created any entries just yet
                //at least with the current implementation (it would be be nice if we would do that like w windows)
            ]);

        });

        it("doesnt blow up on log on activate", async function () {
            //youre doing a write but there's no current file should do different things 
            //when you're before restore vs after, but also regardless of init, we shouldnt 
            //misrepresent timestamps
            filesystemLog.resetForUnitTests();
            filesystemLog.write("test", {message: "msg1"});
            now += 60000;//one minute later
            var init = filesystemLog.init();
            lifecycleEventHandler.getActivationState.calls.mostRecent().args[1]();
            await init;
            var files = await filesystemLog.getFilesBetweenDates(new Date("2022-08-22"), new Date("2022-08-23"));
            expect(files).toEqual([
                { name: "2022-08-22T17:59:32.754Z.txt"},
            ]);
            var text1 = await filesystemLog.readFile(files[0]);
            expect(text1).toEqual(
                "Mon Aug 22 2022 13:58:32 GMT-0400 (Eastern Daylight Time): test - {\"message\":\"msg1\"}\n"
            );
        });

    });

    describe("lifecycleEventHandler", function(){
        beforeEach(async function (){
        });
        it("saves lastfile", async function (){
            var init = filesystemLog.init();
            lifecycleEventHandler.getActivationState.calls.mostRecent().args[1]();
            await init;
            expect(lifecycleEventHandler.setActivationState).toHaveBeenCalledWith("filesystem", {
                name: "2022-08-22T17:58:32.754Z.txt"
            }, jasmine.any(Function));
        });
        it("restores", async function (){
            var init = filesystemLog.init();
            lifecycleEventHandler.getActivationState.calls.mostRecent().args[1]({
                name: "2022-08-21T17:58:32.754Z.txt"
            });
            await init;
            expect(filesystemLog._logFile)
        });

    });

});