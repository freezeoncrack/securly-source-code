define([
    'amd/logger/logger',
    'amd/utils/featureFlags',
    'amd/utils/featureFlags.backing',
    'js/test/mocks/chrome.runtime',
    'js/test/mocks/chrome.storage'
], function(
    Logger,
    FeatureFlags,
    flags,
    runtime,
    storage
) {
    describe('FeatureFlags', function() {
        var FEATURE = 'FAKE_FLAG';
        var FAKE_SCHOOL = 'THIS SCHOOL DOES NOT EXIST!';
        var featureFlags;

        beforeEach(function() {
            storage.local.mock();
            flags[FEATURE] = ['DyKnow'];
            featureFlags = new FeatureFlags();
        });

        afterEach(function() {
            storage.local.clear();
            delete chrome.runtime.lastError;
            delete flags.FAKE_FLAG;
        });

        it('can fetch instance', function() {
            expect(featureFlags).toBeTruthy();
        });

        it('can fetch singleton', function() {
            var instance = FeatureFlags.instance();
            expect(instance).toBeTruthy();
            expect(instance.setSchool).toBeTruthy();
            expect(instance.isEnabled).toBeTruthy();
        });

        it('can evaluate with singleton', function() {
            spyOn(FeatureFlags, 'instance').andReturn(featureFlags);
            spyOn(featureFlags, 'isEnabled');
            FeatureFlags.isEnabled(FEATURE);
            expect(featureFlags.isEnabled).toHaveBeenCalledWith(FEATURE);
        });

        it('resolver completes promise', function() {
            var success = null;
            var school = null;

            runs(function() {
                featureFlags._schoolResolver('DyKnow');
                featureFlags._schoolPromise.then(
                    function(data) { success = true; school = data; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(school).toBe('DyKnow');
            });
        });

        it('can flag check for school', function() {
            expect(featureFlags._checkFlag('DyKnow', FEATURE)).toBe(true);
        });

        it('can fail check for school', function() {
            expect(featureFlags._checkFlag(FAKE_SCHOOL, FEATURE)).toBe(false);
        });

        it('initialize sets school promise', function() {
            waitsFor(function() {
                return featureFlags._schoolResolver !== null;
            });

            runs(function() {
                expect(featureFlags._schoolPromise.then).toBeTruthy();
                expect(featureFlags._schoolResolver).toBeTruthy();
            });
        });

        it('can fetch flag for school', function() {
            var school = null;
            var success = null;
            var flagValue = null;

            runs(function() {
                featureFlags._schoolPromise.then(
                    function(name) { school = name; }
                ).then(function() {
                    return featureFlags.isEnabled(FEATURE);
                }).then(
                    function(value) { flagValue = value; success = true; },
                    function() { success = false; }
                );
                expect(success).toBe(null);
                featureFlags.setSchool('DyKnow');
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(school).toBe('DyKnow');
                expect(success).toBe(true);
                var check = featureFlags._checkFlag('DyKnow', FEATURE);
                expect(check).toBe(flagValue);
                expect(flagValue).toBe(true);
            });
        });

        it('flag can fail for school', function() {
            var school = null;
            var success = null;
            var flagValue = null;

            runs(function() {
                featureFlags._schoolPromise.then(
                    function(name) { school = name; }
                ).then(function() {
                    return featureFlags.isEnabled(FEATURE);
                }).then(
                    function(value) { flagValue = value; success = true; },
                    function() { success = false; }
                );
                expect(success).toBe(null);
                featureFlags.setSchool(FAKE_SCHOOL);
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(school).toBe(FAKE_SCHOOL);
                expect(success).toBe(true);
                var check = featureFlags._checkFlag(FAKE_SCHOOL, FEATURE);
                expect(check).toBe(flagValue);
                expect(flagValue).toBe(false);
            });
        });

        it('set school sets storage', function() {
            spyOn(featureFlags, '_storeSchool').andCallThrough();
            var success = null;

            runs(function() {
                var promise = featureFlags.setSchool('DyKnow');
                expect(promise.then).toBeTruthy();
                promise.then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(featureFlags._storeSchool).toHaveBeenCalledWith('DyKnow');
                expect(storage.local.set).toHaveBeenCalledWith(
                    {school: {name: 'DyKnow'}},
                    jasmine.any(Function)
                );
            });
        });

        it('loads saved school', function() {
            spyOn(featureFlags, '_loadSchool').andCallThrough();
            storage.local._store.school = {name: 'DyKnow'};
            featureFlags = new FeatureFlags();
            var success = null;
            var school = null;

            runs(function() {
                var promise = featureFlags._schoolPromise;
                expect(promise.then).toBeTruthy();
                promise.then(
                    function(name) { school = name; success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(storage.local.get).toHaveBeenCalledWith(
                    'school', jasmine.any(Function));
                expect(success).toBe(true);
                expect(school).toBe('DyKnow');
            });
        });

        it('catches failed school load', function() {
            storage.local.failGet = true;
            var success = null;

            runs(function() {
                var promise = featureFlags._loadSchool();
                expect(promise.then).toBeTruthy();
                promise.then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(storage.local.get).toHaveBeenCalledWith(
                    'school', jasmine.any(Function));
                expect(success).toBe(false);
            });
        });

        it('catches failed school save', function() {
            storage.local.failSet = true;
            var success = null;
            spyOn(featureFlags, '_storeSchool').andCallThrough();

            runs(function() {
                var promise = featureFlags.setSchool('DyKnow');
                expect(promise.then).toBeTruthy();
                promise.then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(storage.local.set).toHaveBeenCalledWith(
                    {school: {name: 'DyKnow'}},
                    jasmine.any(Function)
                );
                expect(featureFlags._storeSchool).toHaveBeenCalledWith('DyKnow');
                expect(success).toBe(false);
                expect(storage.local._store.school).toBe(undefined);
            });
        });

        it('reads feature for school when storage get and set fail', function() {
            storage.local.failGet = true;
            storage.local.failSet = true;
            var schoolGet = null;
            var schoolSet = null;
            var success = null;
            var flagValue = null;

            runs(function() {
                featureFlags._loadSchool().then(
                    function() { schoolGet = true; },
                    function() { schoolGet = false; }
                )
                .then(featureFlags.setSchool.bind(featureFlags, 'DyKnow'))
                .then(
                    function() { schoolSet = true; },
                    function() { schoolSet = false; }
                )
                .then(featureFlags.isEnabled.bind(featureFlags, FEATURE))
                .then(
                    function(value) { flagValue = value; success = true; },
                    function() { success = false; }
                );
            });

            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(flagValue).toBe(true);
                expect(schoolGet).toBe(false);
                expect(schoolSet).toBe(false);
            });
        });
    });
});
