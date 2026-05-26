
import $ from "/js/mjs/lib/jquery.signalR-SW-2.0.2.js";
var identityMethods = [
    'connectionSlow',
    'disconnected',
    'error',
    'received',
    'reconnected',
    'reconnecting',
    'starting',
    'stateChanged'
];

function Hub() {
    var self = this;
    $.signalR.fn.init.call(this, "http://localhost", "", true);
    this._parseResponse = $.signalR.fn._parseResponse;
    this.clientProtocol = "1.3";
    var mock = jasmine.createSpyObj('hub', ['createHubProxy', 'start', 'stop', 'log']);
    Object.assign(this, mock);

    identityMethods.forEach(function(key) {
        self[key] = jasmine.createSpy(key).and.callFake(
            self.identityEvent.bind(self));
    });
}

Hub.prototype.identityEvent = function() {
    return this;
};

export default Hub;

