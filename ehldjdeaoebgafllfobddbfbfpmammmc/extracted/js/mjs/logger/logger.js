import filesystem from "/js/mjs/filesystem.js";

var Logger = {

    log: function (title, message) {
        console.log.apply( console, arguments );
        if(typeof title !== "string"){
            filesystem.write("Log", title);
        } else {
            filesystem.write(title, message);
        }
    },

    debug : function (title, message) {
        console.debug.apply( console, arguments );
        if(typeof title !== "string"){
            filesystem.write("Debug", title);
        } else {
            filesystem.write(title, message);
        }
    },

    info : function (title, message) {
        console.info.apply( console, arguments );
        if(typeof title !== "string"){
            filesystem.write("Info", title);
        } else {
            filesystem.write(title, message);
        }
    },

    warn : function (title, message) {
        console.warn.apply( console, arguments );
        if(typeof title !== "string"){
            filesystem.write("Warn", title);
        } else {
            filesystem.write(title, message);
        }
    },

    error : function( msg, stack ) {
        console.error.apply( console, arguments );
        filesystem.error( "SystemError", { "message" : msg });
    }
};

export default Logger;