import DeviceInformation from "/js/mjs/logger/DeviceInformation.js";
import EnvironmentInformation from "/js/mjs/logger/EnvironmentInformation.js";
import Api from "/js/mjs/clients/api.js";
import deferred from "/js/mjs/utils/deferred.js";
import EventEmitter from "/js/mjs/lib/EventEmitter.js";
import { extend } from "/js/globals.js";
import filesystemLog from "/js/mjs/filesystem.js";


var LogSenderClient = function(baseUrl){
    var baseUrl = baseUrl || 'https://diag.dyknow.com/dyknowlogservice60/dylogservice.svc/json/',
        api = new Api(),
        createPayload = function(options){
            var deviceInfo = new DeviceInformation(),
                envInfo = new EnvironmentInformation();

            var payload = {
                fullname: options.name || '',
                username: options.username || '',
                email: options.email || '',
                inst: options.institution || '',
                notes: options.notes || '',
                envReport: {
                    version: options.version || envInfo._getProductVersion(),
                    hostname: options.hostName || deviceInfo._getHostName(),
                    operatingSystem: options.operatingSystem || deviceInfo._getOSDescription(),
                    kernalVersion: options.kernalVersion || deviceInfo._getKernelVersion(),
                    MachineName: options.machineName || deviceInfo._getMachineName(),
                    MachineModel: options.machineModel || deviceInfo._getMachineModel(),
                    CurrentLocale: options.currentLocale || deviceInfo._getCurrentLocale(),
                    CPUType: options.cpuType || deviceInfo._getCPUType(),
                    ProcessorSpeed: options.processorSpeed || deviceInfo._getProcessorSpeed(),
                    ProcessorCount: options.processorCount || deviceInfo._getNumberOfProcessors(),
                    PhysicalMemory: options.physicalMemory || deviceInfo._getPhysicalMemory(),
                    UserMemory: options.userMemory || deviceInfo._getUserMemory(),
                    VideoAdapter: options.videoAdapter || deviceInfo._getVideoAdapter(),
                    VideoMemory: options.videoMemory || deviceInfo._getVideoMemory(),
                    Monitors: options.monitors || deviceInfo._getMonitors(),
                    NetworkDevices: options.networkDevices || deviceInfo._getNetworkDevices(),
                    RunningApplications: options.runningApplications || [],
                    MonitorInstalled: options.monitorInstalled || envInfo._getMonitorIsInstalled(),
                    MonitorRunning: options.monitorRunning || envInfo._getMonitorIsRunning(),
                    AgentExists: options.agentExists || envInfo._getMonitorAgentExists()
                }
            };

            return JSON.stringify(payload);
        },
        executeRemoteAction = function(action, payload){
            return api.post(baseUrl + action, { data: payload}).then(function(result){
                if (!result || result.RetCode !== 0){
                    return deferred.get().reject(result);
                } else return deferred.get().resolve(result);
            });
        };
    this._api = api;

    this._createMarkerWithDirectoryPath = function(dirPath, marker){
        return executeRemoteAction("CreateMarker", JSON.stringify({DirPath: dirPath, Type: marker}));
    };

    this._sendEnvironmentReport = function(options){
        var payload = createPayload(options);
        this._updateProgress(0, 1, 'Generating Environment Report');
        //options should probably only have username, email, institution, and notes at this point (we get this through the UI on send logs.
        return this._sendEnvironmentReportWithFullName(payload);
        //do stuff
    };

    this.sendLogsWithStartDate = function(startDate, endDate, options){
        var _this = this;
        return deferred.get(function(dfd){
            _this._sendEnvironmentReport(options)
                .then(function(responseObj){
                    filesystemLog.getFilesBetweenDates(startDate, endDate)
                        .then(function(fileEntries){
                            var dirPath = responseObj.UploadDir;
                            _this._markUploadStartWithDirectory(dirPath)
                                .then(function(){
                                    _this._updateProgress(1, 1, 'Environment Report Successfully Sent');
                                    _this._updateProgress(0, fileEntries.length, "Uploading Files");
                                    _this._uploadFiles(fileEntries, dirPath)
                                        .then(function(numFiles){
                                            _this._markUploadEndWithDirectory(dirPath, 2);
                                            _this._updateProgress(numFiles, numFiles, "Logs Successfully Sent");
                                            dfd.resolve();
                                        }, function(e){
                                            dfd.reject({ message: 'Failed to upload all log files. Please check your Internet connection and have your admin verify diag.dyknow.com is whitelisted. If this problem persists, please contact Dyknow support.', error: e });
                                        });
                                }, function(e){
                                    dfd.reject({ message: 'Failed to mark upload start with directory. Please check your Internet connection and have your admin verify diag.dyknow.com is whitelisted. If this problem persists, please contact Dyknow support.', error: e });
                                });
                        }, function(e){
                            dfd.reject({ message: 'Failed to read log files. Please try again. If this problem persists, please contact Dyknow support.', error: e });
                        });
                }, function(e){
                    dfd.reject({ message: 'Failed to send environment report. Please check your Internet connection and have your admin verify diag.dyknow.com is whitelisted. If this problem persists, please contact Dyknow support.', error: e });
                });
        });
    };



    this._sendEnvironmentReportWithFullName = function (payload){
        return executeRemoteAction("DyKnowLogMac", payload);
    };

    this._markUploadStartWithDirectory = function(path){
        return this._createMarkerWithDirectoryPath(path, 1);
    };

    this._uploadFile = function(uploadDir,file){
        return deferred.get(async function(dfd){
            try{
                var fileDate = new Date(file.name.slice(0, -4));
                var fileName = 'DM' +fileDate.getFullYear().toString() + (fileDate.getMonth() + 1).toString() + fileDate.getDate().toString() + '_' + fileDate.getHours().toString() + fileDate.getMinutes().toString() + fileDate.getSeconds().toString()+ '.log';
                var getPayload = function(chunkData, chunkNum, totalChunks){
                    var payload = {
                        UploadDir: uploadDir,
                        FileName: fileName,
                        ChunkData: chunkData,
                        ChunkNum: chunkNum,
                        TotalChunks: totalChunks
                    };
                    return payload;
                };

                var maxChunkSize = 102400;
                var start = 0;
                var stop = maxChunkSize;
                var uploadedChunks = 0;
                var chunk = 0;
                var fileData = await filesystemLog.readFile(file);
                var fileBlob = new Blob([fileData]);

                var remainder = fileBlob.size % maxChunkSize;
                var totalChunks = Math.floor(fileBlob.size / maxChunkSize);
                if (remainder !== 0) {
                    totalChunks += 1;
                }

                if(!fileBlob.size){
                    dfd.resolve();
                }

                //its important that we upload these in order 
                //or we get weirdness in the log files
                for(var i = 0; i < totalChunks; i++){
                    let blob = fileBlob.slice(start, stop);
                    let reader = new FileReader();
                    let payload = getPayload("", chunk, totalChunks);
                    chunk++;
                    let payloadDfd = deferred.get();
                    reader.onload = function(e){
                        var base64 = e.target.result.match(/,(.*)$/)[1];
                        payloadDfd.resolve(base64);
                    };

                    start = stop;

                    if(i === (totalChunks -1) && remainder !== 0){
                        stop = start + remainder;
                    } else {
                        stop+= maxChunkSize;
                    }

                    reader.readAsDataURL(blob);
                    var base64 = await payloadDfd;
                    payload.ChunkData = base64;

                    await executeRemoteAction('UploadChunk', JSON.stringify(payload))
                        
                    uploadedChunks++;
                    if(uploadedChunks === totalChunks){
                        dfd.resolve();
                    }
                }
            } catch(e){
                dfd.reject(e);
            }
        });
    };

    this._uploadFiles = function(fileEntries, dirPath){
        var dfd = deferred.get(),
            total = fileEntries.length,
            done = 0,

            _this = this,
            recursiveUpload = function(file){
                _this._uploadFile(dirPath, file)
                    .then(function(){
                        done += 1;

                        if(done === total){
                            dfd.resolve(total);
                        } else {
                            _this._updateProgress(done, total, 'Uploading file ' + (done+1) + '/' + total);
                            recursiveUpload(fileEntries[done]);
                        }
                    });
            };

        if(fileEntries.length) {
            recursiveUpload(fileEntries[done]);
        } else {
            setTimeout(function(){
                dfd.resolve(0);
            });
        }

        return dfd;
    };

    this._markUploadEndWithDirectory = function(path){
        return this._createMarkerWithDirectoryPath(path, 2);
    };

    this._uploadFilePath = function(){

    };

    this._updateProgress = function (current, total, message){
        var obj = {
            current: current,
            total: total,
            message: message
        };
        this.trigger('statusUpdate', [obj]);
    };

    this._uploadComplete = function (){

    };

    this._uploadError = function (){

    };
};

extend( LogSenderClient, EventEmitter );


export default LogSenderClient;


