import _ from  "/js/lib/underscore.js";
var timeLord = {
    delay: function (callback, time) {
        return _.delay(callback, time);
    },
    _override: null,
    now: function () {
        if (timeLord._override){
            return timeLord._override;
        } else {
            return _.now();
        }
    },
    warp: function (time, callback){
        timeLord._override = time;
        callback();
        timeLord._override = null;
    }
};
export default timeLord;