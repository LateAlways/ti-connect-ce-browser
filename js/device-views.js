/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*global angular */
/*global $ */
(function () {
    'use strict';
    var app = angular.module('device-views', ['ngDialog', 'device-views-developer-options']);

    app.directive('loadingMask', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/loading-mask.html'
        };
    });
    app.directive('noDevice', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/no-device.html'
        };
    });
    app.directive('connectedDevice', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/connected-device.html'
        };
    });
    app.directive('deviceExplorer', function ($filter, $timeout, ngDialog) {
        return {
            restrict: 'E',
            templateUrl: 'templates/device-explorer.html',
            link : function(scope, element, attrs) {
                var connect  = scope.connect;

                //            fileEntries = [],
                connect.selectedFilesBeforeSort = null;
                scope.model.lastFileIndex = null;
                scope.model.lastFileSelected = null;
                connect.clickDeviceExplorerArea = function () {
                    if (connect.primary === connect.files) {
                        connect.clearFileSelection();
                    } else {
                        connect.primary = connect.files;
                        //Check if the selected files are special types (TABLE_SETUP, USER_ZOOM, WINDOW)
                        connect.specialTypes = connect.areSpecialTypes();
                    }
                    scope.model.selectedAll = connect.areSelectedAll();
                };
                connect.selectedFiles = function () {
                    return (connect.currentDevice) ? $filter('filter')(connect.currentDevice.files, {selected : true}) : [];
                };
                connect.clearFileSelection = function () {
                    if (connect.currentDevice) {
                        connect.currentDevice.files.forEach(function (element) {
                            element.selected = false;
                        });
                    }
                };
                connect.shiftKeyFileAction = function (file, clear) {
                    if (clear) {
                        connect.clearFileSelection();
                    }
                    connect.selectAction(scope.model.lastFileSelected,
                                         scope.model.lastFileIndex,
                                         file,
                                         connect.currentDevice.files);
                };

                connect.fileClick = function (file, event) {
                    connect.primary = connect.files;

                    if (event.button === 0) {
                        if (event.shiftKey && (event.metaKey || event.ctrlKey)) {
                            connect.shiftKeyFileAction(file, false);
                        } else if (event.shiftKey) {
                            connect.shiftKeyFileAction(file, true);
                        } else if (event.metaKey || event.ctrlKey) {
                            if (file.selected) {
                                file.selected = false;
                            } else {
                                scope.model.lastFileIndex = connect.getFileIndex(file);
                                scope.model.lastFileSelected = file;
                                file.selected = true;
                            }
                        } else {
                            scope.model.lastFileIndex = connect.getFileIndex(file);
                            scope.model.lastFileSelected = file;
                            connect.clearFileSelection();
                            file.selected = true;
                        }
                    }
                    //Check if the selected files are special types (TABLE_SETUP, USER_ZOOM, WINDOW)
                    connect.specialTypes = connect.areSpecialTypes();
                    event.stopPropagation();
                };

                connect.refreshLastFileIndex = function () {
                    var files,
                        index;
                    if (scope.model.lastFileSelected && scope.predicate) {
                        files = connect.currentDevice.files;
                        for (index = 0; index < files.length; index += 1) {
                            if (scope.model.lastFileSelected === files[index]) {
                                scope.model.lastFileIndex = index;
                                break;
                            }
                        }
                    }
                };
                
                connect.sortFiles = function () {
                    //Sort files by javascript code since we need to refresh the last file index after that
                    connect.selectedFilesBeforeSort = connect.selectedFiles(); //get selected files before sort them
                    connect.currentDevice.files = $filter('orderBy')(connect.currentDevice.files, scope.predicate, scope.reverse);
                    connect.refreshLastFileIndex();
                    
                    //select previous selected items (asynchronously) once files are sorted
                    $timeout(function () {
                        connect.selectItems(connect.selectedFilesBeforeSort, 0, connect.selectedFilesBeforeSort.length-1);            
                    });
                };
                
                connect.deleteFilesSelection = function() {
                    var tiDevice,
                        new_dialog,
                        i,
                        file,
                        ext,
                        type;
                    if (connect.canDeleteSelection()) {
                        connect.collapseExplorer = false;
                        tiDevice = connect.dm.getDeviceWithID(connect.currentDevice.chromeDeviceID);
                        new_dialog = ngDialog.openConfirm({
                            template: 'templates/dialog-delete-files.html'
                        }).then(function (value) { // confirm was called
                            var cancelled = false,
                                isCancelledFunc,
                                selectedFiles = connect.selectedFiles();
                            if (value === 1) {
                                connect.cancelFunc = function () {
                                    cancelled = true;
                                };
                                isCancelledFunc = function() {
                                    return cancelled;
                                };
                                connect.animations.deleteFiles.value = true;
                                scope.ga_tracker.sendEvent('Transfer', 'DeleteCount', selectedFiles.length);
                                for (i = 0; i < selectedFiles.length; i = i + 1) {
                                    file = selectedFiles[i];
                                    ext = tiDevice.getExtensionForType(file.typeID);
                                    type = file.type;
                                    //If file type is NOT special (TABLE_SETUP, USER_ZOOM, WINDOW), delete that file
                                    if(!connect.isSpecialType(type)) {
                                        connect.deleteFile(tiDevice, file, ext, i, selectedFiles.length, isCancelledFunc);
                                    }
                                }
                                connect.refresh();
                            } else {
                                AppLogger.log('delete files was cancelled');
                            }
                        }, function (value) { // handle cancel action
                            AppLogger.log('delete files was cancelled');
                        });
                    }
                };

                $(document).on('keydown', function (event) {
                    // select-all listener (CMD/CTRL + A)
                    var select = false;
                    // only Mac OSx supports unselect all but let's keep it for all platforms in our app.
                    if (connect.primary === connect.files && event.which === 65 && (event.metaKey || event.ctrlKey)) {
                        select = !event.shiftKey;
                        connect.selectAllFiles(select);
                        scope.model.selectedAll = select;
                    }
                    // Refresh (CMD/CTRL + R)
                    else if(event.which === 82 && (event.metaKey || event.ctrlKey) && connect.canRefresh() && connect.primary === connect.files){
                        connect.refresh();
                    }
                    // Calculator Information (CMD/CTRL + D)
                    else if(event.which === 68 && (event.metaKey || event.ctrlKey)){
                        connect.openCalcInfo();
                    }
                    // Send to Computer (CMD/CTRL + L)
                    else if(event.which === 76 && (event.metaKey || event.ctrlKey) && connect.canCollect() && !connect.isAnimationDisplayed) {
                        connect.collectFiles();
                    }
                    // Add files from Computer (CMD/CTRL + M)
                    else if(event.which === 77 && (event.metaKey || event.ctrlKey) && connect.canSend()) {
                        connect.sendFiles();
                    }
                });

                connect.clearFileSelection();
            }
        };
    });

    app.directive('animations', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/animations.html'
        };
    });

    app.directive('droppable', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element[0].addEventListener('drop', scope.handleDrop, false);
                element[0].addEventListener('dragover', scope.handleDragOver, false);
            }
        };
    });

    app.directive('commtest', function () {
        return {
            restrict: 'E',
            replace: true,
            scope: true,
            templateUrl: 'templates/commtest.html',
            link: function postLink(scope, element, attr) {
                scope.commtest_counter = 0;
                $(document).on('keypress', function (event) {
                    AppLogger.log('commtest keyhandler which=' + event.which + ' counter=' + scope.commtest_counter);
                    if ((scope.commtest_counter === 0 && event.which === 116) || (scope.commtest_counter === 1 && event.which === 101) || (scope.commtest_counter === 2 && event.which === 115)) {
                        scope.commtest_counter = scope.commtest_counter + 1;
                    } else if (scope.commtest_counter === 3 && event.which === 116) {
                        scope.openCommTestDialog();
                        scope.commtest_counter = 0;
                    } else {
                        scope.commtest_counter = 0;
                    }
                });
            }
        };
    });

}());
