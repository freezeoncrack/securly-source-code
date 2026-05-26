define(['./lockedAttentionFrame', 'amd/lib/uuid'], function (MockLockedAttentionFrame, guid) {
    function mockRealtimeLockedAttentionFrame(cabraUUID, conversationID, payload) {
        this.cabra_id = cabraUUID;
        this.payload_id = 'new_object';
        this.cabra_name = 'dyknow.me/attention_monitor';
        this.payload = new MockLockedAttentionFrame(cabraUUID, conversationID, payload);
        this.user = {};
    }
    return mockRealtimeLockedAttentionFrame;
});