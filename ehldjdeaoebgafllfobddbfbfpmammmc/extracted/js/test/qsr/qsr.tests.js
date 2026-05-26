define([
    'amd/filesystem',
    'amd/qsr/attentionManager',
    'amd/qsr/blockingManager',
    'amd/qsr/qsr',
    'amd/qsr/state',
    'amd/qsr/tracker',
    'underscore'
], function(
    filesystem,
    AttentionManager,
    BlockingManager,
    QSR,
    State,
    Tracker,
    _
) {
    describe('QSR', function() {
        var communicating, mockIdn, qsr, tracker;

        beforeEach(function() {
            Tracker._purge();
            tracker = Tracker.instance('test');
            communicating = true;
            mockIdn = jasmine.createSpyObj('idn', ['isCommunicating']);
            mockIdn.isCommunicating.andCallFake(function() {
                return communicating;
            });
            qsr = new QSR(mockIdn);
        });

        afterEach(function() {
            if (qsr) {
                qsr.stop();
            }
        });

        it('can construct', function() {
            expect(qsr).toBeTruthy();
        });

        it('can fail construction', function() {
            expect(function() { qsr = new QSR(); }).toThrow();
        });

        it('can start and stop', function() {
            qsr.start();
            expect(qsr.running).toBe(true);
            qsr.stop();
            expect(qsr.running).toBe(false);
        });

        it('starting will prep tick after load', function() {
            spyOn(qsr, 'loadState').andReturn(Promise.resolve());
            spyOn(qsr, '_delayTick');
            qsr.start();

            expect(qsr.running).toBe(true);
            waitsFor(function() {
                return qsr._delayTick.calls.length > 0;
            });

            runs(function() {
                expect(qsr._delayTick).toHaveBeenCalled();
            });
        });

        it('starting will prep tick after failed load', function() {
            spyOn(qsr, 'readState').andReturn(Promise.reject());
            spyOn(qsr, '_delayTick');
            qsr.start();

            expect(qsr.running).toBe(true);
            waitsFor(function() {
                return qsr._delayTick.calls.length > 0;
            });

            runs(function() {
                expect(qsr._delayTick).toHaveBeenCalled();
            });
        });

        it('can load saved state', function() {
            var json = JSON.stringify({
                state: 'hello world',
                timestamp: new Date()
            });
            spyOn(qsr, 'readState').andReturn(Promise.resolve(json));
            spyOn(State, 'restore').andCallThrough();

            var success = null;
            runs(function() {
                qsr.loadState().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(qsr.readState).toHaveBeenCalled();
                expect(State.restore).toHaveBeenCalledWith(json);
                expect(qsr.state.state).toBe('hello world');
            });
        });

        it('handles load with bad JSON', function() {
            var json = '{"this json":"is not'; // complete"}
            spyOn(qsr, 'readState').andReturn(Promise.resolve(json));
            spyOn(State, 'restore').andCallThrough();

            var success = null;
            qsr.state = null;
            runs(function() {
                qsr.loadState().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(qsr.readState).toHaveBeenCalled();
                expect(State.restore).toHaveBeenCalledWith(json);
                expect(qsr.state).toBe(null);
            });
        });

        it('calls managers on restore', function() {
            var attentionManager = AttentionManager.instance();
            var blockingManager = BlockingManager.instance();
            spyOn(attentionManager, 'restoreState');
            spyOn(blockingManager, 'restoreState');

            var state = new State();
            qsr.state = state;

            qsr.restore();
            expect(attentionManager.restoreState).toHaveBeenCalledWith(state);
            expect(blockingManager.restoreState).toHaveBeenCalledWith(state);
        });

        it('tick sets timeout', function() {
            qsr.running = true;
            spyOn(_, 'delay');
            spyOn(qsr, '_tick').andReturn(Promise.resolve());

            var success = null;
            runs(function() {
                qsr.tick().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(qsr._tick).toHaveBeenCalled();
                expect(_.delay).toHaveBeenCalledWith(
                    jasmine.any(Function), QSR.TICK_TIME);
            });
        });

        it('failed internal tick sets timeout', function() {
            qsr.running = true;
            spyOn(_, 'delay');
            spyOn(qsr, '_tick').andReturn(Promise.reject());

            var success = null;
            runs(function() {
                qsr.tick().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(qsr._tick).toHaveBeenCalled();
                expect(_.delay).toHaveBeenCalledWith(
                    jasmine.any(Function), QSR.TICK_TIME);
            });
        });

        // is communicating, state changed
        it('can capture state on tick while communicating', function() {
            spyOn(qsr, 'expired').andReturn(false);
            spyOn(qsr, 'setState');

            tracker.state(null);
            qsr.state = new State();
            var state = {test: 'testing'};
            tracker.state(state);

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.setState).toHaveBeenCalled();
            expect(qsr.active).toBe(false);
        });

        // is communicating, state unchanged
        it('will capture state while communicating', function() {
            spyOn(qsr, 'setState');
            tracker.state({test: 'testing'});
            qsr.state = new State();

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.active).toBe(false);
            expect(qsr.setState).toHaveBeenCalled();
        });

        // communicating to not communicating transition
        // active state unchanged
        it('can can transition to not communicating', function() {
            communicating = false;
            spyOn(qsr, 'expired').andReturn(false);
            spyOn(qsr, 'setState');
            spyOn(qsr, 'restore');

            tracker.state({test: 'testing'});
            qsr.state = new State();

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.expired).toHaveBeenCalled();
            expect(qsr.active).toBe(true);
            expect(qsr.setState).not.toHaveBeenCalled();
            expect(qsr.restore).not.toHaveBeenCalled();
        });

        // communicating to not communicating transition
        // active state cleared during transition
        it('can change state to active when not communicating', function() {
            communicating = false;
            spyOn(qsr, 'expired').andReturn(false);
            spyOn(qsr, 'setState');
            spyOn(qsr, 'restore');

            tracker.state({test: 'testing'});
            qsr.state = new State();
            tracker.state(null);

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.expired).toHaveBeenCalled();
            expect(qsr.active).toBe(true);
            expect(qsr.setState).not.toHaveBeenCalled();
            expect(qsr.restore).toHaveBeenCalled();
        });

        // not communicating to communicating transition
        // active state matches QSR state
        it('can transition to communicating', function() {
            spyOn(qsr, 'expired');
            spyOn(qsr, 'setState');
            spyOn(qsr, 'restore');

            tracker.state({test: 'testing'});
            qsr.state = new State();
            qsr.active = true;

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.expired).not.toHaveBeenCalled();
            expect(qsr.active).toBe(false);
            expect(qsr.setState).toHaveBeenCalled();
            expect(qsr.restore).not.toHaveBeenCalled();
        });

        // not communicating to communicating transition
        // active state cleared before transition
        it('can change state to inactive when communication resumes', function() {
            spyOn(qsr, 'expired');
            spyOn(qsr, 'setState');
            spyOn(qsr, 'restore');

            tracker.state({test: 'testing'});
            qsr.state = new State();
            qsr.active = true;
            tracker.state(null);

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.expired).not.toHaveBeenCalled();
            expect(qsr.active).toBe(false);
            expect(qsr.setState).toHaveBeenCalled();
            expect(qsr.restore).toHaveBeenCalledWith(jasmine.any(Object));
        });

        // not communicating and already active
        // state unchanged
        it('will not restore unchanged active state', function() {
            communicating = false;
            spyOn(qsr, 'expired').andReturn(false);
            spyOn(qsr, 'setState');
            spyOn(qsr, 'restore');

            qsr.state = new State();
            qsr.active = true;

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.expired).toHaveBeenCalled();
            expect(qsr.active).toBe(true);
            expect(qsr.setState).not.toHaveBeenCalled();
            expect(qsr.restore).not.toHaveBeenCalled();
        });

        // not communicating and already active
        // state was cleared since last tick
        it('restores active state while not communicating', function() {
            communicating = false;
            spyOn(qsr, 'expired').andReturn(false);
            spyOn(qsr, 'setState');
            spyOn(qsr, 'restore');

            tracker.state({test: 'testing'});
            qsr.state = new State();
            tracker.state(null);
            qsr.active = true;

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.expired).toHaveBeenCalled();
            expect(qsr.active).toBe(true);
            expect(qsr.setState).not.toHaveBeenCalled();
            expect(qsr.restore).toHaveBeenCalled();
        });

        // communicating with no state transition
        it('stays inactive while communicating', function() {
            spyOn(qsr, 'expired');
            qsr.state = new State();

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.expired).not.toHaveBeenCalled();
            expect(qsr.active).toBe(false);
        });

        // No state comparison should be needed while communicating. To make
        // sure the timestamp is always up to date, the active state should
        // always be cached.
        it('does not expire state while communicating', function() {
            spyOn(qsr, 'expired');
            spyOn(qsr, 'setState');
            qsr.state = new State();
            spyOn(qsr.state, 'compare');

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.expired).not.toHaveBeenCalled();
            expect(qsr.active).toBe(false);
            expect(qsr.setState).toHaveBeenCalled();
            expect(qsr.state.compare).not.toHaveBeenCalled();
        });

        // no communication or state change
        // state passes maximum allowed time while active
        it('expires state while active', function() {
            communicating = false;
            spyOn(qsr, 'expired').andReturn(true);
            spyOn(qsr, 'resetState');
            spyOn(qsr, 'restore');
            qsr.state = new State();
            qsr.active = true;

            qsr._tick();
            expect(mockIdn.isCommunicating).toHaveBeenCalled();
            expect(qsr.expired).toHaveBeenCalled();
            expect(qsr.active).toBe(true);
            expect(qsr.resetState).toHaveBeenCalled();
            expect(qsr.restore).toHaveBeenCalled();
        });

        it('writes state on set', function() {
            spyOn(qsr, 'writeState').andReturn(new Promise(function() {}));
            var state = new State();
            qsr.setState(state);
            expect(qsr.state).toBe(state);
            expect(qsr.writeState).toHaveBeenCalled();
        });

        it('requests has filesystem init file', function() {
            spyOn(filesystem, 'getFile').andReturn(Promise.reject());
            spyOn(filesystem, 'initFile').andReturn(Promise.reject());
            qsr.getFile();
            expect(filesystem.getFile).not.toHaveBeenCalled();
            expect(filesystem.initFile).toHaveBeenCalledWith('qsr.json');
        });

        it('requests file from filesystem', function() {
            spyOn(filesystem, 'getFile').andReturn(Promise.reject());
            spyOn(filesystem, 'initFile').andReturn(Promise.reject());
            qsr.getFile(true);
            expect(filesystem.getFile).toHaveBeenCalledWith('qsr.json');
            expect(filesystem.initFile).not.toHaveBeenCalled();
        });

        it('get file will cache file', function() {
            var mockFile = {name: 'not real'};
            spyOn(filesystem, 'getFile').andReturn(Promise.resolve(mockFile));
            
            var success = null;
            var value = null;
            runs(function() {
                qsr.getFile(true).then(
                    function(fetched) { value = fetched; success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(filesystem.getFile).toHaveBeenCalled();
                expect(value).toBe(mockFile);
                expect(qsr.file).toBe(mockFile);
            });
        });

        it('get file uses cache', function() {
            qsr.file = {name: 'not real'};
            
            var success = null;
            var value = null;
            runs(function() {
                qsr.getFile().then(
                    function(fetched) { value = fetched; success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(value).toBe(qsr.file);
            });
        });

        it('get file can fail', function() {
            spyOn(filesystem, 'getFile').andReturn(Promise.reject('nope'));

            var success = null;
            var error = null;
            runs(function() {
                qsr.getFile(true).then(
                    function() { success = true; },
                    function(e) { error = e; success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(filesystem.getFile).toHaveBeenCalledWith('qsr.json');
                expect(error).toBe('nope');
            });
        });

        it('write state writes to filesystem', function() {
            qsr.state = new State();
            spyOn(qsr, 'getFile').andReturn(Promise.resolve('test'));
            spyOn(filesystem, 'writeToFile').andReturn(Promise.resolve());

            var success = null;
            runs(function() {
                qsr.writeState().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(qsr.getFile).toHaveBeenCalled();
                expect(filesystem.writeToFile).toHaveBeenCalledWith('test', jasmine.any(Object));
            });
        });

        it('can fail write state', function() {
            qsr.state = new State();
            spyOn(qsr, 'getFile').andReturn(Promise.resolve('test'));
            spyOn(filesystem, 'writeToFile').andReturn(Promise.reject());

            var success = null;
            runs(function() {
                qsr.writeState().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(qsr.getFile).toHaveBeenCalled();
                expect(filesystem.writeToFile).toHaveBeenCalledWith('test', jasmine.any(Object));
            });
        });

        it('failed set discards file', function() {
            qsr.file = {name: 'not real'};
            var state = new State();
            spyOn(qsr, 'writeState').andReturn(Promise.reject('nope'));

            var success = null;
            runs(function() {
                qsr.setState(state).then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(qsr.writeState).toHaveBeenCalled();
                expect(qsr.file).toBe(null);
            });
        });

        it('can read state', function() {
            spyOn(qsr, 'getFile').andReturn(Promise.resolve('test'));
            spyOn(filesystem, 'readFile').andReturn(Promise.resolve());

            var success = null;
            runs(function() {
                qsr.readState().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(qsr.getFile).toHaveBeenCalled();
                expect(filesystem.readFile).toHaveBeenCalledWith('test');
            });
        });

        it('can fail read', function() {
            spyOn(qsr, 'getFile').andReturn(Promise.resolve('test'));
            spyOn(filesystem, 'readFile').andReturn(Promise.reject());

            var success = null;
            runs(function() {
                qsr.readState().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(qsr.getFile).toHaveBeenCalled();
                expect(filesystem.readFile).toHaveBeenCalledWith('test');
            });
        });
    });
});
