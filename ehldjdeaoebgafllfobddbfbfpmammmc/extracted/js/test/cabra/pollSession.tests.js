define(['amd/cabra/pollSession', 'amd/logger/logger', 'amd/sandbox', 'jquery', 'js/test/mocks/cabraInfo'], function(PollCabra, Logger, Sandbox, $, MockCabraInfo) {
    describe('PollCabra', function () {
        var pollSession = false;
        
        var constants = {
            payloads : {
                teacherPollRequest: "256d8517-9a0c-460b-8d6d-af3dcb4c908f",
                studentUpdateDevicePoll: '148ea40d-bd69-4492-8e22-2414829ad76e'
            }
        };
        var conversationid1 = "11111111-1111-1111-1111-111111111111";
        var conversationid2 = "22222222-2222-2222-2222-222222222222";
        
        beforeEach(function () {
            window.sandbox._reset();
            spyOn(sandbox, "publish");//need to avoid chrome runtime here
            pollSession = new PollCabra();
            
            pollSession.init("dyknow.me/assessment_monitor", 20, [], {addCabraFrame:$.noop, enterCabra: $.noop});
            spyOn(pollSession.poll, "start");
            spyOn(pollSession.poll, "assessmentRequest");
            spyOn(pollSession.poll, "hideUI");
            spyOn(pollSession._client, "addCabraFrame").andReturn($.Deferred());
            spyOn(pollSession._client, "enterCabra").andReturn($.Deferred().resolve());
            
            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
            pollSession.didEnterCabra(new MockCabraInfo());
        });
        
        it("shows poll when it gets the message", function() {
            pollSession.applyFromRealtime({
                  broadcastObject: {
                      payload: {
                          payload_id: constants.payloads.teacherPollRequest
                      }
                    }
            });
            expect(pollSession.poll.assessmentRequest).toHaveBeenCalled();
        });
        
        it("sends response when it gets response message", function(){
           pollSession.applyFromRealtime({
                  broadcastObject: {
                      payload: {
                          payload_id: constants.payloads.teacherPollRequest,
                          conversation_id: conversationid1
                      }
                    }
            });
            sandbox._processEvents({
                "pollAnswered": {
                    answer: "C?",
                    conversation_id: conversationid1
                }
            });
            expect(pollSession._client.addCabraFrame).toHaveBeenCalled();
        });
        
        it("ignores secondary responses for same conversation", function () {
           pollSession.applyFromRealtime({
                  broadcastObject: {
                      payload: {
                          payload_id: constants.payloads.teacherPollRequest,
                          conversation_id: conversationid1
                      }
                    }
            });
            sandbox._processEvents({
                "pollAnswered": {
                    answer: "C?",
                    conversation_id: conversationid1
                }
            });
            sandbox._processEvents({
                "pollAnswered": {
                    answer: "D?",
                    conversation_id: conversationid1
                }
            });
            expect(pollSession._client.addCabraFrame.calls.length).toEqual(1);
       });
        
       it("will send responses from other conversations", function (){
           pollSession.applyFromRealtime({
                  broadcastObject: {
                      payload: {
                          payload_id: constants.payloads.teacherPollRequest,
                          conversation_id: conversationid1
                      }
                    }
            });
            sandbox._processEvents({
                "pollAnswered": {
                    answer: "C?",
                    conversation_id: conversationid1
                }
            });
           pollSession.applyFromRealtime({
                  broadcastObject: {
                      payload: {
                          payload_id: constants.payloads.teacherPollRequest,
                          conversation_id: conversationid2
                      }
                    }
            });
            sandbox._processEvents({
                "pollAnswered": {
                    answer: "D?",
                    conversation_id: conversationid2
                }
            });
            expect(pollSession._client.addCabraFrame.calls.length).toEqual(2);
       });
   });
});