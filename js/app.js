/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*global DeviceManager */
/*global languageMap */
/*global ARCHIVED */
/*global analytics */
/*global TI_File */
/*global ProductCodes */
/*global TI_CommTest */
/*global TI84CE_TYPES */
/*global TI83PLUS_DEVICE */
/*global TI84CE_COLOR_IMAGE_VERSION */
/*global ImageUtilities */

(function () {
    'use strict';
    var app;

    const ANALYTICS_YES = 'Yes, I want to help';
    const ANALYTICS_NO = 'No thanks';
    const ANALYTICS_TITLE = 'Texas Instruments';
    const ANALYTICS_DESC = 'Help Us Improve This Product';

    const ANALYTICS_TEXT1 = 'By selecting the "Yes, I want to help" option below, you agree to allow TI to automatically collect anonymous information about: 1) product usage and 2) product reliability. This anonymous information will be used by TI to improve the reliability and performance of this product and improve TI products to better meet customer needs.';
    const ANALYTICS_TEXT2 = 'The system TI uses to collect this data does not gather any personally identifiable information. TI will only use the data it gathers in this manner for the purposes described above.';

    app = angular.module('ConnectApp', ['toolbar-app', 'device-views', 'device-views-screencapture', 'device-views-screencapture-slideshow', 'ngAnimate', 'ngTouch', 'ngDialog', 'ngSanitize']);

    app.config(['ngDialogProvider', function (ngDialogProvider) {
        ngDialogProvider.setDefaults({
            className: 'ngdialog-theme-default',
            plain: false,
            showClose: false,
            closeByDocument: false,
            closeByEscape: true
        });
    }]);

    app.filter('fixGlyphs', function () {
        function replacer(match) {
            switch (match) {
                case '\uF038':
                    return '\u1D1B';
                default:
                    return '?';
            }
        }
        return function (input) {
            var output = input;
            if (typeof input === 'string') {
                output = input.replace(/(\uF038)/, replacer);
            }
            return output;
        };
    });

    app.filter('bytesToString', function () {
        // generic utility function to format sizes in short human readable form
        return function (input) {
            var output = "",
                labels = [' B', ' KB', ' MB', ' GB', ' TB', ' PB', ' EB', ' ZB', ' YB'],
                f;
            input = parseInt(input, 10);
            if (!isNaN(input)) {
                for (f = 0; f < labels.length; f = f + 1) {
                    if (input < Math.pow(1024, f + 1)) {
                        output = Math.round(input / Math.pow(1024, f) * 10) / 10;
                        if (output >= 1000) {
                            output = output.toString();
                            output = output.slice(0, 1) + ',' + output.slice(1);
                        }
                        output = output + labels[f];
                        break;
                    }
                }
            }
            return output;
        };
    });

    app.config(function ($compileProvider) {
        //  Default imgSrcSanitizationWhitelist: /^\s*((https?|ftp|file|blob):|data:image\/)/
        //  chrome-extension: will be added to the end of the expression
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob|chrome-extension):|data:image\//);
    });
    app.controller('ConnectController', function ($scope, $window, ngDialog, $filter, $timeout) {
        var connect = this,
            settings = {
                // defaults
                replace: true
            },
            settingsLoaded = false,
            fileTypes = {
                'REAL': {
                    name: 'Real Number',
                    icon: 'images/filetype_real.svg'
                },
                'REAL_LIST': {
                    name: 'Real List',
                    icon: 'images/filetype_list.svg'
                },
                'MATRIX': {
                    name: 'Matrix',
                    icon: 'images/filetype_matrix.svg'
                },
                'EQUATION': {
                    name: 'Equation',
                    icon: 'images/filetype_equation.svg'
                },
                'STRING': {
                    name: 'String',
                    icon: 'images/filetype_string.svg'
                },
                'PROGRAM': {
                    name: 'Program',
                    icon: 'images/filetype_program.svg'
                },
                'PICTURE': {
                    name: 'Picture',
                    icon: 'images/filetype_image.svg'
                },
                'GRAPH_DATABASE': {
                    name: 'Graph Database',
                    icon: 'images/filetype_graphdb.svg'
                },
                'COMPLEX_NUMBER': {
                    name: 'Complex Number',
                    icon: 'images/filetype_real.svg'
                },
                'COMPLEX_LIST': {
                    name: 'Complex List',
                    icon: 'images/filetype_list.svg'
                },
                'WINDOW': {
                    name: 'Window',
                    icon: 'images/filetype_range.svg'
                },
                'USER_ZOOM': {
                    name: 'User Zoom Recall Window',
                    icon: 'images/filetype_range.svg'
                },
                'TABLE_SETUP': {
                    name: 'Table Setup',
                    icon: 'images/filetype_range.svg'
                },
                'APPVAR': {
                    name: 'AppVar',
                    icon: 'images/filetype_app.svg'
                },
                'GROUP': {
                    name: 'Group',
                    icon: 'images/filetype_group.svg'
                },
                'IMAGE': {
                    name: 'Image',
                    icon: 'images/filetype_image.svg'
                },
                'FLASHAPP': {
                    name: 'Flash Application',
                    icon: 'images/filetype_app.svg'
                },
                // SENDOS: add Send OS File Type
                'OS' : {
                    name: 'OS File',
                    icon: 'images/filetype_os.svg'
                }
            },
            animations = {
                pressToRefresh: {
                    name: 'Press To Refresh',
                    value: false,
                    iconLeft: '',
                    iconMiddle: 'images/animation_sync.svg',
                    iconRight: ''
                },
                refresh: {
                    name: 'Refresh Files',
                    value: false,
                    iconLeft: '',
                    iconMiddle: 'images/animation_sync.svg',
                    iconRight: ''
                },
                deleteFiles: {
                    name: 'Delete Files',
                    value: false,
                    iconLeft: 'images/animation_files.svg',
                    iconMiddle: 'images/animation_arrow.svg',
                    iconRight: 'images/animation_delete.svg',
                    legend: ''
                },
                sendFilesToDevice: {
                    name: 'Send Files To Device',
                    value: false,
                    iconLeft: 'images/animation_files.svg',
                    iconMiddle: 'images/animation_arrow.svg',
                    iconRight: 'images/animation_calculator.svg',
                    legend: ''
                },
                sendOSToDevice: {
                    name: 'Send OS To Device',
                    value: false,
                    iconLeft: 'images/animation_os.svg',
                    iconMiddle: 'images/animation_arrow.svg',
                    iconRight: 'images/animation_calculator.svg',
                    legend: 'Receiving OS ',
                    progress: 'Please hold..the OS on this calculator is being updated to version '
                },
                sendFilesToComp: {
                    name: 'Send Files To Computer',
                    value: false,
                    iconLeft: 'images/animation_calculator.svg',
                    iconMiddle: 'images/animation_arrow.svg',
                    iconRight: 'images/animation_files.svg',
                    legend: ''
                },
                deviceConnectionFailed: {
                    name: 'Device Connection Failed',
                    value: false,
                    iconLeft: '',
                    iconMiddle: 'images/animation_fail.svg',
                    iconRight: '',
                    legend: 'Uh-Oh..',
                    progress: 'It looks like this calculator is not responding properly. Sorry about that. We recommend reinstalling the operating system to fix this issue.'
                },
                screenCapture: {
                    iconMiddle: 'images/animation_capture.svg'
                }
            };

        var openAndProcessAnalyticsDialog = function(config) {
            ngDialog.open({
                template: 'templates/dialog-long-message.html',
                data: { 
                    title: ANALYTICS_TITLE, 
                    desc: ANALYTICS_DESC,
                    paragraph1: ANALYTICS_TEXT1,
                    paragraph2: ANALYTICS_TEXT2,
                    confirm: ANALYTICS_YES,
                    close : ANALYTICS_NO
                }
            }).closePromise.then(function (data) {
                if (data.value === ANALYTICS_YES) {
                    chrome.storage.local.set({'analyticsPermission': "1"}, function() {
                        AppLogger.log('Set Anlytics Permission to true');
                        config.setTrackingPermitted(true);
                    });
                } else { // NO
                    chrome.storage.local.set({'analyticsPermission': "0"}, function() {
                        AppLogger.log('Set Anlytics Permission to false');
                        config.setTrackingPermitted(false);
                    });
                }
            });
        };
        
        $scope.getCurrentDateString = function () {
            var retVal,
                d = new Date(),
                s = "00" + d.getMonth() + 1;

            retVal = d.getFullYear().toString() + s.substr(s.length - 2);
            s = "00" + (d.getDay() + 1);
            retVal += s.substr(s.length - 2);
            return retVal;
        };
        $scope.selection = {
            lastScreenIndex: null,
            lastScreenSelected: null
        };

        connect.collapseExplorer = false;
        connect.files = 'files';

        // Screens model
        $scope.model = {};
        $scope.model.screens = [];

        $scope.predicate = 'name';

        connect.specialTypes = false;
        connect.files = 'files';
        connect.screens = 'screens';
        connect.primary = connect.files;
        connect.refreshPending = false;
        connect.screenCapPending = false;
        connect.fileTypes = fileTypes;
        connect.animations = animations;
        connect.showAnimation = false;
        connect.isAnimationDisplayed = false;
        connect.zoomScreen = {
            open: false,
            hasPrev: true,
            hasNext: true
        };

        // Google Analytics
        $scope.ga_service = analytics.getService('StudentConnect');
        $scope.ga_tracker = $scope.ga_service.getTracker('UA-41318001-8');
        $scope.ga_service.getConfig().addCallback(
            /** @param {!analytics.Config} config */
            function (config) {
                config.setTrackingPermitted(false);
                chrome.storage.local.get('analyticsPermission', function(result) {
                    if (result.analyticsPermission === undefined) {
                        openAndProcessAnalyticsDialog(config);
                        if (config.isTrackingPermitted()) {
                            $scope.ga_tracker.sendAppView('MainView');
                        }
                    } else if (result.analyticsPermission == "1") {
                        config.setTrackingPermitted(true);
                        $scope.ga_tracker.sendAppView('MainView');
                    } else {
                        config.setTrackingPermitted(false);
                    }
                });
            }
        );

        chrome.storage.sync.get("settings", function (items) {
            var property;
            if (chrome.runtime.lastError) {
                AppLogger.warn('unable to load settings from chrome sync');
            } else {
                if (typeof items !== 'undefined') {
                    if (typeof items.settings === 'object' && items.settings) {
                        for (property in items.settings) {
                            if (items.settings.hasOwnProperty(property)) {
                                AppLogger.log('setting ' + property + '=' + items.settings[property]);
                                settings[property] = items.settings[property];
                            }
                        }
                    }
                }
                AppLogger.log('successfully loaded settings from chrome sync');
                AppLogger.log('sync items=' + JSON.stringify(items));
                AppLogger.log('settings=' + JSON.stringify(settings));
                $scope.$apply();
                settingsLoaded = true;
            }
        });
        connect.getSetting = function (name) {
            var value;
            if (!settingsLoaded) {
                AppLogger.warn('reading setting before settings have been loaded from chrome sync');
            }
            if (typeof settings[name] !== 'undefined') {
                value = settings[name];
            }
            return value;
        };
        connect.setSetting = function (name, value) {
            settings[name] = value;
            chrome.storage.sync.set({
                settings: settings
            }, function () {
                if (chrome.runtime.lastError) {
                    AppLogger.warn('error saving settings to chrome sync');
                } else {
                    AppLogger.log('success saved settings to chrome sync');
                }
            });
        };

        connect.dm = new DeviceManager();
        connect.dm.registerListener(connect);
        connect.dm.init();
        connect.showSettingsMenu = false;
        connect.screenBorders = true;
        connect.devices = [];
        connect.currentDevice = null;
        connect.previousFiles = undefined;
        connect.manifest = chrome.runtime.getManifest();

        connect.getFileType = function (id) {
            var typeObj = fileTypes[id],
                type = 'Unknown';
            if (typeObj) {
                type = typeObj.name;
            }
            return type;
        };
        connect.getFileIcon = function (id) {
            var typeObj = fileTypes[id],
                icon = 'images/filetype_app.svg';
            if (typeObj) {
                icon = typeObj.icon;
            }
            return icon;
        };

        connect.noDeviceDoubleClick = function (event) {
            if (event.shiftKey) {
                connect.dm.attachTestDevice();
            }
        };


        connect.canCollect = function () {
            var can = false,
                i;
            if (!connect.collapseExplorer && connect.currentDevice && connect.primary === connect.files) {
                for (i = 0; i < connect.currentDevice.files.length; i += 1) {
                    if (connect.currentDevice.files[i].selected) {
                        can = true;
                        break;
                    }
                }
            }
            return can;
        };

        connect.collectFiles = function () {
            var tiDevice,
                selectedFiles,
                cancelled = false,
                isCancelledFunc;
            connect.cancelFunc = function () {
                cancelled = true;
            };
            isCancelledFunc = function () {
                return cancelled;
            };
            if (connect.canCollect()) {
                connect.primary = connect.files;
                connect.collapseExplorer = false;
                tiDevice = connect.dm.getDeviceWithID(connect.currentDevice.chromeDeviceID);
                selectedFiles = connect.selectedFiles();

                AppLogger.debug('Selected files iteration: \n', selectedFiles, '\nStored selected files: ', selectedFiles);
                $scope.ga_tracker.sendEvent('Transfer', 'ReceiveCount', selectedFiles.length);
                if (selectedFiles.length > 1) {
                    chrome.fileSystem.chooseEntry({
                        type: "openDirectory"
                    }, function (fileEntry) {
                        var i,
                            total = selectedFiles.length;
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
                            connect.getFileToFolder(tiDevice, fileEntry, selectedFiles[i], i + 1, total, isCancelledFunc);
                        }
                    });
                } else {
                    var ext = tiDevice.getExtensionForType($scope.model.lastFileSelected.typeID);
                    chrome.fileSystem.chooseEntry({
                        type: "saveFile",
                        suggestedName: $scope.model.lastFileSelected.name + "." + ext,
                        accepts: [{
                            extensions: [ext]
                        }] // ["8xn", "8xl", "8xm"] }]
                    }, function (fileEntry) {
                        var file = $scope.model.lastFileSelected;
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
                        $scope.ga_tracker.sendEvent('Transfer', 'Receive', ext);
                        tiDevice.getObject(file.name, file.typeID, function () { // onStart
                            connect.animations.sendFilesToComp.legend = 'Receiving file 1 of 1';
                            connect.animations.sendFilesToComp.fileName = file.name;
                            connect.startAnimation(connect.animations.sendFilesToComp);
                        }, function (receivedTIFile) { // onSuccess
                            connect.stopAnimation(connect.animations.sendFilesToComp);
                            fileEntry.createWriter(function (writer) {
                                var data,
                                    blob;
                                try {
                                    data = receivedTIFile.retrieveDataWithFormat();
                                    writer.onwriteend = function (e) {
                                        writer.onwriteend = undefined;
                                        this.truncate(this.position);
                                    };
                                    AppLogger.log('DATA FILE: ', data.toString16());
                                    blob = new Blob([data], {
                                        type: "application/octet-stream"
                                    });
                                    writer.write(blob); // "octet/stream" } ));// "application/octet-stream"
                                } catch (err) {
                                    $scope.ga_tracker.sendException(err, false);
                                    AppLogger.error(err);
                                }
                            });
                        }, function (err) { // onFailure
                            $scope.ga_tracker.sendException(err, false);
                            connect.stopAnimation(connect.animations.sendFilesToComp);
                            // TODO show error
                        }, isCancelledFunc);
                    });
                }
            }
        };

        connect.getFileToFolder = function (tiDevice, fileEntry, file, index, total, isCancelledFunc) {
            var ext = tiDevice.getExtensionForType(file.typeID),
                fileName = $filter('fixGlyphs')(file.name) + '.' + ext;
            $scope.ga_tracker.sendEvent('Transfer', 'Receive', ext);
            tiDevice.getObject(file.name, file.typeID, function () { // onStart
                connect.animations.sendFilesToComp.legend = 'Receiving file ' + index + ' of ' + total;
                connect.animations.sendFilesToComp.fileName = file.name;
                connect.startAnimation(connect.animations.sendFilesToComp);
            }, function (receivedTIFile) { // onSuccess
                connect.stopAnimation(connect.animations.sendFilesToComp);
                chrome.fileSystem.getWritableEntry(fileEntry, function (writableEntry) {
                    writableEntry.getFile(fileName, {
                        create: true
                    }, function (createFileEntry) {
                        createFileEntry.createWriter(function (writer) {
                            var data,
                                blob;
                            try {
                                data = receivedTIFile.retrieveDataWithFormat();
                                writer.onwriteend = function (e) {
                                    writer.onwriteend = undefined;
                                    this.truncate(this.position);
                                };
                                blob = new Blob([data], {
                                    type: "application/octet-stream"
                                });
                                writer.write(blob); // "octet/stream" } ));// "application/octet-stream"
                            } catch (err) {
                                AppLogger.error(err);
                                $scope.ga_tracker.sendException(err, false);
                            }
                        });
                    });
                });
            }, function (err) { // onFailure
                $scope.ga_tracker.sendException(err, false);
                connect.stopAnimation(connect.animations.sendFilesToComp);
                // TODO show error
            }, isCancelledFunc);
        };

        connect.sendFiles = function () {
            var tiDevice, validExtensions;
            if (connect.canSend()) {
                tiDevice = connect.dm.getDeviceWithID(connect.currentDevice.chromeDeviceID);
                validExtensions = tiDevice.getSendObjectValidExtensions();
                validExtensions.push("png"); // add PNG support
                validExtensions.push("jpg"); // add PNG support
                validExtensions.push("jpeg"); // add PNG support
                validExtensions.push("gif"); // add PNG support
                validExtensions.push("bmp"); // add PNG support

                try {
                    chrome.fileSystem.chooseEntry({
                        type: "openFile",
                        accepts: [{
                            description: tiDevice.name + " Files",
                            extensions: validExtensions
                        }],
                        acceptsMultiple: true
                    }, function (fileEntries) {
                        connect.processSendFileEntries(fileEntries);
                    });
                } catch (err) {
                    AppLogger.error(err);
                    setTimeout(function () {
                        connect.stopAnimation(connect.animations.sendFilesToDevice);
                    }, 0);
                }
            }
        };


        connect.change = function (file) {
            var new_dialog,
                tiFile = file.tiFile,
                ngDialogData = {
                    objectType: file.objectType,
                    maxLength: file.tiFile.getMaxCustomNameLength(),
                    newName: file.devName,
                    nameRegex: file.tiFile.getValidNameRegex()
                };
            //If Custom option was selected, the Custom Filename Dialog will be displayed
            if (file.newName.toUpperCase() === 'Custom'.toUpperCase()) {
                //Opening the Custom Filename Dialog with the data type name and the max length 
                //that will be used in the description
                new_dialog = ngDialog.open({
                    template: 'templates/dialog-custom-filename.html',
                    data: ngDialogData
                });
                new_dialog.closePromise.then(function (data) {
                    var i,
                        foundExisting = false;
                    //If Done button was clicked and there is a valid custom filename, let's add it as a new option
                    if (data.value === 'Done' && tiFile.isValidName(ngDialogData.newName)) {
                        for (i = 0; i < file.filenameOptions.length; i = i + 1) {
                            if (file.filenameOptions[i] === ngDialogData.newName) {
                                foundExisting = true;
                            }
                        }
                        if (!foundExisting) {
                            file.filenameOptions.unshift(ngDialogData.newName);
                        }
                        file.newName = ngDialogData.newName;
                    } else {
                        AppLogger.log("No custom name will be set");
                        file.newName = file.devName;
                    }
                });
            }
            file.memTypeOptions = file.memTypeOptionsFunc(file.newName);
            if (file.memTypeOptions.length === 1) {
                file.memType = file.memTypeOptions[0];
            }
        };

        /**
         * Displays the showSendOSToHandheldDialog dialog with the list of the given OS file
         */
        connect.showSendOSToHandheldDialog = function (tiDevice, file) { // SENDOS: adding support
            var localSettings,
                ngDialogData,
                dialog;
            // done reading files
            localSettings = {
                replace: connect.getSetting('replace')
            };
            AppLogger.log('before dialog replace=' + localSettings.replace);
            // open dialog
            ngDialogData = {
                device: connect.currentDevice,
                file: file,
                settings: localSettings
            };

            dialog = ngDialog.open({
                template: 'templates/dialog-send-os.html',
                data: ngDialogData,
                controller: ['$scope', function ($scope) {
                    $scope.removeArrayIndex = connect.removeArrayIndex;
                    $scope.change = connect.change;
                    $scope.getHashKeyNumber = connect.getHashKeyNumber;
                }]
            });
            dialog.closePromise.then(function (data) {
                var cancelled = false,
                    isCancelledFunc,
                    ext;
                connect.cancelFunc = function () {
                    cancelled = true;
                };
                isCancelledFunc = function () {
                    return cancelled;
                };
                AppLogger.log('dialog closed with value: ' + data.value);
                if (data.value === 'Send') {
                    connect.setSetting('replace', ngDialogData.settings.replace);
                    $scope.ga_tracker.sendEvent('TransferOS', 'SendCount', file.length);
                    // connect.sendFile(tiDevice, file.tiFile, file.newName, ext, i + 1, files.length, isCancelledFunc);
                    connect.sendOS(tiDevice, file.tiFile, file.newName, ext, 1, 1, isCancelledFunc);
                    // DO not refresh since UpdateOS will disconnect the calculator - connect.refresh();
                } else {
                    AppLogger.log('send OS File Dialog cancelled');
                }
            }); // dialog.closePromise.then
        };
        /**
         * Displays the SendFilesToHandheld dialog with the list of the given files
         */
        connect.showSendFilesToHandheldDialog = function (tiDevice, files) {
            var localSettings,
                ngDialogData,
                dialog;
            // done reading files
            localSettings = {
                replace: connect.getSetting('replace')
            };
            AppLogger.log('before dialog replace=' + localSettings.replace);
            // open dialog
            ngDialogData = {
                device: connect.currentDevice,
                files: files,
                settings: localSettings
            };

            dialog = ngDialog.open({
                template: 'templates/dialog-send-files.html',
                data: ngDialogData,
                controller: ['$scope', function ($scope) {
                    $scope.removeArrayIndex = connect.removeArrayIndex;
                    $scope.change = connect.change;
                    $scope.getHashKeyNumber = connect.getHashKeyNumber;
                }]
            });
            dialog.closePromise.then(function (data) {
                var i,
                    file,
                    cancelled = false,
                    isCancelledFunc,
                    ext;
                connect.cancelFunc = function () {
                    cancelled = true;
                };
                isCancelledFunc = function () {
                    return cancelled;
                };
                AppLogger.log('dialog closed with value: ' + data.value);
                if (data.value === 'Send') {
                    connect.setSetting('replace', ngDialogData.settings.replace);
                    $scope.ga_tracker.sendEvent('Transfer', 'SendCount', files.length);
                    if(connect.hasDuplicateFilenames(files)){
                        connect.openDuplicateFilenamesDialog(tiDevice, files);
                    }
                    else {
                        for (i = 0; i < ngDialogData.files.length; i = i + 1) {
                            file = ngDialogData.files[i];
                            ext = file.ext;
                            if (file.memType === 'Archive') {
                                file.tiFile.setObjectFlags(ARCHIVED);
                            }
                            connect.sendFile(tiDevice, file.tiFile, file.newName, ext, i + 1, files.length, isCancelledFunc);
                        }
                        connect.refresh();
                    }
                } else {
                    AppLogger.log('send files cancelled');
                }
            }); // dialog.closePromise.then
        };
        
        connect.hasDuplicateFilenames = function(files) {
            var fileNameArr = files.map(function (file) {
                return file.newName;
            });
            return fileNameArr.some(function (fileName, idx) { 
                return fileNameArr.indexOf(fileName) != idx;
            });
        };
        
        connect.openDuplicateFilenamesDialog = function(tiDevice, files){
            var dialog = ngDialog.open({
                template: 'templates/dialog-duplicate-filenames.html',
            });
            
            dialog.closePromise.then(function (data) {
                connect.showSendFilesToHandheldDialog(tiDevice, files);
            });
        };        
        /**
         * Creates a new file model from the given hostFile as name and tiFile as member among other require fields
         * @param tiDevice the tiDevice to assign those files
         * @param hostFile the FileEntry
         * @param the TI_File
         * @return a new file model from the given hostFile as name and tiFile as member among other require fields
         */
        connect.createFileModel = function (tiDevice, hostFile, tiFile, ext) {
            var filenameOptions,
                memTypeOptionsFunc,
                objectName,
                objectType;
            filenameOptions = tiFile.getNameOptions();
            if (!filenameOptions) {
                AppLogger.error(hostFile.name + ' has an unsupported file type ' + tiFile.getObjectType());
                return;
            } else {
                //Getting the filename and data type
                objectName = tiFile.getNameString();
                objectType = tiDevice.getNameForType(tiFile.getObjectType());
                filenameOptions = filenameOptions.slice();
                if (tiFile.supportsCustomNames()) {
                    filenameOptions.push('Custom');
                }
                connect.insertOptionIfNeeded(tiFile, filenameOptions);
                memTypeOptionsFunc = tiFile.getAllowedLocations();
                return {
                    tiFile: tiFile,
                    fileName: hostFile.name.replace(/\.[A-Za-z0-9]+$/, ""),
                    devName: objectName,
                    newName: objectName,
                    filenameOptions: filenameOptions,
                    memType: tiFile.getObjectFlags() === ARCHIVED ? 'Archive' : 'RAM',
                    memTypeOptionsFunc: memTypeOptionsFunc,
                    memTypeOptions: memTypeOptionsFunc(objectName),
                    objectType: objectType,
                    objectTypeLabel: fileTypes[objectType].name,
                    ext: ext,
                    selected: false
                };
            }
        };
        connect.processSendFileOSEntry = function (device, entry) {
            try {
                entry.file(function (file) {
                    var reader = new FileReader(),
                        ext;
                    AppLogger.log("reading file " + entry.name);
                    reader.onerror = function (err) {
                        AppLogger.error(err);
                    };
                    ext = file.name.split('.').pop().toLocaleLowerCase();
                    if (connect.isFileExtensionAllowedOS(device, ext)) {
                        reader.onload = function () {
                            var headerArrayBuffer = reader.result,
                                headerArray = new Uint8Array(headerArrayBuffer),
                                tiFile;
                            tiFile = new TI_File(headerArray);
                            connect.showSendOSToHandheldDialog(device, connect.createFileModel(device, entry, tiFile, ext));
                        };
                        reader.readAsArrayBuffer(file);
                    } else {
                        AppLogger.error(entry.name + ' has an unsupported file type ');
                        $scope.ga_tracker.sendEvent('Transfer', 'SendUnsupported', ext);
                    }
                });
            } catch (err) {
                AppLogger.error(err);
            }
        };
        connect.processSendFileObjectEntries = function (tiDevice, fileEntries) {
            /**
             * Loads the given FileEntry in a Promise
             * @param entry the FileEntry
             * @return a new Promise to load the given file
             */
            var imgCount = 0,
                promises,
                loadFile;
            
            loadFile = function (entry) {
                return new Promise(function (resolve, reject) {
                    try {
                        entry.file(function (file) {
                            var reader = new FileReader(),
                                ext,
                                extLength;
                            AppLogger.log("reading file " + entry.name);
                            reader.onerror = function (err) {
                                AppLogger.error(err);
                                resolve();
                            };
                            ext = file.name.split('.'); // use ext to retrieve length  
                            extLength = ext.length; // validates whether the file has an extension or not
                            ext = ext.pop().toLocaleLowerCase(); // finally retrieves the extension
                            //                            if (ext === "png") { USIGLI
                            if (/\.(jpe?g|png|gif|bmp)$/i.test(file.name)) {
                                reader.onload = function () {
                                    var tiDevice,
                                        tiFile,
                                        typeInfo;
                                    tiDevice = connect.dm.getDeviceWithID(connect.currentDevice.chromeDeviceID);
                                    // TODO: change this piece once duplicated names are validated
                                    if (imgCount > 9) { // reset image counter
                                        imgCount = 0;
                                    }

                                    typeInfo = tiDevice.getTypeInfo('IMAGE');

                                    tiFile = new TI_File();
                                    tiFile.setOwnerCalculatorID(TI83PLUS_DEVICE);
                                    tiFile.setOwnerProductID(ProductCodes.TI83PREMIUM_CE_PRODUCT);
                                    tiFile.setObjectType(typeInfo.objectType);
                                    tiFile.setObjectFlags(ARCHIVED);
                                    tiFile.setNameString(typeInfo.nameOptions[imgCount++]);
                                    tiFile.isFlashObject = false;
                                    tiFile.setVersion(TI84CE_COLOR_IMAGE_VERSION);

                                    ImageUtilities.imgSrcBase64ToRgb565(reader.result, function (fileData) {
                                        if (typeof fileData === "undefined") {
                                            AppLogger.error("An error occurred while processing the image");
                                            resolve();
                                        } else {
                                            tiFile.setFileData(fileData);
                                            tiFile.setDataCount(fileData.length);
                                            tiFile.setBlock2Length(fileData.length);
                                            AppLogger.info("Done Generating ImageVar");
                                            resolve(connect.createFileModel(tiDevice, entry, tiFile, ext));
                                        }
                                    });
                                };
                                reader.readAsDataURL(file);
                            } else if (connect.isFileExtensionAllowed(tiDevice, ext)) {
                                reader.onload = function () {
                                    var headerArrayBuffer = reader.result,
                                        headerArray = new Uint8Array(headerArrayBuffer),
                                        tiFile;
                                    tiFile = new TI_File(headerArray);
                                    resolve(connect.createFileModel(tiDevice, entry, tiFile, ext));
                                };
                                reader.readAsArrayBuffer(file);
                            } else {
                                AppLogger.error(entry.name + ' has an unsupported file type ');
                                if(extLength > 1) {
                                    $scope.ga_tracker.sendEvent('Transfer', 'SendUnsupported', ext);
                                }
                                resolve();
                            }
                        });
                    } catch (err) {
                        AppLogger.error(err);
                        resolve();
                    }
                });
            };
            // map all file entries to call loadFile for each element
            promises = fileEntries.map(loadFile);
            // chain all promises and resolve passing the list of loaded files
            Promise.all(promises).then(function (files) { // resolve
                files.remove(undefined); // TODO show dialog with the names of the files and add those in the loading process above "Unsopported File..."
                if (files.length > 0) {
                    connect.showSendFilesToHandheldDialog(tiDevice, files);
                } else {
                    AppLogger.error('All provided files were invalid!');
                }
            }, function (err) { // reject
                AppLogger.error('Then error: ', err);
            });
        };
        connect.processSendFileEntries = function (fileEntries) {
            var tiDevice,
                index,
                ext; // Set image name for Image Files (png, jpg, ..., etc)
            if (chrome.runtime.lastError) {
                AppLogger.log("error during file selection: " + chrome.runtime.lastError.message);
                connect.stopAnimation(connect.animations.sendFilesToDevice);
                return;
            }
            if (!connect.currentDevice) {
                return;
            }
            // Entry entry
            // array of FileEntry fileEntries
            AppLogger.log("got " + fileEntries.length + " files to send");
            if (fileEntries.length === 0) {
                return;
            }
            tiDevice = connect.dm.getDeviceWithID(connect.currentDevice.chromeDeviceID);
            connect.primary = connect.files;
            connect.collapseExplorer = false;
            // SENDOS: [BEGIN]
            //         Restrict send OS file only. Display warning message and remove os file from list if 
            //         this condition is met
            for (index in fileEntries) {
                if (fileEntries.hasOwnProperty(index)) {
                    ext = fileEntries[index].name.split(".").pop().toLocaleLowerCase();
                    if (typeof name !== "undefined" && connect.isFileExtensionAllowedOS(tiDevice, ext)) {
                        break;
                    }  
                }
            }
            if (connect.isFileExtensionAllowedOS(tiDevice, ext) && fileEntries.length > 1) {
                // TODO: [SENDOS] - Original message is too generic and says "One or more files was invalid and could not be sent to the calculator(s)"
                //                  Review message with team to agree it is ok to change it
                // IMPLEMENTME: connect.showWarningMessage("Operating System (OS) cannot be sent along more files. Please, try sending OS file only.");
                AppLogger.warn("Operating System (OS) cannot be sent along more files. Please, try sending only the OS file.");
                fileEntries.remove(fileEntries[index]);
                ext = undefined;
                ngDialog.open({
                    template: 'templates/dialog-message.html',
                    data: { // TODO: @en[] -> localization
                        message: "Operating System (OS) cannot be sent along more files. Please, try sending only the OS file.",
                        confirm: "Proceed with all other files...",
                        close : "Close"
                    }
                }).closePromise.then(function (data) {
                    if (data.value === "Proceed with all other files...") {
                        connect.processSendFileObjectEntries(tiDevice, fileEntries);
                    } else {
                        AppLogger.log("Cancelled Send Files ... ");
                    }
                });

            }  else if (connect.isFileExtensionAllowedOS(tiDevice, ext)) { // Calculator OS
                connect.processSendFileOSEntry(tiDevice, fileEntries[index]);
            } else { // regular Calculator Files
                connect.processSendFileObjectEntries(tiDevice, fileEntries);
            }
            // SENDOS: [END]
        };

        connect.sendFile = function (tiDevice, tiFile, fileName, ext, index, total, isCancelledFunc) {
            $scope.ga_tracker.sendEvent('Transfer', 'Send', ext);
            tiFile.setNameString(fileName);
            tiDevice.sendObject(tiFile, function () { // onStart
                connect.animations.sendFilesToDevice.legend = 'Sending file ' + index + ' of ' + total;
                connect.animations.sendFilesToDevice.fileName = fileName;
                connect.startAnimation(connect.animations.sendFilesToDevice);
            }, function () { // onSuccess
                connect.stopAnimation(connect.animations.sendFilesToDevice);
            }, function (err) { // onFailure
                // TODO display error
                connect.stopAnimation(connect.animations.sendFilesToDevice);
            }, isCancelledFunc);
        };
        // SENDOS: adding send os support
        connect.sendOS = function (tiDevice, tiOSFile, fileName, ext, index, total, isCancelledFunc) {
            var origLegendMessage = connect.animations.sendOSToDevice.legend,
                origProgressMessage = connect.animations.sendOSToDevice.progress;
            AppLogger.info("Sending OS...");
            $scope.ga_tracker.sendEvent('Transfer', 'SendOS', ext);
            tiOSFile.setNameString(fileName);
            tiDevice.sendOS(tiOSFile, function () { // onStart
                connect.animations.sendOSToDevice.legend = origLegendMessage + " 0%";
                connect.animations.sendOSToDevice.progress = origProgressMessage.concat(tiOSFile.getVersionMajor())
                    .concat(".").concat(tiOSFile.getVersionMinor());
                connect.animations.sendOSToDevice.fileName = fileName;
                connect.startAnimation(connect.animations.sendOSToDevice);
            }, function () { // onSuccess
                connect.animations.sendOSToDevice.legend = origLegendMessage;
                connect.animations.sendOSToDevice.progress = origProgressMessage;
                connect.stopAnimation(connect.animations.sendOSToDevice);
            }, function (err) { // onFailure
                connect.animations.sendOSToDevice.legend = origLegendMessage;
                connect.animations.sendOSToDevice.progress = origProgressMessage;
                // TODO display error
                connect.stopAnimation(connect.animations.sendOSToDevice);
            }, isCancelledFunc,
                            function(device) { // TIC_HAL_SetIOPercentage (onUpdateProgress) // TODO: CodeReview - should we hide device and only pass the require args
                var percentage = Math.round(((device.osSentProgress*1.0)/(device.ioTransferSize*1.0)) * 100);
                AppLogger.debug("device.osSentProgress: ", device.osSentProgress, ", device.ioTransferSize: ", device.ioTransferSize,
                                " -> percentage: ", percentage);
                if (percentage <= 100 && percentage > device.currentPercentage) {
                    device.currentPercentage = percentage;
                    $timeout(function() {
                        connect.animations.sendOSToDevice.legend = 'Receiving OS ' + device.currentPercentage + '%';  
                    });
                    AppLogger.debug("updateSetIOPercentage: ", device.currentPercentage);
                } else {
                    AppLogger.debug("updateSetIOPercentage: ", device.currentPercentage, " (No significant percentage increment)");
                }
            });
        };

        /**
         * Inserts the filename that comes in the file header if it's valid. If the filename is
         * already one of the options, it simply selects it.
         **/
        connect.insertOptionIfNeeded = function (tiFile, options) {
            var objectName = tiFile.getNameString(),
                filteredOption = options.filter(function (o) {
                    return o === objectName;
                });
            if (filteredOption.length === 0) {
                if (tiFile.isValidName(objectName)) {
                    options.unshift(objectName);
                }
            }
        };

        connect.openCalcInfo = function () {
            if (connect.currentDevice) {
                connect.showSettingsMenu = false;
                $scope.ga_tracker.sendAppView('CalcInfoDialog');
                ngDialog.open({
                    template: 'templates/dialog-calc-info.html',
                    data: {
                        device: connect.currentDevice
                    }
                });
            }
        };

        connect.openAbout = function () {
            connect.showSettingsMenu = false;
            $scope.ga_tracker.sendAppView('AboutDialog');
            ngDialog.open({
                template: 'templates/dialog-about.html',
                data: {
                    manifest: connect.manifest
                }
            });
        };

        connect.openAnalytics = function() {
            connect.showSettingsMenu = false;
            $scope.ga_service.getConfig().addCallback(
                /** @param {!analytics.Config} config */
                function (config) {
                    openAndProcessAnalyticsDialog(config);
                }
            );
        };

        connect.toggleSettingsMenu = function () {
            if (connect.currentDevice || $scope.model.screens.length) {
                connect.showSettingsMenu = !connect.showSettingsMenu;
            }
        };

        connect.sendOSToCalculator = function () {
            var tiDevice, validExtensions;
            connect.showSettingsMenu = false;
            if (connect.canSend()) {
                tiDevice = connect.dm.getDeviceWithID(connect.currentDevice.chromeDeviceID);
                validExtensions = [TI84CE_TYPES.OS.extension];

                try {
                    chrome.fileSystem.chooseEntry({
                        type: "openFile",
                        accepts: [{
                            description: tiDevice.name + " Operating System File", // TODO: @en[]
                            extensions: validExtensions
                        }],
                        acceptsMultiple: false
                    }, function (fileEntries) {
                        connect.processSendFileEntries([fileEntries]);
                    });
                } catch (err) {
                    AppLogger.error(err);
                    setTimeout(function () {
                        connect.stopAnimation(connect.animations.sendFilesToDevice);
                    }, 0);
                }
            }
        };

        connect.showFailAnimation = function () {
            connect.startAnimation(connect.animations.deviceConnectionFailed);
            connect.stopAnimation(connect.animations.deviceConnectionFailed);
        };

        connect.canDeleteSelection = function () {
            var result = false;
            if (connect.primary === connect.files) {
                result = (connect.canCollect() && !connect.specialTypes);
            } else if (connect.primary === connect.screens) {
                result = connect.canSaveScreens();
            }
            return result;
        };

        connect.canSetScreenBorder = function () {
            return connect.canSaveScreens();
        };

        connect.deleteSelection = function () {
            if (connect.canSaveScreens()) {
                connect.deleteScreensSelection();
            }
            if (connect.canCollect() && connect.primary === connect.files) {
                connect.deleteFilesSelection();
            }
        };

        connect.deleteFile = function (tiDevice, file, ext, index, total, isCancelledFunc) {
            tiDevice.deleteObject(file.name, file.typeID, function () { // onStart
                connect.animations.deleteFiles.legend = 'Deleting file ' + (index + 1) + ' of ' + total;
                connect.animations.deleteFiles.fileName = file.name;
                connect.startAnimation(connect.animations.deleteFiles);
            }, function () { // onSuccess
                connect.stopAnimation(connect.animations.deleteFiles);
            }, function (err) { // onFailure
                $scope.ga_tracker.sendException(err, false);
                connect.stopAnimation(connect.animations.deleteFiles);
                // TODO show error
                $scope.$apply();
            }, isCancelledFunc);
            $scope.ga_tracker.sendEvent('Transfer', 'Delete', ext);
        };

        connect.canCopySelection = function () {
            return connect.canSaveScreens();
        };

        connect.copySelection = function () {
            if (connect.canCopySelection()) {
                connect.copyScreenToClipboard();
            }
        };

        connect.canSend = function () {
            return connect.currentDevice && !connect.refreshPending && !connect.isAnimationDisplayed;
        };

        connect.canRefresh = function () {
            return connect.currentDevice && !connect.refreshPending && !connect.isAnimationDisplayed;
        };

        connect.refresh = function () {
            var tiDevice = connect.dm.getDeviceWithID(connect.currentDevice.chromeDeviceID);
            connect.primary = connect.files;
            connect.collapseExplorer = false;
            connect.refreshPending = true;
            tiDevice.getDirectory(function () { // onStart
                connect.stopAnimation(connect.animations.pressToRefresh);                
                connect.startAnimation(connect.animations.refresh);
                connect.previousFiles = undefined;
            }, function (directory) { // onSuccess
                connect.setDeviceDirectoryInfo(tiDevice, directory);
                connect.refreshPending = false;
                connect.stopAnimation(connect.animations.refresh);
                connect.sortFiles();
                connect.setDeviceInfo(tiDevice.ioProductInformation, tiDevice);
                $scope.$apply();
            }, function (err) { //onFailure
                $scope.ga_tracker.sendException(err, false);
                connect.refreshPending = false;
                connect.stopAnimation(connect.animations.refresh);
                // TODO display error
            });
        };

        connect.removeArrayIndex = function (somearray, index) {
            somearray.splice(index, 1);
        };

        function logConnectTime() {
            var duration;
            if (connect.currentDevice && connect.currentDevice.supportedDevice) {
                duration = Date.now() - connect.currentDevice.connectTimestamp;
                duration = Math.round(duration / 1000);
                $scope.ga_tracker.sendEvent('Connect', 'Seconds', duration);
            }
        }

        // DeviceManager Listener Callback
        connect.deviceDisconnected = function (device) {
            connect.setDeviceToBackgroundPage(device);
            if (device.device === connect.currentDevice.chromeDeviceID) {
                connect.saveScreenCaptures();
                logConnectTime();
                connect.currentDevice = undefined;
                ngDialog.closeAll('cancel');
                setTimeout(function () {
                    $scope.$apply();
                }, 0);
            }
        };

        // DeviceManager Listener Callback
        connect.deviceConnected = function (tiDevice) {
            connect.setDeviceToBackgroundPage(tiDevice);
            connect.currentDevice = {};
            connect.currentDevice.chromeDeviceID = tiDevice.device;
            connect.currentDevice.files = [];
            tiDevice.getDeviceInformation(function () { // onStart
                //connect.startAnimation(connect.animations.refresh);
            }, function (deviceInfo) { // onSuccess
                connect.setDeviceInfo(deviceInfo, tiDevice);
                // Report device info to Analytics, even for non-supported devices
                $scope.ga_tracker.sendEvent('Connect', 'DeviceProductIDMinor', deviceInfo.getProductIDMinor());
                $scope.ga_tracker.sendEvent('Connect', 'DeviceProductID', connect.currentDevice.productId);
                $scope.ga_tracker.sendEvent('Connect', 'DeviceOS', connect.currentDevice.os);
                $scope.ga_tracker.sendEvent('Connect', 'DeviceLanguage', connect.currentDevice.language);
                $scope.ga_tracker.sendEvent('Connect', 'DeviceHWVersion', connect.currentDevice.hwVersion);
                $scope.ga_tracker.sendEvent('Connect', 'DeviceName', connect.currentDevice.name);
                //This validation is being used to support CE devices only
                //If the connected device is not CE, it is disconnected
                if (deviceInfo.getProductIDMinor() !== ProductCodes.TI83PREMIUM_CE_PRODUCT) {
                    connect.deviceDisconnected(tiDevice);
                    connect.currentDevice.supportedDevice = true;
                    // TODO Show Unsupported Device Dialog
                } else {
                    connect.currentDevice.supportedDevice = true;
                }
                connect.currentDevice.connectTimestamp = Date.now();
                connect.stopAnimation(connect.animations.refresh);
            }, function (err) { // onFailure
                // TODO show error
                $scope.ga_tracker.sendException(err, false);
                connect.stopAnimation(connect.animations.refresh);
            }).then(function () {
                connect.startAnimation(connect.animations.pressToRefresh);
            });
        };
        
        connect.setDeviceToBackgroundPage = function (device) {
            chrome.runtime.getBackgroundPage(function (backgroundPage) {
                backgroundPage.device = device;
            });
        };

        connect.setDeviceInfo = function (deviceInfo, tiDevice) {
            var i = deviceInfo;
            connect.currentDevice.os = i.getBaseMajor() + '.' + i.getBaseMinor() + '.' + i.getBasePatch() + '.' + i.getBaseBuildNumber();
            connect.currentDevice.romVersion = i.getBootMajor() + '.' + i.getBootMinor() + '.' + i.getBootPatch() + '.' + i.getBootBuildNumber();
            connect.currentDevice.language = languageMap[i.getLanguageMajor()];
            connect.currentDevice.hwVersion = i.getHardwareVersion();
            connect.currentDevice.name = tiDevice.name;
            connect.currentDevice.productId = tiDevice.productInfoString;
            connect.currentDevice.freeRAMAvailable = tiDevice.freeRAMAvailable;
            connect.currentDevice.totalRAMAvailable = tiDevice.totalRAMAvailable;
            connect.currentDevice.freeFLASHAvailable = tiDevice.freeFLASHAvailable;
            connect.currentDevice.totalFLASHAvailable = tiDevice.totalFLASHAvailable;
            $scope.$apply();
        };

        connect.setDeviceDirectoryInfo = function (device, directory) {
            var f, o, t, s, l, obj, pid, tid, length,
                d = connect.currentDevice,
                typeTable = device.getTypeTable();
            if (d) {
                d.files = [];
                for (o in directory) {
                    if (directory.hasOwnProperty(o)) {
                        obj = directory[o];
                        // TODO: should tid and pid info go in other place ?? 
                        tid = obj.getobjectType();
                        pid = device.ioProductInformation.getProductIDMinor();
                        t = device.getNameForType(tid);
                        s = obj.getobjectSize();
                        /*jslint bitwise: true */
                        l = (obj.getobjectFlags() & ARCHIVED) !== 0 ? 'Archive' : 'RAM';
                        /*jslint bitwise: false */
                        AppLogger.log("Setting file " + obj.objectName + ":" + t + "(" + s + ") from " + l);
                        d.files.push({
                            name: obj.objectName,
                            type: t,
                            typeID: tid,
                            productID: pid,
                            bytes: s,
                            location: l,
                            selected: false
                        });

                        length = d.files.length - 1;
                        connect.selectNewFile(d.files[length]);
                    }
                }

                f = {
                    name: 'TblSet',
                    type: typeTable.TABLE_SETUP.name,
                    typeID: typeTable.TABLE_SETUP.objectType,
                    productID: ProductCodes.TI83PREMIUM_CE_PRODUCT,
                    bytes: 20,
                    location: 'RAM',
                    selected: false
                };
                d.files.push(f);
                f = {
                    name: 'Window',
                    type: typeTable.WINDOW.name,
                    typeID: typeTable.WINDOW.objectType,
                    productID: ProductCodes.TI83PREMIUM_CE_PRODUCT,
                    bytes: 210,
                    location: 'RAM',
                    selected: false
                };
                d.files.push(f);
                f = {
                    name: 'RclWindw',
                    type: typeTable.USER_ZOOM.name,
                    typeID: typeTable.USER_ZOOM.objectType,
                    productID: ProductCodes.TI83PREMIUM_CE_PRODUCT,
                    bytes: 209,
                    location: 'RAM',
                    selected: false
                };
                d.files.push(f);
                $scope.$apply();
            }

        };

        connect.selectNewFile = function (file) {
            var index,
                isNew = true;

            // connect.previousFiles should contain info only when a file was dragged in or 
            // when any file was selected to be sent to device
            if (connect.previousFiles) {

                // Comparing if file already exist in connect.previousFiles. Otherwise, file will be selected
                for (index = 0; index < connect.previousFiles.length; index += 1) {
                    if (file.bytes === connect.previousFiles[index].bytes &&
                        file.location === connect.previousFiles[index].location &&
                        file.name === connect.previousFiles[index].name &&
                        file.size === connect.previousFiles[index].size &&
                        file.type === connect.previousFiles[index].type &&
                        file.typeID === connect.previousFiles[index].typeID) {
                        isNew = false;
                        break;
                    }
                }
                if (isNew) {
                    $scope.model.lastFileIndex = connect.getFileIndex(file);
                    $scope.model.lastFileSelected = file;
                }
                file.selected = isNew;
            }
        };

        connect.selectAction = function (lastItemSelected, lastItemIndex, item, array) {
            if (lastItemSelected) {
                var currentItemIndex = connect.getItemIndex(item, array);

                //Select screens from the last selected to the current selected screen
                return connect.selectRangeOfItems(array, lastItemIndex, currentItemIndex);
            } else {
                //Select screens from the current selected screen to the first element
                return connect.selectRangeOfItems(array, 0, connect.getItemIndex(item, array));
            }
        };

        connect.selectRangeOfItems = function (array, lastItemIndex, currentItemIndex) {
            var start, end;
            if (lastItemIndex < currentItemIndex) {
                start = lastItemIndex;
                end = currentItemIndex;
            } else {
                start = currentItemIndex;
                end = lastItemIndex;
            }
            //Select items from the last selected to the current selected
            return connect.selectItems(array, start, end);
        };

        connect.selectItems = function (array, start, end) {
            var i, item, selectedItems = [];
            for (i = start; i <= end; i += 1) {
                item = array[i];
                item.selected = true;
                selectedItems.push(item);
            }
            return selectedItems;
        };

        connect.getFileIndex = function (file) {
            return connect.getItemIndex(file, connect.currentDevice.files);
        };

        connect.getScreenIndex = function (screen) {
            return connect.getItemIndex(screen, $scope.model.screens);
        };

        connect.getItemIndex = function (item, array) {
            var index;
            for (index = 0; index < array.length; index += 1) {
                if (item === array[index]) {
                    break;
                }
            }
            return index;
        };



        connect.startAnimation = function (animation) {
            AppLogger.log("Starting animation: " + animation.name);
            connect.isAnimationDisplayed = true;
            connect.showAnimation = true;
            animation.value = true;
            $scope.$apply();
        };

        connect.stopAnimation = function (animation) {
            AppLogger.log("Stopping animation: " + animation.name);
            connect.showAnimation = false;
            animation.value = false;
            connect.isAnimationDisplayed = false;
            setTimeout(function () {
                $scope.$apply();
            }, 0);
        };

        connect.cancel = function () {
            AppLogger.log("cancel called");
            if (typeof connect.cancelFunc === 'function') {
                connect.cancelFunc();
            }
        };

        $scope.handleDrop = function (e) {
            var items,
                i,
                entry,
                fileEntries = [];
            // Assigning files to be used in selectNewFile() method
            connect.previousFiles = connect.currentDevice.files;

            e.preventDefault();
            e.stopPropagation();

            items = e.dataTransfer.items;

            // Sending every file dragged in
            for (i = 0; i < items.length; i = i + 1) {
                entry = items[i].webkitGetAsEntry();
                fileEntries.push(entry);
            }
            connect.processSendFileEntries(fileEntries);
        };

        $scope.handleDragOver = function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            return false;
        };
        connect.isFileExtensionAllowedOS = function (device, ext) {
            return ((ext === TI84CE_TYPES.OS.extension && device.ioProductInformation.getMathCapability() === 0) || // 0 === exact, 1 === aprox
                    (ext === "8pu" && device.ioProductInformation.getMathCapability() === 1)); // TODO partial support for 83 PCE. Modify once we have TI83PCE_TYPES
        };
        connect.isFileExtensionAllowed = function (tiDevice, ext) {
            var i,
                result = false,
                extensionsAllowed = tiDevice.getSendObjectValidExtensions();

            for (i = 0; i < extensionsAllowed.length; i = i + 1) {
                if (ext === extensionsAllowed[i]) {
                    result = true;
                    break;
                }
            }
            return result;
        };

        connect.getHashKeyNumber = function (hashKey) {
            return hashKey.replace(':', '');
        };

        connect.areSpecialTypes = function () {
            var i, result = true,
                selectedFiles = connect.selectedFiles();
            for (i = 0; i < selectedFiles.length; i++) {
                var file = selectedFiles[i];
                //If at least one file is special type, it returns false
                if (!connect.isSpecialType(file.type)) {
                    result = false;
                    break;
                }
            }
            return result;
        };

        connect.isSpecialType = function (type) {
            var result = false;
            if (type === TI84CE_TYPES.TABLE_SETUP.name ||
                type === TI84CE_TYPES.WINDOW.name ||
                type === TI84CE_TYPES.USER_ZOOM.name) {
                result = true;
            }
            return result;
        };

        connect.getLockIcon = function (file) {
            //If file type is special (TABLE_SETUP, USER_ZOOM, WINDOW), 
            //it returns the lock icon and remove the file location 
            if (connect.isSpecialType(file.type)) {
                file.location = '';
                return 'images/lock.svg';
            }
        };

        connect.openLocalStorageDialog = function () {
            var new_dialog = ngDialog.open({
                template: 'templates/dialog-local-storage.html',
            });
        };

        $scope.openCommTestDialog = function () {
            var config = {
                iterations: 10,
                size: 100,
                mem: 'RAM'
            },
                testConfigDialog = ngDialog.open({
                    template: 'templates/dialog-commtest-config.html',
                    data: {
                        config: config
                    },
                    controller: ['$scope', function ($scope) {}]
                });
            $scope.ga_tracker.sendAppView('CommTestDialog');
            testConfigDialog.closePromise.then(function (data) {
                var tiDevice,
                    commTest,
                    status = {},
                    statusDialog,
                    statusFunc;

                statusFunc = function (pct, iteration, msg) {
                    status.percentage = pct;
                    status.iteration = iteration;
                    status.message = msg;
                    $scope.$apply();
                };

                if (data.value === 'Start') {
                    if (connect.currentDevice) {
                        tiDevice = connect.dm.getDeviceWithID(connect.currentDevice.chromeDeviceID);
                        commTest = new TI_CommTest(connect.dm, tiDevice, config.iterations, config.size, config.mem, statusFunc);
                        commTest.run();
                    }
                }
                statusDialog = ngDialog.open({
                    template: 'templates/dialog-commtest.html',
                    data: {
                        status: status
                    },
                    controller: ['$scope', function ($scope) {}]
                });
                statusDialog.closePromise.then(function (data) {
                    if (data.value === 'Cancel') {
                        commTest.stop();
                    }
                });
            });
        };

        function onChromeStorageChangedListener(changes, areaName) {
            var stats,
                area;
            if (areaName === 'local' || areaName === 'sync') {
                area = chrome.storage[areaName];
                stats = $scope.model.chromeStorageStats[areaName];
                stats.quota = area.QUOTA_BYTES;
                area.getBytesInUse(null, function (bytesInUse) {
                    stats.used = bytesInUse;
                    stats.remaining = stats.quota - stats.used;
                    AppLogger.info('chrome.storage.' + areaName + ':' + JSON.stringify(stats));
                });
            }
        }

        $scope.model.chromeStorageStats = {
            'local': {
                'quota': 0,
                'used': 0,
                'remaining': 0
            },
            'sync': {
                'quota': 0,
                'used': 0,
                'remaining': 0
            }
        };
        // call the listener to set the initial values
        onChromeStorageChangedListener(null, 'local');
        onChromeStorageChangedListener(null, 'sync');
        // add the listener to track changes
        chrome.storage.onChanged.addListener(onChromeStorageChangedListener);

        $timeout(function () {
            $timeout(function () {
                connect.ready = true;
            }, 500);
        }, 0);
    });

    function setRootFontSize() {
        var width = $(window).width(),
            pixels = Math.max(Math.min(Math.floor(width / 66.85), 14), 9);
        $("html").css('font-size', pixels + 'px');
    }

    $(window).resize(setRootFontSize);
    setRootFontSize();
}());