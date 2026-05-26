import switchboardEvents from "/js/mjs/broadcast/broadcastSessionManager.events.js";
describe("switchboardEvents", function () {
    beforeEach(function () {

    });

    it("A test to make sure you are testing this file", function () {
        var keys = [];
        for (var k in switchboardEvents) {
            keys.push(k);
        }
        expect(keys.length).toBe(9);
    });
    it("switchboardEvents of BroadcastSessionManagerJoinEvent is BroadcastSessionManagerJoinEvent", function () {
        expect(switchboardEvents.BroadcastSessionManagerJoinEvent).toEqual('BroadcastSessionManagerJoinEvent');
    });
    it("switchboardEvents of BroadcastSessionManagerControlChangeEvent is BroadcastSessionManagerControlChangeEvent", function () {
        expect(switchboardEvents.BroadcastSessionManagerControlChangeEvent).toEqual('BroadcastSessionManagerControlChangeEvent');
    });
    it("switchboardEvents of BroadcastSessionManagerLeaveEvent is BroadcastSessionManagerLeaveEvent", function () {
        expect(switchboardEvents.BroadcastSessionManagerLeaveEvent).toEqual('BroadcastSessionManagerLeaveEvent');
    });
    it("switchboardEvents of BroadcastSessionManagerWillDetachFromAllBroadcastsEvent is BroadcastSessionManagerWillDetachFromAllBroadcastsEvent", function () {
        expect(switchboardEvents.BroadcastSessionManagerWillDetachFromAllBroadcastsEvent).toEqual('BroadcastSessionManagerWillDetachFromAllBroadcastsEvent');
    });
    it("switchboardEvents of BroadcastSessionManagerDidDetachFromAllBroadcastsEvent is BroadcastSessionManagerDidDetachFromAllBroadcastsEvent", function () {
        expect(switchboardEvents.BroadcastSessionManagerDidDetachFromAllBroadcastsEvent).toEqual('BroadcastSessionManagerDidDetachFromAllBroadcastsEvent');
    });
    it("switchboardEvents of BroadcastSessionManagerWillAttachToBroadcast is BroadcastSessionManagerWillAttachToBroadcast", function () {
        expect(switchboardEvents.BroadcastSessionManagerWillAttachToBroadcast).toEqual('BroadcastSessionManagerWillAttachToBroadcast');
    });
    it("switchboardEvents of BroadcastSessionManagerDidAttachToBroadcast is BroadcastSessionManagerDidAttachToBroadcast", function () {
        expect(switchboardEvents.BroadcastSessionManagerDidAttachToBroadcast).toEqual('BroadcastSessionManagerDidAttachToBroadcast');
    });
    it("switchboardEvents of BroadcastSessionManagerWillDetachFromBroadcast is BroadcastSessionManagerWillDetachFromBroadcast", function () {
        expect(switchboardEvents.BroadcastSessionManagerWillDetachFromBroadcast).toEqual('BroadcastSessionManagerWillDetachFromBroadcast');
    });
    it("switchboardEvents of BroadcastSessionManagerDidDetachFromBroadcast is BroadcastSessionManagerDidDetachFromBroadcast", function () {
        expect(switchboardEvents.BroadcastSessionManagerDidDetachFromBroadcast).toEqual('BroadcastSessionManagerDidDetachFromBroadcast');
    });
});