/**
 * Created by alexandr.parkhomenko on 31.07.2014.
 */
var streamGlobal,
    thumbnail;

$(function () {
    thumbnail = new ThumbnailDesktop();
    thumbnail.init();

    $(window).bind("beforeunload", function() {
        if (!streamGlobal) {
            Logger.warn("StreamGlobal doesn't exist !");
        }
        var track = streamGlobal.getVideoTracks()[0];
        if (track && track.readyState === "live") {
            track.stop();
        }
    });
});

