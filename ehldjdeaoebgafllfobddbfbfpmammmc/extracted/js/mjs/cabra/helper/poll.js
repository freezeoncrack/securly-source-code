import Logger from "/js/mjs/logger/logger.js";
import Sandbox from "/js/mjs/sandbox.js";
import WindowHelper from "/js/mjs/windowHelper.js";
import WindowKeepAliveManager from "/js/mjs/windowKeepAliveManager.js";
import WindowKeepAlive from "/js/mjs/windowKeepAlive.js";

var Poll = function () {
    this.keepAlive = new WindowKeepAlive();
    var sandbox = new Sandbox().init();
    var _this = this;
    this.pendingPoll = false;
    this.init = function () {
        return _this;
    };
    this.openAssessments = {};

    this.assessmentRequest = function(request) {
        var self = this;
        var openDialog = WindowKeepAlive.openPopupPromise.bind(
            WindowKeepAlive,
            'assessment', request,
            '../ui/views/cabras/pollRequest.html', 370, 500
        );
        var shouldBeOpen = WindowKeepAlive.shouldBeOpenPromise.bind(
            WindowKeepAlive,
            function() { return self.pendingPoll; });

        var addKeepAlive = function () {
            Logger.info('Will add keep alive For poll');
            self.pendingPoll = true;
            self.keepAlive = new WindowKeepAlive(openDialog, shouldBeOpen);
            WindowKeepAliveManager.addKeepAlive(self.keepAlive);
        };

        if (this.keepAlive) {
            //Close the existing window and keepAlive
            Logger.debug("A Poll Keep Alive Exists, will remove before creating a new one", this.keepAlive);
            WindowKeepAliveManager.removeKeepAlive(this.keepAlive).then(function () {
                Logger.info("The old Poll keepalive was succesfully removed");
                self.keepAlive = false;
                addKeepAlive();
            }, function () {
                Logger.warn("The old Poll keepalive failed to be removed");
                self.keepAlive = false;
                addKeepAlive();
            });
        } else {
            Logger.debug("A Poll Keep alive does not exist, will add one immediately");
            addKeepAlive();
        }
    };

    this.hideUI = function(){
        Logger.debug("Will hide Poll UI");
        _this.pendingPoll=false;
        WindowKeepAliveManager.removeKeepAlive(_this.keepAlive);
    };

    this.start = function () {

    };

    this.stop = function () {
        this.hideUI();
    };
};

export default Poll;
