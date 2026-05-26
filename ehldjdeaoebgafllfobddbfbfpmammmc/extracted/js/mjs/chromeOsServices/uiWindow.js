//algorithm needs
//this has to support: locked, messages, understanding, questions
//does this need to be generic or am I overengineering?
//the algorithm we have currently does...
//1. opens the window but accepts no knowledge of the window location. This is an oversight as all of our keepalive windows are singleton
//2. has coordination between 

import Sandbox from "/js/mjs/sandbox.js";
import deferred from "/js/mjs/utils/deferred.js";
import Logger from "/js/mjs/logger/logger.js";

const CANCELLED = "__cancelled__";

class uiWindow{
    constructor(url, options){
        this.url = url;
        this.options = options;
        this.window = null;
        this.sandbox = new Sandbox().init();
        this.findWindowDfd = null;
        this.launching = false;
        this.closing = false;
        this.subscribed = false;

        this.sandbox.subscribe("dyknowWindowReady", (windowId)=>{
            if (this.window && this.findWindowDfd && this.window.id === windowId){
                this.findWindowDfd.resolve();
                this.findWindowDfd = null;
            }
        });        
    }

    subscribe () {
        if (this.subscribed){ return; }
        chrome.windows.onRemoved.addListener(this.onRemoved);
    }

    unsubscribe () {
        chrome.windows.onRemoved.removeListener(this.onRemoved);
    }

    onRemoved(windowId) {
        if (this.closing || !this.window){ return; }//ignore
        if (windowId === this.window.id && this.options.shouldBeOpen) {
            let keepAlive = this.options.shouldBeOpen();
            if (keepAlive){
                this.launchWindow();
            }
        }
    }

    isRunning () {
        return Boolean(this.launching || this.window || this.findWindowDfd);
    }

    //NOTE: lifecycleEventHandler.closeOrphanWindows is probably
    //doing our job here so dont expect too much here
    //update: sadly bc you cant rely on runtime.sendMessage, we
    //cant have that clean up. might move some code in here to dedupe 
    //by default though hmm...
    async findWindow(){
        if (this.findWindowDfd){
            try{
                await this.findWindowDfd;
                return Boolean(this.window);
            } catch {
                return false;
            }
        }
        var windows = await chrome.windows.getAll({populate: true});
        var window = windows.filter(w=>w.tabs.filter(t=>t.url === this.url).length);
        this.window = window[0];//found or not
        return Boolean(this.window);
    }

    async launchWindow(){
        this.subscribe();
        var info = await chrome.system.display.getInfo();
        var screen = info[0].workArea;    
        this.findWindowDfd = deferred.get();
        try{
            this.window = await chrome.windows.create({ 
                url: this.url, 
                width: this.options.width,
                height: this.options.height,
                top: 0,
                left: screen.width - this.options.width,
                type: this.options.type
            });
            await this.findWindowDfd;//TODO: cancellabilty?
            this.findWindowDfd = null;
        } catch(err){
            Logger.debug(err);
        }
    }

    async closeWindow(){
        //todo
        if (this.findWindowDfd){ 
            this.findWindowDfd.reject(CANCELLED);
            this.findWindowDfd = null;
        }
        if (!this.window){
            return;
        }
        this.closing = true;
        let window = this.window;
        this.window = null;
        await chrome.windows.remove(window.id);
        this.closing = false;
    }

}

export default uiWindow;