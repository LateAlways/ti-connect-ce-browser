/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/**
 * Connect directive to control the contextual toolbars.
 */ 
(function () {
    'use strict';
    var app = angular.module('toolbar-app', []);
    app.directive('toolbarApp', function ($filter, $timeout) {
        return {
            restrict: 'E',
            templateUrl: 'templates/toolbar-app.html',
            link: function (scope, element, attr) {
                AppLogger.debug("Directive toolbar-app");
                var connect = scope.connect;
                // {boolean} define wheather or not all items are selected
                scope.model.selctedAll = false;
                /**
                 * Returns true if device explorer toolbar can be shown
                 * @returns {true} if device explorer toolbar can be shown
                 */
                connect.showToolbarDeviceExplorer = function () {
                    return (connect.primary === connect.files);
                };
                /**
                 * Returns true if screen capture toolbar can be shown
                 * @returns {true} if screen capture toolbar can be shown
                 */
                connect.showToolbarScreenCapture = function () {
                    return (connect.primary === connect.screens);
                };
                /**
                 * Returns true if all screens can be selected. In other words, check if there is at least one screen available.
                 * @returns {true} if all screens can be selected.
                 */
                connect.canSelectAllScreens = function () {
                    return (connect.primary === connect.screens && scope.model.screens.length > 0);
                };
                /**
                 * Returns true if all files can be selected. In other words, check if there is at least one file available.
                 * @returns {true} if all files can be selected.
                 */
                connect.canSelectAllFiles = function () {
                    return (connect.primary === connect.files && (connect.currentDevice !== null && typeof connect.currentDevice !== 'undefined') &&
                            connect.currentDevice.files.length > 0);
                };
                /**
                 * Returns true if either files or screens can be all selected
                 * @returns {true} if either files or screens can be all selected
                 */
                connect.canSelectAll = function () {
                    return (connect.canSelectAllFiles() || connect.canSelectAllScreens());
                };
                /**
                 * Returns true if all screens are selected
                 * @returns {true} if all screens are selected
                 */
                connect.areSelectedAllScreens = function () {
                    return (connect.canSelectAllScreens() && scope.model.screens.length ===  $filter('filter')(scope.model.screens, {selected: true}).length);
                };
                /**
                 * Returns true if all files are selected
                 * @returns {true} if all files are selected
                 */
                connect.areSelectedAllFiles = function () {
                    return (connect.canSelectAllFiles() && connect.currentDevice.files.length ===  $filter('filter')(connect.currentDevice.files, {selected: true}).length);
                };
                /**
                 * Returns true if either all files or all screen are selected
                 * @returns {true} if either all files or all screen are selected
                 */
                connect.areSelectedAll = function () {
                    return (connect.areSelectedAllFiles() || connect.areSelectedAllScreens());
                };
                /**
                 * Select all or select none the screens upon the given select parameter
                 * @param {boolean} select define if {true} select all screens, otherwise select none
                 */
                connect.selectAllScreens = function (select) {
                    $timeout(function () {
                        $filter('filter')(scope.model.screens, {selected: !select}).forEach(function (item) {
                            item.selected = select;
                        });
                    });
                };
                /**
                 * Select all or select none the files upon the given select parameter
                 * @param {boolean} select define if {true} select all files, otherwise select none
                 */
                connect.selectAllFiles = function (select) {
                    $timeout(function () {
                        $filter('filter')(connect.currentDevice.files, {selected: !select}).forEach(function (item) {
                            item.selected = select;
                        });
                    });
                };
                /**
                 * Select all files from the selected workspace area (Device Explorer or Screen Capture)
                 */
                connect.selectAll = function () {
                    if (connect.canSelectAllFiles()) {
                        connect.selectAllFiles(scope.model.selectedAll);
                    } else if (connect.canSelectAllScreens()) {
                        connect.selectAllScreens(scope.model.selectedAll);
                    }
                };
                scope.model.selectedAll = connect.areSelectedAll();
            }
        };
    }).directive('toolbarDeviceExplorer', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/toolbar-device-explorer.html',
        };
    }).directive('toolbarScreenCapture', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/toolbar-screen-capture.html',
        };
    });

}());
