/*global TEMPORARY */
define(['amd/filesystem'], function(filesystemLog) {
    describe('filesystem', function () {
        var file = false;
        beforeEach(function (done) {
            file = {
                name: filesystemLog.getActualLogFilename()
            };
        });

        it('determines if a file is from today', function () {
            expect(filesystemLog.isFromToday(file)).toBe(true);
        });

    });

    describe('Queue Created', function () {

        beforeEach(function (done){
            //this is the same as in filesystem, the only diff being it uses TEMPORARY storage
            //instead of PERMINANT since we can't create to PERM in a unit test.
            spyOn(filesystemLog, 'initFilesystem').andCallFake(function(){
                var _this = filesystemLog;
                return new Promise(function(resolve, reject){
                    window.webkitRequestFileSystem(TEMPORARY, 5 * 1024 * 1024 /*5MB*/, function (fs) {
                        _this._fs = fs;
                        _this.clearLog();
                        _this.initLogFile().then(function () {
                            window.filesystemLog = filesystemLog;
                            _this.initQueue().then(function () {
                                _this.__initSuccessful = true;
                                resolve();
                            });
                        });
                    }, function (e) {
                        _this.processError(e);
                        reject(e);
                    });
                });
            });
        });

        afterEach(function(done){

        });

        it('msgQueue should be object',function() {
            var setupComplete = false;
            //We need to give setup a chance to return before asserting
            runs(function(){
                expect(typeof filesystemLog._msgQueue).toBe('boolean');
                filesystemLog.init().then(function(){
                    setupComplete = true;
                });
            });

            waitsFor(function(){
                return setupComplete;
            });

            runs(function(){
                expect(typeof filesystemLog._msgQueue).toBe('object');
            });

        });
        
        it("reads back exactly what it writes in for 100 character x 100 lines", function(){
            var setupComplete = false;
            var setupString = "";
            for(var i = 0; i<100; i++){
                var currLine = "";
                for (var j = 0; j < 10; j++){
                    currLine += (i % 10).toString();
                }
                setupString += currLine + "\n";
            }
            //We need to give setup a chance to return before asserting
            runs(function(){
                filesystemLog.init().then(function(){
                    setupComplete = true;
                });
            });

            waitsFor(function(){
                return setupComplete;
            });

            runs(function(){
                setupString.split("\n").forEach(function(msg){
                   filesystemLog.write("TEST", msg); 
                });
            });
            
            waitsFor(function (){
               return filesystemLog._msgQueue.isEmpty() && !filesystemLog.writingToFile;
            });
            
            var fileRead = false;
            var fileResults;
            
            runs(function(){
                filesystemLog.readLastFileLogFile().then(function (results){
                   fileRead = true;
                    fileResults = results;
                });
            });
            
            waitsFor(function(){
                return fileRead;
            }, "The file should be read", 500);
            
            runs(function () {
                var remixedLines = fileResults.split("\n").map(function (line){
                    var msg = line.split(" - ")[1];
                    if (msg) {
                        return msg;
                    } else {
                        return "EMPTY LINE";
                    }
                });
                
                expect(remixedLines.length).toEqual(102);//last two lines are empty bc setupString adds one and logger adds one
                expect(remixedLines[100]).toEqual("EMPTY LINE");
                expect(remixedLines[101]).toEqual("EMPTY LINE");
                remixedLines.splice(100,2);
                expect(remixedLines.join("\n")+"\n").toEqual(setupString);
            });
        });
    });

});