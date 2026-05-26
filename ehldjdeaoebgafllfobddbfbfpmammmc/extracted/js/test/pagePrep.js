define(['node_modules/fs/index'], function(fs){

    var node_modules = '../../node_modules/';
    phantom.injectJs(node_modules + 'karma-jasmine/lib/jasmine.js');
    phantom.injectJs(node_modules + 'sinon-chrome/phantom-tweaks.js');

    var page;
    var injectFn;


    return {
        beforeEach: function() {
            page = require('webpage').create();

            page.onConsoleMessage = function(msg) {
                console.log(msg);
            };

            page.onError = function(msg, trace) {
                var msgStack = [msg];
                if (trace && trace.length) {
                    msgStack.push('TRACE:');
                    trace.forEach(function(t) {
                        msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
                    });
                }
                // we need try..catch here as mocha throws error that catched by phantom.onError
                try {
                    mocha.throwError(msgStack.join('\n'));
                } catch(e) { }
            };

            // #1. inject chrome.* api mocks and other stuff into page
            page.onInitialized = function() {
                page.injectJs(node_modules + 'chai/chai.js');
                page.injectJs(node_modules + 'sinon/pkg/sinon-1.12.1.js');
                page.injectJs(node_modules + 'sinon-chrome/chrome.js');
                page.injectJs(node_modules + 'sinon-chrome/phantom-tweaks.js');
                page.evaluate(function() {
                    assert = chai.assert;
                });
                // run additional functions defined in tests
                if (injectFn) {
                    injectFn();
                }
            };
        },
        afterEach: function() {
            page.close();
            injectFn = null;
        }
    }
});