import ko from "/ui/js/lib/knockout-secure-binding.js";
import Answer from "/ui/js/mixins/answerMixin.js";
import Sandbox from "/js/mjs/sandbox.js";

var Poll = function(config, parentVm) {
    //note, knockout-secure-binding can no longer do the binding tricks
    //we normally can do, so we have to hack in isSelected
    var config = config || { payload: {}};
    var sandbox = new Sandbox().init();
    if(config.payload.answers){
        this.answers = Object.keys(config.payload.answers).map(function (key) {return {answer: key, custom_answer: config.payload.answers[key]};});
        this.answers = ko.observableArray(this.answers.map(function(answer){
            return new Answer(answer, parentVm);
        }));
    } else {
        this.answers = ko.observableArray([]);
    }

    this.question = ko.observable(config.payload.question || "");
    this.for_credit = ko.observable(config.payload.for_credit || false);
    this.conversation_id =config.conversation_id || false;
    this.selectedAnswer = ko.observable(false);

};

export default Poll;