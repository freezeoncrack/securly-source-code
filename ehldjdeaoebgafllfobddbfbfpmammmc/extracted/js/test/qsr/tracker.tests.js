define([
    'amd/qsr/tracker'
], function(
    Tracker
) {
    describe('tracker', function() {
        var instance;

        beforeEach(function() {
            Tracker._purge();
            instance = Tracker.instance('test');
        });

        it('can fetch tracker instance', function() {
            expect(instance).toBeTruthy();
        });

        it('can fetch tracker names', function() {
            var names = Tracker.names();
            expect(names.length).toBe(1);
            expect(names.indexOf('test')).not.toBe(-1);
        });

        it('can purge trackers for testing', function() {
            expect(Tracker.names().length).toBe(1);
            Tracker._purge();
            expect(Tracker.names().length).toBe(0);
        });

        it('tracker instances match', function() {
            var fetched = Tracker.instance('test');
            expect(instance).toBeTruthy();
            expect(fetched).toBeTruthy();
            expect(fetched).toBe(instance);
        });

        it('named trackers are different', function() {
            var fetched = Tracker.instance('testificate');
            expect(instance).toBeTruthy();
            expect(fetched).toBeTruthy();
            expect(fetched).not.toBe(instance);
        });

        it('can set tracker state', function() {
            expect(instance.state.bind(instance, 'test')).not.toThrow();
        });

        it('can get tracker state', function() {
            var state = {test: 'testing'};
            var setState = instance.state(state);
            expect(setState).toBe(state);
            expect(instance.state()).toBe(state);
        });

        it('can use falsy states', function() {
            var testState = function(state) {
                var setState = instance.state(state);
                expect(setState).toBe(state);
                expect(instance.state()).toBe(state);
            };

            testState(undefined);
            testState(null);
            testState(false);
        });

        it('different trackers do not share states', function() {
            var fetched = Tracker.instance('testificate');

            expect(instance.state({test: 'testing'})).toBe(instance.state());
            expect(fetched.state({test: 'testificate'})).toBe(fetched.state());
            expect(fetched.state()).not.toBe(instance.state());
        });
    });
});
