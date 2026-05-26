import Logger from "/js/mjs/logger/logger.js";
import ThumbnailCabraSession from "/js/mjs/cabra/thumbnailSession.js";
import PalCabraSession from "/js/mjs/cabra/palSession.js";
import DirectControlSession from "/js/mjs/cabra/directControlSession.js";
import AppBlockingCabraSession from "/js/mjs/cabra/appBlockingSession.js";
import AttentionSession from "/js/mjs/cabra/attentionSession.js";
import PollCabraSession from "/js/mjs/cabra/pollSession.js";
import StatusCabraSession from "/js/mjs/cabra/statusSession.js";

// define([
//     'amd/cabra/thumbnailSession', 'amd/cabra/statusSession', 'amd/cabra/palSession',
//     'amd/cabra/appBlockingSession', 'amd/cabra/pollSession', 'amd/cabra/attentionSession',
//     'amd/cabra/directControlSession', 'amd/logger/logger'
// ], function(
//     ThumbnailCabraSession, StatusCabraSession, PalCabraSession,
//     AppBlockingCabraSession, PollCabraSession, AttentionSession,
//     DirectControlSession, Logger
// ) {
var CabraSessionFactory = {

    /**
     * A dictionary of the cabra types.
     */
    //MV3 NOT YET READY TO PORT!!!!!
    //getCabraSessionWill always return null
    _types: {
        "dyknow.me/screen_shot" : ThumbnailCabraSession,
        "dyknow.me/application_blocking" : AppBlockingCabraSession,
        "dyknow.me/participant_activity_monitor" : PalCabraSession,
        "dyknow.me/participant_status_monitor" : StatusCabraSession,
        "dyknow.me/assessment_monitor": PollCabraSession,
        "dyknow.me/attention_monitor": AttentionSession,
        "dyknow.me/direct_control_monitor": DirectControlSession
    },

    /**
     * Get a cabra session.
     */
    getCabraSession: function(name, cabraId, rules, satelliteAPIClient) {
        var cabra = false;
        if (this._types[name]) {
            cabra = new this._types[name]();
            cabra.init(name, cabraId, rules, satelliteAPIClient, cabra);
            Logger.debug(name + " with id " + cabraId +" was created ");
            return cabra;
        } else {
            return null;
        }
    }

};

export default CabraSessionFactory;
