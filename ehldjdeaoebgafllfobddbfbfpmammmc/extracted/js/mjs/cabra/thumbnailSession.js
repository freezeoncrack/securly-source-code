
import CabraSession from "/js/mjs/cabra/session.js"; 
import SETTINGS from "/js/mjs/settings.js"; 
import Logger from "/js/mjs/logger/logger.js"; 
import Thumbnail from "/js/mjs/cabra/helper/thumbnail.js"; 
import _ from "/js/lib/underscore.js";
import { extend, SystemError } from "/js/globals.js";
import eventAggregator from "/js/mjs/utils/eventAggregator.js";
import deferred from "/js/mjs/utils/deferred.js";

var ThumbnailCabraSession = function () {

    this.thumbnail = null;
    this.Thumbnail = Thumbnail;
    this._hasEntered = false;
    this._midEnterQueue = [];

    this.init = function (name, cabraId, rules, satelliteAPIClient, instance) {
        this.thumbnail = new this.Thumbnail().init();
        return ThumbnailCabraSession.prototype.init.apply(this, arguments);
    };

    this.willEnterCabra = function () {
        Logger.debug("Thumbnail entering/subscribing");
        this.subscribe();

        ThumbnailCabraSession.prototype.willEnterCabra.apply(this, arguments);
    };

    this.willLeaveCabra = function () {
        Logger.debug("Thumbnail Stopping");
        this.thumbnail.stop();
        
        ThumbnailCabraSession.prototype.willLeaveCabra.apply(this, arguments);
    };

    this.applyFromState = function (frame) {
        ThumbnailCabraSession.prototype.applyFromState.apply(this, arguments);
        
        this._hasEntered = true;
        if ((!frame || !frame.payload || _.isEmpty(frame.payload) ) && this._midEnterQueue.length){
            var data = _.last(this._midEnterQueue);
            frame = this._getFrame(data);
            this._midEnterQueue = [];//clear it out
        }

        this._updateThumbnail(frame);
    };

    this.applyFromRealtime = function (data) {

        ThumbnailCabraSession.prototype.applyFromRealtime.apply(this, arguments);

        if (!this._hasEntered){
            Logger.debug("Thumbnail data arrived before enter. enqueuing till after Enter");
            this._midEnterQueue.push(data);
            return;
        }

        var frame = this._getFrame(data);
        this._updateThumbnail(frame);
    };

    this._updateThumbnail = function ( frame ){
        Logger.debug("Updating Thumbnail");
        if ( !(frame && typeof frame === "object" && frame.payload &&
            typeof frame.payload === "object") ) {
            throw new SystemError("Not valid payload !");
        }

        var payload = frame.payload,
            rule = this.rules.filter(function(rule){
                return rule.to === SETTINGS.DYDEV.RULE_TO_CONST;
            })[0],
            promise;

        if ( !(rule && typeof rule === "object")) {
            throw new SystemError("Not valid rule !");
        }

        if ( !payload.url ) {
            Logger.debug("Payload doesn't have url to upload result of thumbnail cabra");
            return false;
        }

        if ( !frame.conversation_id ) {
            Logger.debug("Frame must be with conversation id !", frame);
            return false;
        }

        var _this = this;
        promise = new Promise(function(resolve, reject){
            _this.thumbnail.withScale(payload.scale, payload.request_fullscreen).then(function (obj) {
                Logger.debug("Captured Thumbnail", obj);
                _this._client.thumbnailResponse(payload.url, obj.blob, SETTINGS.THUMBNAIL.MIMETYPE).then(
                    function (data) {
                        resolve(obj.source);
                    }, 
                    function (error) {
                        /**
                         * Thumbnail response isn't valid
                         * We should check status of response
                         */
                        if ( error.status === 200 ){
                            Logger.debug("Thumbnail was uploaded !");
                            resolve();
                            return;
                        }
                        reject({ "message" : error });
                        throw new SystemError("Error in upload thumbnail request. Error description - " + error);
                    });
            }, function (obj) {
                if(obj.source === SETTINGS.THUMBNAIL.SOURCE.UNAVAILABLE ||
                    obj.source === SETTINGS.THUMBNAIL.SOURCE.CHROMEPROTECTED ||
                    obj.source === SETTINGS.THUMBNAIL.SOURCE.CHROMEBLOCKED){
                    Logger.debug("Thumbnail not available, resolving with custom source " + obj.source);
                    //there is no thumbnail to upload to aws so resolve with the source and get out.
                    resolve(obj.source);
                    return;
                } else {
                    reject({ "message": obj.message });
                    Logger.error(obj.message, obj.stack);
                }
            });
        });


        promise.then(function(source){
            _this._addCabraFrame(rule, frame.conversation_id, source);
        }, function () {
            _this._addCabraFrame(rule, frame.conversation_id);
        });
    };


    this._addCabraFrame = function (rule, conversationId, source) {
        this._client.addCabraFrame(this.cabraId, rule, conversationId, {source: source }).then(
            function (data) {
                Logger.debug("Thumbnail frame was uploaded !");
                Logger.debug("Thumbnail Data", data);

            }, 
            function (error) {
                throw new SystemError("Error in upload addCabraFrame request. Error description - " + error);
            }
        );
    };
};

extend(ThumbnailCabraSession, CabraSession);

export default ThumbnailCabraSession;
