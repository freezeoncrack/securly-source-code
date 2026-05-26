define([
    'amd/cabra/attentionSession.events', 'amd/cabra/helper/messages', 'amd/logger/logger',
    'amd/lib/uuid', 'underscore', 'amd/windowKeepAliveManager',
    'js/test/mocks/chrome.storage'
], function(
    attentionEvents, Messages, Logger,
    guid, _, WindowKeepAliveManager,
    storage
) {
    describe('Messages', function () {
        var messages = null, mockStorage;

        beforeEach(function () {
            messages = new Messages();
            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;

            spyOn(WindowKeepAliveManager, "addKeepAlive");
            spyOn(WindowKeepAliveManager, 'removeKeepAlive');

            chrome.storage.local.mock();
        });

        afterEach(function() {
            storage.local.clear();
        });

        describe('Datasource', function () {

            it("throws when adding without conversationid", function () {
                var badCall = function () {
                    messages.addMessage(null, "yolo");
                };
                expect(badCall).toThrow();
            });

            it("throws when adding without message", function () {
                var badCall = function () {
                    messages.addMessage(guid(), null);
                };
                expect(badCall).toThrow();
            });

            it("adds messages no openUrls", function  () {
                var convo = guid(),
                    message = "yolo";
                messages.addMessage(convo, message);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo);
                expect(messages.messages[0].message).toEqual(message);
                expect(messages.messages[0].open_urls).toBe(undefined);
            });

            it("adds messages dont open urls", function  () {
                var convo = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, false);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo);
                expect(messages.messages[0].message).toEqual(message);
                expect(messages.messages[0].open_urls).toBe(false);
            });

            it("adds messages open urls", function  () {
                var convo = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, true);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo);
                expect(messages.messages[0].message).toEqual(message);
                expect(messages.messages[0].open_urls).toBe(true);
            });

            it("throws when findMessageByConversationId without conversationid", function () {
                var badCall = function () {
                    messages.findMessageByConversationId(null);
                };
                expect(badCall).toThrow();
            });

            it("findMessageByConversationId is found", function  () {
                var convo = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, true);
                expect(messages.messages.length).toBe(1);
                expect(messages.findMessageByConversationId(convo)).not.toBe(undefined);
            });

            it("findMessageByConversationId is not found", function  () {
                var convo = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, true);
                expect(messages.messages.length).toBe(1);
                expect(messages.findMessageByConversationId(guid())).toBe(undefined);
            });

            it("throws when updateMessage without conversationid", function () {
                var badCall = function () {
                    messages.updateMessage(null);
                };
                expect(badCall).toThrow();
            });

            it("updateMessage is found updates to not open urls", function  () {
                var convo = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, true);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo);
                expect(messages.messages[0].message).toEqual(message);
                expect(messages.messages[0].open_urls).toBe(true);

                messages.updateMessage(convo, false);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo);
                expect(messages.messages[0].message).toEqual(message);
                expect(messages.messages[0].open_urls).toBe(false);
            });

            it("updateMessage is found updates to open urls", function  () {
                var convo = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, false);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo);
                expect(messages.messages[0].message).toEqual(message);
                expect(messages.messages[0].open_urls).toBe(false);

                messages.updateMessage(convo, true);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo);
                expect(messages.messages[0].message).toEqual(message);
                expect(messages.messages[0].open_urls).toBe(true);
            });

            it("updateMessage is not found", function  () {
                var convo = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, true);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo);
                expect(messages.messages[0].message).toEqual(message);
                expect(messages.messages[0].open_urls).toBe(true);

                messages.updateMessage(guid(), false);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo);
                expect(messages.messages[0].message).toEqual(message);
                expect(messages.messages[0].open_urls).toBe(true);
            });

            it("throws when removeMessage without conversationid", function () {
                var badCall = function () {
                    messages.removeMessage(null);
                };
                expect(badCall).toThrow();
            });

            it("removeMessage is found", function  () {
                var convo = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, true);
                expect(messages.messages.length).toBe(1);
                messages.removeMessage(convo);
                expect(messages.messages.length).toBe(0);
            });

            it("removeMessage only removes the match", function  () {
                var convo = guid(),
                    convo2 = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, true);
                messages.addMessage(convo2, "another", true);
                expect(messages.messages.length).toBe(2);
                messages.removeMessage(convo);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo2);
                expect(messages.messages[0].message).toEqual('another');
                expect(messages.messages[0].open_urls).toBe(true);
            });

            it("removeMessage only removes the match", function  () {
                var convo = guid(),
                    convo2 = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, true);
                messages.addMessage(convo2, "another", true);
                expect(messages.messages.length).toBe(2);
                messages.removeMessage(convo2);
                expect(messages.messages.length).toBe(1);
                expect(messages.messages[0].conversationId).toEqual(convo);
                expect(messages.messages[0].message).toEqual('yolo');
                expect(messages.messages[0].open_urls).toBe(true);
            });

            it("removeMessage is not found", function  () {
                var convo = guid(),
                    message = "yolo";
                messages.addMessage(convo, message, true);
                expect(messages.messages.length).toBe(1);
                messages.removeMessage(guid());
                expect(messages.messages.length).toBe(1);
            });

            it("clear removes all messages (just one)", function  () {
                messages.addMessage(guid(), 'yolo', true);
                expect(messages.messages.length).toBe(1);
                messages.clear();
                expect(messages.messages.length).toBe(0);
            });

            it("clear removes all messages", function  () {
                messages.addMessage(guid(), 'yolo', true);
                messages.addMessage(guid(), 'yolo', true);
                messages.addMessage(guid(), 'yolo', true);
                expect(messages.messages.length).toBe(3);
                messages.clear();
                expect(messages.messages.length).toBe(0);
            });

        });

        describe('Dialog Lifecycle', function () {
            it("addMessage shows dialog only the first time and reuses", function (){
                spyOn(messages, 'showDialog').andCallThrough();
                messages.addMessage(guid(), "yolo", true);
                messages.addMessage(guid(), "again", true);
                expect(messages.showDialog).toHaveBeenCalled();
                expect(messages.showDialog.calls.length).toBe(1);
            });

            it("updateMessage does not touch dialog", function (){
                var convo1 = guid();
                messages.addMessage(convo1, "yolo", true);
                spyOn(messages, 'showDialog');
                spyOn(messages, 'hideDialog');
                messages.updateMessage(convo1, false);
                expect(messages.showDialog).not.toHaveBeenCalled();
                expect(messages.hideDialog).not.toHaveBeenCalled();
            });

            it("removeMessage hides dialog when the last message is acknowledged", function (){
                var convo1 = guid(),
                    convo2 = guid();
                spyOn(messages, 'hideDialog').andCallThrough();
                messages.addMessage(convo1, "yolo", true);
                messages.addMessage(convo2, "again", true);
                messages.removeMessage(convo1);
                expect(messages.hideDialog).not.toHaveBeenCalled();
                messages.removeMessage(convo2);
                expect(messages.hideDialog).toHaveBeenCalled();
                expect(messages.hideDialog.calls.length).toBe(1);
            });

            it("clear hides dialog", function (){
                var convo1 = guid(),
                    convo2 = guid();
                spyOn(messages, 'hideDialog').andCallThrough();
                messages.addMessage(convo1, "yolo", true);
                messages.addMessage(convo2, "again", true);
                messages.clear();
                expect(messages.hideDialog).toHaveBeenCalled();
                expect(messages.hideDialog.calls.length).toBe(1);
            });
        });

        describe('Inter-form Communication', function () {

        });

        describe('Open URLs', function () {
            var simpleUrls = [
                "http://foo.com/blah_blah",
                "http://foo.com/blah_blah/",
                "http://foo.com/blah_blah_(wikipedia)",
                "http://foo.com/blah_blah_(wikipedia)_(again)",
                "http://www.example.com/wpstyle/?p=364",
                "https://www.example.com/foo/?bar=baz&inga=42&quux",
                //"http://142.42.1.1/", doesn't work with linkify
                "http://foo.com/blah_(wikipedia)#cite-1",
                "http://foo.com/blah_(wikipedia)_blah#cite-1",
                "http://foo.com/(something)?after=parens",
                "http://code.google.com/events/#&product=browser",
                "http://j.mp",
                "http://foo.bar/?q=Test%20URL-encoded%20stuff",
                "http://1337.net",
                "http://a.b-c.de",
                //"http://223.255.255.254", doesn't work with linkify
                "https://code.google.com/p/chromium/codesearch#chromium/src/third_party/iaccessible2/ia2_api_all.idl&q=IID_IAccessible2&sq=package:chromium&type=cs&l=1459"
            ];

            var urlEncoding = [
                "https://dyknow.loggly.com/search#terms=%22%5C%22message%5C%22%3A%5C%22Broadcast%2FProblem%22%5C%22&from=2016-02-23T15%3A24%3A40.535Z&until=2016-03-01T15%3A24%3A40.535Z"
            ];

            var otherProtocols = [
                "ftp://foo.bar/baz"
            ];

            var unicodeSpecialCharacters = [
                "http://✪df.ws/123",
                //"http://➡.ws/䨹", doesn't work with linkify
                //"http://⌘.ws", doesn't work with linkify
                //"http://⌘.ws/", doesn't work with linkify
                "http://foo.com/unicode_(✪)_in_parens",
                "http://☺.damowmow.com/",
                //"http://مثال.إختبار", doesn't work with linkify
                //"http://例子.测试", doesn't work with linkify
                //"http://उदाहरण.परीक्षा", doesn't work with linkify
                "http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com"
            ];

            var portsUsernamesPassword = [
                "http://userid:password@example.com:8080",
                "http://userid:password@example.com:8080/",
                "http://userid@example.com",
                "http://userid@example.com/",
                "http://userid@example.com:8080",
                "http://userid@example.com:8080/",
                "http://userid:password@example.com",
                "http://userid:password@example.com/",
                //"http://142.42.1.1:8080/"
            ];

            it("add message doesn't open URL if message doesn't contain one", function() {
                var convo = guid(),
                    message = "yolo";
                spyOn(window, 'open').andCallThrough();
                messages.addMessage(convo, message, true);
                expect(window.open).not.toHaveBeenCalled();
            });

            it("add message doesn't open URL if open_urls is false", function() {
                var convo = guid(),
                    message = "http://www.google.com";
                spyOn(window, 'open').andCallThrough();
                messages.addMessage(convo, message, false);
                expect(window.open).not.toHaveBeenCalled();
            });

            it("add message doesn't auto open duplicate URLs", function() {
                var x, convo = guid(),
                    message = "http://www.google.com http://www.dyknow.com http://www.google.com";

                spyOn(window, 'open').andCallFake(function() {});
                spyOn(sandbox, 'publish');

                messages.addMessage(convo, message, true);

                expect(window.open.callCount).toBe(2);
                expect(window.open.callCount).toBe(2);
                expect(window.open.calls[0].args[0]).toEqual("http://www.google.com");
                expect(window.open.calls[1].args[0]).toEqual("http://www.dyknow.com");
                expect(sandbox.publish).toHaveBeenCalledWith(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, {conversationId: convo});
            });

            //TODO: don't open if file exists, writing to file
            it("add message doesn't auto open already opened URLs", function() {
                var x, convo = guid(),
                    message = "http://www.google.com http://www.dyknow.com http://www.cnn.com, http://www.reddit.com";

                spyOn(window, 'open').andCallFake(function() {});
                spyOn(sandbox, 'publish');

                //Add message to local storage along with some additional to ensure we get the one we want.
                var obj = {};
                var today = new Date();
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.pearson.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                obj[convo] = {'date':today.toLocaleString(),'urls': ['http://www.cnn.com', 'http://www.reddit.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.reddit.com']};
                storage.local.set(obj);

                messages.addMessage(convo, message, true);

                expect(window.open.callCount).toBe(2);
                expect(window.open.callCount).toBe(2);
                expect(window.open.calls[0].args[0]).toEqual("http://www.google.com");
                expect(window.open.calls[1].args[0]).toEqual("http://www.dyknow.com");
                expect(sandbox.publish).toHaveBeenCalledWith(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, {conversationId: convo});
            });

            it("add message auto open URLs when no convo record in storage", function() {
                var x, convo = guid(),
                    message = "http://www.google.com http://www.dyknow.com http://www.cnn.com, http://www.reddit.com";

                spyOn(window, 'open').andCallFake(function() {});
                spyOn(sandbox, 'publish');

                //Add message to local storage along with some additional to ensure we get the one we want.
                var obj = {};
                var today = new Date();
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.pearson.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.foxnnews.com', 'http://www.pbs.org']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.reddit.com']};
                storage.local.set(obj);

                messages.addMessage(convo, message, true);

                expect(window.open.callCount).toBe(4);
                expect(window.open.calls[0].args[0]).toEqual("http://www.google.com");
                expect(window.open.calls[1].args[0]).toEqual("http://www.dyknow.com");
                expect(window.open.calls[2].args[0]).toEqual("http://www.cnn.com");
                expect(window.open.calls[3].args[0]).toEqual("http://www.reddit.com");
                expect(sandbox.publish).toHaveBeenCalledWith(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, {conversationId: convo});
            });

            function test_single(urls, ignoreURLMatch) {
                urls.forEach(function(url) {
                    it("single URL is auto opened", function() {
                        var convo = guid();

                        spyOn(window, 'open').andCallFake(function() {});
                        spyOn(sandbox, 'publish');

                        var message = url;
                        messages.addMessage(convo, message, true);

                        expect(window.open.callCount).toBe(1);
                        expect(window.open).toHaveBeenCalled();
                        if (!ignoreURLMatch) {
                            expect(window.open).toHaveBeenCalledWith(url);
                        }
                        expect(sandbox.publish).toHaveBeenCalledWith(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, {conversationId: convo});
                    });
                });
            }

            function test_prefixed(urls, ignoreURLMatch) {
                urls.forEach(function(url) {
                    it("single URL prefixed by text is auto opened", function() {
                        var convo = guid();

                        spyOn(window, 'open').andCallFake(function() {});
                        spyOn(sandbox, 'publish');

                        var message = "Go to: " + url;
                        messages.addMessage(convo, message, true);

                        expect(window.open.callCount).toBe(1);
                        expect(window.open).toHaveBeenCalled();
                        if (!ignoreURLMatch) {
                            expect(window.open).toHaveBeenCalledWith(url);
                        }
                        expect(sandbox.publish).toHaveBeenCalledWith(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, {conversationId: convo});
                    });
                });
            }

            function test_suffixed(urls, ignoreURLMatch) {
                urls.forEach(function(url) {
                    it("single URL suffixed by text is auto opened", function() {
                        var convo = guid();

                        spyOn(window, 'open').andCallFake(function() {});
                        spyOn(sandbox, 'publish');

                        var message = url + " - do exercises 1 and 3";
                        messages.addMessage(convo, message, true);

                        expect(window.open.callCount).toBe(1);
                        expect(window.open).toHaveBeenCalled();
                        if (!ignoreURLMatch) {
                            expect(window.open).toHaveBeenCalledWith(url);
                        }
                        expect(sandbox.publish).toHaveBeenCalledWith(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, {conversationId: convo});
                    });
                });
            }

            function test_prefixed_and_suffixed(urls, ignoreURLMatch) {
                urls.forEach(function(url) {
                    it("single URL prefixed and suffixed by text is auto opened", function() {
                        var convo = guid();

                        spyOn(window, 'open').andCallFake(function() {});
                        spyOn(sandbox, 'publish');

                        var message = "Go to: " + url + " and do exercises 1 and 3";
                        messages.addMessage(convo, message, true);

                        expect(window.open.callCount).toBe(1);
                        expect(window.open).toHaveBeenCalled();
                        if (!ignoreURLMatch) {
                            expect(window.open).toHaveBeenCalledWith(url);
                        }
                        expect(sandbox.publish).toHaveBeenCalledWith(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, {conversationId: convo});
                    });
                });
            }

            function test_multiple_links(urls, ignoreURLMatch) {
                urls.forEach(function(url) {
                    it("multiple URLs are auto opened", function() {
                        var convo = guid();

                        spyOn(window, 'open').andCallFake(function() {});
                        spyOn(sandbox, 'publish');

                        var message = "Go to: " + url + " and then go to http://www.dyknow.com";
                        messages.addMessage(convo, message, true);

                        expect(window.open.callCount).toBe(2);
                        expect(window.open).toHaveBeenCalled();
                        if (!ignoreURLMatch) {
                            expect(window.open.calls[0].args[0]).toEqual(url);
                            expect(window.open.calls[1].args[0]).toEqual("http://www.dyknow.com");
                        }
                        expect(sandbox.publish).toHaveBeenCalledWith(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, {conversationId: convo});
                    });
                });
            }

            function test_punctuated_link(urls, ignoreURLMatch) {
                urls.forEach(function(url) {
                    it("messages ending with punctuation are auto opened correctly", function() {
                        var convo = guid();

                        spyOn(window, 'open').andCallFake(function() {});
                        spyOn(sandbox, 'publish');

                        var message = "Go to: " + url + ".";
                        messages.addMessage(convo, message, true);

                        expect(window.open.callCount).toBe(1);
                        expect(window.open).toHaveBeenCalled();
                        if (!ignoreURLMatch) {
                            expect(window.open).toHaveBeenCalledWith(url);
                        }
                        expect(sandbox.publish).toHaveBeenCalledWith(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, {conversationId: convo});
                    });
                });
            }

            function test_quoted_link(urls, ignoreURLMatch) {
                urls.forEach(function(url) {
                    it("URLs encased in quotation marks are auto opened correctly", function() {
                        var convo = guid();

                        spyOn(window, 'open').andCallFake(function() {});
                        spyOn(sandbox, 'publish');

                        var message = "Go to: \"" + url + "\"";
                        messages.addMessage(convo, message, true);

                        expect(window.open.callCount).toBe(1);
                        expect(window.open).toHaveBeenCalled();
                        if (!ignoreURLMatch) {
                            expect(window.open).toHaveBeenCalledWith(url);
                        }
                        expect(sandbox.publish).toHaveBeenCalledWith(attentionEvents.AttentionSessionAcknowledgeOpenURLEvent, {conversationId: convo});
                    });
                });
            }

            function testScenarios(urls, ignoreURLMatch) {
                test_single(urls, ignoreURLMatch);
                test_prefixed(urls, ignoreURLMatch);
                test_suffixed(urls, ignoreURLMatch);
                test_prefixed_and_suffixed(urls, ignoreURLMatch);
                test_multiple_links(urls, ignoreURLMatch);
                test_punctuated_link(urls, ignoreURLMatch);
                test_quoted_link(urls, ignoreURLMatch);
            }

            testScenarios(simpleUrls, false);
            testScenarios(urlEncoding, false);
            testScenarios(otherProtocols, false);
            testScenarios(unicodeSpecialCharacters, true);
            testScenarios(portsUsernamesPassword, true);
        });
    });
});
