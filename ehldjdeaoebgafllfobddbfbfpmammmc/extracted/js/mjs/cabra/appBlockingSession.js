import { extend } from "/js/globals.js";
import CabraSession from "/js/mjs/cabra/session.js"; 
import Logger from "/js/mjs/logger/logger.js"; 
import BlockingManager from "/js/mjs/qsr/blockingManager.js";
import Tracker from "/js/mjs/qsr/tracker.js"; 
import _ from "/js/lib/underscore.js";


var AppBlockingCabraSession = function() {

    this.blockingManager = BlockingManager.instance();
    this.tracker = Tracker.instance('blocking');

    this.init = function (name, cabraId, rules, satelliteAPIClient, instance) {
        return AppBlockingCabraSession.prototype.init.apply(this, arguments);
    };

    /**
     * Clear Appblocking before tearing down.
     */
    this.willLeaveCabra = function() {
        Logger.info('Clearing app blocking cabra for leave.');
        this.applyState(null);
        AppBlockingCabraSession.prototype.willLeaveCabra.apply(this, arguments);
    };

    /**
     * Apply from a state event.
     * @param {object} state The state to apply.
     */
    this.applyFromState = function(state) {
        AppBlockingCabraSession.prototype.applyFromState.apply(this, arguments);
        this.applyState(state);
    };

    /**
     * Apply from a realtime event.
     * @param {object} data The realtime data.
     */
    this.applyFromRealtime = function(data) {
        AppBlockingCabraSession.prototype.applyFromRealtime.apply(this, arguments);
        var frame = this._getFrame(data);
        this.applyState(frame);
    };

    /**
     * Update the tracker and blocking manager states.
     * @param {object} The state object to apply.
     */
    this.applyState = function(state) {
        var state = (state && !_.isEmpty(state)) ? state : null;
        Logger.info('Updating app blocking tracker.');
        this.tracker.state(state);
        this.blockingManager.applyState(state);
    };
};

extend(AppBlockingCabraSession, CabraSession);

export default AppBlockingCabraSession;
