define([
    'amd/cabra/attentionSession.events',
    'viewmodels/messagesViewModel',
    '../../mocks/chrome.windows'
], function(
    attentionEvents,
    Model,
    chromeWindows
) {
    describe('messages view model', function() {
        var sandbox;
        beforeEach(function() {
            sandbox = jasmine.createSpyObj('sandbox', ['publish']);
        });

        it('can create messages view model', function() {
            var model = new Model(sandbox);
            expect(model).toBeTruthy();
            expect(model.messages().length).toBe(0);
            expect(model.teacher()).toBe('');
            expect(sandbox.publish).not.toHaveBeenCalled();
        });

        it('can acknowledge message', function() {
            var model = new Model(sandbox);
            model.ack({conversationId: 42});
            expect(sandbox.publish).toHaveBeenCalledWith(
                attentionEvents.AttentionSessionAcknowledgeMessageEvent,
                jasmine.any(Object));
        });

        it('can format messages', function() {
            var model = new Model(sandbox);
            spyOn(String.prototype, 'linkify').andCallThrough();
            spyOn(String.prototype, 'replace').andCallThrough();

            model.messages([{ message: 'hello\nworld: http://google.com' }]);

            expect(String.prototype.linkify).toHaveBeenCalled();
            expect(String.prototype.replace).toHaveBeenCalled();

            expect(model.messages()[0].message).toBe('hello<br/>world: ' +
                '<a href="http://google.com" class="linkified" ' +
                'target="_blank">http://google.com</a>');
        });
    });
});
