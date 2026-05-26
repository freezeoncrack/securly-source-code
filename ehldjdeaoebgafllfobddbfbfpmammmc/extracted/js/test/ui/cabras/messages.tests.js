define([
    'cabras/messages',
    'viewmodels/messagesViewModel',
    '../../mocks/chrome.windows',
    'jquery',
    'amd/lib/knockout'
], function(
    Messages,
    MessagesViewModel,
    chromeWindows,
    $,
    ko
) {
    describe('messages cabra', function() {
        afterEach(function() {
            delete Messages.sandbox;
            delete Messages.messages;
            delete Messages.groups;
            delete Messages.chromeWindow;
        });

        function mockMessage(name) {
            return { teacher: name, message: 'Hello world.' };
        }

        function mockMessages(names) {
            return names.map(mockMessage);
        }

        it('can initialize', function() {
            spyOn(ko, 'applyBindings');
            var sandbox = jasmine.createSpyObj(
                'sandbox', ['subscribe', 'publish']);

            Messages.init(sandbox);
            
            expect(sandbox.subscribe).toHaveBeenCalledWith(
                'messagesRequest', jasmine.any(Function));
            expect(sandbox.subscribe).toHaveBeenCalledWith(
                'messagesRequestRealtime', jasmine.any(Function));
            expect(sandbox.subscribe).toHaveBeenCalledWith(
                'messagesRequestRemove', jasmine.any(Function));
            expect(ko.applyBindings).toHaveBeenCalled();
            expect(chromeWindows.getCurrent).toHaveBeenCalled();

            expect(Messages.sandbox).toBe(sandbox);
            expect(Messages.messages).toBeTruthy();
            expect(Messages.messages().length).toBe(0);
            expect(Messages.groups).toBeTruthy();
            expect(Messages.groups().length).toBe(0);
        });

        it('can resize', function() {
            spyOn($.fn, 'init').andCallFake(function(selector) {
                if (selector === '#message-groups') {
                    this.height = jasmine.createSpy('height').andReturn(120);
                } else if (selector === 'body') {
                    this.height = jasmine.createSpy('height').andReturn(80);
                }
            });
            chromeWindows.getCurrent.andCallFake(function(callback) {
                callback({id: 42, height: 110});
            });
            Messages.chromeWindow = jasmine.createSpyObj(
                'chromeWindow', ['updateWindow']);

            Messages.resize();
            expect(Messages.chromeWindow.updateWindow).toHaveBeenCalledWith(
                42, true, null, 170);
        });

        describe('groupings', function() {
            it('will produce empty groups for empty messages', function() {
                expect(Messages.groupings()).toEqual([]);
                expect(Messages.groupings(null)).toEqual([]);
                expect(Messages.groupings({})).toEqual([]);
                expect(Messages.groupings([])).toEqual([]);
            });

            it('will give one group for one teacher', function() {
                var messages = mockMessages(['Bob', 'Bob', 'Bob']);
                expect(messages.length).toBe(3);

                var groups = Messages.groupings(messages);
                expect(groups.length).toBe(1);
                expect(groups[0].messages().length).toBe(3);
            });

            it('will give multiple groups for multiple teachers', function() {
                var messages = mockMessages(['Bob', 'Tim', 'Tim', 'Tim', 'Bob', 'Bob']);
                expect(messages.length).toBe(6);

                var groups = Messages.groupings(messages);
                expect(groups.length).toBe(3);
                expect(groups[0].messages().length).toBe(1);
                expect(groups[1].messages().length).toBe(3);
                expect(groups[2].messages().length).toBe(2);
            });

            it('will allow regrouping', function() {
                Messages.groups = jasmine.createSpy('groups');
                Messages.messages = jasmine.createSpy('messages').andReturn([]);
                spyOn(Messages, 'groupings').andCallThrough();
                spyOn(Messages, 'resize');

                Messages.regroup();
                expect(Messages.messages).toHaveBeenCalled();
                expect(Messages.groupings).toHaveBeenCalledWith([]);
                expect(Messages.groups).toHaveBeenCalledWith([]);
                expect(Messages.resize).toHaveBeenCalled();
            });
        });
    });
});
