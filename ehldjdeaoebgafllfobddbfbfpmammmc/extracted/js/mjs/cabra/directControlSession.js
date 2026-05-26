
import CabraSession from "/js/mjs/cabra/session.js"; 
import cabraEvents from "/js/mjs/cabra/cabraSession.events.js"; 
import directControlEvents from "/js/mjs/cabra/directControlSession.events.js";
import directControl from "/js/mjs/cabra/helper/directControl.js"; 
import Sandbox from "/js/mjs/sandbox.js"; 
import Logger from "/js/mjs/logger/logger.js";
import _ from "/js/lib/underscore.js";
import blockingEvents from "/js/mjs/cabra/helper/blocking.events.js";
import { extend } from "/js/globals.js";

var constants = {
    payloads: {
        directControlState: "897caa1c-43e8-46de-b159-e54efd495187",
        teacherCommand: "adc7d240-ad92-4e5c-95cb-99162fa76fd9",
        studentResponse: "2acea8b4-ca57-4d24-bb74-823cb525fa75"
    }
};

var DirectControlCabraSession = function () {
    var directControlCabraSession = this;

    var sandbox = new Sandbox().init();

    this.init = function (name, cabraId, rules, satelliteAPIClient, instance) {
        return DirectControlCabraSession.prototype.init.apply(this, arguments);
    };

    this.applyFromState = function (state) {
        DirectControlCabraSession.prototype.applyFromState.apply(this, arguments);
        this.applyState(state);
    };

    this.applyFromRealtime = function ( data) {
        DirectControlCabraSession.prototype.applyFromRealtime.apply(this, arguments);
        var frame = this._getFrame(data);
        //need to switch based on the payloadid
        switch(frame.payload_id){
            case constants.payloads.directControlState:
                this.sendTabs(frame.conversation_id);
                return;
            case constants.payloads.teacherCommand:
                this.processComandFrame(frame);
                return;
            default:
                return;
        }
    };

    this.willLeaveCabra = function () {
        Logger.info('Clearing directControl cabra for leave.');
        this.clearState();
        DirectControlCabraSession.prototype.willLeaveCabra.apply(this, arguments);
    };

    /**
     * Clear the directontrol state.
     */
    this.clearState = function() {
        Logger.info('DirectControl: clearing');
        //at this time, this is a noop
    };

    this.sendTabs = function (conversationId) {
        directControl.getTabs().then(function (tabs){
            directControlCabraSession.sendACK(conversationId, {
                type: "tab_refresh",
                tabs: tabs
            });
        });
    };

    this.doCommand = function(cmd, conversationId){
        switch(cmd.command){
            case "tab_close":
                return directControl.closeTab(cmd.window_id, cmd.tab_id).then(function(result){
                    sandbox.publish(blockingEvents.close_tab, {
                        url: result.target_url,
                        title: result.target_title,
                        tab_id: cmd.tab_id
                    });
                    return directControlCabraSession.sendACK(conversationId, result);
                });                    
            case "tab_change":
                return directControl.changeTab(cmd.window_id, cmd.tab_id).then(function(result){
                    return directControlCabraSession.sendACK(conversationId, result);
                });
            default:
                Logger.info('DirectControl: ignoring command ' + cmd.command);
                return Promise.resolve();
        }
    };

    /**
     * Update the current tracker and attention manager state.
     * @param {object} state The state to apply.
     */
    this.applyState = function(state) {
        // Guard against unknown states.
        if (!state || !state.payload || !Object.keys(state.payload).length) {
            Logger.warn('Unknown control state, assuming the desired behavior is to clear state.', state);
            this.clearState();
            return;
        }

        // Track any state frame, if available.
        var stateFrame = state.payload.control_state;
        if (!stateFrame || !stateFrame.payload || stateFrame.payload.control_mode !== "tabs"){
            Logger.debug("DirectControl: applying clear state");
            this.clearState();
        } else {
            this.sendTabs(stateFrame.conversation_id);
        }
        var pendingCommands = state.payload.commands;
        if (!pendingCommands || !pendingCommands.length){ return;}
        pendingCommands.forEach(function (cmdFrame){
            directControlCabraSession.processComandFrame(cmdFrame);
        });
    };

    this.subscribe = function () {
        DirectControlCabraSession.prototype.subscribe.apply(this, arguments);

    };

    this.unsubscribe = function () {
        DirectControlCabraSession.prototype.unsubscribe.apply(this, arguments);
    };

    this.sendACK = function (conversationId, commandACK) {
        var self = this,
            our_rule = self.rules.filter(function(rule) {
                return rule.to === 'broadcaster' && rule.from === 'participant';
            }).first();

        return self._client.addCabraFrame(self.cabraId, our_rule, conversationId, commandACK)
            .then(function (data) {
                Logger.debug("Command Response was successfully post to the server.");
                return data;
            }, function (error) {
                Logger.error("Command Response request failed.", error);
                return Promise.reject(error);
            });
    };

    this._runningCmd = false;
    this._queue = [];
    this.processComandFrame = function (frame){
        if(!frame){ throw new Error("frame must not be null");}
        if (directControlCabraSession._runningCmd){
            directControlCabraSession._queue.push(frame);
            //we assume perhaps incorrectly if there is a queue
            //that there is likewise an in-flight request
        } else {
            directControlCabraSession._runningCmd = true;
            directControlCabraSession.drainQueue(frame);
        }
    };

    this.drainQueue = function (frame){
        try{
            directControlCabraSession.doCommand(frame.payload, frame.conversation_id)
            .then(function (){
                return true;
            }, function (err){
                return Promise.resolve();//return a success, assume we logged this elsewhere
            }).then(function (){
                var nextFrame = directControlCabraSession._queue.shift();
                if (nextFrame){
                    directControlCabraSession.drainQueue(nextFrame);
                } else {
                    directControlCabraSession._runningCmd = false;
                }
            });
        } catch(err){
            var nextFrame = directControlCabraSession._queue.shift();
            if (nextFrame){
                directControlCabraSession.drainQueue(nextFrame);
            } else {
                directControlCabraSession._runningCmd = false;
            }
            throw err;
        }
    };

    
};

extend(DirectControlCabraSession, CabraSession);

export default DirectControlCabraSession;