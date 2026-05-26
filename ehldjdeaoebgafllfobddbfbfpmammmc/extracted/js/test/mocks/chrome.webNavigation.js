define([], function(){

    if(!window.chrome.webNavigation){
        window.chrome.webNavigation = jasmine.createSpyObj('window.chrome.webNavigation', ['onCommitted', 'onCompleted']);
        window.chrome.webNavigation.onCommitted = jasmine.createSpyObj('window.chrome.webNavigation.onCommitted', ['addListener', 'removeListener']);
        window.chrome.webNavigation.onCompleted = jasmine.createSpyObj('window.chrome.webNavigation.onCompleted', ['addListener', 'removeListener']);
    }
    return window.chrome.webNavigation;
});