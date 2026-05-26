
import directControl from "/js/mjs/cabra/helper/directControl.js";
import chrome  from "/test/mocks/chrome.js";
import logger from "/test/mocks/logger.js";
import browserEvents from "/js/mjs/chromeOsServices/browserEvents.js";
import _ from "/js/lib/underscore.js";

function nextTick(){ return deferred.get().resolve();}

async function waitFor(func){
    while(!func()){
        await deferred.get().resolve();//tight loop
    }
}

describe("directControl", function () {
    beforeEach(function () {
        chrome.useMock();
        logger.useMock();
        chrome.runtime.lastError = null;//in case it's been reset
        spyOn(_, "delay");
        browserEvents._resetForTest();

    });
    describe("getTabs", function () {
        it("parses multiple windows", async function () {
            var tabsResult = directControl.getTabs();
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 1,
                        focused: true,
                        tabs:[{
                            id: 100, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/muppets",
                            title: "muppets"
                        }, {
                            id: 101, 
                            url: "https://www.khanacademy.org/cs",
                            title: "cs"
                        }]
                    },
                    {
                        id: 2,
                        focused: false,
                        tabs:[{
                            id: 102, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/harmony",
                            title: "harmony"
                        }, {
                            id: 103, 
                            url: "https://www.ixl.com",
                            title: "ixl"
                        }]
                    }
                ]
            );

            var tabs = await tabsResult;
            expect(tabs.length).toEqual(4);
            expect(tabs[0]).toEqual({
                window_id: 1,
                tab_id: 100, 
                url: "https://www.youtube.com/channel/muppets",
                title: "muppets",
                active: "active-focused",
                audible: "audible"
            });
            expect(tabs[1]).toEqual({
                window_id: 1,
                tab_id: 101, 
                url: "https://www.khanacademy.org/cs",
                title: "cs"
            });
            expect(tabs[2]).toEqual({
                window_id: 2,
                tab_id: 102, 
                url: "https://www.youtube.com/channel/harmony",
                title: "harmony",
                audible: "audible",
                active: "active"
            });
            expect(tabs[3]).toEqual({
                window_id: 2,
                tab_id: 103, 
                url: "https://www.ixl.com",
                title: "ixl"
            });
        });

        it("parses when the second window is focused", async function () {
            var tabsResult = directControl.getTabs();
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 1,
                        focused: false,
                        tabs:[{
                            id: 100, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/muppets",
                            title: "muppets"
                        }, {
                            id: 101, 
                            url: "https://www.khanacademy.org/cs",
                            title: "cs"
                        }]
                    },
                    {
                        id: 2,
                        focused: true,
                        tabs:[{
                            id: 102, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/harmony",
                            title: "harmony"
                        }, {
                            id: 103, 
                            url: "https://www.ixl.com",
                            title: "ixl"
                        }]
                    }
                ]
            );
            var tabs = await tabsResult;

            expect(tabs.length).toEqual(4);
            expect(tabs[0]).toEqual({
                window_id: 1,
                tab_id: 100, 
                url: "https://www.youtube.com/channel/muppets",
                title: "muppets",
                active: "active",
                audible: "audible"
            });
            expect(tabs[1]).toEqual({
                window_id: 1,
                tab_id: 101, 
                url: "https://www.khanacademy.org/cs",
                title: "cs"
            });
            expect(tabs[2]).toEqual({
                window_id: 2,
                tab_id: 102, 
                url: "https://www.youtube.com/channel/harmony",
                title: "harmony",
                audible: "audible",
                active: "active-focused"
            });
            expect(tabs[3]).toEqual({
                window_id: 2,
                tab_id: 103, 
                url: "https://www.ixl.com",
                title: "ixl"
            });
        });

        it("handles no tabs open at all", async function () {
            var tabsResult = directControl.getTabs();
            chrome.windows.getAll.calls.mostRecent().args[1](
                []
            );

            var tabs = await tabsResult;
            expect(tabs.length).toEqual(0);
        });

        it("rejects on a lastError", async function () {
            var tabsResult = directControl.getTabs();
            chrome.runtime.lastError = { message: "lolwut"};
            chrome.windows.getAll.calls.mostRecent().args[1]();
            try{
                await tabsResult;
                fail("should have rejected");
            }catch{
                //yay
            }
        });

        it("strips out our app tabs", async function () {
            browserEvents.lastGoodWindow = 5;
            var tabsResult = directControl.getTabs();
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 1,
                        focused: true,
                        tabs:[{
                            id: 100, 
                            active: true, 
                            audible: false,
                            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html",
                            title: "Attention"
                        }]
                    },            
                    {
                        id: 2,
                        focused: false,
                        tabs:[{
                            id: 102, 
                            active: true, 
                            audible: false,
                            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html",
                            title: "stripme"
                        }]
                    },
                    {
                        id: 3,
                        focused: false,
                        tabs:[{
                            id: 102, 
                            active: true, 
                            audible: false,
                            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html",
                            title: "stripme"
                        }]
                    },
                    {
                        id: 4,
                        focused: false,
                        tabs:[{
                            id: 102, 
                            active: true, 
                            audible: false,
                            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html",
                            title: "stripme"
                        }]
                    },
                    {
                        id: 5,
                        focused: false,
                        tabs:[{
                            id: 102, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/harmony",
                            title: "harmony"
                        }, {
                            id: 103, 
                            url: "https://www.ixl.com",
                            title: "ixl"
                        }]
                    },
                    //and also knows about pendingUrls
                    {
                        id: 11,
                        focused: true,
                        tabs:[{
                            id: 110, 
                            active: true, 
                            audible: false,
                            url: "",
                            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html",
                            title: "Attention"
                        }]
                    },            
                    {
                        id: 12,
                        focused: false,
                        tabs:[{
                            id: 112, 
                            active: true, 
                            audible: false,
                            url: "",
                            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html",
                            title: "stripme"
                        }]
                    },
                    {
                        id: 13,
                        focused: false,
                        tabs:[{
                            id: 112, 
                            active: true, 
                            audible: false,
                            url: "",
                            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html",
                            title: "stripme"
                        }]
                    },
                    {
                        id: 14,
                        focused: false,
                        tabs:[{
                            id: 112, 
                            active: true, 
                            audible: false,
                            url: "",
                            pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html",
                            title: "stripme"
                        }]
                    }
                ]
            );

            var tabs = await tabsResult;
            expect(tabs.length).toEqual(2);
            expect(tabs[0]).toEqual({
                window_id: 5,
                tab_id: 102, 
                url: "https://www.youtube.com/channel/harmony",
                title: "harmony",
                audible: "audible",
                active: "active-focused"
            });
            expect(tabs[1]).toEqual({
                window_id: 5,
                tab_id: 103, 
                url: "https://www.ixl.com",
                title: "ixl"
            });
        });
        it("keeps the lastwindow active if unlocked messages is up on top", async function () {
            browserEvents.lastGoodWindow = 5;
            var tabsResult = directControl.getTabs();
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 2,
                        focused: true,
                        tabs:[{
                            id: 102, 
                            active: true, 
                            audible: false,
                            url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html",
                            title: "stripme"
                        }]
                    },
                    {
                        id: 5,
                        focused: false,
                        tabs:[{
                            id: 102, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/harmony",
                            title: "harmony"
                        }, {
                            id: 103, 
                            url: "https://www.ixl.com",
                            title: "ixl"
                        }]
                    }
                ]
            );

            var tabs = await tabsResult;
            expect(tabs.length).toEqual(2);
            expect(tabs[0]).toEqual({
                window_id: 5,
                tab_id: 102, 
                url: "https://www.youtube.com/channel/harmony",
                title: "harmony",
                audible: "audible",
                active: "active-focused"
            });
            expect(tabs[1]).toEqual({
                window_id: 5,
                tab_id: 103, 
                url: "https://www.ixl.com",
                title: "ixl"
            });
        });


    });
    describe("closeTab", function () {
        it("removes and indicates new active tab", async function () {
           
           var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2]({
                focused: true,
                id: 4, 
                tabs:[{
                    id: 101, 
                    active: true, 
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            });

            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 4,
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });

        it("removes and indicates new active tab of a background window", async function () {
           
           var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2]({
                focused: false, 
                id: 4,
                tabs:[{
                    id: 101, 
                    active: true, 
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            });
            
            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 4,
                result_tabid: 101,
                result_active: "active",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });

        it("removes and indicates the window was closed and the new active window", async function () {
           
           var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.runtime.lastError = {message:"No window with id: 4."};
            chrome.windows.get.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;//next call will be fine
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 2,
                        focused: false,
                        tabs:[{
                            id: 103, 
                            active: true, 
                            audible: true,
                            url: "https://www.dontfind.com",
                            title: "dontfind"
                        }]
                    },{
                        id: 1,
                        focused: true,
                        tabs:[{
                            id: 101, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/muppets",
                            title: "muppets"
                        }]
                    }
                ]
            );
            
            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 1,//this communicates that the window was closed
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });

        it("removes and indicates no windows are open anymore", async function () {
           
           var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.runtime.lastError = {message:"No window with id: 4."};
            chrome.windows.get.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;//next call will be fine
            chrome.windows.getAll.calls.mostRecent().args[1](
                []
            );
            
            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_active: "unknown",//we'll be real, we dont know whats active here
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });

        it("removes and tries to focus the first window when window manager defaults to an out of browser state (lastError)", async function () {
            //todo: test this scenario to make sure we dont send us out of browser unnecessarily
           
           var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.runtime.lastError = {message:"No window with id: 4."};
            chrome.windows.get.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;//next call will be fine
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 1,
                        focused: false,
                        tabs:[{
                            id: 101, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/muppets",
                            title: "muppets"
                        }]
                    },//just gonna pick the first since what else do we say
                    {
                        id: 2,
                        focused: false,
                        tabs:[{
                            id: 103, 
                            active: true, 
                            audible: true,
                            url: "https://www.dontfind.com",
                            title: "dontfind"
                        }]
                    },
                ]
            );
            expect(chrome.windows.update).toHaveBeenCalledWith(1, {focused:true}, jasmine.any(Function));
            chrome.windows.update.calls.mostRecent().args[2]();
            
            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 1,//this communicates that the window was closed
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
    });

        it("removes and tries to focus the first window when window manager defaults to an out of browser state (empty tabs)", async function () {
            //todo: test this scenario to make sure we dont send us out of browser unnecessarily
           
           var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2]({
                tabs: []//this seems to be the more likely scenario now instead of a lastError
            });
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 1,
                        focused: false,
                        tabs:[{
                            id: 101, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/muppets",
                            title: "muppets"
                        }]
                    },//just gonna pick the first since what else do we say
                    {
                        id: 2,
                        focused: false,
                        tabs:[{
                            id: 103, 
                            active: true, 
                            audible: true,
                            url: "https://www.dontfind.com",
                            title: "dontfind"
                        }]
                    },
                ]
            );
            expect(chrome.windows.update).toHaveBeenCalledWith(1, {focused:true}, jasmine.any(Function));
            chrome.windows.update.calls.mostRecent().args[2]();
            
            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 1,//this communicates that the window was closed
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });

        it("removes and indicates the active window is not focused if attempt fails", async function () {
            //todo: test this scenario to make sure we dont send us out of browser unnecessarily
           
           var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.runtime.lastError = {message:"No window with id: 4."};
            chrome.windows.get.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;//next call will be fine
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 1,
                        focused: false,
                        tabs:[{
                            id: 101, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/muppets",
                            title: "muppets"
                        }]
                    },//just gonna pick the first since what else do we say
                    {
                        id: 2,
                        focused: false,
                        tabs:[{
                            id: 103, 
                            active: true, 
                            audible: true,
                            url: "https://www.dontfind.com",
                            title: "dontfind"
                        }]
                    },
                ]
            );
            chrome.runtime.lastError = { message: "AHHHH THE BURNING"};
            chrome.windows.update.calls.mostRecent().args[2]();
            
            var result = await cmdResult;
        
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 1,//this communicates that the window was closed
                result_tabid: 101,
                result_active: "active",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });

        it("indicates the tab was already closed after get", async function () {
           
           var cmdResult = directControl.closeTab(4, 100);
            //wasnt closed at this point
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            //but was here. so it goes
            chrome.runtime.lastError = {message:"No tab with id: 100."};
            chrome.tabs.remove.calls.mostRecent().args[1]();
            //we will treat this error just like a success!
            chrome.runtime.lastError = null;//next call will be fine
            chrome.windows.get.calls.mostRecent().args[2]({
                focused: true,
                id: 4, 
                tabs:[{
                    id: 101, 
                    active: true, 
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            });
            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 4,
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });

        it("indicates the tab was already closed at start", async function () {
           
           var cmdResult = directControl.closeTab(4, 100);
            chrome.runtime.lastError = {message:"No tab with id: 100."};
            chrome.tabs.get.calls.mostRecent().args[1]();
            chrome.runtime.lastError = {message:"No tab with id: 100."};
            chrome.tabs.remove.calls.mostRecent().args[1]();
            //we will treat this error just like a success!
            chrome.runtime.lastError = null;//next call will be fine
            chrome.windows.get.calls.mostRecent().args[2]({
                focused: true,
                id: 4, 
                tabs:[{
                    id: 101, 
                    active: true, 
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            });
            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 4,
                result_tabid: 101,
                result_active: "active-focused",
                target_url: undefined,
                target_title: undefined
                //dont know the url/title bc the tab was already closed
            });
        });

        it("errors when theres an error on remove", async function () {
            var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.runtime.lastError = {message:"egads! what?"};
            chrome.tabs.remove.calls.mostRecent().args[1]();
            try{
                await cmdResult;
                fail("should have thrown");
            } catch{
                //yay
            }
        });

        it("errors when theres an error on tab get", async function () {
            var cmdResult = directControl.closeTab(4, 100);
            chrome.runtime.lastError = {message:"egads! what?"};
            chrome.tabs.get.calls.mostRecent().args[1]();
            try{
                await cmdResult;
                fail("should have rejected");
            } catch{
                //yay
            }
        });

        it("errors when there's an error when trying to get", async function () {
            var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.runtime.lastError = { message: "AHH THE BURNING"};                    
            chrome.windows.get.calls.mostRecent().args[2]();

            try {
                await cmdResult
                fail("should have rejected");
            } catch{
                //yay
            }
        });

        it("errors when there's a chrome api bug where no active tab exists in get", async function () {
            var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2]({
                focused: true,
                id: 4, 
                tabs:[{
                    id: 101, 
                    active: false, //weird, there are tabs but none are active?
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            });
            try {
                await cmdResult
                fail("should have rejected");
            } catch{
                //yay
            }        });

        it("errors when there's an invalid windowid", async function () {
            var cmdResult = directControl.closeTab("SYNTHETIC_WINDOW", 100);
            chrome.windows.get.and.callFake(function (){
                throw new Error("No matching signature");//there more to this but the main idea
            });
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            try{
                await cmdResult;
                fail("should have rejected");
            } catch {
                //yay
            }
        });
        it("skips windowid -1 in the process to avoid potential crashes", async function () {
            chrome.windows.get.and.callFake(function (windowId, params, callback){
                if (windowId === -1){
                    throw new Error("WE WERENT SUPPOSED TO DO THIS");//today it doesnt do this, but lets just be paranoid 
                }
            });
           
           var cmdResult = directControl.closeTab(-1, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook",
                windowId: 4
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.runtime.lastError = {message:"No window with id: 4."};
            chrome.windows.get.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;//next call will be fine
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 2,
                        focused: false,
                        tabs:[{
                            id: 103, 
                            active: true, 
                            audible: true,
                            url: "https://www.dontfind.com",
                            title: "dontfind"
                        }]
                    },{
                        id: 1,
                        focused: true,
                        tabs:[{
                            id: 101, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/muppets",
                            title: "muppets"
                        }]
                    }
                ]
            );
            
            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 1,//this communicates that the window was closed
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });
        it("skips windowid -1 in the process when it decides to return undefined", async function () {
            chrome.windows.get.and.callFake(function (windowId, params, callback){
                if (windowId === -1){
                    throw new Error("WE WERENT SUPPOSED TO DO THIS");//today it doesnt do this, but lets just be paranoid 
                }
            });
           
           var cmdResult = directControl.closeTab(-1, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook",
                windowId: 4
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2]();//some times for whatever reason, it returns undefined here
            chrome.windows.getAll.calls.mostRecent().args[1](
                [
                    {
                        id: 2,
                        focused: false,
                        tabs:[{
                            id: 103, 
                            active: true, 
                            audible: true,
                            url: "https://www.dontfind.com",
                            title: "dontfind"
                        }]
                    },{
                        id: 1,
                        focused: true,
                        tabs:[{
                            id: 101, 
                            active: true, 
                            audible: true,
                            url: "https://www.youtube.com/channel/muppets",
                            title: "muppets"
                        }]
                    }
                ]
            );
            
            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 1,//this communicates that the window was closed
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });
        it("skips windowid -1 in the process when it decides to return undefined and then an empty window", async function () {
            chrome.windows.get.and.callFake(function (windowId, params, callback){
                if (windowId === -1){
                    throw new Error("WE WERENT SUPPOSED TO DO THIS");//today it doesnt do this, but lets just be paranoid 
                }
            });
           
           var cmdResult = directControl.closeTab(-1, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook",
                windowId: 4
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2]();//some times for whatever reason, it returns undefined here
            chrome.windows.getAll.calls.mostRecent().args[1](//and hey sometimes it returns an obejct here wiht no tabs!
                [
                    {
                        id: 2,
                        focused: false,
                        tabs:[] //life is a highway
                    }
                ]
            );
            
            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_active: "unknown",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });

        it("retries when the student is dragging a tab", async function () {
           
           var cmdResult = directControl.closeTab(4, 100);
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook"
            });
            chrome.tabs.remove.calls.mostRecent().args[1]();
            chrome.windows.get.calls.mostRecent().args[2]({
                focused: true,
                id: 4, 
                tabs:[{
                    id: 101, 
                    active: true, 
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            });

            var result = await cmdResult;
            
            expect(result).toEqual({
                type: "tab_close",
                target_tabid: 100, 
                target_windowid: 4,
                result_windowid: 4,
                result_tabid: 101,
                result_active: "active-focused",
                target_url: "https://www.facebook.com",
                target_title: "facebook"
            });
        });

    });
    describe("changeTab", function () {
        it("updates and indicates success", async function () {
           
           var cmdResult = directControl.changeTab(4, 100);
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.windows.update.calls.mostRecent().args[2]();
            var result = await cmdResult

            expect(result).toEqual({
                type: "tab_change",
                target_windowid: 4,
                target_tabid: 100
            });
        });

        it("indicates the tab was already closed", async function () {
           
           var cmdResult = directControl.changeTab(4, 100);
            chrome.runtime.lastError = {message:"No tab with id: 100."};
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;
            chrome.windows.update.calls.mostRecent().args[2]();
            chrome.windows.getAll.calls.mostRecent().args[1]([{
                focused: true,
                id: 4, 
                tabs:[{
                    id: 101, 
                    active: true, 
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            }]);
            var result = await cmdResult

            expect(result).toEqual({
                type: "tab_change",
                target_windowid: 4,
                target_tabid: 100,
                result_windowid: 4,
                result_tabid: 101,
                result_active: "active-focused"
            });
        });

        it("indicates the tab was already closed-flipped async", async function () {
           
           var cmdResult = directControl.changeTab(4, 100);
            //flipped order yields same results
            chrome.windows.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = {message:"No tab with id: 100."};
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;
            chrome.windows.getAll.calls.mostRecent().args[1]([{
                focused: true,
                id: 4, 
                tabs:[{
                    id: 101, 
                    active: true, 
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            }]);
            var result = await cmdResult

            expect(result).toEqual({
                type: "tab_change",
                target_windowid: 4,
                target_tabid: 100,
                result_windowid: 4,
                result_tabid: 101,
                result_active: "active-focused"
            });
        });

        it("indicates the window was already closed", async function () {
           
           var cmdResult = directControl.changeTab(4, 100);
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = {message:"No window with id: 4."};//would be strange for this to happen this way but this double asserts for us
            chrome.windows.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;
            chrome.windows.getAll.calls.mostRecent().args[1]([{
                focused: true,
                id: 5, 
                tabs:[{
                    id: 101, 
                    active: true, 
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            }]);
            var result = await cmdResult

            expect(result).toEqual({
                type: "tab_change",
                target_windowid: 4,
                target_tabid: 100,
                result_windowid: 5,
                result_tabid: 101,
                result_active: "active-focused"
            });
        });

        it("indicates the window was already closed flipped async", async function () {
           
           var cmdResult = directControl.changeTab(4, 100);
            //flipped order yrields same results
            chrome.runtime.lastError = {message:"No window with id: 4."};//would be strange for this to happen this way but this double asserts for us
            chrome.windows.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.windows.getAll.calls.mostRecent().args[1]([{
                focused: true,
                id: 5, 
                tabs:[{
                    id: 101, 
                    active: true, 
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            }]);
            var result = await cmdResult

            expect(result).toEqual({
                type: "tab_change",
                target_windowid: 4,
                target_tabid: 100,
                result_windowid: 5,
                result_tabid: 101,
                result_active: "active-focused"
            });
        });

        it("indicates there are no windows open anymore", async function () {
           
           var cmdResult = directControl.changeTab(4, 100);
            chrome.runtime.lastError = {message:"No tab with id: 100."};
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = {message:"No window with id: 4."};
            chrome.windows.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;
            chrome.windows.getAll.calls.mostRecent().args[1](
                []
            );
            var result = await cmdResult

            expect(result).toEqual({
                type: "tab_change",
                target_windowid: 4,
                target_tabid: 100,
                result_active: "unknown"
            });
        });

        it("errors when theres an error on tab update", async function () {
            var cmdResult = directControl.changeTab(4, 100);
            chrome.runtime.lastError = {message:"AHHH THE BURNING!"};
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;
            chrome.windows.update.calls.mostRecent().args[2]();
                        try {
                await cmdResult
                fail("should have rejected");
            } catch{
                //yay
            }
        });

        it("errors when there's an error on window update", async function () {
            var cmdResult = directControl.changeTab(4, 100);
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = {message:"AHHH THE BURNING!"};
            chrome.windows.update.calls.mostRecent().args[2]();
            try {
                await cmdResult
                fail("should have rejected");
            } catch{
                //yay
            }
        });

        it("errors when there's an error on both tab and windows update", async function () {
            var cmdResult = directControl.changeTab(4, 100);
            chrome.runtime.lastError = {message:"AHHH THE BURNING!"};
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = {message:"AHHH MORE BURNING!"};
            chrome.windows.update.calls.mostRecent().args[2]();
                        try {
                await cmdResult
                fail("should have rejected");
            } catch{
                //yay
            }
        });

        it("errors when there's an api error and there are no active tabs", async function () {
            var cmdResult = directControl.changeTab(4, 100);
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = {message:"No window with id: 4."};//would be strange for this to happen this way but this double asserts for us
            chrome.windows.update.calls.mostRecent().args[2]();
            chrome.runtime.lastError = null;
            chrome.windows.getAll.calls.mostRecent().args[1]([{
                focused: true,
                id: 5, 
                tabs:[{
                    id: 101, 
                    active: false, //wait... there's no active tabs?
                    audible: true,
                    url: "https://www.youtube.com/channel/muppets",
                    title: "muppets"
                }]
            }]);
                        try {
                await cmdResult
                fail("should have rejected");
            } catch{
                //yay
            }
        });

        it("errors when there's an invalid windowid", async function () {
            chrome.windows.update.and.callFake(function (){
                throw new Error("No matching signature");//there more to this but the main idea
            });
            var cmdResult = directControl.changeTab("SYNTHETIC_WINDOW", 100);
            try{
                await cmdResult;
                fail("should have rejected");
            } catch {
                //yay
            }
        });

        it("skips windowid -1 in the process to avoid potential crashes", async function () {
            chrome.windows.get.and.callFake(function (windowId, params, callback){
                if (windowId === -1){
                    throw new Error("WE WERENT SUPPOSED TO DO THIS");//today it doesnt do this, but lets just be paranoid 
                }
            });
           
           var cmdResult = directControl.changeTab(-1, 100);
            chrome.tabs.update.calls.mostRecent().args[2]();
            chrome.tabs.get.calls.mostRecent().args[1]({
                id: 100,
                url: "https://www.facebook.com",
                title: "facebook",
                windowId: 4
            });
            chrome.windows.update.calls.mostRecent().args[2]();
            var result = await cmdResult

            expect(result).toEqual({
                type: "tab_change",
                target_windowid: 4,
                target_tabid: 100
            });
        });
    });
});
