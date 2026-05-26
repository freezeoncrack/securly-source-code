define(['amd/sandbox', 'amd/lib/uuid', 'amd/settings'], function(Sandbox, uuid, SETTINGS){
    var UserWatcher = function(){
        var sandbox = false,
            topicId = uuid(),
            getTopicEventName = function(/*string*/event){
                return topicId + event;
            },
            _this = this;




        this._signedInTopicEvent = getTopicEventName(SETTINGS.EVENTS.SIGN_IN);
        this._signedOutTopicEvent = getTopicEventName(SETTINGS.EVENTS.SIGN_OUT);
        this.currentUser = {};
        this.onUserSignIn = function (/*function*/doOnUserSignIn) {
            sandbox.subscribe(this._signedInTopicEvent, doOnUserSignIn);
        };
        this.onUserSignOut = function (/*function*/doOnUserSignOut) {
            sandbox.subscribe(this._signedOutTopicEvent, doOnUserSignOut);
        };
        this.offUserSignIn = function (/*function*/offUserSignIn) {
            sandbox.unsubscribe(this._signedInTopicEvent, offUserSignIn);
        };
        this.offUserSignOut = function (/*function*/offUserSignOut) {
            sandbox.unsubscribe(this._signedOutTopicEvent, offUserSignOut);
        };
        this._addListener = function (account, /*bool*/signedIn) {
            if (signedIn) {
                sandbox.publish(this._signedInTopicEvent);
            } else {
                sandbox.publish(this._signedOutTopicEvent);
            }
        };
        this.getCurrentUser = function(){
            return new Promise(function(resolve, reject){
                chrome.identity.getProfileUserInfo(resolve);
            });
        };
        this.init = function () {
            sandbox = new Sandbox().init();
            this.getCurrentUser()
                .then(function(info){
                    _this.currentUser = info;
                });
            /**
             * Fire on users login and logout action in Google browser
             * Not available with simple Google account
             */
            //using .bind to preserve our this context in the event handler
            chrome.identity.onSignInChanged.addListener(this._addListener.bind(this));
            return this;
        };
        this.stop = function () {
            //remove all of our events from sandbox
            sandbox.unsubscribe(this._signedInTopicEvent);
            sandbox.unsubscribe(this._signedOutTopicEvent);

            //now remove our onSignedInChanged listener
            chrome.identity.onSignInChanged.removeListener(this._addListener.bind(this));
        };
    };
    return UserWatcher;
});