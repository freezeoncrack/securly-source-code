
var cabra = {
    cabraIDFromCabraName: function (cabraName) {
        var cabraId = -1;
        if (cabraName == "dyknow.me/application_blocking") {
            cabraId = 16;
        } else if (cabraName == "dyknow.me/attention_monitor") {
            cabraId = 21;
        } else if (cabraName == "dyknow.me/screen_shot") {
            cabraId = 15;
        } else if (cabraName == "dyknow.me/participant_status_monitor") {
            cabraId = 19;
        }

        return cabraId;
    },
    isControlFromCabraName: function (cabraName) {
        if (cabraName == "dyknow.me/application_blocking") {
            return true;
        } else if (cabraName == "dyknow.me/attention_monitor") {
            return true;
        } else if (cabraName == "dyknow.me/screen_shot") {
            return false;
        } else if (cabraName == "dyknow.me/participant_status_monitor") {
            return true;
        }

        return false;
    },
    cabraWithName: function (cabraName) {
        return {
            "cabra_id": cabra.cabraIDFromCabraName(cabraName),
            "name": cabraName,
            "version": 1
        };
    }
};
export default cabra;