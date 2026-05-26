import attentionEvents from "/js/mjs/cabra/attentionSession.events.js";
import Logger from "/js/mjs/logger/logger.js";
import Sandbox from "/js/mjs/sandbox.js";
import WindowKeepAliveManager from "/js/mjs/windowKeepAliveManager.js";
import WindowKeepAlive from "/js/mjs/windowKeepAlive.js";
import _ from "/js/lib/underscore.js";
import linkify from "/js/lib/linkify.min.js";
import { SystemError} from "/js/globals.js";

const sandbox = new Sandbox().init();
class Messages {
    constructor() {

        //List of Unacknowledged messages
        //Maintaining this list here as well as at the UI layer because we do not have guarentees on the lifecycle of the UI Layer
        //And may need to restore "state" at the ui layer because the window was closed etc.
        this.messages = [
            /*{ conversationId: <guid>, message: <string>, open_urls: <bool> }*/
        ];

    }

    async showDialog () {
        var self = this;
        // //TODO: should we be reconnecting any such communication? 
        // //could we simply send it the { messages: self.messages}
        // //again and call it a day? on the other hand, when do 
        // //we call this and what are we intending by it? 
        // if (!await self.window.findWindow()) {
        //     await self.window.launchWindow();
        // }
        // sandbox.publish("messagesRequest", {
        //     messages: self.messages
        // });
        var startUrl = chrome.runtime.getURL("/ui/views/cabras/messagesRequest.html");
        var openDialog = function() {
            return WindowKeepAlive.openPopupPromise(
                'messages', 
                {messages: self.messages},
                startUrl,
                370, 100
            );
        };
        
        var shouldBeOpen = function () {
            return WindowKeepAlive.shouldBeOpenPromise(function() { 
                return self.messages.length > 0; 
            });    
        };
        
        if (!self.messagesDialog) {
            Logger.info('Will add keep alive for messages');
            self.messagesDialog = new WindowKeepAlive(openDialog, shouldBeOpen, 'isOpened', 'open');
            self.messagesDialog.startUrl = startUrl;//new addition to this concept not always available

            WindowKeepAliveManager.addKeepAlive(self.messagesDialog, WindowKeepAliveManager.priority.low);
        }
    }

    hideDialog () {
        var self = this;
        if (self.messagesDialog) {
            WindowKeepAliveManager.removeKeepAlive(self.messagesDialog);
            self.messagesDialog = null;
        }
    }

    findMessageByConversationId (/*guid*/ conversationId) {
        if (!conversationId) {
            throw new SystemError("Cannot call findMessageByConversationId without a conversationId");
        }
        var self = this;
        return self.messages.filter(function (message) {
            return message.conversationId == conversationId;
        })[0];
    }

    /**
     * Add a message to be displayed.
     * @param {string} conversationId A non-optional conversation GUID.
     * @param {string} message A non-optional message to display.
     * @param {bool} openUrls If any URLs should be opened.
     * @param {string} teacher The teacher name for the message.
     */
    addMessage (conversationId, message, openUrls, teacher) {
        if (!conversationId) {
            throw new SystemError("Cannot call addMessage without a conversationId");
        }
        if (!message) {
            throw new SystemError("Cannot call addMessage without a message");
        }

        var newMessage = {
            conversationId: conversationId,
            message: message,
            open_urls: openUrls,
            teacher: teacher
        };
        this.messages.unshift(newMessage);

        if (!this.messagesDialog){
            this.showDialog();
        } else {
            //Publish Event to Add Message to UI if UI already exists
            sandbox.publish('messagesRequestRealtime', newMessage);
        }

        // Open any URLs, if desired.
        if (newMessage.open_urls === true) {
            this.openUrls(newMessage);
        }
    }

    /**
     * Parse message for urls and open each url.
     */
    openUrls (newMessage) {
        //TODO: read from file
        var urls = linkify.find(newMessage.message);
        if (!urls.length) { return; }

        //prevent duplicate URLs from being opened more than once
        var hrefs = _.pluck(urls, "href");
        var uniqueURLs = _.unique(hrefs);
        chrome.storage.local.get(newMessage.conversationId, function (res) {
            var urls_to_open;
            if (res && _.keys(res).length !== 0) {
                Logger.debug('got opened urls back from local storage.');
                urls_to_open = _.difference(uniqueURLs, res[newMessage.conversationId].urls);
            } else {
                Logger.debug("didn't find any opened urls in local storage.");
                urls_to_open = uniqueURLs;
            }
            //open each unique URL
            //uniqueURLs
            urls_to_open.forEach(function (url) {
                //todo fix this to do the right thing, specifically to not create
                //a new window 
                chrome.windows.create({ url: url });
                //window.open(url);
            });
            //only write if we don't already exist
            if (urls_to_open && urls_to_open.length > 0) {
                //TODO: write to file
                var obj = {};
                var today = new Date();
                obj[newMessage.conversationId] = { 'date': today.toLocaleString(), 'urls': urls_to_open };
                chrome.storage.local.set(obj, function () {
                    Logger.debug('url ack saved to local storage');
                    //send open URL ack
                    sandbox.publish(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, { conversationId: newMessage.conversationId });
                });
            } else {
                Logger.debug('url converstation already found in storage.');
            }
        });
    }

    //Precondition: conversationId must not be non null
    updateMessage(/*guid*/ conversationId, /*bool*/ open_urls) {
        if (!conversationId) {
            throw new SystemError("Cannot call updateMessage without a conversationId");
        }
        var self = this, message = self.findMessageByConversationId(conversationId);
        if (message) {
            var index = self.messages.indexOf(message);
            if (index >= 0) {
                self.messages[index].open_urls = open_urls;
            }
        }
    }

    //Precondition: conversationId must not be non null
    removeMessage (/*guid*/ conversationId) {
        if (!conversationId) {
            throw new SystemError("Cannot call removeMessage without a conversationId");
        }
        var self = this, message = self.findMessageByConversationId(conversationId);
        if (!message) {
            if (self.messages.length === 0) {
                self.hideDialog();
            }
        } else {
            var index = self.messages.indexOf(message);
            if (index >= 0) {
                self.messages.splice(index, 1);
                if (self.messages.length === 0) {
                    self.hideDialog();
                }
                else {
                    //Publish Event to Remove Message from UI if UI already exists and not the last message
                    sandbox.publish('messagesRequestRemove', message);
                }
            }
        }
    }

    clear () {
        var self = this;
        self.messages = [];
        self.hideDialog();
    }
}

export default Messages;
