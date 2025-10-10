/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*global angular*/
/*global $*/
/*global ScreenCapture*/
/*global chrome*/
/*global Blob */
/*global toTIDataURLtoUint8Array */
/*global JSZip */
(function () {
    'use strict';
    var app = angular.module('device-views-screencapture', ['ngAnimate']);
    app.directive('screenCaptures', function ($filter, $timeout) {
        return {
            restrict: 'E',
            templateUrl: 'templates/screen-captures.html',
            link: function (scope, element, attrs) {
                var connect = scope.connect;

                connect.screens = 'screens';
                connect.capNum = 1;
                connect.selectedScreens = function() {
                    return $filter('filter')(scope.model.screens, {selected: true});
                };

                connect.clearScreenSelection = function () {
                    scope.model.screens.forEach(function(element) {
                        element.selected = false;
                    });
                };

                connect.clickScreenCapturesArea = function () {
                    if (connect.primary === connect.screens) {
                        connect.clearScreenSelection();
                    } else {
                        connect.primary = connect.screens;
                    }
                    scope.model.selectedAll = connect.areSelectedAll();
                    connect.setBorderState();
                };

                connect.canTakeScreenCap = function () {
                    return connect.currentDevice !== null && 
                            typeof connect.currentDevice !== "undefined" && 
                            !connect.screenCapPending;
                };

                connect.takeScreenCap = function () {
                    var tiDevice,
                        screenObj;
                    if (connect.canTakeScreenCap()) {
                        if(connect.isChromeLocalStorageAvailable()) {
                            tiDevice = connect.dm.getDeviceWithID(connect.currentDevice.chromeDeviceID);
                            if (tiDevice) {
                                screenObj = new ScreenCapture();
                                tiDevice.getScreenSnapshot(function () { // onStart
                                    scope.ga_tracker.sendEvent('Transfer', 'Receive', 'screen');
                                    screenObj.name = 'Capture ' + connect.capNum;
                                    screenObj.id = connect.capNum;
                                    connect.capNum += 1;
                                    scope.model.screens.push(screenObj);
                                    connect.screenCapPending = true;
                                    setTimeout(function () {
                                        // scroll to bottom of screen captures view
                                        var sc = $("#ScreenCaptures");
                                        sc.scrollTop(sc.prop("scrollHeight"));
                                    }, 500);
                                    scope.$apply();
                                }, function (imageData) { // onSuccess
                                    var width = 320,
                                        height = 240,
                                        canvas,
                                        ctx,
                                        idata,
                                        dataURL;
                                    connect.screenCapPending = false;
                                    AppLogger.log("screenCaptureAvailable called");
                                    canvas = $("#theCanvas")[0];
                                    ctx = canvas.getContext('2d');
                                    canvas.width = width; //TODO: get these values from the device info
                                    canvas.height = height; //TODO: get these values from the device info
                                    idata = ctx.createImageData(width, height);
                                    idata.data.set(imageData);
                                    ctx.putImageData(idata, 0, 0);
                                    dataURL = canvas.toDataURL();
                                    AppLogger.log(dataURL);
                                    connect.clearScreenSelection();
                                    screenObj.imgSrc = dataURL;
                                    connect.saveScreenCaptures();
                                    scope.$apply();
                                }).then(undefined, function (err) {
                                    scope.ga_tracker.sendException(err, false);
                                    // TODO display error                       
                                });
                            }
                        }
                        else {
                            connect.openLocalStorageDialog();
                        }
                    }
                };

                connect.deleteScreenCapture = function (screen) {
                    var id = screen.id;
                    scope.model.screens = scope.model.screens.filter(function (e, i) {
                        return e.id !== id;
                    });
                    connect.saveScreenCaptures();
                    //If last selected screen was removed, initiliaze global vars
                    if (scope.selection.lastScreenSelected === screen) {
                        scope.selection.lastScreenSelected = null;
                        scope.selection.lastScreenIndex = null;
                    } else {
                        //Decrease variable since one screen was removed
                        scope.selection.lastScreenIndex = scope.selection.lastScreenIndex - 1;
                    }
                };

                connect.shiftKeyScreenAction = function (screen, clear) {
                    if (clear) {
                        connect.clearScreenSelection();
                    }
                    connect.selectAction(scope.selection.lastScreenSelected,
                                         scope.selection.lastScreenIndex,
                                         screen,
                                         scope.model.screens);
                };
                connect.screenClick = function (screen, event) {
                    connect.primary = connect.screens;

                    if (event.button === 0) {
                        if (event.shiftKey && (event.metaKey || event.ctrlKey)) {
                            connect.shiftKeyScreenAction(screen, false);
                        } else if (event.shiftKey) {
                            connect.shiftKeyScreenAction(screen, true);
                        } else if (event.metaKey || event.ctrlKey) {
                            if (screen.selected) {
                                screen.selected = false;
                            } else {
                                scope.selection.lastScreenIndex = connect.getScreenIndex(screen);
                                scope.selection.lastScreenSelected = screen;
                                screen.selected = true;
                            }
                        } else {
                            scope.selection.lastScreenIndex = connect.getScreenIndex(screen);
                            scope.selection.lastScreenSelected = screen;
                            connect.clearScreenSelection();
                            screen.selected = true;
                        }
                    }

                    connect.setBorderState();

                    event.stopPropagation();
                };

                connect.canSaveScreens = function () {
                    return connect.primary === connect.screens && connect.selectedScreens().length > 0;
                };

                connect.saveScreens = function () {
                    var ext = "png",
                        fileName = "";
                    if (connect.canSaveScreens()) {
                        if (connect.selectedScreens().length > 1) {
                            chrome.fileSystem.chooseEntry({
                                type: "openDirectory"
                            }, function (fileEntry) {
                                var i,
                                    j,
                                    ss = connect.selectedScreens(),
                                    total = ss.length; 
                                if (chrome.runtime.lastError) {
                                    AppLogger.warn('Opening save as chooser: ', chrome.runtime.lastError);
                                    connect.stopAnimation(connect.animations.sendFilesToComp);
                                    return;
                                }
                                if (typeof fileEntry === "undefined" || fileEntry.length === 0) {
                                    // action canceled by user
                                    return;
                                }
                                if (!connect.currentDevice) {
                                    return;
                                }
                                for (i = 0; i < total; i = i + 1) {
                                    j = 0;
                                    chrome.fileSystem.getWritableEntry(fileEntry, function (writableEntry) {
                                        var screen = ss[j],
                                            fileName = screen.name + "." + ext;
                                        j = j + 1;
                                        writableEntry.getFile(fileName, {
                                            create: true
                                        }, function (createFileEntry) {
                                            connect.saveScreen(createFileEntry, screen);
                                        });
                                    });
                                }
                            });
                        } else {
                            chrome.fileSystem.chooseEntry({
                                type: "saveFile",
                                suggestedName: scope.selection.lastScreenSelected.name + ".png",
                                accepts: [{
                                    extensions: ["png"]
                                }] // ["8xn", "8xl", "8xm"] }]
                            }, function (fileEntry) {
                                var file = scope.selection.lastScreenSelected;
                                if (chrome.runtime.lastError) {
                                    AppLogger.warn('Opening save as chooser: ', chrome.runtime.lastError);
                                    return;
                                }
                                if (typeof fileEntry === "undefined" || fileEntry.length === 0) {
                                    // action canceled by user
                                    return;
                                }
                                if (!connect.currentDevice) {
                                    return;
                                }

                                scope.ga_tracker.sendEvent('Transfer', 'Receive', ext);
                                // save user's input name into the screen capture title if it is different
                                fileName = fileEntry.name.replace(/\.png$/i, ''); // remove file extension
                                connect.saveScreen(fileEntry, file);

                                if (scope.selection.lastScreenSelected.name !== fileName) {
                                    scope.selection.lastScreenSelected.name = fileName;
                                    scope.$apply();
                                    // save all screen captures in case either dirty or name has changed.
                                    connect.saveScreenCaptures();
                                }

                            });
                        }

                    }

                };

                connect.saveScreen = function (fileEntry, file) {
                    fileEntry.createWriter(function (writer) {
                        var blob;
                        try {
                            writer.onwriteend = function (e) {
                                writer.onwriteend = undefined;
                                this.truncate(this.position);
                            };
                            //                    blob = new Blob([connect.getImgRawData(file.imgSrc)], { type: "image/png" });
                            blob = new Blob([file.getImgArrayData()], {
                                type: "image/png"
                            });
                            writer.write(blob);

                            if (file.dirty === true) {
                                file.dirty = false;
                                // save all screen captures in case either dirty or name has changed.
                                connect.saveScreenCaptures(); // once we listen for the application closing we might do it only once there
                                scope.$apply();
                            }
                        } catch (err) {
                            scope.ga_tracker.sendException(err, false);
                            AppLogger.error(err);
                        }

                    });
                };

                connect.toggleScreenBorders = function () {
                    var ss = connect.selectedScreens(),
                        screen;
                    connect.screenBorders = !connect.screenBorders;
                    for (var i = 0; i < ss.length; i += 1) {
                        screen = ss[i];
                        screen.border = connect.screenBorders;
                    }
                    connect.saveScreenCaptures();
                };

                connect.loadScreenCaptures = function () {
                    chrome.storage.local.get("screenCaptures", function (items) {
                        var screen, screens;
                        try {
                            if (chrome.runtime.lastError) {
                                AppLogger.warn('unable to load screen captures from chrome sync');
                            } else {
                                if (typeof items !== 'undefined') {
                                    AppLogger.log("screens = ", items);
                                    if (typeof items.screenCaptures === 'string' && items.screenCaptures) {
                                        screens = JSON.parse(items.screenCaptures);
                                        for (screen in screens) {
                                            if (screens.hasOwnProperty(screen)) {
                                                scope.model.screens[screen] = new ScreenCapture(screens[screen]);
                                            }
                                        }
                                        if (screens.length > 1) {
                                            connect.capNum = 1 + screens.reduce(function (previousValue, currentValue, index, array) {
                                                if (typeof previousValue === "object") {
                                                    return Math.max(previousValue.id, currentValue.id);
                                                } else {
                                                    return Math.max(previousValue, currentValue.id);
                                                }
                                            });
                                            connect.capNum = Math.max(1, connect.capNum);
                                        } else if (screens.length === 1) {
                                            connect.capNum = screens[0].id + 1;
                                        }
                                    }
                                }
                                AppLogger.log('successfully loaded screen captures from chrome sync');
                            }
                        } catch (err) {
                            AppLogger.error(err);
                            scope.ga_tracker.sendException(err, false);
                        }
                    });
                };

                connect.saveScreenCaptures = function () {
                    var allCaptures;
                    if (connect.currentDevice) {
                        allCaptures = JSON.stringify(scope.model.screens);
                        if (allCaptures) {
                            chrome.storage.local.set({
                                screenCaptures: allCaptures
                            }, function () {
                                if (chrome.runtime.lastError) {
                                    AppLogger.warn('error saving screen captures to chrome sync');
                                } else {
                                    AppLogger.log('success saved screen captures to chrome sync');
                                }
                            });
                        }
                    }
                };

                connect.setBorderState = function() {
                    var borderState = true,
                        ss = connect.selectedScreens();
                    for (var i = 0; i < ss.length; i += 1) {
                        if(ss[i].border === undefined || !ss[i].border) {
                            borderState = false;
                            break;
                        }
                    }
                    connect.screenBorders = borderState;
                };

                connect.loadScreenCaptures();

                connect.deleteScreensSelection = function() {
                    scope.model.screens = scope.model.screens.filter(function (e, i) { return !e.selected; });
                    connect.saveScreenCaptures();
                    scope.selection.lastScreenSelected = null;
                    scope.selection.lastScreenIndex = null;  
                };
                
                connect.isChromeLocalStorageAvailable = function() {
                    var stats,
                        area,
                        areaName = 'local',
                        limit = 250000,
                        result = false;
                    
                    area = chrome.storage[areaName];
                    stats = scope.model.chromeStorageStats[areaName];
                    
                    if(stats.remaining >= limit) {
                        AppLogger.log("there is enough space for taking screen captures");
                        result = true;
                    }
                    else {
                        AppLogger.log("there is NO enough space for taking screen captures");
                    }
                    
                    AppLogger.info('chrome.storage.' + areaName + ':' + JSON.stringify(stats));
                    return result;
                };
                
                connect.copyScreenToClipboard = function() {
                    document.oncopy = function(event) {
                        var screen = undefined;       
                        var selectedScreens = connect.selectedScreens(); 
                        var html = "";

                        if (selectedScreens.length > 0) {
                            for(var i=0; i<selectedScreens.length; i++) {
                                screen = selectedScreens[i];
                                html += "<img src='"+screen.imgSrc+"'>";
                            }
                            event.clipboardData.setData('text/html', html);
                            event.preventDefault();
                        }
                    };
                    document.execCommand("Copy");
                }
                
                // select-all listener
                $(document).on('keydown', function (event) {
                    var select = false;
                    // only Mac OSx supports unselect all but let's keep it for all platforms in our app.
                    if (connect.primary === connect.screens && event.which === 65 &&  (event.metaKey || event.ctrlKey)) { 
                        select = !event.shiftKey;
                        connect.selectAllScreens(select);
                        scope.model.selectedAll = select;
                    }
                    // Capture Screens (CMD/CTRL + T)
                    else if(event.which === 84 && (event.metaKey || event.ctrlKey) && connect.canTakeScreenCap()) {
                        if(connect.primary === connect.files) { 
                            $("#ScreenCaptures").click();
                        }
                        connect.takeScreenCap();
                    }
                    // Save As (SHIFT + CMD/CTRL + S)
                    else if(event.which === 83  && 
                            event.shiftKey &&
                            (event.metaKey || event.ctrlKey)) {
                        connect.saveScreens();
                    }
                    // Copy (CMD/CTRL + C)
                    else if(event.which === 67  && 
                            (event.metaKey || event.ctrlKey) &&
                            connect.canCopySelection()) {
                        connect.copySelection();
                    }
                });
            }
        };
    });

    app.directive('draggablescreen', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var connect = scope.connect;
                element.screen = attrs.screen;
                scope.handleDragStart = function (e) {
                    var selectedScreens = connect.selectedScreens(),
                        filteredScreens, //used to see if the dragged screen is also selected
                        zip,
                        screen,
                        draggedScreen,
                        i;
                    draggedScreen = JSON.parse($(this).attr("screen")); // this attribute was added on the html side
                    if (selectedScreens.length === 0) { //there are no selected screens, so only save the screen being dragged
                        event.dataTransfer.setData('DownloadURL', 'image/png:' + draggedScreen.name + '.png:' + draggedScreen.imgSrc);
                    } else {
                        // add the currently dragged item if not selected
                        filteredScreens = selectedScreens.filter(function (screen) {
                            return screen.id === draggedScreen.id;
                        });
                        if (filteredScreens.length === 0) {
                            selectedScreens.push(draggedScreen);
                        }
                        // if only one image is selected+dragged, then set the drop as an image
                        if (selectedScreens.length <= 1) {
                            draggedScreen = selectedScreens[0];
                            event.dataTransfer.setData('DownloadURL', 'image/png:' + draggedScreen.name + '.png:' + draggedScreen.imgSrc);
                        } else {
                            zip = new JSZip();
                            for (i = 0; i < selectedScreens.length; i += 1) {
                                screen = selectedScreens[i];
                                zip.file(screen.name + '.png', toTIDataURLtoUint8Array(screen.imgSrc));
                            }
                            //                    add date here
                            event.dataTransfer.setData('DownloadURL', "application/zip:" + scope.getCurrentDateString() + ".zip:data:image/png;base64," + zip.generate({
                                "binary": false
                            }));
                        }
                    }
                };
                element[0].addEventListener('dragstart', scope.handleDragStart, false);
            }
        };
    });

    app.directive("contenteditablescreen", function () {
        return {
            restrict: "A",
            require: "ngModel",
            scope: true,
            link: function (scope, element, attrs, ngModel) {
                function read() {
                    var html = element.html();
                    html = html.replace(/&nbsp;/g, "\u00a0");
                    html = html.replace(/&amp;/g, "\u00a0");
                    ngModel.$setViewValue(html);
                }

                ngModel.$render = function () {
                    element.html(ngModel.$viewValue);
                };

                element.bind("blur", function (e) {
                    var editingScreen = JSON.parse($(this).attr("screen")),
                        filteredScreens = scope.model.screens.filter(function (screen) {
                            return screen.id === editingScreen.id;
                        });
                    filteredScreens[0].dirty = true;
                    scope.$apply(read);
                });

                element.bind("keyup change", function (e) {
                    scope.$apply(read);
                });

                element.bind("keydown", function (e) {
                    if (e.keyCode === 13) {
                        if (!ngModel.$viewValue || ngModel.$viewValue.trim().length === 0) {
                            ngModel.$rollbackViewValue();
                            scope.screen.name = ngModel.cachedName;
                        }
                        element[0].blur();
                        e.preventDefault();
                    } else if (e.keyCode === 27) {
                        ngModel.$rollbackViewValue();
                        scope.screen.name = ngModel.cachedName;
                        element[0].blur();
                        e.preventDefault();
                    } else if (e.which === 191) { // filter / and ?
                        e.preventDefault();
                    } else if (e.which === 220) { // filter \ and |
                        e.preventDefault();
                    } else if (e.which === 229) { // filter ' and "
                        e.preventDefault();
                    } else if (e.shiftKey && e.which === 56) { // filter *
                        e.preventDefault();
                    } else if (e.shiftKey && e.which === 186) { // filter :
                        e.preventDefault();
                    } else if (e.shiftKey && e.which === 188) { // filter <
                        e.preventDefault();
                    } else if (e.shiftKey && e.which === 190) { // filter >
                        e.preventDefault();
                    } else {
                        //AppLogger.log("e.which=" + e.which);
                        AppLogger.log("ngModel.viewValue=" + ngModel.$viewValue);
                        scope.$apply(read);
                    }
                });

                element.bind("focus", function (e) {
                    //AppLogger.log(ngModel.$viewValue);
                    ngModel.cachedName = ngModel.$viewValue;
                    ngModel.$render();
                });
            }
        };
    });

}());
