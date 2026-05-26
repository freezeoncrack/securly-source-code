define([], function(){

    if(!window.chrome.windows) {
        window.chrome.windows = jasmine.createSpyObj('window.chrome.windows', ['create', 'remove', 'getLastFocused', 'get', 'getCurrent', 'getAll']);
        window.chrome.windows.onFocusChanged = jasmine.createSpyObj('window.chrome.windows.onFocusChanged', ['addListener', 'removeListener']);
        window.chrome.windows.onRemoved = jasmine.createSpyObj('window.chrome.windows.onRemoved', ['addListener', 'removeListener']);
    }

    return window.chrome.windows;
});
