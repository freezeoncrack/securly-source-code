import EventEmitter from "/js/mjs/lib/EventEmitter.js";
import JQXHRForSignalR from "/js/mjs/lib/JQXHRForSignalR.js";


//for the same of transitioning signalr smoothly, doing 
//a little shim replacement. The biggest needs for signalr is
//a simple event system. The intention here is not to rewrite
//jquery but instead fo provide
//1. a namespace to hang off the signalr utilities (different time)
//    - $.signalr
//    - $.connection()
//    - $.hubConnection 
//2. a simple isolated event system 


const jQueryReplacement ={
    _data: new WeakMap(),
    triggerHandler: function (obj, event, args){
        var emitter = jQueryReplacement._data.get(obj);
        if (emitter){
            emitter.emitEvent(event, args);
        }
    },
    bind: function (obj, event, callback){
        var emitter = jQueryReplacement._data.get(obj);
        if (!emitter){
            emitter = new EventEmitter();
            jQueryReplacement._data.set(obj, emitter);
        }
        emitter.on(event, callback);
    },
    unbind: function (obj, event, callback) {
        var emitter = jQueryReplacement._data.get(obj);
        if (!emitter){ return;}
        emitter.off(event, callback);//note if callback is empty we will clear all events
    },
    type: function (obj){
        return Object.prototype.toString
        .call(obj)
        .replace(/^\[object (.+)\]$/, '$1')
        .toLowerCase();
    },
    isEmptyObject: function( obj ) {
        var name;
        for ( name in obj ) {
            return false;
        }
        return true;
    },
    param: function (obj){
        var url = new URL("http://localhost");//url not used
        Object.keys(obj).forEach(k=>url.searchParams.set(k, obj[k]));
        return url.searchParams.toString();
    },
    noop: function () {},
    ajax: function (config){
        //only need to support tyep GET except for abort (POST)       
        var url = config.url;
        var fetchOptions = {
            method: config.type,
            headers: {
                "Content-Type": config.contentType
            }
        };
        //data handling gotta do that here
        //dataType: text looks like, but wahats that mean
        //processData: true
        //timeout: null
        //async: true
        //global: false
        //cache: false
        var errorCallback = config.error;
        var successCallback = config.success;
        var jqxhr = new JQXHRForSignalR();
        var retDfd = jqxhr.runFetch(url, fetchOptions, config.timeout).then(function (result){
            if (successCallback){
                successCallback(result)
            }
            return result;
        }, function (err){
            if (errorCallback){
                errorCallback(err, jqxhr.statusText)
            }
            return Promise.reject(err);//ensure we reject
        });
        jqxhr.then = retDfd.then.bind(retDfd);
        //not seeing many / any places where we use the jqxhr like a promise
        return jqxhr;
    }

};

export default jQueryReplacement;