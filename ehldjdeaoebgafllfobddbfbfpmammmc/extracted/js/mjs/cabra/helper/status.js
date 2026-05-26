import Logger from "/js/mjs/logger/logger.js";
import Sandbox from "/js/mjs/sandbox.js";
import WindowHelper from "/js/mjs/windowHelper.js";
import WindowKeepAliveManager from "/js/mjs/windowKeepAliveManager.js";
import WindowKeepAlive from "/js/mjs/windowKeepAlive.js";

var Status = function () {
    var sandbox = new Sandbox().init();

    this.keepAlive = new WindowKeepAlive();
    var _this = this;
    this.currentStatus = {};
    this.pendingStatusRequest = false;
    this.init = function () {
        return _this;
    };
    this.setStatus = function(status){
        _this.currentStatus = status;
        _this.hideUI();
        sandbox.publish('statusUpdateDifferentDevice', status);
        chrome.storage.local.set({status: status});
    };

    this.clearStatus = function(){
        chrome.storage.local.remove("status");
    };

    this.requestStatus = function(request) {
        var self = this;
        var openDialog = WindowKeepAlive.openPopupPromise.bind(
            WindowKeepAlive,
            'status', request,
            '../ui/views/cabras/statusRequest.html', 400, 150
        );
        var shouldBeOpen = WindowKeepAlive.shouldBeOpenPromise.bind(
            WindowKeepAlive,
            function() { return self.pendingStatusRequest; });

        var addKeepAlive = function () {
            Logger.info('Will add keep alive for status');
            self.pendingStatusRequest = true;
            self.keepAlive = new WindowKeepAlive(openDialog, shouldBeOpen);
            WindowKeepAliveManager.addKeepAlive(self.keepAlive);
        };

        if (this.keepAlive) {
            //Close the existing window and keepAlive
            Logger.debug("A Status Keep Alive Exists, will remove before creating a new one", this.keepAlive);
            WindowKeepAliveManager.removeKeepAlive(this.keepAlive).then(function () {
                Logger.info("The old Status keepalive was succesfully removed");
                self.keepAlive = false;
                addKeepAlive();
            }, function () {
                Logger.warn("The old Status keepalive failed to be removed");
                self.keepAlive = false;
                addKeepAlive();
            });
        } else {
            Logger.debug("A Status Keep alive does not exist, will add one immediately");
            addKeepAlive();
        }
    };

    this.hideUI = function(){
        Logger.debug("Will hide Status UI");
        _this.pendingStatusRequest = false;
        WindowKeepAliveManager.removeKeepAlive(_this.keepAlive);
    };

    this.start = function () {
        this.clearStatus();
    };

    this.stop = function () {
        this.clearStatus();
        this.hideUI();
    };
};

export default Status;
