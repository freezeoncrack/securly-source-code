define([], function() {
    // Actual chrome instance, if it was available.
    var chrome;

    // Define the chrome mock.
    var mock = {
        // Setup the mock.
        useMock: function() {
            if (window.chrome && window.chrome !== this) {
                chrome = window.chrome;
                window.chrome = this;
            }
            // Mock each chrome section.
            mockManagement(this);
            mockRuntime(this);
            mockTabs(this);
            mockWebNavigation(this);
            mockWindows(this);
        },

        // Reset the mock.
        resetMock: function() {
            if (window.chrome && window.chrome === this) {
                window.chrome = chrome;
                chrome = undefined;
            }
            // Delete all the mock references.
            delete this.management;
            delete this.runtime;
            delete this.tabs;
            delete this.webNavigation;
            delete this.windows;
        }
    };

    // Helper to define spies for add and remove listener.
    function spyListener(mock, region, name) {
        mock[region][name] = jasmine.createSpyObj(
            'chrome.' + region + '.' + name,
            ['addListener', 'removeListener']);
    }

    // Helper to spy on multiple listeners.
    function spyListeners(mock, region, names) {
        names.forEach(function(name) { spyListener(mock, region, name); });
    }

    //
    // Mock setup functions.
    //

    // Define the management mock.
    function mockManagement(mock) {
        mock.management = jasmine.createSpyObj('chrome.management', ['getAll', 'setEnabled']);
        spyListeners(mock, 'management',
            ['onInstalled', 'onUninstalled', 'onEnabled', 'onDisabled']);
    }

    // Define the runtime mock.
    function mockRuntime(mock) {
        mock.runtime = jasmine.createSpyObj('chrome.runtime',
            ['getPlatformInfo', 'sendMessage', 'reload', 'getManifest']);
        spyListeners(mock, 'runtime',
            ['onMessage', 'onUpdateAvailable', 'onSuspend',
            'onSuspendCanceled', 'onRestartRequired']);
        mock.runtime.id = "kmpjlilnemjciohjckjadmgmicoldglf";
    }

    // Define the tabs mock.
    function mockTabs(mock) {
        mock.tabs = jasmine.createSpyObj('chrome.tabs',
            ['query', 'remove', 'captureVisibleTab', 'update', 'get', 'discard']);
        spyListeners(mock, 'tabs', ['onCreated', 'onRemoved', 'onHighlighted']);
    }

    // Define the web navigation mock.
    function mockWebNavigation(mock) {
        mock.webNavigation = {};
        spyListeners(mock, 'webNavigation', ['onCommitted', 'onCompleted']);
    }

    // Define the windows mock.
    function mockWindows(mock) {
        mock.windows = jasmine.createSpyObj('chrome.windows',
            ['create', 'remove', 'get', 'getCurrent', 'getLastFocused', 'getAll', 'update']);
        spyListeners(mock, 'windows', ['onFocusChanged', 'onRemoved']);
    }

    return mock;
});
