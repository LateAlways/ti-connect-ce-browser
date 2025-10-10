/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
var TILogger = function(level, name) {
    "use strict";
    this.level = level;
    this.name = name;
    // validate name is a string, if name is other type console will handle all the arguments passed as a long string
    name = typeof name === "string" ? name : undefined; 
    switch (level) {
        case TILogger.LEVEL.DEBUG: 
            this.debug = name ? console.debug.bind(console, name) : console.debug.bind(console);
            /* falls through */
        case TILogger.LEVEL.LOG:
            this.log = name ? console.log.bind(console, name) : console.log.bind(console);
            /* falls through */
        case TILogger.LEVEL.TRACE:
            this.trace = name ? console.trace.bind(console, name) : console.trace.bind(console);
            /* falls through */
        case TILogger.LEVEL.INFO:
            this.info = name ? console.info.bind(console, name) : console.info.bind(console);
            /* falls through */
        case TILogger.LEVEL.WARN:
            this.warn = name ? console.warn.bind(console, name) : console.warn.bind(console);
            /* falls through */
        case TILogger.LEVEL.ERROR:
            /* falls through */
        default:  
            this.error = name ? console.error.bind(console, name) :  console.error.bind(console);
    }
    return this;
};
/**
 * Compares the given level with the level set in such logger
 */
TILogger.prototype.isLoggable = function(level) {
    "use strict";
    return this.level >= level;  
};
TILogger.prototype.debug = function () {
};
TILogger.prototype.log = function () {
};
TILogger.prototype.trace = function () {
};
TILogger.prototype.info = function () {
};
TILogger.prototype.warn = function () {
};
TILogger.prototype.error = function () {
};
TILogger.createLogger = function (level, name) {
    "use strict";
    var tl = new TILogger(level, name);
    return tl;
};
TILogger.LEVEL = {
    "DEBUG" : 6,
    "LOG"   : 5,
    "TRACE" : 4,
    "INFO"  : 3,
    "WARN"  : 2,
    "ERROR" : 1
};


