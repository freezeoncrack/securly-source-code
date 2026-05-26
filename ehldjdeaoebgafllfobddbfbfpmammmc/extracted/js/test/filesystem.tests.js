define([
    'amd/filesystem',
    'js/test/mocks/file',
    'js/test/mocks/fileReader',
    'js/test/mocks/fileWriter'
], function(
    filesystem,
    mockFile,
    MockFileReader,
    MockFileWriter
) {
    describe('filesystem', function() {
        var root;

        beforeEach(function() {
            filesystem._logFile = null;
            filesystem._fs = {};
            root = filesystem._fs.root = jasmine.createSpyObj(
                'filesystem._fs.root',
                ['getFile', 'createReader']
            );
        });

        it('gets date for file', function() {
            var file = mockFile.logFile();
            var date = filesystem.logFileDate(file);

            expect(date).toBeTruthy();
            expect(isNaN(date.getTime())).toBe(false);
        });

        it('gets log files', function() {
            var files = [mockFile.logFile(), mockFile.file('dir', true),
                mockFile.file('test.json')];
            root.createReader.andCallFake(function() {
                var reader = jasmine.createSpyObj('reader', ['readEntries']);
                reader.readEntries.andCallFake(function(success) {
                    success(files);
                });
                return reader;
            });

            var success = null;
            var logs = null;

            runs(function() {
                filesystem.getLogFiles().then(
                    function(logFiles) { logs = logFiles; success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(logs).toBeTruthy();
                expect(logs.length).toBe(1);
                expect(logs[0]).toBe(files[0]);
            });
        });

        it('fails file get before filesystem setup', function() {
            filesystem._fs = null;

            var success = null;
            runs(function() {
                filesystem.getFile('nope.file').then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
            });
        });

        it('can get file', function() {
            root.getFile.andCallFake(function(name, flags, success, failure) {
                success(mockFile.file(name));
            });

            var name = 'test.file';
            var success = null;
            var file = null;

            runs(function() {
                filesystem.getFile(name).then(
                    function(theFile) { file = theFile; success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(file).toBeTruthy();
                expect(file.name).toBe(name);
            });
        });

        it('can fail file get', function() {
            root.getFile.andCallFake(function(name, flags, success, failure) {
                failure('nope');
            });

            var success = null;
            var error = null;

            runs(function() {
                filesystem.getFile('test.file').then(
                    function() { success = true; },
                    function(e) { error = e; success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(error.error).toBe('nope');
            });
        });

        it('can init file', function() {
            spyOn(filesystem, 'getFile').andReturn('yup');
            var fetched = filesystem.initFile('test.file');
            expect(fetched).toBe('yup');
            expect(filesystem.getFile).toHaveBeenCalledWith(
                'test.file',
                {create: true}
            );
        });

        it('can init log file', function() {
            var fileDfd = new Promise(function(resolve, reject) {
                resolve(mockFile.file('test.file'));
            });
            spyOn(filesystem, 'getActualLogFilename').andCallThrough();
            spyOn(filesystem, 'initFile').andReturn(fileDfd);

            var success = null;
            runs(function() {
                filesystem.initLogFile().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(filesystem.getActualLogFilename).toHaveBeenCalled();
                expect(filesystem.initFile).toHaveBeenCalled();
            });
        });

        it('can fail log file init', function() {
            var fileDfd = new Promise(function(resolve, reject) {
                reject('nope');
            });
            spyOn(filesystem, 'getActualLogFilename').andCallThrough();
            spyOn(filesystem, 'initFile').andReturn(fileDfd);

            var success = null;
            runs(function() {
                filesystem.initLogFile().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(filesystem.getActualLogFilename).toHaveBeenCalled();
                expect(filesystem.initFile).toHaveBeenCalled();
            });
        });

        it('can write to file', function() {
            var blob = new Blob(['TEST'], {type: 'text/plain'});
            var writer = new MockFileWriter();
            spyOn(writer, 'write').andCallThrough();
            spyOn(writer, 'truncate').andCallThrough();
            spyOn(writer, 'seek').andCallThrough();
            var file = mockFile.file('test.file');
            file.createWriter.andCallFake(function(callback) {
                callback(writer);
            });

            var success = null;
            runs(function() {
                filesystem.writeToFile(file, blob, false).then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(file.createWriter).toHaveBeenCalled();
                expect(writer.seek).not.toHaveBeenCalled();
                expect(writer.write).toHaveBeenCalledWith(blob);
                expect(writer.truncate).toHaveBeenCalled();
            });
        });

        it('can append to file', function() {
            var blob = new Blob(['TEST'], {type: 'text/plain'});
            var writer = new MockFileWriter();
            writer.length = 42;
            spyOn(writer, 'write').andCallThrough();
            spyOn(writer, 'truncate').andCallThrough();
            spyOn(writer, 'seek').andCallThrough();
            var file = mockFile.file('test.file');
            file.createWriter.andCallFake(function(callback) {
                callback(writer);
            });

            var success = null;
            runs(function() {
                filesystem.writeToFile(file, blob, true).then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(file.createWriter).toHaveBeenCalled();
                expect(writer.seek).toHaveBeenCalledWith(42);
                expect(writer.write).toHaveBeenCalledWith(blob);
                expect(writer.truncate).not.toHaveBeenCalled();
            });
        });

        it('can fail writing to file', function() {
            var blob = new Blob(['TEST'], {type: 'text/plain'});
            var writer = new MockFileWriter();
            spyOn(writer, 'write').andCallFake(function(data) {
                writer.onerror('nope');
            });
            spyOn(writer, 'seek');
            var file = mockFile.file('test.file');
            file.createWriter.andCallFake(function(callback) {
                callback(writer);
            });

            var success = null;
            runs(function() {
                filesystem.writeToFile(file, blob).then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(file.createWriter).toHaveBeenCalled();
                expect(writer.seek).not.toHaveBeenCalled();
                expect(writer.write).toHaveBeenCalledWith(blob);
            });
        });

        it('can write to log file', function() {
            var blob = new Blob(['TEST'], {type: 'text/plain'});
            var logFile = mockFile.logFile();
            var fileDfd = new Promise(function(resolve, reject) {
                resolve(logFile);
            });
            var writeDfd = new Promise(function(resolve, reject) {
                resolve();
            });
            spyOn(filesystem, 'getLogFile').andReturn(fileDfd);
            spyOn(filesystem, 'writeToFile').andReturn(writeDfd);

            var success = null;
            runs(function() {
                filesystem.writeToLog(blob).then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(filesystem.getLogFile).toHaveBeenCalled();
                expect(filesystem.writeToFile).toHaveBeenCalledWith(logFile, blob, true);
            });
        });

        it('can fail writing to log file during write', function() {
            var blob = new Blob(['TEST'], {type: 'text/plain'});
            var logFile = mockFile.logFile();
            var fileDfd = new Promise(function(resolve, reject) {
                resolve(logFile);
            });
            var writeDfd = new Promise(function(resolve, reject) {
                reject('nope');
            });
            spyOn(filesystem, 'getLogFile').andReturn(fileDfd);
            spyOn(filesystem, 'writeToFile').andReturn(writeDfd);

            var success = null;
            runs(function() {
                filesystem.writeToLog(blob).then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(filesystem.getLogFile).toHaveBeenCalled();
                expect(filesystem.writeToFile).toHaveBeenCalledWith(logFile, blob, true);
            });
        });

        it('can fail writing to log file during getLogFile', function() {
            var blob = new Blob(['TEST'], {type: 'text/plain'});
            var logFile = mockFile.logFile();
            var fileDfd = new Promise(function(resolve, reject) {
                reject();
            });
            spyOn(filesystem, 'getLogFile').andReturn(fileDfd);
            spyOn(filesystem, 'writeToFile');

            var success = null;
            runs(function() {
                filesystem.writeToLog(blob).then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(filesystem.getLogFile).toHaveBeenCalled();
                expect(filesystem.writeToFile).not.toHaveBeenCalled();
            });
        });

        it('can read file', function() {
            var file = mockFile.file('test.file');
            file.file.andCallFake(function(callback) { callback('test'); });
            var reader = new MockFileReader();
            spyOn(window, 'FileReader').andReturn(reader);
            reader.result = 'hello world';
            reader.readAsText.andCallFake(function() {
                reader.onloadend();
            });

            var success = null;
            var content = null;
            runs(function() {
                filesystem.readFile(file).then(
                    function(read) { content = read; success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(file.file).toHaveBeenCalled();
                expect(reader.readAsText).toHaveBeenCalledWith('test', 'text/plain');
                expect(content).toBe('hello world');
            });
        });

        it('can fail file read', function() {
            var file = mockFile.file('test.file');
            file.file.andCallFake(function(callback) { callback('test'); });
            var reader = new MockFileReader();
            spyOn(window, 'FileReader').andReturn(reader);
            reader.error = 'nope';
            reader.readAsText.andCallFake(function() {
                reader.onloadend();
            });

            var success = null;
            var error = null;
            runs(function() {
                filesystem.readFile(file).then(
                    function() { success = true; },
                    function(e) { error = e; success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(file.file).toHaveBeenCalled();
                expect(reader.readAsText).toHaveBeenCalledWith('test', 'text/plain');
                expect(error).toBe('nope');
            });
        });

        it('can fail file read getting file', function() {
            var file = mockFile.file('test.file');
            file.file.andCallFake(function(callback, fail) { fail('nope'); });
            spyOn(filesystem, 'processError');

            var success = null;
            var error = null;
            runs(function() {
                filesystem.readFile(file).then(
                    function() { success = true; },
                    function(e) { error = e; success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(file.file).toHaveBeenCalled();
                expect(filesystem.processError).toHaveBeenCalledWith('nope');
                expect(error).toBe('nope');
            });
        });

        it('can read log file', function() {
            spyOn(filesystem, 'readFile').andReturn('done');
            filesystem._logFile = 'fake';

            var success = null;
            var result = null;
            runs(function() {
                filesystem.readLastFileLogFile().then(
                    function(value) { result = value; success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(filesystem.readFile).toHaveBeenCalledWith('fake');
                expect(result).toBe('done');
            });
        });

        it('can fail reading log file', function() {
            spyOn(filesystem, 'readFile').andReturn('done');

            var success = null;
            runs(function() {
                filesystem.readLastFileLogFile().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(filesystem.readFile).not.toHaveBeenCalled();
            });
        });
    });
});
