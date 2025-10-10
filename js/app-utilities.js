/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*jslint unused: false */
/*global TILogger */
/*jshint -W079 */ // Redefinition of '{a}' GLOBAL
var AppLogger;
var DefaultAppLoggerLevel = TILogger.LEVEL.DEBUG;
var setAppLoggerLevel = function(level) {
    "use strict";
    /*jshint -W020 */ // {a} is a read-only native object
    AppLogger = TILogger.createLogger(level, "APP:");
};
setAppLoggerLevel(DefaultAppLoggerLevel);