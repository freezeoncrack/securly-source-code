import guid from "/js/mjs/lib/uuid.js"; 
function mockUnlockedMessageFrame(cabraUUID, conversationID, payload, account_id) {
    this.cabra_id = cabraUUID;
    this.frame_id = 123;
    this.conversation_id = conversationID;
    this.object_id = guid();
    this.payload_id = '5927bfeb-0fdb-49ea-ad1a-cd57194c301b';
    this.payload = payload;
    this.to = 'participants';
    this.from = '42';
    this.from_option = 'broadcaster';
    if (account_id) {
        this.account_id = account_id;
        this.from = '' + account_id;
    }
}
export default mockUnlockedMessageFrame;
