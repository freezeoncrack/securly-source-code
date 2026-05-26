import browserEvents from "/js/mjs/chromeOsServices/browserEvents.js";
export default {
    start:function () {
        var backgroundUrl = chrome.runtime.getURL('background.html');
        browserEvents.register();
        browserEvents.on(browserEvents.TABCHANGE, function (tab){
            if (tab.url === backgroundUrl) {
                chrome.tabs.remove(tab.id);//is this extreme? yes. does it avoid the "why is this tab blocked when we're not blocking" issue? also yes
            }
        });
    }
};