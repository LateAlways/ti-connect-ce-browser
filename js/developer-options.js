/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*global DefaultAppLoggerLevel */
/*global DefaultCarsLoggerLevel */
/*global setAppLoggerLevel */
/*global setCarsLoggerLevel */

/**
 * Developer options global. 
 */ 
var DeveloperOptions = {
    options : {
        appLog : {
            "remember" : false,
            "level" : DefaultAppLoggerLevel
        },
        carsLog : {
            "remember" : false,
            "level" : DefaultCarsLoggerLevel
        }
    },
    /**
     * Loads and set the developer options from the local storage
     */
    loadDeveloperOptions : function() {
        "use strict";
        console.debug('loadDeveloperOptions()');
        if (chrome) {
            chrome.storage.local.get("developerOptions", function(items) {
                if (chrome.runtime.lastError) {
                    console.debug('No user preferences from chrome sync');
                } else {
                    if (typeof items !== 'undefined' && typeof items.developerOptions !== 'undefined') {
                        DeveloperOptions.options = items.developerOptions;
                        console.debug("Succesfully loaded developer options: ", DeveloperOptions);
                        DeveloperOptions.setLoggerLevels();
                    }
                }
            });
        }
    },
    /**
     * Saves the developer options in the local storage
     */
    saveDeveloperOptions : function() {
        "use strict";
        console.debug('saveDeveloperOptions(', DeveloperOptions.options, ')');
        var devOpt = DeveloperOptions.options;
        if (chrome) {
            // let's save the logger levels before reseting if not set to remember
            DeveloperOptions.setLoggerLevels();
            // reset
            if (devOpt.appLog.remember === false) {
                devOpt.appLog.level = DefaultAppLoggerLevel;
            }
            if (devOpt.carsLog.remember === false) {
                devOpt.carsLog.level = DefaultCarsLoggerLevel;
            }
            chrome.storage.local.set({
                "developerOptions": DeveloperOptions.options
            }, function () {
                if (chrome.runtime.lastError) {
                    AppLogger.warn('error saving screen captures to chrome sync');
                } else {
                    AppLogger.log('success saved screen captures to chrome sync');
                }
            });
        }
    },
    /**
     * Sets the logger level for either App Module and Cars Module
     */
    setLoggerLevels : function() {
        "use strict";
        console.debug('setLoggerLevels()');
        setAppLoggerLevel(DeveloperOptions.options.appLog.level);
        setCarsLoggerLevel(DeveloperOptions.options.carsLog.level);
    }
};
DeveloperOptions.loadDeveloperOptions();