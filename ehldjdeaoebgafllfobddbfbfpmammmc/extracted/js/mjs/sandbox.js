var Sandbox = function(){
    var _this = this;
    if(globalThis.sandbox){
        return globalThis.sandbox;
    }

    this.init = function(){
        if(!this.ready) {
            //note: according to https://developers.chrome.com/extensions/runtime#method-sendMessage
            //runtime sendmessage does not send to your current frame, so it's only 
            //valid outside our context
            if (!chrome || !chrome.runtime || !chrome.runtime.onMessage){ return this;}//dont crash for tests
            chrome.runtime.onMessage.addListener(globalThis.sandbox._processEvents);
            this.ready = true;
        }
        return this;
    };

    this.ready = false;

    this.dictionary = {};
    this._stopper = false;
    this._queuedEvents = [];//for restore after SW

    this.subscribe= function (event, callback) {
        if (this.dictionary[event]) {
            this.dictionary[event].push(callback);
        } else {
            this.dictionary[event] = [];
            this.dictionary[event].push(callback);
        }
    };

    this.unsubscribe = function(event, callback){
        if(event && callback){
            this.dictionary[event] = this.dictionary[event].filter(function(func){
                return func !== callback;
            });
        } else if(event){
            delete this.dictionary[event];
        }
        //note: we're nowhere subscribing in this file, so I dont think we should be unsubscribing here
        // eventAggregator.off(event, callback);
    };

    this.publish= function (event, data, onResponse) {
        var toSend = {};
        toSend[event] = data ? data: {};
        //note: according to https://developers.chrome.com/extensions/runtime#method-sendMessage
        //runtime sendmessage does not send to your current frame, so it's only 
        //valid outside our context
        this._sendEvents(toSend, onResponse);
        //this allows the passing back and forth within the frame
        var callbacks = this.dictionary[event];
        if (callbacks && callbacks.length){
            var pubsub = this;
            callbacks.forEach(function (eventCallback){
                //onResponse not currently supported
                eventCallback(data);
            });
        }
    };

    this.replayEvents = function (events){
        events.forEach(e=>this._processEvents(e));
    };

    this._processEvents= function (request) {
        if (_this._stopper){ 
            _this._queuedEvents.push(request);
            return;//bail early
        }
        for(var prop in request){
            if (_this.dictionary[prop]) {
                _this.dictionary[prop].forEach(function(func){
                    func(request[prop]);
                });
            }
        }
    };

    this._reset = function(){
        this.dictionary = {};
    };

    this._sendEvents= function (events, onResponse){
        //note: according to https://developers.chrome.com/extensions/runtime#method-sendMessage
        //runtime sendmessage does not send to your current frame, so it's only 
        //valid outside our context
        chrome.runtime.sendMessage(events, onResponse).then(
            function (){}, 
            function (err){
            //9/10 times this is only complaining that there is no listener set up
            //which is fine bc we rely on state for those scenarios
            //but we need to catch this or we get an uncaught promise
        });
    };

    globalThis.sandbox = this;
};

export default Sandbox;
