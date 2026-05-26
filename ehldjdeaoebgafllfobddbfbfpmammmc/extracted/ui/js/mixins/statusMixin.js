import ko from "/ui/js/lib/knockout-secure-binding.js";
var Status = function(config, parentVm) {
    var config = config || {};

    this.text = config.text || "";
    this.order = config.order || 0;
    this.color = config.color || 'transparent';
    this.weight = config.weight || 0;
    this.showMask = ko.observable(false);
    this.getClassForStatus = function() {
        return parentVm.getClassForStatus(this);
    };
    this.getFontAwesomeClassForStatus = function() {
        return parentVm.getFontAwesomeClassForStatus(this);
    };
};

export default Status;
