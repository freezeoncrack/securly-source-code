import ko from "/js/mjs/lib/knockout.js";
import Sandbox from "/js/mjs/sandbox.js";

var AttentionViewModel = function() {
    this.message = ko.observable('');
    this.details = ko.observable('');
};

export default AttentionViewModel;