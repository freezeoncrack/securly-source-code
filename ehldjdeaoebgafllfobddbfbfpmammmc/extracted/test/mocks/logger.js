
import Logger from "/js/mjs/logger/logger.js"; 
var mock = {
    useMock: function() {
        spyOn(Logger, 'debug');
        spyOn(Logger, 'info');
        spyOn(Logger, 'warn');
        spyOn(Logger, 'error');
    }
};

export default mock;