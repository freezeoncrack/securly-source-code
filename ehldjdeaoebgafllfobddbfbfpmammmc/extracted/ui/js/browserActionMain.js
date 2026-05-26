import ko from "/ui/js/lib/knockout-secure-binding.js";
import Sandbox from "/js/mjs/sandbox.js";
import Status from "/ui/js/mixins/statusMixin.js";
import BA from "/ui/js/viewmodels/browserActionViewModel.js";
import Logger from "/js/mjs/logger/logger.js";
var options = {
    attribute: "data-bind",        // default "data-sbind"
    globals: window,               // default {}
    bindings: ko.bindingHandlers,  // default ko.bindingHandlers
    noVirtualElements: false       // default true
 };
ko.bindingProvider.instance = new ko.secureBindingsProvider(options);

var mBA = new BA(),
sandbox = new Sandbox().init();
    
sandbox.subscribe('statusUpdateDifferentDevice', function(data){
    Logger.info("UI: Browser Action Status Update was receieved", data);
    mBA.selectedStatus(new Status(data));
});

mBA.loaded(true);

ko.applyBindings(mBA, document.getElementById('browseractions'));