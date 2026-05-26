import BlockingManager from "/js/mjs/qsr/blockingManager.js";
import State from "/js/mjs/qsr/state.js";
import Logger from "/js/mjs/logger/logger.js";
import _ from "/js/lib/underscore.js";
import lifecycleEventHandler from "/js/mjs/chromeOsServices/lifecycleEventHandler.js";
import deferred from "/js/mjs/utils/deferred.js";

describe('BlockingManager', function() {
    var blockingManager = null;
    var bundles;
    var now; 

    function mockBundles() {
        var bundleOsList = Array.prototype.slice.call(arguments);
        return bundleOsList.map(function(osList) {
            return {
                applications: osList.map(function(os) {
                    return {
                        name: 'name',
                        identifier: 'identifier',
                        os: {
                            type: os
                        }
                    };
                })
            };
        });
    }

    beforeEach(function() {
        blockingManager = BlockingManager.instance();
        bundles = mockBundles(
            ['web', 'windows', 'mac'],
            ['web', 'web', 'chrome'],
            ['web', 'web-fragment'],
            ['web-fragment']
        );
        now = 1659493199229;
        spyOn(Logger, "debug");
        spyOn(Logger, "info");
        spyOn(Logger, "warn");
        spyOn(Logger, "error");
        spyOn(lifecycleEventHandler, "setClassroomState");
        spyOn(_, "delay");
        spyOn(_, "now").and.callFake(function() { return now;});
        spyOn(lifecycleEventHandler, "getActivationState");
        spyOn(chrome.storage.local, "get");
        spyOn(chrome.storage.local, "set");
        spyOn(chrome.storage.session, "get");
        spyOn(chrome.storage.session, "set");
    });
    afterEach(function(){
        delete chrome.lastError;
    });

    it('can fetch instance', function() {
        expect(blockingManager).toBeTruthy();
    });

    it('will reuse instance', function() {
        expect(BlockingManager.instance()).toBe(blockingManager);
    });

    it('can apply application rule', function() {
        spyOn(blockingManager.appBlock, 'applicationRule');

        var whitelist = ['thing 1'];
        var blacklist = ['thing 2'];
        blockingManager.applyApplicationRule(whitelist, blacklist);

        expect(blockingManager.appBlock.applicationRule).toHaveBeenCalledWith(
            blockingManager.coreApplicationWhiteList,
            blockingManager.customerApplicationWhiteList,
            whitelist,
            blacklist
        );
    });

    it('can apply url filtering', function() {
        spyOn(blockingManager.urlFilter, 'filter');

        var whitelist = ['thing 1'];
        var blacklist = ['thing 2'];
        blockingManager.applyUrlFiltering(whitelist, blacklist);

        expect(blockingManager.urlFilter.filter).toHaveBeenCalledWith(
            blockingManager.coreUrlWhiteList,
            blockingManager.customerUrlWhiteList,
            whitelist,
            blacklist
        );
    });

    it('can collapse bundles', function() {
        var apps = blockingManager.bundledApplications(bundles);
        expect(apps.length).toBe(9);
    });

    it('can get apps for OS', function() {
        var apps = blockingManager.applicationsForOsType(
            blockingManager.bundledApplications(bundles),
            'chrome'
        );
        expect(apps.length).toBe(1);
    });

    it('can get apps for other OSes', function() {
        var apps = blockingManager.applicationsForOsType(
            blockingManager.bundledApplications(bundles),
            'chrome',
            true
        );
        expect(apps.length).toBe(8);
    });

    it('can filter for chrome applications', function() {
        var apps = blockingManager.applicationsFromBundles(bundles);
        expect(apps.length).toBe(3);
    });

    it('can filter for websites', function() {
        var apps = blockingManager.websitesFromBundles(bundles);
        expect(apps.length).toBe(7);
    });
    
    it('apps return name/identifier correctly', function() {
        var apps = blockingManager.applicationsFromBundles(bundles);
        expect(apps[0]).toEqual({name: 'name', identifier: 'identifier'});
        expect(apps[1]).toEqual({name: 'name', identifier: 'identifier'});
        expect(apps[2]).toEqual({name: 'name', identifier: 'identifier'});
    });
    
    it('websites return identifier/ostype correctly', function() {
        var apps = blockingManager.websitesFromBundles(bundles);
        expect(apps[0]).toEqual({identifier: 'identifier', ostype: 'web'});
        expect(apps[1]).toEqual({identifier: 'identifier', ostype: 'web'});
        expect(apps[2]).toEqual({identifier: 'identifier', ostype: 'web'});
        expect(apps[3]).toEqual({identifier: 'identifier', ostype: 'web'});
        expect(apps[4]).toEqual({identifier: 'identifier', ostype: 'web-fragment'});
        expect(apps[5]).toEqual({identifier: 'identifier', ostype: 'web-fragment'});
        expect(apps[6]).toEqual({identifier: 'identifier', ostype: 'chrome'});
    });

    it('can apply whitelist application rules', function() {
        var apps = blockingManager.applicationsFromBundles(bundles);
        var state = {
            payload: {
                type: 'whitelist',
                bundles: bundles
            }
        };
        spyOn(blockingManager, 'applyApplicationRule');

        blockingManager.applyApplicationRulesFromState(state);
        expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith(apps, []);
    });

    it('can apply blacklist application rules', function() {
        var apps = blockingManager.applicationsFromBundles(bundles);
        var state = {
            payload: {
                type: 'blacklist',
                bundles: bundles
            }
        };
        spyOn(blockingManager, 'applyApplicationRule');

        blockingManager.applyApplicationRulesFromState(state);
        expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], apps);
    });

    it('can apply whitelist url filtering', function() {
        var apps = blockingManager.websitesFromBundles(bundles);
        var state = {
            payload: {
                type: 'whitelist',
                bundles: bundles
            }
        };
        spyOn(blockingManager, 'applyUrlFiltering');

        blockingManager.applyUrlFilteringFromState(state);
        expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith(apps, []);
    });

    it('can apply blacklist url filtering', function() {
        var apps = blockingManager.websitesFromBundles(bundles);
        var state = {
            payload: {
                type: 'blacklist',
                bundles: bundles
            }
        };
        spyOn(blockingManager, 'applyUrlFiltering');

        blockingManager.applyUrlFilteringFromState(state);
        expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], apps);
    });

    it('can apply whitelist state', function() {
        var apps = blockingManager.applicationsFromBundles(bundles);
        var sites = blockingManager.websitesFromBundles(bundles);
        var state = {
            payload: {
                type: 'whitelist',
                bundles: bundles
            }
        };
        spyOn(blockingManager, 'applyApplicationRule');
        spyOn(blockingManager, 'applyUrlFiltering');

        blockingManager.applyState(state);
        expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith(apps, []);
        expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith(sites, []);
    });

    it('can apply blacklist state', function() {
        var apps = blockingManager.applicationsFromBundles(bundles);
        var sites = blockingManager.websitesFromBundles(bundles);
        var state = {
            payload: {
                type: 'blacklist',
                bundles: bundles
            }
        };
        spyOn(blockingManager, 'applyApplicationRule');
        spyOn(blockingManager, 'applyUrlFiltering');

        blockingManager.applyState(state);
        expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], apps);
        expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], sites);
    });

    it('undefined state clears rules', function() {
        spyOn(blockingManager, 'applyApplicationRule');
        spyOn(blockingManager, 'applyUrlFiltering');

        blockingManager.applyState();
        expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], []);
        expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], []);
    });

    it('null state clears rules', function() {
        spyOn(blockingManager, 'applyApplicationRule');
        spyOn(blockingManager, 'applyUrlFiltering');

        blockingManager.applyState(null);
        expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], []);
        expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], []);
    });

    it('empty state clears rules', function() {
        spyOn(blockingManager, 'applyApplicationRule');
        spyOn(blockingManager, 'applyUrlFiltering');

        blockingManager.applyState({});
        expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], []);
        expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], []);
    });

    it('can restore state', function() {
        spyOn(blockingManager, 'applyState');
        var stateObject = {test: 'testing'};
        var state = new State({blocking: stateObject});

        blockingManager.restoreState(state);
        expect(blockingManager.applyState).toHaveBeenCalledWith(stateObject);
    });

    describe("lifecycleEventHandler", function () {

/* Quick novella about blockingManager and its relationship with lifecycleEventHandler: 
It will not be loading its stuff up in the same way. Because we expect blockingManager
to exist as part of a generally-loosely-coupled but known and tracked hierarchy, we 
are goign to take advantage of that. We will expect startFromInactive to be its main entryway
and likewise for it to get loaded in sycronously prior to uncorking events. This means it 
cannot be responsible for loading its own recursive callback structure unless I continue 
getting cuter with completion callbacks and the like inside.

As a consequence, we dont have any load getActivitationState null scenario of consequence
*/
        it("proceeds normally with no activationState", async function () {
            //simple error handling we woudlnt expect this to be called this way in practice
            spyOn(blockingManager.urlFilter, "startFromInactive");
            spyOn(blockingManager.appBlock, "startFromInactive");
            blockingManager.startFromInactive(null);//no state
            expect(blockingManager.urlFilter.startFromInactive).not.toHaveBeenCalled();
            expect(blockingManager.appBlock.startFromInactive).not.toHaveBeenCalled();
        });

        it("resets blocked tabs with activationState", function () {
            //test relies upon blockingmanager above being constructed            
            blockingManager.startFromInactive({
                urlFilter: { 
                    filteredTabs:{
                        4: { id: 4, url: "https;//www.facebook.com" },
                        5: { id: 5, url: "https;//www.youtube.com" }
                    },
                    revertedTabs: {
                        6: { id: 6, url: "https;//www.youtube.com" }
                    }
                },
                appBlock: {
                    installedExtensions: [
                        { name: "2048", id: "12233122324", enabled: true},
                        { name: "grammarly", id: "3434343343", enabled: true},
                        { name: "evilthing", id: "99999", enabled: false}
                    ]
                }
            });
            //is this overstepping our bounds? yes. do I care? no
            expect(blockingManager.urlFilter._filteredTabs).toEqual({
                4: { id: 4, url: "https;//www.facebook.com" },
                5: { id: 5, url: "https;//www.youtube.com" }
            });
            expect(blockingManager.urlFilter._revertedTabs).toEqual({
                6: { id: 6, url: "https;//www.youtube.com" }
            });
            expect(blockingManager.appBlock._installedExtensions).toEqual([
                { name: "2048", id: "12233122324", enabled: true},
                { name: "grammarly", id: "3434343343", enabled: true},
                { name: "evilthing", id: "99999", enabled: false}
            ]);            
        });


    });
});