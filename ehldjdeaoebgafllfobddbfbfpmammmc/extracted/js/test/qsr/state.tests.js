define([
    'amd/qsr/state',
    'amd/qsr/tracker'
], function(
    State,
    Tracker
) {
    describe('State', function() {
        beforeEach(function() {
            Tracker._purge();
        });

        it('can build state', function() {
            var state = new State();
            expect(state).toBeTruthy();
            expect('state' in state).toBe(true);
        });

        it('can capture state', function() {
            var tracker = Tracker.instance('feature');
            var featureState = {test: 'testing'};
            tracker.state(featureState);
            var state = new State();
            expect(Object.keys(state.state).length).toBe(Tracker.names().length);
            expect(state.state.feature).toBe(featureState);
        });

        it('can capture tracker state', function() {
            var tracker = Tracker.instance('feature');
            var featureState = {test: 'testing'};
            tracker.state(featureState);
            var state = State.currentTrackerState();
            expect(Object.keys(state.state).length).toBe(Tracker.names().length);
            expect(state.state.feature).toBe(featureState);
        });

        it('can create state', function() {
            var stateObject = {test: 'testing'};
            var state = new State(stateObject);
            expect(state.state).toBe(stateObject);
        });

        it('can serialize state', function() {
            var stateObject = {test: 'testing'};
            var state = new State(stateObject);
            expect(JSON.stringify(state)).toBe(JSON.stringify(stateObject));
        });

        it('can compare states', function() {
            var baseState = {test: 'testing'};

            var state = new State(baseState);
            var otherState = new State(baseState);

            expect(state.compare('nope')).toBe(false);
            expect(state.compare(JSON.stringify(baseState))).toBe(true);
            expect(state.compare(otherState)).toBe(true);
            expect(otherState.compare(state)).toBe(true);

            otherState = new State({test: 'testificate'});
            expect(state.compare(otherState)).toBe(false);
            expect(otherState.compare(state)).toBe(false);
        });

        it('can dump and restore state', function() {
            var state = new State({test: 'testing'});

            var dump = state.dump();
            var dumpString = JSON.stringify(dump);
            expect(dump).toBeTruthy();
            expect(dumpString).toBeTruthy();

            var dumpRestore = State.restore(dump);
            var stringRestore = State.restore(dumpString);

            expect(dumpRestore).toBeTruthy();
            expect(stringRestore).toBeTruthy();

            expect(state.compare(dumpRestore)).toBe(true);
            expect(dumpRestore.compare(state)).toBe(true);

            expect(state.compare(stringRestore)).toBe(true);
            expect(stringRestore.compare(state)).toBe(true);

            expect(dumpRestore.compare(stringRestore)).toBe(true);
            expect(stringRestore.compare(dumpRestore)).toBe(true);
        });

        it('can get named state', function() {
            var state = new State({test: 'testing'});
            expect(state.getNamed('test')).toBe('testing');
        });

        it('returns null for unknown state names', function() {
            var state = new State({test: 'testing'});
            expect(state.getNamed('not_here')).toBe(null);
        });

        describe('timed tests', function() {
            beforeEach(function() {
                jasmine.Clock.useMock();
            });

            afterEach(function() {
                jasmine.Clock.reset();
            });

            it('will not validated invalid dates', function() {
                expect(State.validateTimestamp()).toBe(undefined);
                expect(State.validateTimestamp('')).toBe(undefined);
                expect(State.validateTimestamp('not a date')).toBe(undefined);
                expect(State.validateTimestamp({})).toBe(undefined);
            });

            it('will validate good dates', function() {
                var dateIn, dateOut;

                dateIn = new Date(2012, 10, 20, 14);
                dateOut = State.validateTimestamp(
                    JSON.parse(JSON.stringify(dateIn)));
                expect(dateOut.getTime()).toEqual(dateIn.getTime());

                dateOut = State.validateTimestamp(dateIn);
                expect(dateOut).toBe(dateIn);

                dateOut = State.validateTimestamp(
                    JSON.parse(JSON.stringify(new Date())));
                expect(dateOut).toBeTruthy();
                expect(dateOut).not.toBe(dateIn);
            });

            it('can restore with current time', function() {
                var data = JSON.stringify({
                    state: {test: 'testing'}
                });

                jasmine.Clock.tick(1000);
                var timestamp = new Date();

                var state = State.restore(data);
                expect(state.timestamp).toBeTruthy();
                expect(state.timestamp.getTime()).toBe(timestamp.getTime());
                expect(state.state).toEqual({test: 'testing'});
            });

            it('will restore timestamp', function() {
                var timestamp = new Date();
                var data = JSON.stringify({
                    state: {test: 'testing'},
                    timestamp: timestamp
                });

                // Tick to make sure a failed time stamp will not match.
                jasmine.Clock.tick(1000);

                var state = State.restore(data);
                expect(state.timestamp).toBeTruthy();
                expect(state.timestamp.getTime()).toEqual(timestamp.getTime());
                expect(state.state).toEqual({test: 'testing'});
            });
        });
    });
});
