import { extend, SystemError } from "/js/globals.js";
import CabraSession from "/js/mjs/cabra/session.js"; 
import cabraEvents from "/js/mjs/cabra/cabraSession.events.js"; 
import attentionEvents from "/js/mjs/cabra/attentionSession.events.js";
// import Messages from "/js/mjs/cabra/helper/messages.js"; 
import Sandbox from "/js/mjs/sandbox.js"; 
import AttentionManager from "/js/mjs/qsr/attentionManager.js";
import Tracker from "/js/mjs/qsr/tracker.js"; 
import Logger from "/js/mjs/logger/logger.js";
import lifecycleEventHandler from "/js/mjs/chromeOsServices/lifecycleEventHandler.js";

var constants = {
    payloads: {
        kAttentionLockedRequest: '35b75155-44f9-4a83-aa7d-80d6fd371bcf',
        kAttentionUnlockedRequest: '5927bfeb-0fdb-49ea-ad1a-cd57194c301b',
        kAttentionUnlockedACK: '416ea7f8-4cd0-4f0e-82e4-aeb1b5057b8f'
    },
    lockedRequests: {
        kAttentionRequestLocked: 'locked',
        kAttentionRequestUnlocked: 'unlocked'
    }
};

var AttentionCabraSession = function () {

    var sandbox = new Sandbox().init();
    this.attentionManager = AttentionManager.instance();
    this.tracker = Tracker.instance('attention');

    this.init = function (name, cabraId, rules, satelliteAPIClient, instance) {
        return AttentionCabraSession.prototype.init.apply(this, arguments);
    };

    this.applyFromState = function (state) {
        AttentionCabraSession.prototype.applyFromState.apply(this, arguments);
        this.attentionManager.setCourse(this.course);
        this.applyState(state);
    };

    this.applyFromRealtime = function (data) {
        AttentionCabraSession.prototype.applyFromRealtime.apply(this, arguments);
        var frame = this._getFrame(data);
        this.attentionManager.setCourse(this.course);
        this.applyState(frame);
    };

    this.willLeaveCabra = function () {
        Logger.info('Clearing attention cabra for leave.');
        this.clearState();
        AttentionCabraSession.prototype.willLeaveCabra.apply(this, arguments);
    };

    /**
     * Clear the attention state.
     */
    this.clearState = function() {
        Logger.info('Clearing attention tracker.');
        this.tracker.state(null);
        this.attentionManager.clear();
    };

    /**
     * Update the current tracker and attention manager state.
     * @param {object} state The state to apply.
     */
    this.applyState = function(state) {
        // Guard against unknown states.
        if (!state || !state.payload_id && (!state.payload || !Object.keys(state.payload).length)) {
            Logger.warn('Unknown attention state, assuming the desired behavior is to clear attention.', state);
            this.clearState();
            return;
        }

        // Track any locking frame, if available.
        var lockFrame = this._findLockingFrame(state);
        if (lockFrame) {
            Logger.info('Locked attention frame found, tracking.');
            this.tracker.state(lockFrame);
        }

        this.attentionManager.applyState(state);
    };

    /**
     * Find a locked attention request for a state or frame.
     * @param {object} state The state or frame being applied.
     * @returns {object|undefined} The state frame for locked attention.
     */
    this._findLockingFrame = function(state) {
        // Guard against unknown states.
        if (!state) { return; }

        // Handle by realtime frame.
        if (state.payload_id) {
            return state.payload_id === constants.payloads.kAttentionLockedRequest ?
                state : undefined;
        }

        // Handle for state application.
        if (state.payload && state.payload.locked_message) {
            return this._findLockingFrame(state.payload.locked_message);
        }
    };

    this._CabraSessionRequestStateEvent = null;
    this._AttentionSessionAcknowledgeMessageEvent = null;
    this._AttentionSessionAcknowledgeOpenURLEvent = null;

    this.stateRequestEvent = function (event) {
        var self = this;
        if (event.name == "dyknow.me/attention_monitor") {
            sandbox.publish(self.broadcastId + "/" + cabraEvents.CabraSessionStateChangeEvent, { "cabra_id": self.cabraId, "name": self.name, frame: self.state });
        }
    };

    this.subscribe = function () {
        AttentionCabraSession.prototype.subscribe.apply(this, arguments);
        this._CabraSessionRequestStateEvent = this.stateRequestEvent.bind(this);
        this._AttentionSessionAcknowledgeMessageEvent = this.acknowledgeMessage.bind(this);
        this._AttentionSessionAcknowledgeOpenURLEvent = this.acknowledgeOpenUrl.bind(this);

        sandbox.subscribe(this.broadcastId + "/" + cabraEvents.CabraSessionRequestStateEvent,  this._CabraSessionRequestStateEvent);
        sandbox.subscribe(attentionEvents.AttentionSessionAcknowledgeMessageEvent,  this._AttentionSessionAcknowledgeMessageEvent);
        sandbox.subscribe(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent,  this._AttentionSessionAcknowledgeOpenURLEvent);
        lifecycleEventHandler.replayQueuedMessageInteractions();        
    };

    this.unsubscribe = function () {
        AttentionCabraSession.prototype.unsubscribe.apply(this, arguments);

        sandbox.unsubscribe(this.broadcastId + "/" + cabraEvents.CabraSessionRequestStateEvent,  this._CabraSessionRequestStateEvent);
        sandbox.unsubscribe(attentionEvents.AttentionSessionAcknowledgeMessageEvent,  this._AttentionSessionAcknowledgeMessageEvent);
        sandbox.unsubscribe(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent,  this._AttentionSessionAcknowledgeOpenURLEvent);

        this._CabraSessionRequestStateEvent = null;
        this._AttentionSessionAcknowledgeMessageEvent = null;
        this._AttentionSessionAcknowledgeOpenURLEvent = null;
    };

    this.acknowledgeMessageWithType = function (conversationId, acknowledgementType) {
        var self = this,
            our_rule = self.rules.filter(function(rule) {
                return rule.to === 'participant' && rule.from === 'participant';
            }).first();

        return self._client.addCabraFrame(self.cabraId, our_rule, conversationId, { type: acknowledgementType })
            .then(function (data) {
                Logger.debug("Message Acknowledgement was successfully post to the server.");
            }, function (error) {
                Logger.error("Message Acknowledgement request failed.", error);
            });
    };

    this.acknowledgeMessage = function (event) {
        if (!event || !event.conversationId) {
            throw new SystemError("Cannot call acknowledgeMessage without a conversationId");
        }

        var self = this,
            acknowledgementType = 'message';
        AttentionManager.instance().removeMessage(event.conversationId);
        self.acknowledgeMessageWithType(event.conversationId, acknowledgementType);
    };

    this.acknowledgeOpenUrl = function (event) {
        if (!event || !event.conversationId) {
            throw new SystemError("Cannot call acknowledgeOpenUrl without a conversationId");
        }

        var self = this,
            open_urls = false,
            acknowledgementType = 'open_urls';
        AttentionManager.instance().updateMessage(event.conversationId, open_urls);
        //TODO: Write to file that we opened urls
        self.acknowledgeMessageWithType(event.conversationId, acknowledgementType).then(function(data){
            //we succeeded, go ahead and remove local ack
            chrome.storage.local.remove(event.conversationId);
        });
    };
};

extend(AttentionCabraSession, CabraSession);

export default AttentionCabraSession;
