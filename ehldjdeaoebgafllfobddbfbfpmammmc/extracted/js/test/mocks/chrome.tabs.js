define([], function(){

    if(!window.chrome.tabs){
        window.chrome.tabs = jasmine.createSpyObj('window.chrome.tabs', ['onCreated', 'onRemoved', 'onHighlighted', 'query', 'remove', 'captureVisibleTab']);
        window.chrome.tabs.onCreated = jasmine.createSpyObj('window.chrome.tabs.onCreated', ['addListener', 'removeListener']);
        window.chrome.tabs.onRemoved = jasmine.createSpyObj('window.chrome.tabs.onRemoved', ['addListener', 'removeListener']);
        window.chrome.tabs.onHighlighted = jasmine.createSpyObj('window.chrome.tabs.onHighlighted', ['addListener', 'removeListener']);
    }
    return window.chrome.tabs;
});
