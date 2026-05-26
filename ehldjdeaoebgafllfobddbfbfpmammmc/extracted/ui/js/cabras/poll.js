import ko from "/ui/js/lib/knockout-secure-binding.js";
import PollViewModel from "/ui/js/viewmodels/pollViewModel.js";
import Poll from "/ui/js/mixins/pollMixin.js";
import Sandbox from "/js/mjs/sandbox.js";
import WindowHelper from "/js/mjs/windowHelper.js";
var options = {
    attribute: "data-bind",        // default "data-sbind"
    globals: window,               // default {}
    bindings: ko.bindingHandlers,  // default ko.bindingHandlers
    noVirtualElements: false       // default true
 };
ko.bindingProvider.instance = new ko.secureBindingsProvider(options);

export default {
    init: function () {
        var sandbox = new Sandbox().init();
        var vm = new PollViewModel();
        vm.activePoll(new Poll());
        sandbox.subscribe('assessmentRequest', function(data){
            console.log(data);
            var poll = new Poll(data, vm);

            vm.activePoll(poll);
            vm.loaded(true);
        });

        chrome.windows.getCurrent(function(window){
            sandbox.publish("dyknowWindowReady", window.id);
        });

        ko.applyBindings(vm, document.getElementById('poll'));
    }
};