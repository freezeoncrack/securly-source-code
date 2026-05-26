import ko from "/ui/js/lib/knockout-secure-binding.js";

var Answer = function(answer, parentVm) {
    var answerVm = this;
    this.answer = answer.answer || "";
    this.lower_answer = answer.answer.toLowerCase() || "";
    this.custom_answer = answer.custom_answer || answer.answer;
    this.isSelected = function (){
        return parentVm.isSelected(answerVm);
    };
    this.selectMe = function () {
        return parentVm.selectAnswer(answerVm);
    }
};
export default Answer;
