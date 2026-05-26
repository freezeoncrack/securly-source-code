import guid from "/js/mjs/lib/uuid.js"; 
import MockSupportedCabra from './supportedCabra.js';
import MockBroadcastObject from './broadcastObject.js';

function mockBroadcastInfo(broadcastId, accessToken, activeCabras, supportedCabras) {
    this.broadcast_id = (!!broadcastId) ? broadcastId : guid();
    this.access_token = (!!accessToken) ? accessToken : guid();
    this.broadcast_user_type = "participant";
    this.broadcast_objects = Object.keys(activeCabras).map(function (cabraName) {
        var cabraUUID = activeCabras[cabraName];
        return new MockBroadcastObject(cabraName, cabraUUID);
    });
    this.account_id = 1234;
    this.device_id = 5678;
    this.supported_cabras = supportedCabras.map(function (cabraName) {
        return new MockSupportedCabra(cabraName);
    });
    this.locked = true;
    this.control = true;
    this.control_roster = {};
}
export default mockBroadcastInfo;