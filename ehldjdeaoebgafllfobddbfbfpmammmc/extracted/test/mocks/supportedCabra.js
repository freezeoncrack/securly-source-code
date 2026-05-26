import cabra from "./cabra.js";
import cabraRules from "./cabraRule.js";
function mockSupportedCabra(cabraName) {
    this.cabra_id = cabra.cabraIDFromCabraName(cabraName);
    this.cabra = cabra.cabraWithName(cabraName);
    this.control = cabra.isControlFromCabraName(cabraName);
    this.cabra_rules = cabraRules.cabraRulesWithCabraName(cabraName);
}
export default mockSupportedCabra;
