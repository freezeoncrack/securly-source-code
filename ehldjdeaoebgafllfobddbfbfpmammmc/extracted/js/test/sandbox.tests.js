define(['amd/sandbox','amd/logger/logger'], function(Sandbox,Logger){
    describe("sandbox", function () {
        var sandbox;
        beforeEach(function (done) {
            chrome.runtime.onMessage = {
                addListener: function(){}
            };

            sandbox = new Sandbox().init();

            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
        });
        afterEach(function(){
            sandbox._reset();
        });

        it("will let me know about my event", function () {
            var called = false;
            sandbox.subscribe('foo', function(){
                called = true;
            });

            expect(called).toEqual(false);
            sandbox.publish("foo");
            expect(called).toEqual(true);
        });

        it("will not bug me about a different event", function () {
            var called = false;
            sandbox.subscribe({
                "foo": function () {
                    called = true;
                }
            });

            sandbox.publish("bar");
            expect(called).toEqual(false);
        });
    });
});
