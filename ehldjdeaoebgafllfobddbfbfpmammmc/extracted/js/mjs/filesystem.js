import Queue from "/js/mjs/logger/queue.js";
import deferred from "/js/mjs/utils/deferred.js";
import lifecycleEventHandler from "/js/mjs/chromeOsServices/lifecycleEventHandler.js";
import timeLord from "/js/mjs/chromeOsServices/timeLord.js";

//now that webkitRequestfileSystem
const filesystemLog = {
    _databasename: "rxl_lg",
    _db: false,
    _initSuccessful: false,
    _logFile: false,
    _queued: [],
    MAX_FILES: 7,
    resetForUnitTests: function (){
        filesystemLog._databasename = "rxl_lg";
        filesystemLog._db = false;
        filesystemLog._initSuccessful = false;
        filesystemLog._logFile = false;
        filesystemLog._queued = [];       
    },
    isFromToday : function(file){
        var today = new Date(timeLord.now()),
        //we can do this because the name of the file is just new Date().toJSON();
            fileDate = new Date(file.name.slice(0, -4));

        return fileDate.getDate() === today.getDate();
    },

    getActualLogFilename: function () {
        var date = new Date(timeLord.now());
        return date.toISOString() + ".txt";
    },

    init: function () {        
        return this.initFilesystem();
    },

    _emptyQueueAfterInit: function () {
        var _this = this;
        this._queued.forEach(function (logEntry){
            var name = filesystemLog._logFile.name;
            logEntry.name = name;
            var transaction = _this._db.transaction(["logs"], "readwrite");
            transaction.objectStore("logs").add(logEntry);    
        });
        this._queued = [];
    }, 

    initFilesystem: function () {
        var _this = this;
        return deferred.get(function(dfd){
            //probably have to go get the initialization state 
            //i wonder whether we need to block everything on this
            //now given everything else we have to add on
        lifecycleEventHandler.getActivationState("filesystem", function (obj){
            //typically it would set the filesystem
            var request = indexedDB.open(filesystemLog._databasename, 2);
            
            request.onsuccess = async (event) => {
                var db = event.target.result;
                filesystemLog._db = db;
                if (obj && obj.name){
                    filesystemLog.startFromInactive(obj);
                } else {
                    await filesystemLog.clearLog();
                    await filesystemLog.initLogFile();    
                }
                filesystemLog._initSuccessful = true;
                if (_this._queued && _this._queued.length){
                    _this._emptyQueueAfterInit();
                }
                dfd.resolve();
            };

            request.onerror = (event) => {
                console.error("Why didn't you allow my web app to use IndexedDB?!");
            };

            request.onupgradeneeded = (event) => {
                // Save the IDBDatabase interface
                var db = event.target.result;
                // Create an objectStore for this database
                if (!event.oldVersion || event.oldVersion < 1){
                    var objectStore = db.createObjectStore("logs", { autoIncrement : true });
                    objectStore.createIndex("date", "date", { unique: false });
                    objectStore.createIndex("name", "name", { unique: false });
                }
                // Create an objectStore for qsr
                if (!event.oldVersion || event.oldVersion < 2){
                    db.createObjectStore("qsr", { keyPath: "qsr" });
                }
            };
        });
            /**
             * Request to filesystem on persistent local storage
             */
            // window.webkitRequestFileSystem(PERSISTENT, 5 * 1024 * 1024 /*5MB*/, function (fs) {
            //     _this._db = fs;
            //     _this.clearLog();
            //     _this.initLogFile().then(function () {
            //         window.filesystemLog = filesystemLog;
            //         _this.initQueue().then(function () {
            //             _this.__initSuccessful = true;
            //             resolve();
            //         });
            //     });
            // }, function (e) {
            //     _this.processError(e);
            //     reject(e);
            // });
        });
    },

    initLogFile: function() {
        var _this = this;
        var logFileName = _this.getActualLogFilename();
        var file = { name: logFileName};
        _this._logFile = file;
        lifecycleEventHandler.setActivationState("filesystem", {
            name: logFileName
        }, function () {

        });
    },

    startFromInactive: function (data){
        filesystemLog._logFile = { name: data.name};
    },
    /** Test Function **/
    getLogFile: function() {
        var _this = this;

        return new Promise(function (resolve, reject) {
            if (!(_this.__initSuccessful && typeof _this._logFile === "object"  )) {
                reject({ "message": "File creation process failed !" });
            }

            if (!_this.isFromToday(_this._logFile)) {
                _this.initLogFile().then(function (file) {
                    resolve(file);
                }, function (error) {
                    console.warn(error);
                    reject({ "message": "File creation process failed !" });
                });
            }

            resolve(_this._logFile);
        });
    },

    getLogFiles: async function() {
        //maybe for perf we just pass this stuff in maybe I dunno
        var transaction = this._db.transaction(["logs"], "readonly");
        var store = transaction.objectStore("logs")
        var index = {};
        for await(var val of filesystemLog.getQueryIterable(store, "date")){
            index[val.name] = true;
        }
        var files = Object.keys(index).map(key=>({ name: key}));
        return files;
    },

    logFileDate: function(file) {
        if (!file){
             console.error("no log file. returning 0");
             console.trace();
             return new Date(0);
        } else if (!file.name){
            console.error("no log file name. returning 0");
            return new Date(0);
        }
        return new Date(file.name.slice(0, -4));
    },

    getFilesBetweenDates: function(d1, d2) {
        var _this = this;
        var date2 = new Date(d2);
        date2.setDate(date2.getDate() + 1);

        return _this.getLogFiles().then(
            function(files) {
                return files.filter(function(file) {
                    var date = _this.logFileDate(file);
                    return date >= d1 && date < date2;
                });
            },
            function(e) {
                _this.processError(e);
                return deferred.get(function(dfd) {
                    dfd.reject(e);
                });
            }
        );
    },
    deleteFilesBefore: function (earliestDate){
        var dfd = deferred.get();
        var transaction = this._db.transaction(["logs"], "readwrite");
        var request = transaction
            .objectStore("logs")
            .index("date")
            .openCursor(IDBKeyRange.upperBound(earliestDate, true));
        request.onsuccess = function (event){
            var cursor = event.target.result;
            if (!cursor) { 
                dfd.resolve();
            } else {
                cursor.delete();
                cursor.continue();
            }
        };
        return dfd;
    },
    clearLog: async function() {
        var _this = this;
        if (typeof _this._db !== 'object') { return; }
        var dfd = deferred.get();
        var files = await _this.getLogFiles();
        var now = new Date(timeLord.now());
        var weekOld = new Date(timeLord.now());
        weekOld.setDate(now.getDate() - 6);//last 7 days including today
        files.sort(function(f1, f2) {
            var date1 = _this.logFileDate(f1);
            var date2 = _this.logFileDate(f2);
            return date1 < date2 ? -1 : date2 < date1 ? 1 : 0;
        });
        var oldest = weekOld.toISOString().substr(0, 10);
        await this.deleteFilesBefore(oldest);
    },

    error: function (title, error) {
        return this.write(title, error.message);
    },

    //prerequisite: log file must exist
    write: function (title, message) {
        var _this = this;
        
        message = typeof message === "undefined" ? '' : message;
        message = typeof message === "object" ?  JSON.stringify(message) : message;
        
        var now = timeLord.now();
        var nowDt = new Date(timeLord.now());
        var date = nowDt.toISOString().substr(0, 10);
        var data = [nowDt.toString() + ": " + title + " - " + message + "\n"]; // Note: window.WebKitBlobBuilder in Chrome 12.
        var logEntry = {//note, hidden autoincrement base index
            date: date,
            name: null,//override later
            now: now,
            data: data
        };
        if (!this._db){
            //database is not ready yet
            this._queued.push(logEntry);
            return;
        }
        //check if we need to create a new log file
        var logFileDate = filesystemLog.logFileDate(filesystemLog._logFile);
        if (logFileDate.getDay() !== nowDt.getDay()){
            this.initLogFile();//reset based on now
        }

        var name = filesystemLog._logFile.name;
        logEntry.name = name;
        var transaction = this._db.transaction(["logs"], "readwrite");
        transaction.objectStore("logs").add(logEntry);
        transaction.onsuccess = function(){
            //noop for now
        };
        transaction.onerror = function(e){
            console.error("failed to write log for "+ JSON.stringify(data));
        };
    },

    getQueryIterable: async function *getQueryIterable(store, index, range){
        var request;
        if (range){
            request = store.index(index).openCursor(range);
        } else {
            request = store.index(index).openCursor();
        }
        
        var dfd = deferred.get();
        //this is weird bc cursor's api is weird
        request.onsuccess = function (event){
            var cursor = event.target.result;
            if (!cursor) { 
                //we're done! nothing left to check
                var oldDfd = dfd; 
                dfd = null; 
                oldDfd.resolve();
                return;
            }
            dfd.resolve(cursor.value);
            dfd = deferred.get();
            cursor.continue();
        };

        while (dfd){
            var val = await dfd;
            if (!val){ return;}
            yield val;
        }
    },
    readFile: async function(file) {
        var name = file.name;
        var transaction = this._db.transaction(["logs"], "readonly");
        var store = transaction.objectStore("logs");
        var retStr = "";
        for await(var val of filesystemLog.getQueryIterable(store, "name", IDBKeyRange.only(name))){
            retStr += val.data[0];
        }
        return retStr;
    },

    readLastFileLogFile: async function() {
        if (!filesystemLog._logFile) {
            throw {error: 'Log file not initialized.'};
        }
        return filesystemLog.readFile(filesystemLog._logFile);
    },

    processError: function (e) {
        console.warn(e);
    },

    //precondition: db is initialized
    getQSR: function() {
        var transaction = this._db.transaction(["qsr"], "readonly");
        var store = transaction.objectStore("qsr");
        var request = store.get("qsr");
        return deferred.get(function(dfd){
            request.onsuccess = function(event) {
                var json = event.target.result;
                dfd.resolve(json && json.data);
            };
            request.onerror = function(event) {
                dfd.reject(event);
            };
        }); 
    },
    setQSR: function(data) {
        var transaction = this._db.transaction(["qsr"], "readwrite");
        var store = transaction.objectStore("qsr");
        var request;
        if (!data){
            request = store.delete("qsr");
        } else {
            request = store.put({
                qsr: "qsr",
                data: data
            })
        }
        return deferred.get(function(dfd){
            request.onsuccess = function(event) {
                dfd.resolve();
            };
            request.onerror = function(event) {
                dfd.reject(event);
            };
        });
    }
};

export default filesystemLog;