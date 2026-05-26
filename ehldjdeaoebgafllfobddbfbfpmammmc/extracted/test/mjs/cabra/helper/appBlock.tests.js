import AppBlock from "/js/mjs/cabra/helper/appBlock.js"; 
import chrome from "/test/mocks/chrome.js"; 
import logger from "/test/mocks/logger.js";
import browserEvents from "/js/mjs/chromeOsServices/browserEvents.js";
import lifecycleEventHandler from "/js/mjs/chromeOsServices/lifecycleEventHandler.js";


describe('AppBlocking', function() {
    var appBlocker = false,
        jsonFromNameAndIdentifier = function (name, identifier) {
            return {
                name: name,
                identifier: identifier
            };
        },
        mockIdentifierFromName = function (name) {
            return "com.testing." + name;
        },
        jsonFromName = function (name) {
            return jsonFromNameAndIdentifier(name, mockIdentifierFromName(name));
        },
        nameFromJson = function (json) {
            return json.name;
        },
        identifierFromJson = function (json) {
            return json.identifier;
        };
    
    beforeEach(function() {
        chrome.useMock();
        logger.useMock();
        appBlocker = new AppBlock();
        browserEvents._resetForTest();
        spyOn(lifecycleEventHandler, "setClassroomState");
    });

    afterEach(function() {
        browserEvents._resetForTest();
        chrome.resetMock();
    });
    
    describe('subscriptions', function() {
        var eventObjects;
        beforeEach(function() {
            eventObjects = [
                chrome.management.onInstalled, chrome.management.onUninstalled,
                chrome.management.onEnabled, chrome.management.onDisabled
            ];
        });

        it('can subscribe to chrome events', function() {
            appBlocker.subscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.addListener).toHaveBeenCalled();
                expect(feature.addListener.calls.all().length).toEqual(1);
            });
        });

        it('will not subscribe if already subscribed', function() {
            appBlocker._subscribed = true;
            appBlocker.subscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.addListener).not.toHaveBeenCalled();
            });
        });

        it('will not re-subscribe to chrome events', function() {
            appBlocker.subscribe();
            appBlocker.subscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.addListener).toHaveBeenCalled();
                expect(feature.addListener.calls.all().length).toEqual(1);
            });
        });

        it('can unsubscribe to chrome events', function() {
            appBlocker.subscribe();
            appBlocker.unsubscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.removeListener).toHaveBeenCalled();
                expect(feature.removeListener.calls.all().length).toEqual(1);
            });
        });

        it('will not unsubscribe if not subscribed', function() {
            appBlocker._subscribed = false;
            appBlocker.unsubscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.removeListener).not.toHaveBeenCalled();
            });
        });

        it('will only unsubscribe once', function() {
            appBlocker.subscribe();
            appBlocker.unsubscribe();
            appBlocker.unsubscribe();
            eventObjects.forEach(function(feature) {
                expect(feature.removeListener).toHaveBeenCalled();
                expect(feature.removeListener.calls.all().length).toEqual(1);
            });
        });

        it('will subscribe on blacklist filter', function() {
            spyOn(appBlocker, 'subscribe');
            spyOn(appBlocker, 'unsubscribe');
            spyOn(appBlocker, 'isBlacklist').and.returnValue(true);
            spyOn(appBlocker, 'isWhitelist').and.returnValue(false);

            appBlocker.applicationRule([], [], [], []);
            expect(appBlocker.subscribe).toHaveBeenCalled();
            expect(appBlocker.unsubscribe).not.toHaveBeenCalled();
            expect(appBlocker.subscribe.calls.all().length).toBe(1);
        });

        it('will subscribe on whitelist filter', function() {
            spyOn(appBlocker, 'subscribe');
            spyOn(appBlocker, 'unsubscribe');
            spyOn(appBlocker, 'isBlacklist').and.returnValue(false);
            spyOn(appBlocker, 'isWhitelist').and.returnValue(true);

            appBlocker.applicationRule([], [], [], []);
            expect(appBlocker.subscribe).toHaveBeenCalled();
            expect(appBlocker.unsubscribe).not.toHaveBeenCalled();
            expect(appBlocker.subscribe.calls.all().length).toBe(1);
        });

        it('will unsubscribe on filter clear', function() {
            spyOn(appBlocker, 'subscribe');
            spyOn(appBlocker, 'unsubscribe');
            spyOn(appBlocker, 'isBlacklist').and.returnValue(false);
            spyOn(appBlocker, 'isWhitelist').and.returnValue(false);

            appBlocker.applicationRule([], [], [], []);
            expect(appBlocker.subscribe).not.toHaveBeenCalled();
            expect(appBlocker.unsubscribe).toHaveBeenCalled();
            expect(appBlocker.unsubscribe.calls.all().length).toBe(1);
        });
    });

    //Core Whitelist Test
    
    it("testAppOnCoreWhitelistIsAllowedNothingOnGlobalOrWhiteListOrBlacklist", function() {
        var coreJson = [
            jsonFromName("Calculator")
        ];
        
        appBlocker.applicationRule(coreJson, [], [], []);
        coreJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
        it("testAppsOnCoreWhitelistIsAllowedNothingOnGlobalOrWhiteListOrBlacklist", function() {
        var coreJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        appBlocker.applicationRule(coreJson, [], [], []);
        coreJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    //Global Whitelists
    
    it("testAppOnGlobalWhitelistIsAllowedNothingOnCoreOrWhitelistOrBlacklist", function() {
        var globalJson = [
            jsonFromName("Calculator")
        ];
        
        appBlocker.applicationRule([], globalJson, [], []);
        globalJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
        it("testAppsOnGlobalWhitelistIsAllowedNothingOnCoreOrWhitelistOrBlacklist", function() {
        var globalJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        appBlocker.applicationRule([], globalJson, [], []);
        globalJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    //Whitelists
    
    it("testAppOnWhitelistIsAllowedNothingOnCoreOrGlobalOrBlacklist", function() {
        var whitelistJson = [
            jsonFromName("Calculator")
        ];
        
        appBlocker.applicationRule([], [], whitelistJson, []);
        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
        it("testAppsOnWhitelistIsAllowedNothingOnCoreOrGlobalOrBlacklist", function() {
        var whitelistJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        appBlocker.applicationRule([], [], whitelistJson, []);
        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    //Blacklist
    
    it("testAppOnBlacklistIsBlockedNothingOnCoreOrGlobalOrWhitelist", function() {
        var blacklistJson = [
            jsonFromName("Calculator")
        ];
        
        appBlocker.applicationRule([], [], [], blacklistJson);
        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
        it("testAppsOnBlacklistIsBlockedNothingOnCoreOrGlobalOrWhitelist", function() {
        var blacklistJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        appBlocker.applicationRule([], [], [], blacklistJson);
        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    //Global+Whitelist
    
    it("testAppsOnGlobalORWhitelistIsAllowedNothingOnCoreOrBlacklist", function() {
        var globalJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        var whiteListJson = [
            jsonFromName("Gmail"),
            jsonFromName("Docs")
        ];
        
        appBlocker.applicationRule([], globalJson, whiteListJson, []);
        globalJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
        
        whiteListJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    //Core+Global+Whitelist
    
    it("testAppsOnGlobalORWhitelistIsAllowedNothingOnCoreOrBlacklist", function() {
        var coreJson = [
            jsonFromName("Earth"),
            jsonFromName("Postman")
        ];
        
        var globalJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        var whiteListJson = [
            jsonFromName("Gmail"),
            jsonFromName("Docs")
        ];
        
        appBlocker.applicationRule(coreJson, globalJson, whiteListJson, []);
        coreJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
        globalJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
        whiteListJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    //Global+Blacklist
    
    it("testAppsOnGlobalORBlacklistIsBlockedOnBlackListAllowedOnGlobalNothingOnCoreOrWhiteList", function() {
            var globalJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        var blacklistJson = [
            jsonFromName("Gmail"),
            jsonFromName("Docs")
        ];
        
        appBlocker.applicationRule([], globalJson, [], blacklistJson);

        globalJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    it("testGlobalListTrumpsBlackListWhenConflictingNothingOnCoreOrWhiteList", function() {
            var globalJson = [
            jsonFromName("Calculator"),
        ];
        
        var blacklistJson = [
            jsonFromName("Calculator"),
            jsonFromName("Docs")
        ];
        
        appBlocker.applicationRule([], globalJson, [], blacklistJson);

        expect(appBlocker.shouldHideApplication("Calculator", mockIdentifierFromName("Calculator"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Docs", mockIdentifierFromName("Docs"))).toBe(true);
    });
    
    //Core+Global+Blacklist
    
    it("testAppsOnCoreOrGlobalORBlacklistIsBlockedOnBlackListAllowedOnGlobalNothingOnWhiteList", function() {
        var coreJson = [
            jsonFromName("Slides"),
            jsonFromName("Spreadsheets")
        ];
        
        var globalJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        var blacklistJson = [
            jsonFromName("Gmail"),
            jsonFromName("Docs")
        ];
        
        appBlocker.applicationRule(coreJson, globalJson, [], blacklistJson);

        coreJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
        globalJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    it("testCoreOrGlobalListTrumpsBlackListWhenConflictingNothingOnWhiteList", function() {
        var coreJson = [
            jsonFromName("Slides")
        ];
            
        var globalJson = [
            jsonFromName("Calculator"),
        ];
        
        var blacklistJson = [
            jsonFromName("Calculator"),
            jsonFromName("Slides"),
            jsonFromName("Spreadsheets")
        ];
        
        appBlocker.applicationRule(coreJson, globalJson, [], blacklistJson);

        expect(appBlocker.shouldHideApplication("Slides", mockIdentifierFromName("Slides"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Calculator", mockIdentifierFromName("Calculator"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Spreadsheets", mockIdentifierFromName("Spreadsheets"))).toBe(true);
    });
    
    //Whitelist+Blacklist
    
    it("testAppsOnWhiteORBlacklistIsBlockedOnBlackListAllowedOnWhiteNothingOnCoreOrGlobal", function() {
        var whitelistJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        var blacklistJson = [
            jsonFromName("Gmail"),
            jsonFromName("Docs")
        ];
        
        appBlocker.applicationRule([], [], whitelistJson, blacklistJson);

        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });

        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    it("testWhiteListTrumpsBlackListWhenConflictingNothingOnCoreOrGlobal", function() {
        var whitelistJson = [
            jsonFromName("Calculator"),
        ];
        
        var blacklistJson = [
            jsonFromName("Calculator"),
            jsonFromName("Slides"),
        ];
        
        appBlocker.applicationRule([], [], whitelistJson, blacklistJson);

        expect(appBlocker.shouldHideApplication("Calculator", mockIdentifierFromName("Calculator"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Slides", mockIdentifierFromName("Slides"))).toBe(true);
    });
    
    //Global+Whitelist+Blacklist
    
    it("testAppsOnGlobalOrWhiteORBlacklistIsBlockedOnBlackListAllowedOnWhiteNothingOnCore", function() {
        var globalJson = [
            jsonFromName("Slides"),
            jsonFromName("Maps")
        ];
        
        var whitelistJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        var blacklistJson = [
            jsonFromName("Gmail"),
            jsonFromName("Docs")
        ];
        
        appBlocker.applicationRule([], globalJson, whitelistJson, blacklistJson);

        globalJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
        
        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });

        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    it("testGlobalOrWhiteListTrumpsBlackListWhenConflictingNothingOnCore", function() {
        var globalJson = [
            jsonFromName("Slides"),
        ];
        
        var whitelistJson = [
            jsonFromName("Calculator"),
        ];
        
        var blacklistJson = [
            jsonFromName("Calculator"),
            jsonFromName("Slides"),
            jsonFromName("Maps")
        ];
        
        appBlocker.applicationRule([], globalJson, whitelistJson, blacklistJson);

        expect(appBlocker.shouldHideApplication("Calculator", mockIdentifierFromName("Calculator"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Slides", mockIdentifierFromName("Slides"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Maps", mockIdentifierFromName("Maps"))).toBe(true);
    });
    
    //Core+Global+Whitelist+Blacklist
    
    it("testAppsOnCoreOrGlobalOrWhiteORBlacklistIsBlockedOnBlackListAllowedOnWhite", function() {
        var coreJson = [
            jsonFromName("Postman"),
            jsonFromName("AngryBirds")
        ];
        
        var globalJson = [
            jsonFromName("Slides"),
            jsonFromName("Maps")
        ];
        
        var whitelistJson = [
            jsonFromName("Calculator"),
            jsonFromName("Maps")
        ];
        
        var blacklistJson = [
            jsonFromName("Gmail"),
            jsonFromName("Docs")
        ];
        
        appBlocker.applicationRule(coreJson, globalJson, whitelistJson, blacklistJson);

        coreJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
        
        globalJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
        
        whitelistJson.forEach(function (json) {
            var expected = false;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });

        blacklistJson.forEach(function (json) {
            var expected = true;
            var actual = appBlocker.shouldHideApplication(nameFromJson(json), identifierFromJson(json));
            expect(expected).toBe(actual);
        });
    });
    
    it("testCoreOrGlobalOrWhiteListTrumpsBlackListWhenConflicting", function() {
        var coreJson = [
            jsonFromName("Postman")
        ];
        
        var globalJson = [
            jsonFromName("Slides"),
        ];
        
        var whitelistJson = [
            jsonFromName("Calculator"),
        ];
        
        var blacklistJson = [
            jsonFromName("Postman"),
            jsonFromName("Calculator"),
            jsonFromName("Slides"),
            jsonFromName("Maps")
        ];
        
        appBlocker.applicationRule(coreJson, globalJson, whitelistJson, blacklistJson);

        expect(appBlocker.shouldHideApplication("Postman", mockIdentifierFromName("Postman"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Calculator", mockIdentifierFromName("Calculator"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Slides", mockIdentifierFromName("Slides"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Maps", mockIdentifierFromName("Maps"))).toBe(true);
    });
    
    
    //Realworld
    
    it("testBlockGamesEnsureOthersAllowed", function() {
        var blacklistJson = [
            jsonFromName("AngryBirds"),
            jsonFromName("Bejeweled")
        ];
        
        appBlocker.applicationRule([], [], [], blacklistJson);

        expect(appBlocker.shouldHideApplication("AngryBirds", mockIdentifierFromName("AngryBirds"))).toBe(true);
        expect(appBlocker.shouldHideApplication("Bejeweled", mockIdentifierFromName("Bejeweled"))).toBe(true);
        expect(appBlocker.shouldHideApplication("Slides", mockIdentifierFromName("Slides"))).toBe(false);
    });
    
    it("emptylist allows everything", function() {
        appBlocker.applicationRule([], [], [], []);

        expect(appBlocker.shouldHideApplication("AngryBirds", mockIdentifierFromName("Postman"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Bejeweled", mockIdentifierFromName("Calculator"))).toBe(false);
        expect(appBlocker.shouldHideApplication("Slides", mockIdentifierFromName("Slides"))).toBe(false);
    });

    it("transition from one plan to another will reenable blocked extensions", function() {
        var allowlistJson = [
            jsonFromName("Calculator"),
            jsonFromName("Readability")
        ];
        var blocklistJson = [
            jsonFromName("AngryBirds"),
            jsonFromName("Bejeweled")
        ];

        
        appBlocker.applicationRule([], [], allowlistJson, []);
        //we have 3 extensions. AngryBirds, Hangouts, and Disabled
        chrome.management.getAll.calls.all()[0].args[0](
            [
                {name: "Hangouts", id: mockIdentifierFromName("Hangouts"), enabled: true},
                {name: "AngryBirds", id: mockIdentifierFromName("AngryBirds"), enabled: true},
                {name: "Disabled", id: mockIdentifierFromName("Disabled"), enabled: false}
            ]
        );
        expect(chrome.management.setEnabled).toHaveBeenCalledWith(mockIdentifierFromName("Hangouts"), false, jasmine.any(Function));
        expect(chrome.management.setEnabled).toHaveBeenCalledWith(mockIdentifierFromName("AngryBirds"), false, jasmine.any(Function));
        appBlocker.applicationRule([], [], [], blocklistJson);
        chrome.management.getAll.calls.all()[1].args[0](
            [
                {name: "Hangouts", id: mockIdentifierFromName("Hangouts"), enabled: false},
                {name: "AngryBirds", id: mockIdentifierFromName("AngryBirds"), enabled: false},
                {name: "Disabled", id: mockIdentifierFromName("Disabled"), enabled: false}
            ]
        );
        expect(chrome.management.setEnabled).toHaveBeenCalledWith(mockIdentifierFromName("Hangouts"), true, jasmine.any(Function));
        expect(chrome.management.setEnabled).not.toHaveBeenCalledWith(mockIdentifierFromName("AngryBirds"), true, jasmine.any(Function));
        expect(chrome.management.setEnabled).not.toHaveBeenCalledWith(mockIdentifierFromName("Disabled"), true, jasmine.any(Function));
        appBlocker.applicationRule([], [], [], []);
        //allow all just restores and counts on the setEnabled to be a noop
        //when already enabled
        // chrome.management.getAll.calls.all()[2].args[0](
        //     [
        //         {name: "Hangouts", id: mockIdentifierFromName("Hangouts"), enabled: true},
        //         {name: "AngryBirds", id: mockIdentifierFromName("AngryBirds"), enabled: false},
        //         {name: "Disabled", id: mockIdentifierFromName("Disabled"), enabled: false}
        //     ]
        // );
        expect(chrome.management.setEnabled).toHaveBeenCalledWith(mockIdentifierFromName("AngryBirds"), true, jasmine.any(Function));
        expect(chrome.management.setEnabled).not.toHaveBeenCalledWith(mockIdentifierFromName("Disabled"), true, jasmine.any(Function));
        
    });
    
    it("case insensitive", function() {
        appBlocker.applicationRule([], [], [], [jsonFromName("Bejeweled")]);

        expect(appBlocker.shouldHideApplication("Bejeweled", mockIdentifierFromName("Bejeweled"))).toBe(true);
        expect(appBlocker.shouldHideApplication("BeJeWeled", mockIdentifierFromName("Bejeweled"))).toBe(true);
        expect(appBlocker.shouldHideApplication("BEJEWELED", mockIdentifierFromName("Bejeweled"))).toBe(true);
        expect(appBlocker.shouldHideApplication("bejeweled", mockIdentifierFromName("Bejeweled"))).toBe(true);
    });
    
    it("matches on identifier even if renamed", function() {
        var json = jsonFromNameAndIdentifier("Chrome Remote Desktop", "gbchcmhmhahfdphkhkmpfmihenigjmpp");
        appBlocker.applicationRule([], [], [], [json]);
        
        expect(appBlocker.shouldHideApplication("Remote Desktop", "gbchcmhmhahfdphkhkmpfmihenigjmpp")).toBe(true);
    });
    
    it("fallsback to name if identifier is undefined", function() {
        var json = jsonFromNameAndIdentifier("Chrome Remote Desktop", "gbchcmhmhahfdphkhkmpfmihenigjmpp");
        appBlocker.applicationRule([], [], [], [json]);
        
        expect(appBlocker.shouldHideApplication("Chrome Remote Desktop")).toBe(true);
        expect(appBlocker.shouldHideApplication("Chrome Remote Desktop", false)).toBe(true);
    });
    
    // The school had blacklist that blocked
    // bundleIdentifier":"knipolnnllmklapflnccelgolnpehhpl","localizedName":"Hangouts Extension"
    // Chrome Reports
    // bundleIdentifier":"knipolnnllmklapflnccelgolnpehhpl","localizedName":"Google Hangouts"
    //
    it("HangoutsCorrectBundleIdentifierButWrongName", function () {
        var json = jsonFromNameAndIdentifier("Hangouts Extension", "knipolnnllmklapflnccelgolnpehhpl");
        appBlocker.applicationRule([], [], [], [json]);
        
        expect(appBlocker.shouldHideApplication("Google Hangouts", "knipolnnllmklapflnccelgolnpehhpl")).toBe(true);
    });
    
    it("isWhitelist", function() {
        var coreJson = [
                jsonFromName("Postman")
            ],
            globalJson = [
                jsonFromName("Slides"),
            ],
            whitelistJson = [
                jsonFromName("Calculator"),
            ],
            blacklistJson = [
                jsonFromName("Maps")
            ];
        
        appBlocker.applicationRule([], [], [], []);
        expect(appBlocker.isWhitelist()).toBe(false);
        appBlocker.applicationRule(coreJson, [], [], []);
        expect(appBlocker.isWhitelist()).toBe(false);
        appBlocker.applicationRule([], globalJson, [], []);
        expect(appBlocker.isWhitelist()).toBe(false);
        appBlocker.applicationRule([], [], whitelistJson, []);
        expect(appBlocker.isWhitelist()).toBe(true);
        appBlocker.applicationRule([], [], [], blacklistJson);
        expect(appBlocker.isWhitelist()).toBe(false);
        
        appBlocker.applicationRule(coreJson, globalJson, [], []);
        expect(appBlocker.isWhitelist()).toBe(false);
        appBlocker.applicationRule(coreJson, [], whitelistJson, []);
        expect(appBlocker.isWhitelist()).toBe(true);
        appBlocker.applicationRule(coreJson, [], [], blacklistJson);
        expect(appBlocker.isWhitelist()).toBe(false);
        
        appBlocker.applicationRule([], globalJson, whitelistJson, []);
        expect(appBlocker.isWhitelist()).toBe(true);
        appBlocker.applicationRule([], globalJson, [], blacklistJson);
        expect(appBlocker.isWhitelist()).toBe(false);
        
        appBlocker.applicationRule([], [], whitelistJson, blacklistJson);
        expect(appBlocker.isWhitelist()).toBe(true);
        
        appBlocker.applicationRule(coreJson, globalJson, whitelistJson, []);
        expect(appBlocker.isWhitelist()).toBe(true);
        appBlocker.applicationRule(coreJson, globalJson, [], blacklistJson);
        expect(appBlocker.isWhitelist()).toBe(false);
        
        appBlocker.applicationRule(coreJson, globalJson, whitelistJson, blacklistJson);
        expect(appBlocker.isWhitelist()).toBe(true);
    });
    
    it("isBlacklist", function() {
        var coreJson = [
                jsonFromName("Postman")
            ],
            globalJson = [
                jsonFromName("Slides"),
            ],
            whitelistJson = [
                jsonFromName("Calculator"),
            ],
            blacklistJson = [
                jsonFromName("Maps")
            ];
        
        appBlocker.applicationRule([], [], [], []);
        expect(appBlocker.isBlacklist()).toBe(false);
        appBlocker.applicationRule(coreJson, [], [], []);
        expect(appBlocker.isBlacklist()).toBe(false);
        appBlocker.applicationRule([], globalJson, [], []);
        expect(appBlocker.isBlacklist()).toBe(false);
        appBlocker.applicationRule([], [], whitelistJson, []);
        expect(appBlocker.isBlacklist()).toBe(false);
        appBlocker.applicationRule([], [], [], blacklistJson);
        expect(appBlocker.isBlacklist()).toBe(true);
        
        appBlocker.applicationRule(coreJson, globalJson, [], []);
        expect(appBlocker.isBlacklist()).toBe(false);
        appBlocker.applicationRule(coreJson, [], whitelistJson, []);
        expect(appBlocker.isBlacklist()).toBe(false);
        appBlocker.applicationRule(coreJson, [], [], blacklistJson);
        expect(appBlocker.isBlacklist()).toBe(true);
        
        appBlocker.applicationRule([], globalJson, whitelistJson, []);
        expect(appBlocker.isBlacklist()).toBe(false);
        appBlocker.applicationRule([], globalJson, [], blacklistJson);
        expect(appBlocker.isBlacklist()).toBe(true);
        
        appBlocker.applicationRule([], [], whitelistJson, blacklistJson);
        expect(appBlocker.isBlacklist()).toBe(false);
        
        appBlocker.applicationRule(coreJson, globalJson, whitelistJson, []);
        expect(appBlocker.isBlacklist()).toBe(false);
        appBlocker.applicationRule(coreJson, globalJson, [], blacklistJson);
        expect(appBlocker.isBlacklist()).toBe(true);
        
        appBlocker.applicationRule(coreJson, globalJson, whitelistJson, blacklistJson);
        expect(appBlocker.isBlacklist()).toBe(false);
    });
    
    it("isAllowAll", function() {
        var coreJson = [
                jsonFromName("Postman")
            ],
            globalJson = [
                jsonFromName("Slides"),
            ],
            whitelistJson = [
                jsonFromName("Calculator"),
            ],
            blacklistJson = [
                jsonFromName("Maps")
            ];
        
        appBlocker.applicationRule([], [], [], []);
        expect(appBlocker.isAllowAll()).toBe(true);
        appBlocker.applicationRule(coreJson, [], [], []);
        expect(appBlocker.isAllowAll()).toBe(true);
        appBlocker.applicationRule([], globalJson, [], []);
        expect(appBlocker.isAllowAll()).toBe(true);
        appBlocker.applicationRule([], [], whitelistJson, []);
        expect(appBlocker.isAllowAll()).toBe(false);
        appBlocker.applicationRule([], [], [], blacklistJson);
        expect(appBlocker.isAllowAll()).toBe(false);
        
        appBlocker.applicationRule(coreJson, globalJson, [], []);
        expect(appBlocker.isAllowAll()).toBe(true);
        appBlocker.applicationRule(coreJson, [], whitelistJson, []);
        expect(appBlocker.isAllowAll()).toBe(false);
        appBlocker.applicationRule(coreJson, [], [], blacklistJson);
        expect(appBlocker.isAllowAll()).toBe(false);
        
        appBlocker.applicationRule([], globalJson, whitelistJson, []);
        expect(appBlocker.isAllowAll()).toBe(false);
        appBlocker.applicationRule([], globalJson, [], blacklistJson);
        expect(appBlocker.isAllowAll()).toBe(false);
        
        appBlocker.applicationRule([], [], whitelistJson, blacklistJson);
        expect(appBlocker.isAllowAll()).toBe(false);
        
        appBlocker.applicationRule(coreJson, globalJson, whitelistJson, []);
        expect(appBlocker.isAllowAll()).toBe(false);
        appBlocker.applicationRule(coreJson, globalJson, [], blacklistJson);
        expect(appBlocker.isAllowAll()).toBe(false);
        
        appBlocker.applicationRule(coreJson, globalJson, whitelistJson, blacklistJson);
        expect(appBlocker.isAllowAll()).toBe(false);
    });
    describe("apps", function () {
        beforeEach(function () {
            appBlocker.subscribe();
        });
        it("installed apps are hidden if should be hidden", function() {
            spyOn(appBlocker, 'shouldHideApplication').and.returnValue(true);
            spyOn(appBlocker, 'hideApplication');
            browserEvents._onExtensionInstalledEvent({ name: 'yolo', id: 'theidentifier' });
            expect(appBlocker.hideApplication).toHaveBeenCalled();
        });
        
        it("installed apps are not hidden if allowed", function() {
            spyOn(appBlocker, 'shouldHideApplication').and.returnValue(false);
            spyOn(appBlocker, 'hideApplication');
            
            browserEvents._onExtensionInstalledEvent({ name: 'yolo', id: 'theidentifier' });
            expect(appBlocker.hideApplication).not.toHaveBeenCalled();
        });
        
        it("enabled apps are hidden if should be hidden", function() {
            spyOn(appBlocker, 'shouldHideApplication').and.returnValue(true);
            spyOn(appBlocker, 'hideApplication');
            
            browserEvents._onExtensionEnabledEvent({ name: 'yolo', id: 'theidentifier' });
            expect(appBlocker.hideApplication).toHaveBeenCalled();
        });
        
        it("enabled apps are not hidden if allowed", function() {
            spyOn(appBlocker, 'shouldHideApplication').and.returnValue(false);
            spyOn(appBlocker, 'hideApplication');
            
            browserEvents._onExtensionEnabledEvent({ name: 'yolo', id: 'theidentifier' });
            expect(appBlocker.hideApplication).not.toHaveBeenCalled();
        });
    });

    describe("lifecycleEventHandler", function () {
        var coreJson = [
            jsonFromName("Calculator")
        ];

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
            appBlocker.startFromInactive(null);//no state
            expect(appBlocker._installedExtensions).toEqual([]);
        });

        it("sets filtered and reverted with activationSTate", async function () {
            appBlocker.startFromInactive({
                installedExtensions: [
                    { name: "2048", id: "12233122324", enabled: true},
                    { name: "grammarly", id: "3434343343", enabled: true},
                    { name: "evilthing", id: "99999", enabled: false}
                ]
            });
            expect(appBlocker._installedExtensions).toEqual([
                { name: "2048", id: "12233122324", enabled: true},
                { name: "grammarly", id: "3434343343", enabled: true},
                { name: "evilthing", id: "99999", enabled: false}
            ]);
        });

        it("saves extensions on applicationrule, install,uninstlal", function () {
            appBlocker.applicationRule([], [], coreJson, []);
            chrome.management.getAll.calls.all()[0].args[0](
                [
                    {name: "Hangouts", id: mockIdentifierFromName("Hangouts"), enabled: true},
                    {name: "Disabled", id: mockIdentifierFromName("Disabled"), enabled: false}
                ]
            );
            expect(lifecycleEventHandler.setClassroomState).toHaveBeenCalledWith("appBlock", {
                installedExtensions: [
                    {name: "Hangouts", id: mockIdentifierFromName("Hangouts"), enabled: true},
                    {name: "Disabled", id: mockIdentifierFromName("Disabled"), enabled: false}
                ]
            });
            lifecycleEventHandler.setClassroomState.calls.reset();
            appBlocker._onExtensionInstalledEvent(
                {name: "AngryBirds", id: mockIdentifierFromName("AngryBirds"), enabled: true}
            );
            expect(lifecycleEventHandler.setClassroomState).toHaveBeenCalledWith("appBlock", {
                installedExtensions: [
                    {name: "Hangouts", id: mockIdentifierFromName("Hangouts"), enabled: true},
                    {name: "Disabled", id: mockIdentifierFromName("Disabled"), enabled: false},
                    {name: "AngryBirds", id: mockIdentifierFromName("AngryBirds"), enabled: true}
                ]
            });
            lifecycleEventHandler.setClassroomState.calls.reset();
            appBlocker._onExtensionUninstalledEvent(mockIdentifierFromName("Disabled"));
            expect(lifecycleEventHandler.setClassroomState).toHaveBeenCalledWith("appBlock", {
                installedExtensions: [
                    {name: "Hangouts", id: mockIdentifierFromName("Hangouts"), enabled: true},
                    {name: "AngryBirds", id: mockIdentifierFromName("AngryBirds"), enabled: true}
                ]
            });
            lifecycleEventHandler.setClassroomState.calls.reset();


            appBlocker.applicationRule([], [], [], []);
            expect(lifecycleEventHandler.setClassroomState).toHaveBeenCalledWith("appBlock", {
                installedExtensions: []
            });

        });
    });
});

