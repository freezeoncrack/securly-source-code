export default function mockBroadcastFrameCommand(broadcastId, payloadId, payload, cabraName, cabraUUID) {
        this.broadcast_id = broadcastId;
        this.cabra_id = cabraUUID;
        this.payload_id = payloadId;
        this.cabra_name = cabraName;
        this.payload = payload;
        this.user = {};
    };