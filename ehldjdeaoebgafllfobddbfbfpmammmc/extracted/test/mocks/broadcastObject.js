import guid from "/js/mjs/lib/uuid.js"; 
import cabra from "./cabra.js";
function mockBroadcastObject(cabraName, cabraUUID) {
    this.cabra_name = cabraName;
    this.cabra_id = cabra.cabraIDFromCabraName(cabraName);
    this.object_id = (!!cabraUUID) ? cabraUUID : guid();
    this.status = "open";
}
export default mockBroadcastObject;
