import ko from "/ui/js/lib/knockout-secure-binding.js";
import StatusViewModel from "/ui/js/viewmodels/statusViewModel.js";
import Status from "/ui/js/mixins/statusMixin.js";
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
    init:function(){
        var sandbox = new Sandbox().init();
        var vm = new StatusViewModel();
        sandbox.subscribe('statusRequest', function(data){
            //clear our current status out of the local storage'
            vm.conversation_id = data.conversation_id;
            chrome.storage.local.remove("status", function(){
                if(chrome.runtime.lastError){
                    console.error(chrome.runtime.lastError);
                }
                vm.selectedStatus(new Status());
                vm.statusOptions(data.payload.statuses.map(function(status){
                    return new Status(status, vm);
                }));
                vm.loaded(true);
            });
        });

        chrome.windows.getCurrent(function(window){
            sandbox.publish("dyknowWindowReady", window.id);
        });

        vm.isWindow = true;
        ko.applyBindings(vm, document.getElementById('status'));
    }
};