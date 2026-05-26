import AttentionSession from "/js/mjs/cabra/attentionSession.js";
import attentionEvents from "/js/mjs/cabra/attentionSession.events.js";
import SatelliteApiClient from "/js/mjs/clients/satellite.js";
import Sandbox from "/js/mjs/sandbox.js";
import Logger from "/js/mjs/logger/logger.js";
import guid from "/js/mjs/lib/uuid.js";
import AttentionManager from "/js/mjs/qsr/attentionManager.js";
import chrome from "/test/mocks/chrome.js";
import cabraRules from "/test/mocks/cabraRule.js";
import MockCabraInfo from "/test/mocks/cabraInfo.js";
import MockStateFrame from "/test/mocks/stateFrame.js";
import MockLockedAttentionFrame from "/test/mocks/lockedAttentionFrame.js";
import MockUnlockedMessageFrame from "/test/mocks/unlockedMessageFrame.js";
import MockRealtimeLockedAttentionFrame from "/test/mocks/realtimeLockedAttentionFrame.js";
import MockRealtimeUnlockedMessageFrame from "/test/mocks/realtimeUnlockedMessageFrame.js";
import _ from "/js/lib/underscore.js";

describe('AttentionSession', function() {
    var attentionSession, attentionManager, attention, messages;

    beforeEach(function() {
        chrome.useMock();
        attentionSession = new AttentionSession();
        attentionSession.init(
            'dyknow.me/attention_monitor',
            guid(),
            cabraRules.cabraRulesWithCabraName('dyknow.me/attention_monitor'),
            {addCabraFrame: function() { return $.Deferred(); }}
        );

        attentionManager = AttentionManager.instance();
        attention = attentionManager.attention;
        messages = attentionManager.messages;

        sandbox = new Sandbox().init();

        Logger.debug = $.noop;
        Logger.info = $.noop;
        Logger.warn = $.noop;
        Logger.error = $.noop;

        storage.local.mock();
    });

    afterEach(function() {
        storage.local.clear();
    });

    describe('applyState', function() {
        it('clears for unknow state', function() {
            spyOn(attentionSession, 'clearState');
            spyOn(attentionSession, '_findLockingFrame');
            attentionSession.applyState({});
            expect(attentionSession.clearState).toHaveBeenCalled();
            expect(attentionSession._findLockingFrame).not.toHaveBeenCalled();
        });

        it('clears for unknow payload', function() {
            spyOn(attentionSession, 'clearState');
            spyOn(attentionSession, '_findLockingFrame');
            attentionSession.applyState({payload: {}});
            expect(attentionSession.clearState).toHaveBeenCalled();
            expect(attentionSession._findLockingFrame).not.toHaveBeenCalled();
        });

        it('finds locking frame', function() {
            spyOn(attentionSession, '_findLockingFrame').and.returnValue('yup');
            spyOn(attentionSession.tracker, 'state');

            attentionSession.applyState({payload_id: true});
            expect(attentionSession._findLockingFrame).toHaveBeenCalled();
            expect(attentionSession.tracker.state).toHaveBeenCalledWith('yup');
        });

        it('can fail finding locking frame', function() {
            spyOn(attentionSession, '_findLockingFrame');
            spyOn(attentionSession.tracker, 'state');

            attentionSession.applyState({payload_id: true});
            expect(attentionSession._findLockingFrame).toHaveBeenCalled();
            expect(attentionSession.tracker.state).not.toHaveBeenCalledWith();
        });
    });

    describe('finding locking frames', function() {
        it('can find frame for state', function() {
            var frame = new MockLockedAttentionFrame(guid(), guid(), {
                payload: {foo: 'bar'}
            });
            var state = {payload: {locked_message: frame}};
            spyOn(attentionSession, '_findLockingFrame').andCallThrough();
            
            var locked = attentionSession._findLockingFrame(state);
            expect(attentionSession._findLockingFrame).toHaveBeenCalledWith(frame);
            expect(locked).toBe(frame);
        });

        it('can find frame for realtime', function() {
            var frame = new MockLockedAttentionFrame(guid(), guid(), {
                payload: {foo: 'bar'}
            });
            
            var locked = attentionSession._findLockingFrame(frame);
            expect(locked).toBe(frame);
        });

        it('will find nothing for frame and state without locking', function() {
            expect(attentionSession._findLockingFrame()).toBe(undefined);
            expect(attentionSession._findLockingFrame({})).toBe(undefined);
            expect(attentionSession._findLockingFrame({payload: {}})).toBe(undefined);
            expect(attentionSession._findLockingFrame({payload: {locked_message: {}}})).toBe(undefined);
        });
    });

    describe('state messages', function() {
        it('clears on attach', function() {
            var broadcastId = guid();
            var cabraId = 21;
            var cabraUUID = attentionSession.cabraId;
            var cabraFrame = new MockStateFrame({});
            var cabraInfo = new MockCabraInfo(
                cabraId, attentionSession.cabraId, cabraFrame);
            spyOn(attentionSession, 'applyState').andCallThrough();
            spyOn(attentionManager, 'clear');

            attentionSession.didEnterCabra(cabraInfo);
            expect(attentionSession.applyState).toHaveBeenCalledWith(cabraFrame);
            expect(attentionManager.clear).toHaveBeenCalled();
        });
    });

    describe('realtime messages', function() {
        it('passes locking frame to attention manager', function() {
            var frame = new MockLockedAttentionFrame(guid(), guid(), {
                payload: {foo: 'bar'}
            });
            var data = {broadcastObject: {payload: frame}};
            spyOn(attentionSession, 'applyState').andCallThrough();
            spyOn(attentionManager, 'applyState').andCallThrough();
            spyOn(attentionManager, 'applyFrame');

            attentionSession.applyFromRealtime(data);
            expect(attentionSession.applyState).toHaveBeenCalledWith(frame);
            expect(attentionManager.applyState).toHaveBeenCalledWith(frame);
            expect(attentionManager.applyFrame).toHaveBeenCalledWith(frame);
        });

        it('passes non-locking frame to attention manager', function() {
            var frame = new MockUnlockedMessageFrame(guid(), guid(), {
                payload: {foo: 'bar'}
            });
            var data = {broadcastObject: {payload: frame}};
            spyOn(attentionSession, 'applyState').andCallThrough();
            spyOn(attentionManager, 'applyState').andCallThrough();
            spyOn(attentionManager, 'applyFrame');

            attentionSession.applyFromRealtime(data);
            expect(attentionSession.applyState).toHaveBeenCalledWith(frame);
            expect(attentionManager.applyState).toHaveBeenCalledWith(frame);
            expect(attentionManager.applyFrame).toHaveBeenCalledWith(frame);
        });
    });

    describe('leave cabra', function() {
        it('exiting cabra clears locking', function() {
            var broadcastId = guid();
            var cabraId = 21;
            var cabraUUID = attentionSession.cabraId;
            var message = 'Attention Please';
            var frame = new MockStateFrame({
                'locked_message': new MockLockedAttentionFrame(cabraUUID, guid(), {
                    lock: 'locked',
                    message: message
                })
            });
            var cabraInfo = new MockCabraInfo(cabraId, cabraUUID, frame);
            spyOn(attentionSession, 'applyState').andCallThrough();
            spyOn(attentionManager, 'applyState').andCallThrough();
            spyOn(attentionManager, 'clear');

            attentionSession.didEnterCabra(cabraInfo);
            expect(attentionSession.applyState).toHaveBeenCalledWith(frame);
            expect(attentionManager.applyState).toHaveBeenCalledWith(frame);
            expect(attentionManager.clear).not.toHaveBeenCalled();

            attentionSession.willLeaveCabra();
            expect(attentionManager.clear).toHaveBeenCalled();
        });
    });

    describe('acknowledgements', function() {
        it('acknowledge open url notifies server', function() {
            var broadcastId = guid();
            var cabraId = 21;
            var cabraUUID = attentionSession.cabraId;
            var convo = guid();
            var cabraInfo = new MockCabraInfo(cabraId, cabraUUID, new MockStateFrame({
                messages: [new MockUnlockedMessageFrame(cabraUUID, convo, {
                    message: 'Please complete exercise 1',
                    open_urls: true
                })]
            }));

            attentionSession.didEnterCabra(cabraInfo);

            //simulate somewhere along the way a user clicks "Got it"
            spyOn(attentionSession, 'acknowledgeMessageWithType')
                .and.returnValue($.Deferred().resolve({}));
            sandbox.publish(
                attentionEvents.AttentionSessionAcknowledgeOpenURLEvent,
                { conversationId: convo }
            );
            expect(attentionSession.acknowledgeMessageWithType)
                .toHaveBeenCalledWith(convo, 'open_urls');
        });

        it('acknowledge message notifies server', function() {
            var broadcastId = guid();
            var cabraId = 21;
            var cabraUUID = attentionSession.cabraId;
            var convo = guid();
            var cabraInfo = new MockCabraInfo(cabraId, cabraUUID, new MockStateFrame({
                messages: [new MockUnlockedMessageFrame(cabraUUID, convo, {
                    message: 'Please complete exercise 1',
                    open_urls: true
                })]
            }));

            attentionSession.didEnterCabra(cabraInfo);

            //simulate somewhere along the way a user clicks "Got it"
            spyOn(attentionSession,'acknowledgeMessageWithType')
                .and.returnValue($.Deferred().resolve({}));
            sandbox.publish(
                attentionEvents.AttentionSessionAcknowledgeMessageEvent,
                { conversationId: convo }
            );
            expect(attentionSession.acknowledgeMessageWithType).toHaveBeenCalledWith(convo, 'message');
        });

        it('acknowledge message notifies server after', function() {
            var broadcastId = guid();
            var cabraId = 21;
            var cabraUUID = attentionSession.cabraId;
            var convo = guid();
            var cabraInfo = new MockCabraInfo(cabraId, cabraUUID, new MockStateFrame({
                messages: [new MockUnlockedMessageFrame(cabraUUID, convo, {
                    message: 'Please complete exercise 1',
                    open_urls: true
                })]
            }));

            attentionSession.didEnterCabra(cabraInfo);

            //simulate somewhere along the way a user clicks "Got it"
            spyOn(attentionSession,'acknowledgeMessageWithType')
                .and.returnValue($.Deferred().resolve({}));
            sandbox.publish(
                attentionEvents.AttentionSessionAcknowledgeOpenURLEvent,
                { conversationId: convo }
            );
            sandbox.publish(
                attentionEvents.AttentionSessionAcknowledgeMessageEvent,
                { conversationId: convo }
            );
            expect(attentionSession.acknowledgeMessageWithType).toHaveBeenCalledWith(convo, 'message');
            expect(attentionSession.acknowledgeMessageWithType).toHaveBeenCalledWith(convo, 'open_urls');
        });
    });
});
