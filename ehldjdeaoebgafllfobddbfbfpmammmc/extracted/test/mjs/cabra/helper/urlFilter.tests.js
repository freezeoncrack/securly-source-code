import UrlFilter from "/js/mjs/cabra/helper/urlFilter.js"; 
import chrome from "/test/mocks/chrome.js"; 
import logger from "/test/mocks/logger.js";
import browserEvents from "/js/mjs/chromeOsServices/browserEvents.js";
import Sandbox from "/js/mjs/sandbox.js";
import lifecycleEventHandler from "/js/mjs/chromeOsServices/lifecycleEventHandler.js";


describe('UrlFiltering', function () {
    var urlFilter = false,
        hostnameForName = function (name) {
            return name + '.com';
        },
        createUrlForName = function (name) {
            return 'http://' + hostnameForName(name);
        },
        createUrlForHostName = function (hostname) {
            return 'http://' + hostname;
        },
        createFragmentForName = function (name, trailing) {
            return 'http://' + hostnameForName + trailing;
        };
    var sandbox;

    beforeEach(function() {
        chrome.useMock();
        logger.useMock();
        sandbox = new Sandbox().init();
        sandbox._reset();
        urlFilter = new UrlFilter();
        browserEvents._resetForTest();
        spyOn(lifecycleEventHandler, "setClassroomState");
    });

    afterEach(function() {
        browserEvents._resetForTest();
        chrome.resetMock();
        sandbox._reset();
    });

    describe('subscriptions', function() {
        var eventObjects;
        beforeEach(function() {
            eventObjects = [
                chrome.management.onInstalled, chrome.management.onUninstalled,
                chrome.management.onEnabled, chrome.management.onDisabled,
                chrome.tabs.onCreated, chrome.tabs.onRemoved,
                chrome.webNavigation.onCommitted, chrome.webNavigation.onCompleted
            ];
        });

        it('can subscribe to chrome events', function() {
            urlFilter.subscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.addListener).toHaveBeenCalled();
                expect(feature.addListener.calls.all().length).toEqual(1);
            });
        });

        it('will not subscribe if already subscribed', function() {
            urlFilter._subscribed = true;
            urlFilter.subscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.addListener).not.toHaveBeenCalled();
            });
        });

        it('will not re-subscribe to chrome events', function() {
            urlFilter.subscribe();
            urlFilter.subscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.addListener).toHaveBeenCalled();
                expect(feature.addListener.calls.all().length).toEqual(1);
            });
        });

        it('can unsubscribe to chrome events', function() {
            urlFilter.subscribe();
            urlFilter.unsubscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.removeListener).toHaveBeenCalled();
                expect(feature.removeListener.calls.all().length).toEqual(1);
            });
        });

        it('will not unsubscribe if not subscribed', function() {
            urlFilter._subscribed = false;
            urlFilter.unsubscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.removeListener).not.toHaveBeenCalled();
            });
        });

        it('will only unsubscribe once', function() {
            urlFilter.subscribe();
            urlFilter.unsubscribe();
            urlFilter.unsubscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.removeListener).toHaveBeenCalled();
                expect(feature.removeListener.calls.all().length).toEqual(1);
            });
        });

        it('will subscribe on blacklist filter', function() {
            spyOn(urlFilter, 'subscribe');
            spyOn(urlFilter, 'unsubscribe');
            spyOn(urlFilter, 'isBlacklist').and.returnValue(true);
            spyOn(urlFilter, 'isWhitelist').and.returnValue(false);

            urlFilter.filter([], [], [], []);
            expect(urlFilter.subscribe).toHaveBeenCalled();
            expect(urlFilter.unsubscribe).not.toHaveBeenCalled();
            expect(urlFilter.subscribe.calls.all().length).toBe(1);
        });

        it('will subscribe on whitelist filter', function() {
            spyOn(urlFilter, 'subscribe');
            spyOn(urlFilter, 'unsubscribe');
            spyOn(urlFilter, 'isBlacklist').and.returnValue(false);
            spyOn(urlFilter, 'isWhitelist').and.returnValue(true);

            urlFilter.filter([], [], [], []);
            expect(urlFilter.subscribe).toHaveBeenCalled();
            expect(urlFilter.unsubscribe).not.toHaveBeenCalled();
            expect(urlFilter.subscribe.calls.all().length).toBe(1);
        });

        it('does not unsubscribe on filter clear', function() { //see explanation in urlFilter setup script
            spyOn(urlFilter, 'subscribe');
            spyOn(urlFilter, 'unsubscribe');
            spyOn(urlFilter, 'isBlacklist').and.returnValue(false);
            spyOn(urlFilter, 'isWhitelist').and.returnValue(false);

            urlFilter.filter([], [], [], []);
            expect(urlFilter.subscribe).not.toHaveBeenCalled();
            expect(urlFilter.unsubscribe).not.toHaveBeenCalled();
            expect(urlFilter.unsubscribe.calls.all().length).toBe(0);
        });
    });

    //Core

    it("testWebsiteOnCoreWhitelistIsAllowedNothingOnGlobalOrWhiteListOrBlacklist", function() {
        var coreJson = [
                hostnameForName('google')
            ];

        urlFilter.filter(coreJson, [], [], []);

        coreJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    it("testWebsitesOnCoreWhitelistIsAllowedNothingOnGlobalOrWhiteListOrBlacklist", function() {
        var coreJson = [
                hostnameForName('google'),
                hostnameForName('facebook')
            ];

        urlFilter.filter(coreJson, [], [], []);

        coreJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    //Global

    it("testWebsiteOnGlobalWhitelistIsAllowedNothingOnCoreOrWhitelistOrBlacklist", function() {
        var globalJson = [
                hostnameForName('google')
            ];

        urlFilter.filter([], globalJson, [], []);

        globalJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    it("testWebsitesOnGlobalWhitelistIsAllowedNothingOnCoreOrWhitelistOrBlacklist", function() {
        var globalJson = [
                hostnameForName('google'),
                hostnameForName('facebook')
            ];

        urlFilter.filter([], globalJson, [], []);

        globalJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    //whitelist

    it("testWebsiteOnWhitelistIsAllowedNothingOnCoreOrGlobalOrBlacklist", function() {
        var whitelistJson = [
                hostnameForName('google')
            ];

        urlFilter.filter([], [], whitelistJson, []);

        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    it("testWebsitesOnWhitelistIsAllowedNothingOnCoreOrGlobalOrBlacklist", function() {
        var whitelistJson = [
                hostnameForName('google'),
                hostnameForName('facebook')
            ];

        urlFilter.filter([], [], whitelistJson, []);

        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    //blacklist

    it("testWebsiteOnBlacklistIsBlockedNothingOnCoreOrGlobalOrWhitelist", function() {
        var blacklistjson = [
                hostnameForName('google')
            ];

        urlFilter.filter([], [], [], blacklistjson);

        blacklistjson.forEach(function (json) {
            var expected = true;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    it("testWebsitesOnBlacklistIsBlockedNothingOnCoreOrGlobalOrWhitelist", function() {
        var blacklistjson = [
                hostnameForName('google'),
                hostnameForName('facebook')
            ];

        urlFilter.filter([], [], [], blacklistjson);

        blacklistjson.forEach(function (json) {
            var expected = true;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    //global + whitelist

    it("testWebsitesOnGlobalORWhitelistIsAllowedNothingOnCoreOrBlacklist", function() {
        var globalJson = [
                hostnameForName('depauw'),
                hostnameForName('moodle')
            ],
            whitelistJson = [
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter([], globalJson, whitelistJson, []);

        globalJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    it("adds securly.com/blocked for an allowonly plan", function() {
        var globalJson = [
            ],
            whitelistJson = [
                hostnameForName('google')
            ];

        urlFilter.filter([], globalJson, whitelistJson, []);
        expect(
            urlFilter.shouldFilterWebsiteWithURL("https://securly.com/blocked?email=foo&bar=baz")
        ).toEqual(false);
    });

    //core + global + whitelist

    it("testWebsitesOnCoreOrGlobalORWhitelistIsAllowedNothingOnBlacklist", function() {
        var coreJson = [
                hostnameForName('dyknow'),
                hostnameForName('pearson')
            ],
            globalJson = [
                hostnameForName('depauw'),
                hostnameForName('moodle')
            ],
            whitelistJson = [
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter(coreJson, globalJson, whitelistJson, []);

        coreJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        globalJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    //global + blacklist

    it("testWebsitesOnGlobalORBlacklistIsBlockedOnBlackListAllowedOnGlobalNothingOnCoreOrWhiteList", function() {
        var globalJson = [
                hostnameForName('depauw'),
                hostnameForName('moodle')
            ],
            blacklist = [
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter([], globalJson, [], blacklist);

        globalJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        blacklist.forEach(function (json) {
            var expected = true;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    it("testGlobalListTrumpsBlackListWhenConflictingNothingOnCoreOrWhiteList", function() {
        var globalJson = [
                hostnameForName('facebook')
            ],
            blacklist = [
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter([], globalJson, [], blacklist);

        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('facebook'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('google'))).toBe(true);
    });

    //core + global + blacklist

    it("testWebsitesOnCoreOrGlobalORBlacklistIsBlockedOnBlackListAllowedOnGlobalNothingOnWhiteList", function() {
        var coreJson = [
                hostnameForName('dyknow'),
                hostnameForName('pearson')
            ],
            globalJson = [
                hostnameForName('depauw'),
                hostnameForName('moodle')
            ],
            blacklistJson = [
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter(coreJson, globalJson, [], blacklistJson);

        coreJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        globalJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    it("testCoreOrGlobalListTrumpsBlackListWhenConflictingNothingOnWhiteList", function() {
        var coreJson = [
                hostnameForName('dyknow'),
                hostnameForName('pearson')
            ],
            globalJson = [
                hostnameForName('facebook')
            ],
            blacklist = [
                hostnameForName('dyknow'),
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter(coreJson, globalJson, [], blacklist);

        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('dyknow'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('facebook'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('google'))).toBe(true);
    });

    //whitelist + blacklist

    it("testWebsitesOnWhiteORBlacklistIsBlockedOnBlackListAllowedOnWhiteNothingOnCoreOrGlobal", function() {
        var whitelistJson = [
                hostnameForName('depauw'),
                hostnameForName('moodle')
            ],
            blacklistJson = [
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter([], [], whitelistJson, blacklistJson);

        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    it("testWhiteListTrumpsBlackListWhenConflictingNothingOnCoreOrGlobal", function() {
        var whitelist = [
                hostnameForName('facebook')
            ],
            blacklist = [
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter([], [], whitelist, blacklist);

        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('facebook'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('google'))).toBe(true);
    });

    // global + whitelist + blacklist

    it("testWebsitesOnGlobalOrWhiteORBlacklistIsBlockedOnBlackListAllowedOnWhiteNothingOnCore", function() {
        var globalJson = [
                hostnameForName('youtube')
            ],
            whitelistJson = [
                hostnameForName('depauw'),
                hostnameForName('moodle')
            ],
            blacklistJson = [
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter([], globalJson, whitelistJson, blacklistJson);

        globalJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    it("testGlobalOrWhiteListTrumpsBlackListWhenConflictingNothingOnCore", function() {
        var globalJson = [
                hostnameForName('youtube')
            ],
            whitelist = [
                hostnameForName('facebook')
            ],
            blacklist = [
                hostnameForName('youtube'),
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter([], globalJson, whitelist, blacklist);

        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('youtube'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('facebook'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('google'))).toBe(true);
    });

    // core + global + whitelist + blacklist

    it("testWebsitesOnCoreOrGlobalOrWhiteORBlacklistIsBlockedOnBlackListAllowedOnWhite", function() {
        var coreJson = [
                hostnameForName('dyknow'),
                hostnameForName('pearson')
            ],
            globalJson = [
                hostnameForName('youtube')
            ],
            whitelistJson = [
                hostnameForName('depauw'),
                hostnameForName('moodle')
            ],
            blacklistJson = [
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter(coreJson, globalJson, whitelistJson, blacklistJson);

        coreJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        globalJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });

        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = urlFilter.shouldFilterWebsiteWithURL(createUrlForHostName(json));
            expect(expected).toBe(actual);
        });
    });

    it("testCoreOrGlobalOrWhiteListTrumpsBlackListWhenConflicting", function() {
        var coreJson = [
                hostnameForName('dyknow'),
                hostnameForName('pearson')
            ],
            globalJson = [
                hostnameForName('youtube')
            ],
            whitelist = [
                hostnameForName('facebook')
            ],
            blacklist = [
                hostnameForName('dyknow'),
                hostnameForName('youtube'),
                hostnameForName('facebook'),
                hostnameForName('google')
            ];

        urlFilter.filter(coreJson, globalJson, whitelist, blacklist);

        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('dyknow'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('youtube'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('facebook'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('google'))).toBe(true);
    });

    it("emptylist allows everything", function() {
        urlFilter.filter([], [], [], []);

        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('dyknow'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('youtube'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('facebook'))).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('google'))).toBe(false);
    });

    it("is case insensitive", function() {
        urlFilter.filter([], [], [], [hostnameForName('dyknow')]);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('dyknow'))).toBe(true);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('dYkNoW'))).toBe(true);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('DYKNOW'))).toBe(true);
    });

    it("is case insensitive plan", function() {
        urlFilter.filter([], [], [], [hostnameForName('DyKnow')]);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('dyknow'))).toBe(true);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('dYkNoW'))).toBe(true);
        expect(urlFilter.shouldFilterWebsiteWithURL(createUrlForName('DYKNOW'))).toBe(true);
    });

    it('test subdomains', function() {
        urlFilter.filter([],[],['zendesk.com'],[]);
        expect(urlFilter.shouldFilterWebsiteWithURL('https://dyknow.zendesk.com/agent/#/dashboard')).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL('http://dyknow.zendesk.com/agent/#/dashboard')).toBe(false);

        urlFilter.filter([],[],['dyknow.zendesk.com'],[]);
        expect(urlFilter.shouldFilterWebsiteWithURL('https://dyknow.zendesk.com/agent/#/dashboard')).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL('http://dyknow.zendesk.com/agent/#/dashboard')).toBe(false);

        urlFilter.filter([],[],['www.zendesk.com'],[]);
        expect(urlFilter.shouldFilterWebsiteWithURL('https://dyknow.zendesk.com/agent/#/dashboard')).toBe(true);
        expect(urlFilter.shouldFilterWebsiteWithURL('http://dyknow.zendesk.com/agent/#/dashboard')).toBe(true);
    });

    it('test about scheme', function() {
        urlFilter.filter([],[],['dyknow.com'],[]);
        //has no hostname
        expect(urlFilter.shouldFilterWebsiteWithURL('about://facebook.com')).toBe(false);
        expect(urlFilter.shouldFilterWebsiteWithURL('about://dyknow.com')).toBe(false);
    });

    it('test data scheme', function() {
        urlFilter.filter([],[],['dyknow.com'],[]);
        expect(urlFilter.shouldFilterWebsiteWithURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA')).toBe(false);
    });

    it('test file scheme', function() {
        urlFilter.filter([],[],['dyknow.com'],[]);
        expect(urlFilter.shouldFilterWebsiteWithURL('file://DKTeamcity01/yolo/file.csv')).toBe(true);
        expect(urlFilter.shouldFilterWebsiteWithURL('file://dyknow.com/yolo/file.csv')).toBe(false);
    });

    it('test http scheme', function() {
        urlFilter.filter([],[],['dyknow.com'],[]);
        expect(urlFilter.shouldFilterWebsiteWithURL('http://DKTeamcity01/yolo/file.csv')).toBe(true);
        expect(urlFilter.shouldFilterWebsiteWithURL('http://dyknow.com/yolo/file.csv')).toBe(false);
    });

    it('test https scheme', function() {
        urlFilter.filter([],[],['dyknow.com'],[]);
        expect(urlFilter.shouldFilterWebsiteWithURL('https://DKTeamcity01/yolo/file.csv')).toBe(true);
        expect(urlFilter.shouldFilterWebsiteWithURL('https://dyknow.com/yolo/file.csv')).toBe(false);
    });

    it('test chrome scheme', function() {
        urlFilter.filter([],[],['dyknow.com'],[]);
        //no longer never blocking these
        expect(urlFilter.shouldFilterWebsiteWithURL('chrome://yolo')).toBe(true);
    });

    it('test chrome-devtools scheme', function() {
        urlFilter.filter([],[],['dyknow.com'],[]);
        //we have decided to always allow these
        expect(urlFilter.shouldFilterWebsiteWithURL('chrome-devtools://yolo')).toBe(false);
    });

    it('test chrome-extension scheme', function() {
        urlFilter.filter([],[],['dyknow.com'],[]);
        expect(urlFilter.shouldFilterWebsiteWithURL('chrome-extension://yolo')).toBe(true);
    });

    describe("events", function (){
        beforeEach(function(){
            urlFilter.subscribe();
        });

        it("redirects new tab if tab should be filtered", function() {
            spyOn(urlFilter, 'shouldFilterWebsiteWithURL').and.returnValue(true);
            spyOn(urlFilter, 'redirectTab');

            browserEvents._onTabAddedEvent({ url: 'http://yolo.com', id: 123 });
            expect(urlFilter.redirectTab).toHaveBeenCalled();
        });

        it("does not redirect new tab if tab should not be filtered", function() {
            spyOn(urlFilter, 'shouldFilterWebsiteWithURL').and.returnValue(false);
            spyOn(urlFilter, 'redirectTab');

            browserEvents._onTabAddedEvent({ url: 'http://yolo.com', id: 123 });
            expect(urlFilter.redirectTab).not.toHaveBeenCalled();
        });

        it("redirects navigating tab if tab should be filtered", function() {
            spyOn(urlFilter, 'shouldFilterWebsiteWithURL').and.returnValue(true);
            spyOn(urlFilter, 'redirectTab');

            browserEvents._onTabWillNavigateEvent({ url: 'http://yolo.com', tabId: 123, frameId: 0 });
            var getCallback = chrome.tabs.get.calls.all()[0].args[1];
            getCallback({
                id: 123,
                url: "http://yolo.com"
            });
            expect(urlFilter.redirectTab).toHaveBeenCalled();
        });

        it("does not redirect navigating tab if tab should not be filtered", function() {
            spyOn(urlFilter, 'shouldFilterWebsiteWithURL').and.returnValue(false);
            spyOn(urlFilter, 'redirectTab');

            browserEvents._onTabWillNavigateEvent({ url: 'http://yolo.com', tabId: 123, frameId: 0 });
            expect(urlFilter.redirectTab).not.toHaveBeenCalled();
        });

        it("redirects navigated tab if tab should be filtered", function() {
            spyOn(urlFilter, 'shouldFilterWebsiteWithURL').and.returnValue(true);
            spyOn(urlFilter, 'redirectTab');

            browserEvents._onTabDidNavigateEvent({ url: 'http://yolo.com', tabId: 123, frameId: 0 });
            var getCallback = chrome.tabs.get.calls.all()[0].args[1];
            getCallback({
                id: 123,
                url: "http://yolo.com"
            });
            expect(urlFilter.redirectTab).toHaveBeenCalled();
        });

        it("does not redirect navigated tab if tab should not be filtered", function() {
            spyOn(urlFilter, 'shouldFilterWebsiteWithURL').and.returnValue(false);
            spyOn(urlFilter, 'redirectTab');

            browserEvents._onTabDidNavigateEvent({ url: 'http://yolo.com', tabId: 123, frameId: 0 });
            expect(urlFilter.redirectTab).not.toHaveBeenCalled();
        });
    });

    it("chrome extension", function () {
        urlFilter.filter([],[],['heagkhocbbgfanpmhakmbffiiolbhfcf'],[]);
        expect(urlFilter.shouldFilterWebsiteWithURL('chrome-extension://heagkhocbbgfanpmhakmbffiiolbhfcf/Tornado_Web_nacl.html')).toBe(false);

        urlFilter.filter([],[],['google.com'],[]);
        expect(urlFilter.shouldFilterWebsiteWithURL('chrome-extension://heagkhocbbgfanpmhakmbffiiolbhfcf/Tornado_Web_nacl.html')).toBe(true);

        urlFilter.filter([],[],[],['heagkhocbbgfanpmhakmbffiiolbhfcf']);
        expect(urlFilter.shouldFilterWebsiteWithURL('chrome-extension://heagkhocbbgfanpmhakmbffiiolbhfcf/Tornado_Web_nacl.html')).toBe(true);

        urlFilter.filter([],[],[],['google.com']);
        expect(urlFilter.shouldFilterWebsiteWithURL('chrome-extension://heagkhocbbgfanpmhakmbffiiolbhfcf/Tornado_Web_nacl.html')).toBe(false);
    });

    describe("web-fragments", function() {
        function getFragment(ID) {
            return {identifier:ID, ostype: "web-fragment"};
        }

        function getNonFragment(ID) {
            return {identifier:ID, ostype: "web"};
        }

        it('no ostype defined works as ostype=web', function() {
            //whitelist
            urlFilter.filter([],[],['example.com'],[]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example2.com/pizza')).toBe(true);

            //blacklist
            urlFilter.filter([],[],[],['example.com']);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example2.com/pizza')).toBe(false);
        });

        it('ostype web works as expected', function() {
            //whitelist
            urlFilter.filter([],[],[getNonFragment('example.com')],[]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example2.com/pizza')).toBe(true);

            //blacklist
            urlFilter.filter([],[],[],[getNonFragment('example.com')]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example2.com/pizza')).toBe(false);
        });

        it('test path', function() {
            //whitelist
            urlFilter.filter([],[],[getFragment('example.com/quizzes')],[]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('https://example.com/quizzes')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://www.example.com/quizzes')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes/2')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes/answers/2')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://m.example.com/quizzes/answers/2')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/questions/2')).toBe(true);

            //blacklist
            urlFilter.filter([],[],[],[getFragment('example.com/quizzes')]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('https://example.com/quizzes')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://www.example.com/quizzes')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes/2')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes/answers/2')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://m.example.com/quizzes/answers/2')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/questions/2')).toBe(false);
        });

        it('test path with filename', function() {
            //whitelist
            urlFilter.filter([],[],[getFragment('example.com/recipes/spaghetti.php')],[]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/spaghetti.php')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('https://example.com/recipes/spaghetti.php')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://www.example.com/recipes/spaghetti.php')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/spaghetti.php?filter=vegan')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://m.example.com/recipes/spaghetti.php')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/lasagna.php')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/spaghetti.p')).toBe(true);

            //blacklist
            urlFilter.filter([],[],[],[getFragment('example.com/recipes/spaghetti.php')]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/spaghetti.php')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('https://example.com/recipes/spaghetti.php')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://www.example.com/recipes/spaghetti.php')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/spaghetti.php?filter=vegan')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://m.example.com/recipes/spaghetti.php')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/lasagna.php')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/spaghetti.p')).toBe(false);
        });

        it('test domain with trailing slash', function() {
            //whitelist
            urlFilter.filter([],[],[getFragment('example.com/')],[]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://m.example.com/')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('https://example.com/')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes/answers/2')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/spaghetti.php')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/spaghetti.php?filter=vegan')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.co')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.gov')).toBe(true);

            //blacklist
            urlFilter.filter([],[],[],[getFragment('example.com/')]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://m.example.com/')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('https://example.com/')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/quizzes/answers/2')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/spaghetti.php')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/spaghetti.php?filter=vegan')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.co')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.gov')).toBe(false);
        });

        it('test domain with path and trailing slash', function() {
            //whitelist
            urlFilter.filter([],[],[getFragment('example.com/recipes/')],[]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://m.example.com/recipes/')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('https://example.com/recipes/')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes#vegan')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes:vegan')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes?filter=vegan&name=lasagna%20bake')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/vegan/spaghetti.php')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes.php')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes.and.more/spaghetti.php')).toBe(true);

            //blacklist
            urlFilter.filter([],[],[],[getFragment('example.com/recipes/')]);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://m.example.com/recipes/')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('https://example.com/recipes/')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes#vegan')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes:vegan')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes?filter=vegan&name=lasagna%20bake')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes/vegan/spaghetti.php')).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes.php')).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL('http://example.com/recipes.and.more/spaghetti.php')).toBe(false);
        });


        it('google search fragments block despite xsrf tokens and stuff', function() {
            //blocklist
            urlFilter.filter([],[],[],[getFragment("www.google.com/search?q=snake")]);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=snake")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=snake+game")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?client=firefox-b-1-d&q=snake+game")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=%22snake+game%22&client=firefox-b-1-d&ei=0GazYdHhO5CJggf2zLz4Bg&ved=0ahUKEwjRiemcu9n0AhWQhOAKHXYmD28Q4dUDCA0&uact=5&oq=%22snake+game%22&gs_lcp=Cgxnd3Mtd2l6LXNlcnAQAzILCAAQsQMQgwEQkQIyCwgAEIAEELEDEIMBMggIABCABBCxAzILCAAQgAQQsQMQgwEyCwguELEDEIMBEJECMgUILhCRAjIFCAAQkQIyCwguEIAEELEDEIMBMgsIABCABBCxAxCDATIFCAAQgAQ6BwgAEEcQsAM6BwgAELADEEM6CAgAEOQCELADOgoILhDIAxCwAxBDSgQIQRgASgQIRhgBUIAFWP4LYM8OaAFwAngAgAFiiAHCAZIBATKYAQCgAQHIARPAAQE&sclient=gws-wiz-serp")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=google+snake")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=google%20snake&client=firefox-b-1-d&ei=62azYcKDOOLH_Qb4hJ-IDw&ved=0ahUKEwiCpdWpu9n0AhXiY98KHXjCB_EQ4dUDCA0&uact=5&oq=google+snake&gs_lcp=Cgxnd3Mtd2l6LXNlcnAQAzIICAAQsQMQkQIyCAgAELEDEJECMgUIABCRAjIFCAAQkQIyCwgAEIAEELEDEIMBMgsIABCABBCxAxCDATIFCAAQgAQyCwgAEIAEELEDEIMBMgUIABCABDILCAAQgAQQsQMQgwE6BwgAEEcQsAM6BQguEJECOhAILhCxAxCDARDHARDRAxBDOggIABCABBCxAzoOCC4QgAQQsQMQxwEQowI6BwgAELEDEEM6CAguELEDEJECOgQILhBDOgQIABBDOgsIABCxAxCDARCRAjoOCC4QgAQQsQMQxwEQ0QNKBAhBGABKBAhGGABQ3AZY3BRg7hhoAXACeACAAaQDiAHiDpIBCTcuMS4yLjEuMZgBAKABAcgBCMABAQ&sclient=gws-wiz-serp")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=ssnake")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=aslfjsdlfj+snake")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=ssnake&rlz=1C1GCEU_enUS885US887&oq=ssnake&aqs=chrome..69i57.2382j0j4&sourceid=chrome&ie=UTF-8")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=math")).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=math&xsrf=3jadlkj3isnake94")).toBe(false);
            //allowlist, dont have a good use case for this
            //someday, we MIGHT consider the use case for 
            //allow-listing lists like youtube.com/watch?v=videoid&list=listid&index=2
            //where you could specify a list and it follow these basic rules as well. 
            //this would allow these mechanics for that someday, but we'd need to make
            //the decision someday to support that
            urlFilter.filter([],[],[getFragment("www.google.com/search?q=javascript")],[]);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=javascript")).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=javascript+loop")).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?client=firefox-b-1-d&q=javascript+loop")).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=%javascript+loop%22&client=firefox-b-1-d&ei=0GazYdHhO5CJggf2zLz4Bg&ved=0ahUKEwjRiemcu9n0AhWQhOAKHXYmD28Q4dUDCA0&uact=5&oq=%22javascript+loop%22&gs_lcp=Cgxnd3Mtd2l6LXNlcnAQAzILCAAQsQMQgwEQkQIyCwgAEIAEELEDEIMBMggIABCABBCxAzILCAAQgAQQsQMQgwEyCwguELEDEIMBEJECMgUILhCRAjIFCAAQkQIyCwguEIAEELEDEIMBMgsIABCABBCxAxCDATIFCAAQgAQ6BwgAEEcQsAM6BwgAELADEEM6CAgAEOQCELADOgoILhDIAxCwAxBDSgQIQRgASgQIRhgBUIAFWP4LYM8OaAFwAngAgAFiiAHCAZIBATKYAQCgAQHIARPAAQE&sclient=gws-wiz-serp")).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=loop+javascript")).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=javascript%20loop&client=firefox-b-1-d&ei=62azYcKDOOLH_Qb4hJ-IDw&ved=0ahUKEwiCpdWpu9n0AhXiY98KHXjCB_EQ4dUDCA0&uact=5&oq=google+snake&gs_lcp=Cgxnd3Mtd2l6LXNlcnAQAzIICAAQsQMQkQIyCAgAELEDEJECMgUIABCRAjIFCAAQkQIyCwgAEIAEELEDEIMBMgsIABCABBCxAxCDATIFCAAQgAQyCwgAEIAEELEDEIMBMgUIABCABDILCAAQgAQQsQMQgwE6BwgAEEcQsAM6BQguEJECOhAILhCxAxCDARDHARDRAxBDOggIABCABBCxAzoOCC4QgAQQsQMQxwEQowI6BwgAELEDEEM6CAguELEDEJECOgQILhBDOgQIABBDOgsIABCxAxCDARCRAjoOCC4QgAQQsQMQxwEQ0QNKBAhBGABKBAhGGABQ3AZY3BRg7hhoAXACeACAAaQDiAHiDpIBCTcuMS4yLjEuMZgBAKABAcgBCMABAQ&sclient=gws-wiz-serp")).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=javascriptt")).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=aslfjsdlfj+javascript")).toBe(false);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=snake")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=snake&xsrf=3jadlkj3ijavascript94")).toBe(true);                
        });

        it("googlesearch webfragments inbound variations dont break", function (){
            //blocklist with extra query params we'll ignore
            urlFilter.filter([],[],[],[getFragment("www.google.com/search?q=google+snake&rlz=1C1GCEU_enUS820US821&oq=google+snake&aqs=chrome..69i57j0l7.2421j0j7&sourceid=chrome&ie=UTF-8&safe=active&ssui=on")]);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=google+snake")).toBe(true);
            //if it doesnt start out perfectly, treat like a webfragment
            urlFilter.filter([],[],[],[getFragment("www.google.com/search?surl=1&q=google+snake&rlz=1C1GCEA_enUS966US968&oq=google+snake&aqs=chrome..69i57j0i131i433i512l3j0i512j0i131i433i512j0i512j0i131i433i512l2j0i512.4395j0j7&sourceid=chrome&ie=UTF-8&safe=active&ssui=on")]);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=google+snake")).toBe(false);
            //if it doesnt have a query, matches any google search
            urlFilter.filter([],[],[],[getFragment("www.google.com/search?q=")]);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=google+snake")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?xsrf=alksjdflkdsjf&q=snake+and+stuff")).toBe(true);
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?q=")).toBe(true);//technically this redirects to base search
            expect(urlFilter.shouldFilterWebsiteWithURL("https://www.google.com/search?xsrf=alksjdflkdsjf")).toBe(false);
        });
    });

    describe("whitelist - redirects to studentontask", function () {
        beforeEach(function () {
            //already using mocks so...
            chrome.tabs.update = function () {};
            spyOn(chrome.tabs, "update");
            urlFilter.subscribe();
        });
        it("redirects all tabs on plan starting", function () {
            urlFilter.filter(
                ["studentontask.com"],//core url whitelist
                [],//customer url whitelist (which doesnt currently exist)
                [
                    hostnameForName('google'),
                    hostnameForName('facebook')
                ],
                []
            );
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.facebook.com/something-allowed"},
                {id: 2, url: "https://www.facebook.com/something-also-allowed"},
                {id: 3, url: "https://www.offtask.com/something-off-task"},
                {id: 4, url: "https://also-off-task.com/something-also-off-task"},
                {id: 5, url: "https://www.google.com/something-allowed/path/file.html"},
                {id: 6, url: "https://studentontask.com"}]}
            ]);
            expect(chrome.tabs.update.calls.all().length).toEqual(2);
            expect(chrome.tabs.update).toHaveBeenCalledWith(3, {url: "https://studentontask.com"}, jasmine.any(Function));
            expect(chrome.tabs.update).toHaveBeenCalledWith(4, {url: "https://studentontask.com"}, jasmine.any(Function));
        });

        it("redirects tab willNavigate", function () {
            urlFilter.filter(
                ["studentontask.com"],//core url whitelist
                [],//customer url whitelist (which doesnt currently exist)
                [
                    hostnameForName('google'),
                    hostnameForName('facebook')
                ],
                []
            );
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.facebook.com/something-allowed"},
                {id: 2, url: "https://www.facebook.com/something-also-allowed"}
            ]}]);
            var willNavigate = chrome.webNavigation.onCommitted.addListener.calls.all()[0].args[0];
            willNavigate({ tabId: 1, frameId: 0, url: "http://www.offtask.com/something-off-task"});
            var getCallback = chrome.tabs.get.calls.all()[0].args[1];
            getCallback({
                id: 1,
                url: "http://www.offtask.com/something-off-task"
            });
            expect(chrome.tabs.update.calls.all().length).toEqual(1);
            expect(chrome.tabs.update).toHaveBeenCalledWith(1, {url: "https://studentontask.com"}, jasmine.any(Function));
        });

        it("redirects tab didNavigate", function () {
            //lets imagine willNavigate happens right here and it's slow
            //so it wont be the url on the tab query call...
            urlFilter.filter(
                ["studentontask.com"],//core url whitelist
                [],//customer url whitelist (which doesnt currently exist)
                [
                    hostnameForName('google'),
                    hostnameForName('facebook')
                ],
                []
            );
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.facebook.com/something-allowed"},
                {id: 2, url: "https://www.facebook.com/something-also-allowed"}
            ]}]);
            var didNavigate = chrome.webNavigation.onCompleted.addListener.calls.all()[0].args[0];
            didNavigate({ tabId: 1, frameId: 0, url: "http://www.offtask.com/something-off-task"});
            var getCallback = chrome.tabs.get.calls.all()[0].args[1];
            getCallback({
                id: 1,
                url: "http://www.offtask.com/something-off-task"
            });
            expect(chrome.tabs.update.calls.all().length).toEqual(1);
            expect(chrome.tabs.update).toHaveBeenCalledWith(1, {url: "https://studentontask.com"}, jasmine.any(Function));
        });

        it("silently watches the redirects happening to studentontask", function () {
            urlFilter.filter(
                ["studentontask.com"],//core url whitelist
                [],//customer url whitelist (which doesnt currently exist)
                [
                    hostnameForName('google'),
                    hostnameForName('facebook')
                ],
                []
            );
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.facebook.com/something-allowed"},
                {id: 2, url: "https://www.facebook.com/something-also-allowed"}
            ]}]);
            var willNavigate = chrome.webNavigation.onCommitted.addListener.calls.all()[0].args[0];
            willNavigate({ tabId: 1, frameId: 0, url: "https://studentontask.com"});
            var didNavigate = chrome.webNavigation.onCompleted.addListener.calls.all()[0].args[0];
            didNavigate({ tabId: 1, frameId: 0, url: "https://studentontask.com"});
            expect(chrome.tabs.update.calls.all().length).toEqual(0);
        });

    });

    describe("blacklist - redirects to studentontask", function () {
        beforeEach(function () {
        });
        it("redirects all tabs on plan starting", function () {
            urlFilter.filter(
                ["studentontask.com"],//core url whitelist
                [],//customer url whitelist (which doesnt currently exist)
                [],
                [
                    'offtask.com',
                    'also-off-task.com'
                ]
            );
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.facebook.com/something-allowed"},
                {id: 2, url: "https://www.facebook.com/something-also-allowed"},
                {id: 3, url: "https://www.offtask.com/something-off-task"},
                {id: 4, url: "https://also-off-task.com/something-also-off-task"},
                {id: 5, url: "https://www.google.com/something-allowed/path/file.html"},
                {id: 6, url: "https://studentontask.com"}
            ]}]);
            expect(chrome.tabs.update.calls.all().length).toEqual(2);
            expect(chrome.tabs.update).toHaveBeenCalledWith(3, {url: "https://studentontask.com"}, jasmine.any(Function));
            expect(chrome.tabs.update).toHaveBeenCalledWith(4, {url: "https://studentontask.com"}, jasmine.any(Function));
        });

        it("redirects tab willNavigate", function () {
            urlFilter.filter(
                ["studentontask.com"],//core url whitelist
                [],//customer url whitelist (which doesnt currently exist)
                [],
                [
                    'offtask.com',
                    'also-off-task.com'
                ]
            );
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.facebook.com/something-allowed"},
                {id: 2, url: "https://www.facebook.com/something-also-allowed"}
            ]}]);
            var willNavigate = chrome.webNavigation.onCommitted.addListener.calls.all()[0].args[0];
            willNavigate({ tabId: 1, frameId: 0, url: "http://www.offtask.com/something-off-task"});
            var getCallback = chrome.tabs.get.calls.all()[0].args[1];
            getCallback({
                id: 1,
                url: "http://www.offtask.com/something-off-task"
            });
            expect(chrome.tabs.update.calls.all().length).toEqual(1);
            expect(chrome.tabs.update).toHaveBeenCalledWith(1, {url: "https://studentontask.com"}, jasmine.any(Function));
        });

        it("redirects tab didNavigate", function () {
            //lets imagine willNavigate happens right here and it's slow
            //so it wont be the url on the tab query call...
            urlFilter.filter(
                ["studentontask.com"],//core url whitelist
                [],//customer url whitelist (which doesnt currently exist)
                [],
                [
                    'offtask.com',
                    'also-off-task.com'
                ]
            );
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.facebook.com/something-allowed"},
                {id: 2, url: "https://www.facebook.com/something-also-allowed"}
            ]}]);
            var didNavigate = chrome.webNavigation.onCompleted.addListener.calls.all()[0].args[0];
            didNavigate({ tabId: 1, frameId: 0, url: "http://www.offtask.com/something-off-task"});
            var getCallback = chrome.tabs.get.calls.all()[0].args[1];
            getCallback({
                id: 1,
                url: "http://www.offtask.com/something-off-task"
            });
            expect(chrome.tabs.update.calls.all().length).toEqual(1);
            expect(chrome.tabs.update).toHaveBeenCalledWith(1, {url: "https://studentontask.com"}, jasmine.any(Function));
        });

        it("silently watches the redirects happening to studentontask", function () {
            urlFilter.filter(
                ["studentontask.com"],//core url whitelist
                [],//customer url whitelist (which doesnt currently exist)
                [],
                [
                    'offtask.com',
                    'also-off-task.com'
                ]
            );
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.facebook.com/something-allowed"},
                {id: 2, url: "https://www.facebook.com/something-also-allowed"}
            ]}]);
            var willNavigate = chrome.webNavigation.onCommitted.addListener.calls.all()[0].args[0];
            willNavigate({ tabId: 1, frameId: 0, url: "https://studentontask.com"});
            var didNavigate = chrome.webNavigation.onCompleted.addListener.calls.all()[0].args[0];
            didNavigate({ tabId: 1, frameId: 0, url: "https://studentontask.com"});
            expect(chrome.tabs.update.calls.all().length).toEqual(0);
        });

        it("never block chrome-search new tab when whitelist applied", function () {
            urlFilter.filter([],[],["ontask.com"],[]);
            expect(urlFilter.shouldFilterWebsiteWithURL('chrome-search://local-ntp/local-ntp.html')).toBe(false);
        });

        it("never block chrome-search new tab when blacklist applied", function () {
            urlFilter.filter([],[],[],["local-ntp"]); 
            expect(urlFilter.shouldFilterWebsiteWithURL('chrome-search://local-ntp/local-ntp.html')).toBe(false);
        });
    });
    
    describe("tab restoration", function () {
        beforeEach(function () {
        });

        it("adds filtered tabs to _filteredTabs hash", function () {
            var offtaskUrl = "https://www.offtask.com/something-off-task";
            
            expect(Object.keys(urlFilter._filteredTabs).length).toBe(0);

            urlFilter.filter([],[],[],['offtask.com']);

            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: offtaskUrl}
            ]}]);
            expect(Object.keys(urlFilter._filteredTabs).length).toBe(1);
            expect(urlFilter._filteredTabs[1].url).toBe(offtaskUrl);
        });

        it("updates filtered tab in hash instead of duplicating", function(){
            var offtaskUrl = "https://www.offtask.com/something-off-task";
            var differentOfftaskUrl = "https://www.differentofftask.com/something-off-task";
            
            urlFilter.filter([],[],[],['offtask.com','differentofftask.com']);

            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: offtaskUrl}
            ]}]);
            expect(Object.keys(urlFilter._filteredTabs).length).toBe(1);
            expect(urlFilter._filteredTabs[1].url).toBe(offtaskUrl);

            browserEvents._onTabWillNavigateEvent({ url: differentOfftaskUrl, tabId: 1, frameId: 0 });
            var getCallback = chrome.tabs.get.calls.all()[0].args[1];
            getCallback({
                id: 1,
                url: differentOfftaskUrl
            });
            expect(Object.keys(urlFilter._filteredTabs).length).toBe(1);
            expect(urlFilter._filteredTabs[1].url).toBe(differentOfftaskUrl);
        });

        it("reverts filtered tabs on plan release", function () {
            //this validates plan release while online and while offline.
            //Anything that results in an isAllowAll() == true will revert filtered tabs
            spyOn(urlFilter, 'revertFilteredTabs');
            
            var offtaskUrl = "https://www.offtask.com/something-off-task";

            urlFilter.filter([],[],[],['offtask.com']);

            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: offtaskUrl}
            ]}]);
            
            urlFilter.filter([],[],[],[]);
            expect(urlFilter.revertFilteredTabs).toHaveBeenCalled();
        });

        it("removes tabs from _filteredTabs hash when restoring", function(){
            var offtaskUrl = "https://www.offtask.com/something-off-task";

            urlFilter.filter([],[],[],['offtask.com']);

            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: offtaskUrl}
            ]}]);
            
            urlFilter.filter([],[],[],[]);
            var secondCallback = chrome.tabs.get.calls.all()[0].args[1];
            secondCallback({id:1,url:offtaskUrl});

            expect(Object.keys(urlFilter._filteredTabs).length).toBe(0);
        });

        it("doesnt remove tabs from _filteredTabs hash when blocking plan changes but doesnt release", function(){
            var offtaskUrl = "https://www.offtask.com/something-off-task";

            urlFilter.filter([],[],[],['offtask.com']);

            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: offtaskUrl}
            ]}]);
            
            urlFilter.filter([],[],[],['offtask.com','alsoofftask.net']);

            expect(Object.keys(urlFilter._filteredTabs).length).toBe(1);
        });

        it("doesnt revert filtered tabs that have navigated elsewhere", function(){
            spyOn(urlFilter, 'revertTab');

            var offtaskUrl = "https://www.offtask.com/something-off-task";
            var ontaskUrl = "https://www.ontask.com/";

            urlFilter.filter([],[],[],['offtask.com']);

            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: offtaskUrl}
            ]}]);
            
            var secondCallback = chrome.windows.getAll.calls.all()[0].args[1];
            secondCallback([{tabs:[
                {id: 1, url: ontaskUrl}
            ]}]);

            urlFilter.filter([],[],[],[]);
            expect(urlFilter.revertTab).not.toHaveBeenCalled();
        });

        it("doesnt panic and cleans up when filtered tab is closed before reversion", function () {
            //chrome.tabs.get returns nothing when the tab id refers to a tab that no longer exists

            var offtaskUrl = "https://www.offtask.com/something-off-task";
            urlFilter.filter([],[],[],['offtask.com']);

            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: offtaskUrl}
            ]}]);
            
            urlFilter.filter([],[],[],[]);
            var secondCallback = chrome.tabs.get.calls.all()[0].args[1];

            expect(function(){secondCallback(null);}).not.toThrow();
            expect(Object.keys(urlFilter._filteredTabs).length).toBe(0);
        });

        it("doesnt revert filtered tabs that are navigating", function(){
            spyOn(urlFilter, 'revertTab');

            var offtaskUrl = "https://www.offtask.com/something-off-task";
            var ontaskUrl = "https://www.ontask.com/";

            urlFilter.filter([],[],[],['offtask.com']);

            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: offtaskUrl}
            ]}]);
            
            var secondCallback = chrome.windows.getAll.calls.all()[0].args[1];
            secondCallback([{tabs:[
                {id: 1, url: offtaskUrl, tabStatus: "loading"}
            ]}]);

            urlFilter.filter([],[],[],[]);
            expect(urlFilter.revertTab).not.toHaveBeenCalled();
        });

        it("sleeps tabs that have been reverted", function(){
            spyOn(urlFilter, 'sleepTab');

            urlFilter.filter([],[],[],[]);
            urlFilter._revertedTabs[1] = {id:1,url: "https://www.offtask.com/something-off-task",title:"offtask"};
            urlFilter._processTabChange({id:1, url: "https://www.offtask.com/something-off-task",title:"offtask"});

            expect(urlFilter.sleepTab).toHaveBeenCalled();
        });

        it("doesnt sleep active tab", function(){
            spyOn(urlFilter, 'sleepTab');

            urlFilter.filter([],[],[],[]);
            urlFilter._revertedTabs[1] = {id:1,url: "https://www.offtask.com/something-off-task",title:"offtask"};
            urlFilter._processTabChange({id:1, url: "https://www.offtask.com/something-off-task",title:"offtask", active:true});

            expect(urlFilter.sleepTab).not.toHaveBeenCalled();
        });

        it("doesnt sleep tabs until title isnt the same as url", function(){
            spyOn(urlFilter, 'sleepTab');

            urlFilter.filter([],[],[],[]);
            urlFilter._revertedTabs[1] = {id:1,url: "https://www.offtask.com/something-off-task",title:"offtask"};
            urlFilter._processTabChange({id:1, url: "https://www.offtask.com/something-off-task",title:"https://www.offtask.com/something-off-task"});

            expect(urlFilter.sleepTab).not.toHaveBeenCalled();

            urlFilter._processTabChange({id:1, url: "https://www.offtask.com/something-off-task",title:"offtask"});

            expect(urlFilter.sleepTab).toHaveBeenCalled();
        });

        it("doesnt sleep studentontask", function(){
            spyOn(urlFilter, 'sleepTab');

            urlFilter._revertedTabs[1] = [{id:1,url: "https://www.offtask.com/something-off-task"}];
            urlFilter.filter([],[],[],[]);
            urlFilter._processTabChange({id:1, url: urlFilter.redirectLocation});

            expect(urlFilter.sleepTab).not.toHaveBeenCalled();
        });

        it("doesnt panic when tab cannot be discarded", function(){
            urlFilter.sleepTab({id:1});
            var sleepCallback = chrome.tabs.discard.calls.all()[0].args[1];

            expect(chrome.tabs.discard).toHaveBeenCalled();
            expect(function(){sleepCallback(null);}).not.toThrow(); //simulates a tab that cannot be discarded
        });

        it("publishes the block url event when blocekd", function () {
            spyOn(sandbox, "publish");
            urlFilter.filter(
                ["studentontask.com"],//core url whitelist
                [],//customer url whitelist (which doesnt currently exist)
                [
                    hostnameForName('google'),
                    hostnameForName('facebook')
                ],
                []
            );
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 3, url: "https://www.offtask.com/something-off-task"},
            ]}]);
            expect(sandbox.publish).toHaveBeenCalledWith("blocking_block_url", {
                url: "https://www.offtask.com/something-off-task",
                tab_id: 3,
                title: undefined
            });
        });
    });

    describe("lifecycleEventHandler", function () {

        /* Quick novella about our relationship with lifecycleEventHandler: 
        It will not be loading its stuff up in the same way. Because we expect 
        to exist as part of a generally-loosely-coupled but known and tracked hierarchy, we 
        are goign to take advantage of that. We will expect startFromInactive to be its main entryway
        and likewise for it to get loaded in sycronously prior to uncorking events. This means it 
        cannot be responsible for loading its own recursive callback structure unless I continue 
        getting cuter with completion callbacks and the like inside.
        
        As a consequence, we dont have any load getActivitationState null scenario of consequence
        */
        it("proceeds normally with no activationState", async function () {
            //simple error handling we woudlnt expect this to be called this way in practice
            urlFilter.startFromInactive(null);//no state
            expect(urlFilter._filteredTabs).toEqual({});
        });

        it("sets filtered and reverted with activationSTate", async function () {
            urlFilter.startFromInactive({
                filteredTabs:{
                    4: { id: 4, url: "https;//www.facebook.com" },
                    5: { id: 5, url: "https;//www.youtube.com" }
                },
                revertedTabs: {
                    6: { id: 6, url: "https;//www.youtube.com" }
                }
            });
            expect(urlFilter._filteredTabs).toEqual({
                4: { id: 4, url: "https;//www.facebook.com" },
                5: { id: 5, url: "https;//www.youtube.com" }
            });
            expect(urlFilter._revertedTabs).toEqual({
                6: { id: 6, url: "https;//www.youtube.com" }
            });
        });

        it("saves filtered tabs after updating", function () {
            urlFilter.filter([],[],[],['offtask.com']);
            var queryCallback = chrome.windows.getAll.calls.all()[0].args[1];
            queryCallback([{tabs:[
                {id: 1, url: "https://www.offtask.com/something-off-task"}
            ]}]);
            expect(lifecycleEventHandler.setClassroomState).toHaveBeenCalledWith("urlFilter", {
                filteredTabs:{
                    1: { id: 1, url: "https://www.offtask.com/something-off-task" }
                },
                revertedTabs: { }
            });
            //release now            
            urlFilter.filter([],[],[],[]);
            var secondCallback = chrome.tabs.get.calls.all()[0].args[1];
            secondCallback({id:1,url:"https://studentontask.com/"});
            expect(lifecycleEventHandler.setClassroomState).toHaveBeenCalledWith("urlFilter", {
                filteredTabs:{ },
                revertedTabs: {
                    1: { id: 1, url: "https://www.offtask.com/something-off-task" }
                }
            });
            //ensure reverted gets cleaned up 
            urlFilter._processTabChange({id:1, url: "https://www.offtask.com/something-off-task",title:"offtask"});
            expect(lifecycleEventHandler.setClassroomState).toHaveBeenCalledWith("urlFilter", {
                filteredTabs:{ },
                revertedTabs: { }
            });

        });

        it("reverts tabs on cancelInactive", function () {
            urlFilter.startFromInactive({
                filteredTabs:{
                    4: { id: 4, url: "https://www.facebook.com" }
                },  
                revertedTabs: {
                    6: { id: 6, url: "https://www.youtube.com" }
                }
            });
            //after 5 seconds we cancel
            urlFilter.cancelInactive();
            //now show the revert
            var queryCallback = chrome.tabs.get.calls.all()[0].args[1];
            queryCallback({ id: 4, url: "https://studentontask.com/" });

            expect(urlFilter._filteredTabs).toEqual({});
            expect(chrome.tabs.update).toHaveBeenCalledWith(4, {url: "https://www.facebook.com"}, jasmine.any(Function));

        })

        it("chills out if there is nothign to revert on cancelInactive", function(){
            urlFilter.startFromInactive({});
            //after 5 seconds we cancel
            urlFilter.cancelInactive();
            //now show no revert via the tabs.get not being called
            expect(chrome.tabs.get).not.toHaveBeenCalled();
        });
    });

});
