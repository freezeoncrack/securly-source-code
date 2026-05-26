import guid from "/js/mjs/lib/uuid.js"; 
export default function mockBroadcastInstruction(broadcastId, accessToken) {
    this.broadcast_id = (!!broadcastId) ? broadcastId : guid();
    this.access_token = (!!accessToken) ? accessToken : guid();
    this.url = "http://www.mysatellite.com";
    this.account_id = 1234;
    this.device_id = 5678;
    this.roster = {};
    this.control = true;
    this.control_roster = {};
};