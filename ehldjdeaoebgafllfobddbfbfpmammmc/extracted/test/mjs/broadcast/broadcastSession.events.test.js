import broadcastEvents from "/js/mjs/broadcast/broadcastSession.events.js";
describe("broadcastEvents", function () {
    beforeEach(function () {

    });

    it("A test to make sure you are testing this file", function () {
        var keys = [];
        for (var k in broadcastEvents) {
            keys.push(k);
        }
        expect(keys.length).toBe(18);
    });
    it("broadcastEvents of BroadcastSessionWillAttachEvent is BroadcastSessionWillAttachEvent", function () {
        expect(broadcastEvents.BroadcastSessionWillAttachEvent).toEqual('BroadcastSessionWillAttachEvent');
    });
    it("broadcastEvents of BroadcastSessionDidAttachEvent is BroadcastSessionDidAttachEvent", function () {
        expect(broadcastEvents.BroadcastSessionDidAttachEvent).toEqual('BroadcastSessionDidAttachEvent');
    });
    it("broadcastEvents of BroadcastSessionDidFailToAttachEvent is BroadcastSessionDidFailToAttachEvent", function () {
        expect(broadcastEvents.BroadcastSessionDidFailToAttachEvent).toEqual('BroadcastSessionDidFailToAttachEvent');
    });
    it("broadcastEvents of BroadcastSessionWillDetachEvent is BroadcastSessionWillDetachEvent", function () {
        expect(broadcastEvents.BroadcastSessionWillDetachEvent).toEqual('BroadcastSessionWillDetachEvent');
    });
    it("broadcastEvents of BroadcastSessionDidDetachEvent is BroadcastSessionDidDetachEvent", function () {
        expect(broadcastEvents.BroadcastSessionDidDetachEvent).toEqual('BroadcastSessionDidDetachEvent');
    });
    it("broadcastEvents of BroadcastSessionDidFailToDetachEvent is BroadcastSessionDidFailToDetachEvent", function () {
        expect(broadcastEvents.BroadcastSessionDidFailToDetachEvent).toEqual('BroadcastSessionDidFailToDetachEvent');
    });
    it("broadcastEvents of BroadcastSessionDidReceiveErrorEvent is BroadcastSessionDidReceiveErrorEvent", function () {
        expect(broadcastEvents.BroadcastSessionDidReceiveErrorEvent).toEqual('BroadcastSessionDidReceiveErrorEvent');
    });
    it("broadcastEvents of BroadcastSessionUserJoinEvent is BroadcastSessionUserJoinEvent", function () {
        expect(broadcastEvents.BroadcastSessionUserJoinEvent).toEqual('BroadcastSessionUserJoinEvent');
    });
    it("broadcastEvents of BroadcastSessionUserLeaveEvent is BroadcastSessionUserLeaveEvent", function () {
        expect(broadcastEvents.BroadcastSessionUserLeaveEvent).toEqual('BroadcastSessionUserLeaveEvent');
    });
    it("broadcastEvents of BroadcastSessionStealRequestEvent is BroadcastSessionStealRequestEvent", function () {
        expect(broadcastEvents.BroadcastSessionStealRequestEvent).toEqual('BroadcastSessionStealRequestEvent');
    });
    it("broadcastEvents of BroadcastSessionWillStealEvent is BroadcastSessionWillStealEvent", function () {
        expect(broadcastEvents.BroadcastSessionWillStealEvent).toEqual('BroadcastSessionWillStealEvent');
    });
    it("broadcastEvents of BroadcastSessionDidStealEvent is BroadcastSessionDidStealEvent", function () {
        expect(broadcastEvents.BroadcastSessionDidStealEvent).toEqual('BroadcastSessionDidStealEvent');
    });
    it("broadcastEvents of BroadcastSessionDidFailStealEvent is BroadcastSessionDidFailStealEvent", function () {
        expect(broadcastEvents.BroadcastSessionDidFailStealEvent).toEqual('BroadcastSessionDidFailStealEvent');
    });
    it("broadcastEvents of BroadcastSessionReportProblemRequestEvent is BroadcastSessionReportProblemRequestEvent", function () {
        expect(broadcastEvents.BroadcastSessionReportProblemRequestEvent).toEqual('BroadcastSessionReportProblemRequestEvent');
    });
    it("broadcastEvents of BroadcastSessionWillReportProblemEvent is BroadcastSessionWillReportProblemEvent", function () {
        expect(broadcastEvents.BroadcastSessionWillReportProblemEvent).toEqual('BroadcastSessionWillReportProblemEvent');
    });
    it("broadcastEvents of BroadcastSessionDidReportProblemEvent is BroadcastSessionDidReportProblemEvent", function () {
        expect(broadcastEvents.BroadcastSessionDidReportProblemEvent).toEqual('BroadcastSessionDidReportProblemEvent');
    });
    it("broadcastEvents of BroadcastSessionDidFailReportProblemEvent is BroadcastSessionDidFailReportProblemEvent", function () {
        expect(broadcastEvents.BroadcastSessionDidFailReportProblemEvent).toEqual('BroadcastSessionDidFailReportProblemEvent');
    });
    it("broadcastEvents of BroadcastSessionDidChangeConnectionStatusEvent is BroadcastSessionDidChangeConnectionStatusEvent", function () {
        expect(broadcastEvents.BroadcastSessionDidChangeConnectionStatusEvent).toEqual('BroadcastSessionDidChangeConnectionStatusEvent');
    });

});