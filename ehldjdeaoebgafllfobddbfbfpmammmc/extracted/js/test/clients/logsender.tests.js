define([
    'amd/clients/logsender',
    'amd/logger/logger',
    'amd/filesystem',
    'jquery'
], function(
    LogSender,
    Logger,
    filesystem,
    $
) {
    describe('LogSender send logs', function() {
        var logSender;
        beforeEach(function() {
            window.filesystemLog = filesystem;
            logSender = new LogSender();
        });

        afterEach(function() {
            window.filesystemLog = null;
            logSender = null;
        });

        function promiseFactory(success, message) {
            return $.Deferred(function(dfd) {
                dfd[success ? 'resolve' : 'reject'](message);
            });
        }

        function spyAndPromise(obj, method, success, message) {
            var dfd = promiseFactory(success, message);
            spyOn(obj, method).andReturn(dfd);
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
    });
});
