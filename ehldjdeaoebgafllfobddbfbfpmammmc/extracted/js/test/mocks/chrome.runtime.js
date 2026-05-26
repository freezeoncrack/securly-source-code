define([], function(){

    if(!window.chrome.runtime || !window.chrome.runtime.getPlatformInfo){
        window.chrome.runtime = jasmine.createSpyObj('window.chrome.runtime', ['getPlatformInfo', 'onMessage', 'sendMessage', 'reload', 'onUpdateAvailable', 'onSuspendCanceled', 'onSuspend', 'onRestartRequired', 'getManifest']);
        window.chrome.runtime.onMessage = jasmine.createSpyObj('window.chrome.runtime.onMessage', ['addListener']);
    }
    return window.chrome.runtime;
}); 