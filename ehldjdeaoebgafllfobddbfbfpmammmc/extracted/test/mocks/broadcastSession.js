import BroadcastSession  from "/js/mjs/broadcast/session.js"; 
import CabraSessionFactory  from "/js/mjs/cabra/sessionFactory.js"; 
import MockBroadcastInstruction from "./broadcastInstruction.js"; 
import MockBroadcastInfo from "./broadcastInfo.js"; 
import MockCabraInfo from "./cabraInfo.js";

function mockBroadcastSession(broadcastId, activeCabras, supportCabras, cabraStateMap, beforeEnterMap, afterEnterMap, enterOrder) {
    var instruction = new MockBroadcastInstruction(broadcastId),
        broadcast = new BroadcastSession(),
        attachJson = new MockBroadcastInfo(instruction.broadcast_id, instruction.access_token, activeCabras, supportCabras);
    broadcast.init(instruction);
    spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
    spyOn(broadcast._client, "attach").and.returnValue($.Deferred().resolve(attachJson));
    
    //We want to control the enter order so just swallow all the enters
    spyOn(broadcast, '_createCabraFromBroadcastObject');
    broadcast.attach();
    
    enterOrder.forEach(function (cabraName) {
        var cabraUUID = activeCabras[cabraName],
            state = cabraStateMap[cabraName],
            beforeEnter = beforeEnterMap[cabraName],
            afterEnter = afterEnterMap[cabraName];
        if (cabraUUID) {
            var rules = broadcast._broadcastInfo.supported_cabras.filter(function (supported) {
                    return supported.cabra.name === cabraName;
                })[0].cabra_rules,
                cabraInfo = new MockCabraInfo(false, cabraUUID, state),
                cabraSession = CabraSessionFactory.getCabraSession(cabraName, cabraUUID, rules, broadcast._client); 
            
            if(beforeEnter) {
                beforeEnter(cabraSession);
            }
            
            cabraSession.didEnterCabra(cabraInfo);
            
            if (afterEnter) {
                afterEnter(cabraSession);
            }
        }
    });
}
export default mockBroadcastSession;
