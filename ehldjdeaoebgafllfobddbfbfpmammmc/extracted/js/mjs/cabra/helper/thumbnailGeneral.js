import Logger from "/js/mjs/logger/logger.js"; 
import SETTINGS from "/js/mjs/settings.js";

/**** THIS IS FUNDAMENTALLY AN ABSTRACT CLASS *****/

const PARAMETERS = {};
async function init() {
    //important note here. This is the way we've always done this
    //having the screen.width and screenn.height and a strangely hardcoded aspectratio
    //but that is actually ignoring the fact that we switched to active tab which 
    //should have its own size. so im conflicted about wanting to fix that bug
    var info = await chrome.system.display.getInfo();
    var workArea = info[0].workArea;
    PARAMETERS.WIDTH= workArea.width/12;
    PARAMETERS.HEIGHT = workArea.height/12;
    PARAMETERS.ASPECT_RATIO = 1.09;
}

function resetForTests() {
    Object.keys(PARAMETERS).forEach(a=>delete PARAMETERS[a]);
}

var ThumbanilGeneral = function () {

    var _this = this;

    this.PARAMETERS = PARAMETERS;

    this.getImageBlob = async function (dataUrl, width, height, resolve, reject) {
        if(!dataUrl){
            reject();
            return;
        } else if (dataUrl === SETTINGS.THUMBNAIL.SOURCE.CHROMEPROTECTED|| 
            dataUrl === SETTINGS.THUMBNAIL.SOURCE.CHROMEBLOCKED){
            reject(dataUrl);
            return;
        }

        try {
            var decodedUrl = await fetch(dataUrl);
            var blob = await decodedUrl.blob();
            var img = await createImageBitmap(blob);

            await this._imageToBlob(img, width, height, resolve);
            img.close();
        } catch (e) {
            Logger.error(e.message, e.stack);
            reject();
        }
    };

    this.withScale = async function (scale) {

        if (!this.PARAMETERS.WIDTH){
            await init();
        }
        var width = this.PARAMETERS.WIDTH,
            height = this.PARAMETERS.HEIGHT;

        if (scale > 1) {
            width = width * scale;
            height = height * scale;
        }

        return this._getScreenshot(width, height);
    };

    this._imageToBlob = async function (img, width, height, resolve) {

        // /// create an off-screen canvas
        // if(!img.src){
        //     resolve(img.src);
        // }

        var _this = this,
            currentAspectRatio = img.width / img.height;

        if (img.width / img.height < _this.PARAMETERS.ASPECT_RATIO) {
            width = height * currentAspectRatio;
        } else {
            height = width / currentAspectRatio;
        }

        var canvas = new OffscreenCanvas(width, height),
        ctx = canvas.getContext('2d');

        /// draw source image into the off-screen canvas:
        ctx.drawImage(img, 0, 0, width, height);

        /// encode image to data-uri with base64 version of compressed image
        var blob = await canvas.convertToBlob({ type : SETTINGS.THUMBNAIL.MIMETYPE});
        resolve(blob);
    };
};

ThumbanilGeneral.init = init;
ThumbanilGeneral.resetForTests = resetForTests;

export default ThumbanilGeneral;
