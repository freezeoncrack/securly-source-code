define(['./unlockedMessageFrame', 'amd/lib/uuid'], function (MockUnlockedMessageFrame, guid) {
    function mockRealtimeUnlockedMessageFrame(cabraUUID, conversationID, payload) {
        this.cabra_id = cabraUUID;
        this.payload_id = 'new_object';
        this.cabra_name = 'dyknow.me/attention_monitor';
        this.payload = new MockUnlockedMessageFrame(cabraUUID, conversationID, payload);
        this.user = {};
    }
    return mockRealtimeUnlockedMessageFrame;
});