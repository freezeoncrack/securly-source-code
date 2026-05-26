import ko from "/ui/js/lib/knockout-secure-binding.js";
import MessagesViewModel from "/ui/js/viewmodels/messagesViewModel.js";
import Sandbox from "/js/mjs/sandbox.js";
import WindowHelper from "/js/mjs/windowHelper.js";
// import $ from "/js/lib/jquery-2.1.1.min.js";
var options = {
    attribute: "data-bind",        // default "data-sbind"
    globals: window,               // default {}
    bindings: ko.bindingHandlers,  // default ko.bindingHandlers
    noVirtualElements: false       // default true
 };
ko.bindingProvider.instance = new ko.secureBindingsProvider(options);


export default {
    maxHeight: 230,
    messagePadding: 20,

    /**
     * Group an array of messages by teacher, keeping chronological order.
     * @param {object[]} messages The message objects to sort.
     * @return {MessagesViewModel} An array of message view models.
     */
    groupings: function(messages) {
        // Shortcut if messages isn't valid.
        if (!messages || !Array.isArray(messages)) { return []; }

        // Build the groups of messages by teacher. This is done using
        // plain old JS objects to reduce observable events.
        var lastGroup;
        var groups = [];
        messages.forEach(function(message) {
            if (!lastGroup || lastGroup.teacher !== message.teacher) {
                lastGroup = { teacher: message.teacher, messages: [] };
                groups.push(lastGroup);
            }
            lastGroup.messages.push($.extend({}, message));
        });

        // Now convert the groups to the view models.
        return groups.map(function(group) {
            var model = new MessagesViewModel();
            model.teacher(group.teacher);
            model.messages(group.messages);
            return model;
        });
    },

    /**
     * Regroup the messages.
     */
    regroup: function() {
        this.groups(this.groupings(this.messages()));
        this.resize();
    },

    /**
     * Resize the window to fit the messages.
     */
    resize: function() {
        var self = this;
        chrome.windows.getCurrent(function(messageWindow) {
            var height = $('#message-groups').height();
            var padding = messageWindow.height - $('body').height();
            var resizeHeight = Math.min(self.maxHeight, height + padding + self.messagePadding);
            self.chromeWindow.updateWindow(messageWindow.id, true, null, resizeHeight);
        });
    },

    /**
     * Initialize the message cabra.
     * @param {Sandbox} [sandbox] An optional message sandbox for testing.
     */
    init: function(sandbox) {
        var self = this;
        self.sandbox = sandbox || new Sandbox().init();
        self.messages = ko.observableArray([]);
        self.groups = ko.observableArray([]);
        self.chromeWindow = new WindowHelper();

        // Event handler to request a set of messages.
        self.sandbox.subscribe('messagesRequest', function(data) {
            self.messages(data.messages);
            self.regroup();
        });
        
        // Event handler for new realtime messages.
        self.sandbox.subscribe('messagesRequestRealtime', function(message) {
            var messages = self.messages();
            messages.unshift(message);
            self.messages(messages);
            self.regroup();
            $("#messages").scrollTop(0);
        });
        
        // Event handler to remove a message.
        self.sandbox.subscribe('messagesRequestRemove', function(message) {
            var allMessages = self.messages();
            var messages = allMessages.filter(function(m) {
                return m.conversationId !== message.conversationId;
            });
            if (messages.length !== allMessages.length) {
                self.messages(messages);
                self.regroup();
            }
        });

        self.sandbox.subscribe("dyknowWindowReconnect", function (windowId){
            chrome.windows.getCurrent(function(window) {
                if (windowId === window.id){
                    self.sandbox.publish("dyknowWindowReady", window.id);
                }
            });
    
        });
        
        // Once the current window is available, publish that it is ready.
        chrome.windows.getCurrent(function(window) {
            self.sandbox.publish("dyknowWindowReady", window.id);
        });

        // Bind the view model to update the view.
        ko.applyBindings({groups: self.groups}, document.getElementById('messages'));
    }
};
