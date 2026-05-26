import ko from "/ui/js/lib/knockout-secure-binding.js";
import AttentionViewModel from "/ui/js/viewmodels/attentionViewModel.js";
import Sandbox from "/js/mjs/sandbox.js";

var options = {
    attribute: "data-bind",        // default "data-sbind"
    globals: window,               // default {}
    bindings: ko.bindingHandlers,  // default ko.bindingHandlers
    noVirtualElements: false       // default true
 };
ko.bindingProvider.instance = new ko.secureBindingsProvider(options);


export default {
    init:function(){
        var sandbox = new Sandbox().init();
        var vm = new AttentionViewModel();
        sandbox.subscribe('attentionRequest', function(data){
            vm.message(data.message.replace(/\n/g, "<br/>"));
            vm.details(data.details.replace(/\n/g, "<br/>"));
        });

        chrome.windows.getCurrent(function(window){
            sandbox.publish("dyknowWindowReady", window.id);
        });

        ko.applyBindings(vm, document.getElementById('attention'));
    }
};