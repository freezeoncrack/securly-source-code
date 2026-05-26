import cabra from "./cabra.js";
var cabraRule = {
    cabraRulesWithCabraName: function (cabraName) {
        if (cabraName == "dyknow.me/application_blocking") {
            return [
                cabraRule.cabraRuleWithCabraName(cabraName, "5dae016d-0b6e-4f3e-9f73-2d8428e35715", "broadcaster", "participants")
            ];
        } else if (cabraName == "dyknow.me/attention_monitor") {
            return [
                cabraRule.cabraRuleWithCabraName(cabraName, "35b75155-44f9-4a83-aa7d-80d6fd371bcf", "broadcaster", "participants"),
                cabraRule.cabraRuleWithCabraName(cabraName, "5927bfeb-0fdb-49ea-ad1a-cd57194c301b", "broadcaster", "participants"),
                cabraRule.cabraRuleWithCabraName(cabraName, "416ea7f8-4cd0-4f0e-82e4-aeb1b5057b8f", "participant", "participant")
            ];
        } else if (cabraName == "dyknow.me/screen_shot") {
            return [
                cabraRule.cabraRuleWithCabraName(cabraName, "75e132cf-8371-49b5-bdaa-69785ff4c998", "broadcaster", "participants"),
                cabraRule.cabraRuleWithCabraName(cabraName, "b55d0618-4c7b-4698-9c79-7785c1d19fe5", "participant", "broadcaster"),
                cabraRule.cabraRuleWithCabraName(cabraName, "6f89ddde-f106-4661-896d-7444b2671aef", "broadcaster", "none")
            ];
        } else if (cabraName == "dyknow.me/participant_activity_monitor") {
            return [
                cabraRule.cabraRuleWithCabraName(cabraName, "39C4F580-5F5B-417F-8B55-B432802AA1D9", "participant", "broadcaster")
            ];
        } else if (cabraName == "dyknow.me/participant_status_monitor") {
            return [
                cabraRule.cabraRuleWithCabraName(cabraName, "6c704f01-0443-4633-b420-90a9dc1ef308", "broadcaster", "participants"),
                cabraRule.cabraRuleWithCabraName(cabraName, "5f735fc1-a3a0-4971-97c0-90a4024b589a", "participant", "broadcaster"),
                cabraRule.cabraRuleWithCabraName(cabraName, "8489c53c-9c74-4e8d-9be2-c832358999b7", "participant", "participant")
            ];
        }

        return [];
    },
    cabraRuleWithCabraName: function (cabraName, payloadId, from, to) {
        return {
            "cabra_id": cabra.cabraIDFromCabraName(cabraName),
            "payload_id": payloadId,
            "from": from,
            "to": to,
            "archive_received": "none",
            "archieve_sent": "none"
        };
    }
};
export default cabraRule;