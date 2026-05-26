define([], function(){

    if(!window.chrome.identity){
        window.chrome.identity = jasmine.createSpyObj('window.chrome.identity', ["getProfileUserInfo", "removeCachedAuthToken", "getAuthToken", "getAccounts"]);
    }
    return window.chrome.identity;
});