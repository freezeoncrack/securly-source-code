// define([
//     'amd/clients/api', 'amd/logger/logger','amd/lib/uuid', 
//     'amd/settings','amd/clients/logsender','amd/utils/MyInfo',
//     'underscore'
// ], function(
//        ApiClient, Logger, uuid, 
//        SETTINGS, LogSenderClient, MyInfo,
//        _
//    ){
import ApiClient from "/js/mjs/clients/api.js";
import Logger from "/js/mjs/logger/logger.js";
import uuid from "/js/mjs/lib/uuid.js";
import SETTINGS from "/js/mjs/settings.js";
import LogSenderClient from "/js/mjs/clients/logsender.js";
import MyInfo from "/js/mjs/utils/MyInfo.js";
import _ from "/js/lib/underscore.js";
import lifecycleEventHandler from "/js/mjs/chromeOsServices/lifecycleEventHandler.js";

var LogWatcher = function() {
    const _this = this;
    this.LogSender = new LogSenderClient();
    this.timeout = false;
    this.sendingLogs = false;
    this.token = false;
    this.running = true;
    this.user = false;
    this.apiClient = new ApiClient();
    this.apiClient.baseUrl = SETTINGS.DYDEV.CORE_SERVER + 'v1/';
    this.resolver = false;
    this.waiter = false;

    this.start = function() {
        lifecycleEventHandler.getActivationState("logWatcher", function (recovery){
            if (!recovery || !recovery.state){//session returns empty object by default
                _this._setTimer();
            } else {
                _this.startFromInactive(recovery);
            }
        });
    };

    this.startFromInactive = function (recovery){
        if (!recovery) {
            Logger.error("logWatcher-recover from fatal startFromInactive");            
        }
        switch(recovery.state){
            case "retry":
                var now = _.now();
                if (!recovery.time || now >= recovery.time){
                    _this._maybeCheckForLogRequests();
                } else {
                    _.delay(function (){
                        _this._maybeCheckForLogRequests();
                    }, recovery.time - now);
                }
                return;
            default:
                return _this._setTimer();
        }
    }
    
    this._setTimer = function() {
        var delay = 1800000;
        var time = _.now() + delay;
        lifecycleEventHandler.setActivationState("logWatcher", {
                state: "retry",
                time: time
        });

        _this.timeout = _.delay(function() {
            _this._maybeCheckForLogRequests();
        }, delay);
    };

    this._maybeCheckForLogRequests = function (){
        if(!MyInfo.getInstance() || !MyInfo.getInstance().info ||! _this._isInSchoolDay()) {
            _this._setTimer();
        } else {
            _this.checkForLogRequests().then(function() {
                _this._setTimer();
            }, function () {
                _this._setTimer();
            });
        }
    };

    this._isInSchoolDay = function () {
        var now = new Date(_.now());
        var nowHour = now.getHours();
        return nowHour >= 9 && nowHour <= 16;//only ask for request logs between 9 and 3pm
    };

    this._sendStatusUpdate = function(request_id, status) {
            return _this.apiClient.put(
                'RequestLogs?request_id=' + request_id + "&status=" + status + "&access_token=" + MyInfo.getInstance().info.token,SETTINGS.DEFAULT_RETRY_OPTIONS);                 
    };
    
    this._sendLogs = function(request) {
        var endDate = new Date(),
            startDate = new Date(endDate.getTime());
        startDate.setDate(startDate.getDate()- 7);
        var offset = endDate.getTimezoneOffset() / 60;

        startDate.setHours(startDate.getHours() + offset);
        endDate.setHours(endDate.getHours() + offset);

        var myInfo = MyInfo.getInstance();
        var options = {
            "username": myInfo.info.me.username, 
            "institution": myInfo.info.me.customer_name ? myInfo.info.me.customer_name : "",
            "email": myInfo.info.me.handles && myInfo.info.me.handles[0] ? myInfo.info.me.handles[0].handle_value : "",
            "notes":request.notes? request.notes : ""
        };

        return _this.LogSender.sendLogsWithStartDate(startDate, endDate, options).then(function() {
                return _this._sendStatusUpdate(request.request_id,"success");
            }, function(error) {
                //do nothing
                return; 
            });
    };

    this._sendHealthCheckLogs = function(request) {
        var endDate = new Date(),
            startDate = new Date(endDate.getTime());
        startDate.setDate(startDate.getDate()- 7);
        var offset = endDate.getTimezoneOffset() / 60;

        startDate.setHours(startDate.getHours() + offset);
        endDate.setHours(endDate.getHours() + offset);

        var myInfo = MyInfo.getInstance();
        var options = {
            "username": "Logs sent via Chromebook Health Check", 
            "institution": myInfo.info.me.customer_name ? myInfo.info.me.customer_name : "",
            "email": myInfo.info.me.handles && myInfo.info.me.handles[0] ? myInfo.info.me.handles[0].handle_value : "",
            "notes":"Heath Check Code: " + request.health_check_code
        };

        return _this.LogSender.sendLogsWithStartDate(startDate, endDate, options);
    };

    //prerequisites: myinfo.getinstance().info.me.account_id and myinfo.getinstance().info.token exist anre populated
    //postconditions: returns a thenable 
    this.checkForLogRequests = function(){            
        return _this.apiClient.get('RequestLogs?id=' + MyInfo.getInstance().info.me.account_id + "&access_token=" + MyInfo.getInstance().info.token,SETTINGS.DEFAULT_RETRY_OPTIONS, false).then(function(result){
            if(result && result.request_id){
                Logger.log("logWatcher", "starting send logs");
                return _this._sendLogs(result);
            }
        },function(err){
            return;
        });            
    };
};
export default LogWatcher;

