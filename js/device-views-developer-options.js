/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*global TILogger */
/*global DeveloperOptions*/
(function () {
    'use strict';
    //*< A brief description.
    var app = angular.module('device-views-developer-options', ['ngDialog']);
    /**
     * Developer options for logger level either at App Module and at Cars Module.
     * @return Description of returned value.
     */
    app.directive('developerOptions', function (ngDialog) {
        return {
            restrict: 'E',
            replace: true,
            template: '<div id="DeveloperOptions" style="display : none"></div>',
            link: function (scope, element, attr) {
                AppLogger.debug("Developer Options");
                /**
                 * Listener for key press to display developer options dialog when combo key is
                 * event.which === 2 'B' && event.ctrlKey && event.shiftKey
                 */ 
                $(document).on('keypress', function (event) {
                    AppLogger.log('user preferences keyhandler ', event.which);
                    if (event.which === 2 /* B */ && event.ctrlKey && event.shiftKey) {

                        ngDialog.open({
                            template: 'templates/dialog-developer-options.html',
                            // scope : scope
                            data : {
                                logLevels : TILogger.LEVEL,
                                appLog    : DeveloperOptions.options.appLog,
                                carsLog   : DeveloperOptions.options.carsLog
                            }
                        }).closePromise.then(function (data) {
                            if (data.value === 'OK') {
                                DeveloperOptions.saveDeveloperOptions();
                            }
                        });
                    }
                });
            }
        };
    });

}());
