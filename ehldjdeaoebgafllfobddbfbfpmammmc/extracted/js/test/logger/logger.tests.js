/*global TEMPORARY */
define(['amd/logger/logger', 'amd/filesystem','amd/logger/queue'], function(Logger, filesystemLog,Queue) {
    xdescribe('Logger', function () {

        beforeEach(function (done) {
            //http://updates.html5rocks.com/2011/11/Quota-Management-API-Fast-Facts
            //on chrome extension we get to request
            var writtenData = "";
            spyOn(filesystemLog, "write").andCallFake(function(title,message){
                message = typeof message === "object" ?  JSON.stringify(message) : message;
                writtenData  = JSON.stringify([new Date().toString() + ": " + title + " - " + message + "\n"]);
            });
            spyOn(filesystemLog, "readLastFileLogFile").andCallFake(function(){
                return $.Deferred(function(dfd){
                    dfd.resolve(writtenData);
                });
            });
        });

        it('successfully writes debug to file', function () {
            var title = 'this is the title',
                message = 'this is the message';

            Logger.debug(title, message);
            filesystemLog.readLastFileLogFile()
                .done(function(text){
                    var includesTitle = text.indexOf(title) !== -1;
                    var includesMessage = text.indexOf(message) !== -1;
                    expect(includesMessage).toBe(true);
                    expect(includesTitle).toBe(true);
                });
        });
    });

    xdescribe('Log messages written in order', function() {

        var testQueue = new Queue();

        beforeEach(function (done) {
            //this is the same as in filesystem, the only diff being it uses TEMPORARY storage
            //instead of PERMINANT since we can't create to PERM in a unit test.
            spyOn(filesystemLog, 'initFilesystem').andCallFake(function () {
                var _this = filesystemLog;
                return new Promise(function (resolve, reject) {
                    /**
                     * Request to filesystem on persistent local storage
                     */
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

            spyOn(filesystemLog, "readLastFileLogFile").andCallFake(function () {
                var _msgQueue = filesystemLog._msgQueue,
                    _logFile = filesystemLog._logFile;

                return $.Deferred(function (dfd) {
                    if (_msgQueue.length === 0) {
                        _logFile.file(function (file) {
                            var reader = new FileReader();

                            reader.onloadend = function () {
                                console.info(this.result);
                                dfd.resolve(this.result);
                            };
                            reader.readAsText(file);
                        }, function (e) {
                            filesystemLog.processError(e);
                            dfd.reject(e);
                        });
                    }
                });
            });
            spyOn(filesystemLog, "initQueue").andCallFake(function(){
                var _this = filesystemLog;
                return new Promise(function(resolve,reject) {
                    _this._msgQueue = _this.getQueue();//testQueue;
                    if(_this._msgQueue) {
                        resolve();
                    } else {
                        _this._queueError = 'failed to create message queue';
                        reject({'error': _this._queueError});
                    }
                });
            });

            spyOn(filesystemLog, 'write').andCallFake(function(title,message){

                var _this = filesystemLog,
                    testQueue = filesystemLog.getQueue();
                message = typeof message === "object" ?  JSON.stringify(message) : message;

                // Create a new Blob and write it to log.txt.
                var data = [new Date().toString() + ": " + title + " - " + message + "\n"] , // Note: window.WebKitBlobBuilder in Chrome 12.
                    blob = new Blob(data, {type: "text/plain"});

                testQueue.enqueue(blob);

            });

            if(!filesystemLog._initSuccessful){
                filesystemLog.init().then(function() {
                    expect(typeof filesystemLog._msgQueue).toBe('object');
                   done();
                });
            }
        });

        afterEach(function () {

        });

        it('messages should be in order', function (){
            var finishedWrites = false,
                title1,
                title2,
                message1,
                message2;

            runs ( function () {
                title1 = 'Gettysburg Address';
                message1 = 'Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battlefield of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this. But, in a larger sense, we can not dedicate, we can not consecrate, we can not hallow this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us—that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion—that we here highly resolve that these dead shall not have died in vain—that this nation, under God, shall have a new birth of freedom—and that government of the people, by the people, for the people, shall not perish from the earth.';
                title2 = 'Declaration of Independence';
                message2 = 'We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.--That to secure these rights, Governments are instituted among Men, deriving their just powers from the consent of the governed, --That whenever any Form of Government becomes destructive of these ends, it is the Right of the People to alter or to abolish it, and to institute new Government, laying its foundation on such principles and organizing its powers in such form, as to them shall seem most likely to effect their Safety and Happiness. Prudence, indeed, will dictate that Governments long established should not be changed for light and transient causes; and accordingly all experience hath shewn, that mankind are more disposed to suffer, while evils are sufferable, than to right themselves by abolishing the forms to which they are accustomed. But when a long train of abuses and usurpations, pursuing invariably the same Object evinces a design to reduce them under absolute Despotism, it is their right, it is their duty, to throw off such Government, and to provide new Guards for their future security.--Such has been the patient sufferance of these Colonies; and such is now the necessity which constrains them to alter their former Systems of Government. The history of the present King of Great Britain is a history of repeated injuries and usurpations, all having in direct object the establishment of an absolute Tyranny over these States. To prove this, let Facts be submitted to a candid world.';


                Logger.debug(title1, message1);
                Logger.log(title2, message2);
                Logger.warn(title1,message1);
                //Logger.error(title2,message2);
                setTimeout(function() { finishedWrites = true; }, 3000);
            });

            waitsFor(function(){
                return finishedWrites;
            });

            runs(function(){
                var testQueue = filesystemLog.getQueue();
                expect(testQueue.isEmpty()).toBe(false);
                expect(testQueue.getLength()).toBe(3);
                expect(typeof testQueue.peek()).toBe('object');
                expect(testQueue.getLength()).toBe(3);
                testQueue.dequeue();
                expect(testQueue.getLength()).toBe(2);
                testQueue.dequeue();
                testQueue.dequeue();
                expect(testQueue.isEmpty()).toBe(true);
            });
        });

    });


    describe('logging should be written to file in order',function(){

        var testQueue = new Queue();

        beforeEach(function() {

            //originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            //jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;

            //this is the same as in filesystem, the only diff being it uses TEMPORARY storage
            //instead of PERMINANT since we can't create to PERM in a unit test.
            spyOn(filesystemLog, 'initFilesystem').andCallFake(function () {
                var _this = filesystemLog;
                return new Promise(function (resolve, reject) {
                    /**
                     * Request to filesystem on persistent local storage
                     */
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

            spyOn(filesystemLog, "readLastFileLogFile").andCallFake(function () {
                var _msgQueue = filesystemLog._msgQueue,
                    _logFile = filesystemLog._logFile;

                return $.Deferred(function (dfd) {
                    //if (_msgQueue.length === 0) {
                        _logFile.file(function (file) {
                            var reader = new FileReader();

                            reader.onloadend = function () {
                                console.info(this.result);
                                dfd.resolve(this.result);
                            };
                            reader.readAsText(file);
                        }, function (e) {
                            filesystemLog.processError(e);
                            dfd.reject(e);
                        });
                    //}
                });
            });

            spyOn(filesystemLog, "initQueue").andCallFake(function(){
                var _this = filesystemLog;
                return new Promise(function(resolve,reject) {
                    _this._msgQueue = testQueue;
                    if(_this._msgQueue) {
                        resolve();
                    } else {
                        _this._queueError = 'failed to create message queue';
                        reject({'error': _this._queueError});
                    }
                });
            });

            spyOn(filesystemLog, 'write').andCallFake(function(title,message){

                var _this = filesystemLog;

                message = typeof message === "undefined" ? '' : message;
                message = typeof message === "object" ?  JSON.stringify(message) : message;
                // Create a new Blob and write it to log.txt.
                var data = [new Date().toString() + ": " + title + " - " + message + "\n"] , // Note: window.WebKitBlobBuilder in Chrome 12.
                    blob = new Blob(data, {type: "text/plain"});
                console.log(data);
                testQueue.enqueue(blob);
                _this.log_enqueued_handler();
            });
            spyOn(filesystemLog,'log_enqueued_handler').andCallFake(function(){
                var _this = filesystemLog;
                if(!_this.writingToFile && !testQueue.isEmpty()) {
                    var blob = testQueue.peek();
                    _this.writeToFile(blob).then(function () {
                        testQueue.dequeue();
                        console.log('log msg dequeued');
                        _this.log_dequeued_handler();
                    });
                }
            });
            spyOn(filesystemLog,'log_dequeued_handler').andCallFake(function(){
                var _this = this;
                if(!_this.writingToFile && !testQueue.isEmpty()) {
                    var blob = testQueue.peek();
                    _this.writeToFile(blob).then(function () {
                        testQueue.dequeue();
                        console.log('log msg dequeued');
                        _this.log_dequeued_handler();
                    });
                }
            });

            filesystemLog.init();
        });

        afterEach(function(){
            //jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        });

        it('logs get written in the order that they were sent', function() {

                var p = ['George Washington   (1789-1797)',
                    'John Adams   (1797-1801)',
                    'Thomas Jefferson   (1801-1817)',
                    'James Madison   (1809-1817)',
                    'James Monroe   (1817-1825)',
                    'John Quincy Adams   (1825-1829)',
                    'Andrew Jackson   (1829-1837)',
                    'Martin Van Buren   (1837-1841)',
                    'William Henry Harrison   (1841)',
                    'John Tyler   (1841-1845)',
                    'James K. Polk   (1845-1849)',
                    'Zachary Taylor   (1849-1850)',
                    'Millard Fillmore   (1850-1853)',
                    'Franklin Pierce   (1853-1857)',
                    'James Buchanan   (1857-1861)',
                    'Abraham Lincoln   (1861-1865)',
                    'Andrew Johnson (1865-1869)',
                    'Ulysses S. Grant   (1869-1877)',
                    'Rutherford B. Hayes   (1877-1881)',
                    'James A. Garfield   (1881)',
                    'Chester A. Arthur   (1881-1885)',
                    'Grover Cleveland   (1885-1889)',
                    'Benjamin Harrison   (1889-1893)',
                    'Grover Cleveland   (1893-1897)',
                    'William McKinley   (1897-1901)',
                    'Theodore Roosevelt   (1901-1909)',
                    'William H. Taft   (1909-1913)',
                    'Woodrow Wilson   (1913-1921)',
                    'Warren G. Harding   (1921-1923)',
                    'Calvin Coolidge   (1923-1929)',
                    'Herbert Hoover   (1929-1933)',
                    'Franklin D. Roosevelt   (1933-1945)',
                    'Harry S. Truman   (1945-1953)',
                    'Dwight D. Eisenhower   (1953-1961)',
                    'John F. Kennedy   (1961-1963)',
                    'Lyndon B. Johnson   (1963-1969)',
                    'Richard M. Nixon   (1969-1974)',
                    'Gerald R. Ford   (1974-1977)',
                    'Jimmy Carter   (1977-1981)',
                    'Ronald Reagan   (1981-1989)',
                    'George Bush   (1989-1993)',
                    'William J. Clinton   (1993-2001)',
                    'George W. Bush   (2001-2009)',
                    'Barack Obama   (2009-)'],
                    finishedWrites = false;

                runs ( function () {

                    p.forEach(function(p){
                        Logger.log(p);
                    });
                    setTimeout(function() {
                        finishedWrites = true;
                    }, 4500);
                });

                waitsFor(function(){
                    return finishedWrites;
                });

                var text,
                    fileRead = false;
                runs(function(){

                    filesystemLog.readLastFileLogFile().then(function(textFromFile){
                        text = textFromFile;
                        fileRead = true;
                    });
                });

                waitsFor(function(){
                    return fileRead;
                });

                runs(function(){
                    expect(filesystemLog.getQueue().isEmpty()).toBe(true);
                    expect(text).toBeTruthy();
                    var split = text.split('\n');

                    expect(split[0].indexOf(p[0]) > -1).toBe(true);
                    expect(split[8].indexOf(p[8]) > -1).toBe(true);
                    expect(split[23].indexOf(p[23]) > -1).toBe(true);
                    expect(split[43].indexOf(p[43]) > -1).toBe(true);
                });

        });

        xit('log file correctly written to',function(){

            var finishedWrites = false,
                title1,
                title2,
                message1,
                message2;

            runs ( function () {
                title1 = 'Gettysburg Address';
                message1 = 'Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war,';// testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battlefield of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this. But, in a larger sense, we can not dedicate, we can not consecrate, we can not hallow this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us—that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion—that we here highly resolve that these dead shall not have died in vain—that this nation, under God, shall have a new birth of freedom—and that government of the people, by the people, for the people, shall not perish from the earth.';
                title2 = 'Declaration of Independence';
                message2 = 'We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.--That to secure these rights, Governments are instituted among Men';//, deriving their just powers from the consent of the governed, --That whenever any Form of Government becomes destructive of these ends, it is the Right of the People to alter or to abolish it, and to institute new Government, laying its foundation on such principles and organizing its powers in such form, as to them shall seem most likely to effect their Safety and Happiness. Prudence, indeed, will dictate that Governments long established should not be changed for light and transient causes; and accordingly all experience hath shewn, that mankind are more disposed to suffer, while evils are sufferable, than to right themselves by abolishing the forms to which they are accustomed. But when a long train of abuses and usurpations, pursuing invariably the same Object evinces a design to reduce them under absolute Despotism, it is their right, it is their duty, to throw off such Government, and to provide new Guards for their future security.--Such has been the patient sufferance of these Colonies; and such is now the necessity which constrains them to alter their former Systems of Government. The history of the present King of Great Britain is a history of repeated injuries and usurpations, all having in direct object the establishment of an absolute Tyranny over these States. To prove this, let Facts be submitted to a candid world.';


                Logger.debug(title1, message1);
                Logger.log(title2, message2);
                Logger.warn(title1,message1);
                Logger.debug(title1, message1);
                Logger.log(title2, message2);
                Logger.warn(title1,message1);
                Logger.debug(title1, message1);
                Logger.log(title2, message2);
                Logger.warn(title1,message1);
                Logger.debug(title1, message1);
                Logger.log(title2, message2);
                Logger.warn(title1,message1);
                Logger.debug(title1, message1);
                Logger.log(title2, message2);
                Logger.warn(title1,message1);
                Logger.error(title2,message2);
                //wait 10 seconds
                setTimeout(function() { finishedWrites = true; }, 4500);
            });

            waitsFor(function(){
               return finishedWrites;
            });
            var text,
                fileRead = false;
            runs(function(){

                filesystemLog.readLastFileLogFile().then(function(textFromFile){
                    text = textFromFile;
                    fileRead = true;
                });
            });

            waitsFor(function(){
                return fileRead;
            });

            runs(function(){
                expect(filesystemLog.getQueue().isEmpty()).toBe(true);
                expect(text).toBeTruthy();


            });
        });
    });
});