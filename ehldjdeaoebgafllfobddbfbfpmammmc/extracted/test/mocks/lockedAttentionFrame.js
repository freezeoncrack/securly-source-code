import guid from "/js/mjs/lib/uuid.js"; 
function mockLockedAttentionFrame(cabraUUID, conversationID, payload) {
    this.frame_id = 123;
    this.cabra_id = cabraUUID;
    this.conversation_id = conversationID;
    this.object_id = guid();
    this.payload_id = '35b75155-44f9-4a83-aa7d-80d6fd371bcf';
    this.payload = payload;
    this.to = 'participants';
    this.from = 'broadcaster';
}
export default mockLockedAttentionFrame;