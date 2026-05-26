import ko from "/ui/js/lib/knockout-secure-binding.js";
import attentionEvents from "/js/mjs/cabra/attentionSession.events.js";
import Sandbox from "/js/mjs/sandbox.js";
import _ from "/js/lib/underscore.js";

var MessagesViewModel = function(sandbox) {
    var sandbox = sandbox || new Sandbox().init();
    var self = this;

    this.messages = ko.observableArray([]);
    this.teacher = ko.observable('');
    
    this.ack = function (message, retryAttempt) {
        //sandbox.publish(attentionEvents.AttentionSessionAcknowledgeMessageEvent, { conversationId: message.conversationId});
        var ack = {};
        ack[attentionEvents.AttentionSessionAcknowledgeMessageEvent] = { conversationId: message.conversationId};
        if (retryAttempt == 3) {
            return;
        }
        retryAttempt = retryAttempt || 0;
        var retryTimeout = _.delay(()=>{
            self.ack(message, retryAttempt+1);
        },750);
        chrome.runtime.sendMessage(ack).then(function (resp){
            clearTimeout(retryTimeout);
            console.log("we got a response: " + JSON.stringify(resp));
        }, function (err){
            clearTimeout(retryTimeout);
            console.log("UUUGGGHHGHHH " + err.toString())
        });
    };

    this.formatMessages = ko.computed(function() {
        self.messages().forEach(function(message) {
            message.message = message.message.linkify({ target: "_blank" });
            message.message = message.message.replace(/\n/g, "<br/>");
        });
    });
};

export default MessagesViewModel;
