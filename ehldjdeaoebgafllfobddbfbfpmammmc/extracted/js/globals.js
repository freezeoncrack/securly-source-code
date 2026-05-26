//define(['amd/settings', 'amd/logger/logger'], function(SETTINGS, Logger){
import settings from "/js/mjs/settings.js";
import Logger from "/js/mjs/logger/logger.js";

/**
 * Function that makes inheritance easy
 * @param class Child
 * @param class Parent
 */
function extend (Child, Parent) {
    Child.prototype = new Parent();
    Child.prototype.constructor = Child;
//     Child.superclass = Parent.prototype;
};
globalThis.extend = extend;

/**
 * Helper to extends objects
 * @param destination
 * @param source
 * @returns {*}
 */
Object.extend = function (destination, source) {
    var property;
    for (property in source) {
        if (source.hasOwnProperty(property)) {
            destination[property] = source[property];
        }
    }
    return destination;
};


/**
 * Rewrited error class
 * @param string message
 * @constructor
 */
var SystemError = function( message ) {
    this.constructor.prototype.__proto__ = Error.prototype;
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;

    Logger.error(this.name + ' : ' + this.message, this.stack);
};
globalThis.SystemError = SystemError;

function isArrayFunc ( obj ) {
    if( Object.prototype.toString.call( obj ) === '[object Array]' ) {
        return true;
    }
    return false;
};
globalThis.isArrayFunc = isArrayFunc;

Array.prototype.first = function () {
    return this[0];
};

function getRealObjLength(obj) {

    if (typeof obj !== "object") {
        return 0;
    }
    return Object.keys(obj).length;
};
globalThis.getRealObjLength = getRealObjLength;
// /**
//  * Extends for plugin jquery.ba-tinypubsub
//  */
// (function ($) {
//     // "topic" holder
//     var o = $({});

//     // attach each alias method
//     $.each({on:0,off:0,"trigger":0}, function(alias,method) {
//         $[alias] = function(topic, callbackOrArgs) {
//             o[method || alias].apply(o, arguments);
//         }
//     });

// })(jQuery);

/**
 * Transform text in camel case
 * @returns {string}
 */
function camelize (str) {
    return str.replace (/(?:[_])(\w)/g, function (_, c) {
        return c ? c.toUpperCase () : '';
    })
};

/**
 * Returns true if key is not a key in object or object[key] has
 * value undefined. If key is a dot-delimited string of key names,
 * object and its sub-objects are checked recursively.
 */
globalThis.isUndefinedKey = function(object, key) {
    var keyChain = Array.isArray(key) ? key : key.split('.'),
        objectHasKey = keyChain[0] in object,
        keyHasValue = typeof object[keyChain[0]] !== 'undefined';

    if (objectHasKey && keyHasValue) {
        if (keyChain.length > 1) {
            return isUndefinedKey(object[keyChain[0]], keyChain.slice(1));
        }

        return false;
    }
    else {
        return true;
    }
};


/**
 * This script sets OSName variable as follows:
 *  "globalThiss"    for all versions of globalThiss
 *  "MacOS"      for all versions of Macintosh OS
 *  "CrOS"       for all versions of Chrome OS
 *  "Linux"      for all versions of Linux
 *  "UNIX"       for all other UNIX flavors
 *  FALSE indicates failure to detect the OS
 * @returns {boolean || string}
 */
function detectOS(){

    if (navigator.appVersion.indexOf("CrOS")!=-1){
        return "Chrome OS";
    }
    if (navigator.appVersion.indexOf("Win")!=-1) {
        return "Windows";
    }
    if (navigator.appVersion.indexOf("Mac")!=-1){
        return "MacOS";
    }

    if (navigator.appVersion.indexOf("X11")!=-1){
        return "UNIX";
    }

    if (navigator.appVersion.indexOf("Linux")!=-1) {
        return "Linux";
    }

    return false;
};

/**
 *
 * @param obj
 * @returns {boolean}
 */
globalThis.isEmptyObj = function(obj){
    return (Object.getOwnPropertyNames(obj).length === 0);
}

export { detectOS, extend, SystemError, isArrayFunc, getRealObjLength, camelize };