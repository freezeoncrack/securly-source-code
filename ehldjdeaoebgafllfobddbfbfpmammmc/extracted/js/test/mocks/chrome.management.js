define([], function(){

    if(!window.chrome.management){
        window.chrome.management = jasmine.createSpyObj('window.chrome.management', ['onInstalled', 'onUninstalled', 'onEnabled', 'onDisabled', 'getAll']);
        window.chrome.management.onInstalled = jasmine.createSpyObj('window.chrome.management.onInstalled', ['addListener', 'removeListener']);
        window.chrome.management.onUninstalled = jasmine.createSpyObj('window.chrome.management.onUninstalled', ['addListener', 'removeListener']);
        window.chrome.management.onEnabled = jasmine.createSpyObj('window.chrome.management.onEnabled', ['addListener', 'removeListener']);
        window.chrome.management.onDisabled = jasmine.createSpyObj('window.chrome.management.onDisabled', ['addListener', 'removeListener']);
    }
    return window.chrome.management;
});