import SETTINGS from "/js/mjs/settings.js"; 
import Logger from "/js/mjs/logger/logger.js"; 
import ThumbnailActiveTab from "/js/mjs/cabra/helper/thumbnailActiveTab.js";
// import thumbnailDesktop from "/js/mjs/cabra/helper/thumbnailDesktopSingleton.js";

var Thumbnail = function () {

    var _this = this;

    // this._tryGetDesktopThumbnail = function(resolve, reject, scale) {
    //     _this._getThumbnail(scale).then(function(blob){
    //         resolve({blob:blob, source: SETTINGS.THUMBNAIL.SOURCE.DESKTOP});
    //     }, function(){
    //         _this._tryGetTabThumbnail(resolve, reject, scale);
    //     });
    // };

    this._tryGetTabThumbnail = function(resolve, reject, scale){
        _this._currentThumbnailFeature.withScale(scale).then(function(blob){
            Logger.debug("Thumbnail Active Tab", {blob:blob, source: SETTINGS.THUMBNAIL.SOURCE.TAB});
            resolve({blob:blob, source: SETTINGS.THUMBNAIL.SOURCE.TAB});
        },function(source){
            if (source && (source === SETTINGS.THUMBNAIL.SOURCE.CHROMEBLOCKED || 
                source == SETTINGS.THUMBNAIL.SOURCE.CHROMEPROTECTED)
            ){
                Logger.debug("Unable to get active tab thumbnail", {blob:false, source: source});
                reject({blob:false, source: source});
            } else{
                Logger.debug("Unable to get active tab thumbnail", {blob:false, source: SETTINGS.THUMBNAIL.SOURCE.UNAVAILABLE});
                reject({blob:false, source: SETTINGS.THUMBNAIL.SOURCE.UNAVAILABLE});    
            }
        });
    };

    this._currentThumbnailFeature = null;

    this.init = function () {
        this._currentThumbnailFeature = new ThumbnailActiveTab();
        this._currentThumbnailFeature.init();
        // thumbnailDesktop.addThumbnail();
        return this;
    };
    // /**
    //  * Checks DesktopThumbnail at first
    //  * on false check ActiveTabThumbnail
    //  * @param scale
    //  * @returns {Promise}
    //  * @private
    //  */
    // this._getThumbnail = function (scale) {
    //     thumbnailDesktop.requestPermission();
    //     return new Promise(function(resolve, reject){
    //         var promise = thumbnailDesktop.withScale(scale);
    //         if (!promise) {
    //             reject();
    //             return true;
    //         }
    //         promise.then(function(blob){
    //             resolve(blob);
    //         },function(){
    //             reject();
    //         });
    //     });
    // };

    this.withScale = function (scale, request_fullscreen) {
        //legacy behavior was get desktop always
        // if (request_fullscreen || request_fullscreen === undefined){
        //     return new Promise(function(resolve, reject){
        //         _this._tryGetDesktopThumbnail(resolve, reject, scale);
        //     });
        // } else {
            return new Promise(function (resolve, reject){
                _this._tryGetTabThumbnail(resolve, reject, scale); 
            });
        // }
    };
    this.stop = function () {
        // thumbnailDesktop.removeThumbnail();
        this._currentThumbnailFeature .stop();
    };
};

export default Thumbnail;
