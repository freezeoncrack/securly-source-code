/*
This file currently serves as the base level entry point for creating
abstractions that need to persist externally in ChromeOSServices 
*/

console.log("configurating...");

import "/js/globals.js";
import filesystem from "/js/mjs/filesystem.js";
import App from "/js/mjs/application.js";
import lifecycleEventHandler from "/js/mjs/chromeOsServices/lifecycleEventHandler.js";
import LogSenderClient from "/js/mjs/clients/logsender.js";


chrome.runtime.onMessage.addListener(function (event, sender, callback){
    console.log ("WE DID IT! " + Date.now() + " " + JSON.stringify(event));
    callback("YUUSSSS");
});


var app = new App();

lifecycleEventHandler.init();
filesystem.init().then(app.start, function (){
    console.log('filesystemFailed to start');
});


//TODO: probably refactor this but still has to add handler on first tick
var LogSender = new LogSenderClient();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    Object.keys(request).forEach(function(topic){
        switch (topic) {
            case 'sendlogs':
                var options = request[topic].options,
                    startDate = new Date(request[topic].startDate),
                    endDate = new Date(request[topic].endDate);

                LogSender.sendLogsWithStartDate(startDate, endDate, options)
                    .then(function(){
                        sendResponse({});
                    }, function(error){
                        sendResponse({error:error});
                    });
                break;
        }
    });
    // Return true to indicate that the response will be sent asynchronously.
    return true;
});

LogSender.on('statusUpdate', function(status){
    var message = {
        "updateLogStatus": {
            "total": status.total,
            "current": status.current,
            "message": status.message
        }
    };
    chrome.runtime.sendMessage(message);
});

console.log("hello world!");
// importScripts('js/lib/jquery-2.1.1.min.js');
// importScripts('js/lib/jquery.ba-tinypubsub-0.6.min.js');
// importScripts('js/lib/jquery.ajax-retry.js');
// importScripts('js/lib/jquery.signalR-2.0.2.js');
// importScripts('js/amd/lib/linkify.min.js');
// importScripts('js/lib/canvasToBlob-2.0.5.min.js');
// importScripts('js/lib/require.js');

//importScripts("js/globals.js");
