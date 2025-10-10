/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*jslint bitwise : true */
/*global console */
/*global Uint8Array */
/*global TI_File */
/*global TI83PLUS_DEVICE */
/*global ProductCodes */
/*global ARCHIVED */
/*global Promise */
/*exported TI_CommTest */
var TI_CommTest = function (deviceManager, tiDevice, iterations, size, mem, statusFunc) {
    "use strict";
    var iteration,
        file = {
            'name' : "TESTVAR",
            'typeID' : tiDevice.getTypeInfo('APPVAR').objectType
        },
        stopped,
        appVarSent,
        appVarReceived;

    /* param validation */
    if (iterations < 1 || iterations > 1000) {
        console.error('CommTest iterations out of range: iterations=' + iterations + ' valid range is [1,1000]');
        return false;
    }
    if (size < 1 || size > 65535) {  // TODO look up actual max AppVar size
        console.error('CommTest size out of range: size=' + iterations + ' valid range is [1,65535]');
        return false;
    }
    if (mem !== 'RAM' && mem !== 'Archive') {
        console.error('CommTest mem must be "RAM" or "Archive". mem=' + mem);
        return false;
    }
    if (statusFunc !== undefined && typeof statusFunc !== 'function') {
        console.error('CommTest statusFunc must be a function');
        return false;
    }
        
    function stop() {
        if (!stopped) {
            stopped = true;
            console.log("Done with CommTest");
        }
    }
    
    function status(step, message) {
        var pct;
        pct = Math.min(100, (100 / iterations) * iteration + (((100 / iterations) / 5) * step));
        console.info(message);
        if (statusFunc) {
            statusFunc(pct, iteration, message);
        }
    }
    
    function sendAppVar() {
        return new Promise(function (resolve, reject) {
            if (stopped) {
                reject();
            } else {
                tiDevice.sendObject(appVarSent, function () {
                    status(1, "Sending AppVar");
                }, function () {
                    status(2, "Done Sending");
                    resolve();
                }, function () {
                    reject();
                });
            }
        });
    }
    
    function collectAppVar() {
        return new Promise(function (resolve, reject) {
            if (stopped) {
                reject();
            } else {
                tiDevice.getObject(file.name, file.typeID, function () {
                    status(2, "Collecting AppVar");
                }, function (file) {
                    status(2, "Done Collecting");
                    appVarReceived = file;
                    resolve(appVarReceived);
                }, function () {
                    reject();
                });
            }
        });
    }
    
    function deleteAppVar() {
        return new Promise(function (resolve, reject) {
            if (stopped) {
                reject();
            } else {
                tiDevice.deleteObject(file, function () {
                    status(4, "Deleting AppVar");
                }, function () {
                    status(4, "Done Deleting");
                    resolve();
                }, function () {
                    reject();
                });
            }
        });
    }

    
    function generateAppVar() {
        return new Promise(function (resolve, reject) {
            var i,
                fileData;
            status(0, "Generating AppVar");
            fileData = new Uint8Array(size + 2);
            fileData[0] = size & 0xFF;
            fileData[1] = (size >> 8) & 0xff;
            for (i = 2; i < fileData.length; i = i + 1) {
                fileData[i] = Math.random() * 255 & 0xFF;
            }
            appVarSent = new TI_File();
            appVarSent.setOwnerCalculatorID(TI83PLUS_DEVICE);
            appVarSent.setOwnerProductID(ProductCodes.TI83PREMIUM_CE_PRODUCT);
            appVarSent.setObjectType(file.typeID);
            appVarSent.setObjectFlags(mem === 'RAM' ? 0 : ARCHIVED);
            appVarSent.setNameString(file.name);
            appVarSent.setFileData(fileData);
            appVarSent.setBlock2Length(size + 2);
            appVarSent.isFlashObject = false;
            console.info("Done Generating AppVar");
            resolve(appVarSent);
        });
    }

    function compareAppVars() {
        return new Promise(function (resolve, reject) {
            var sent = appVarSent.getFileData(),
                received = appVarReceived.getFileData(),
                i,
                msg;

            // Compare
            status(5, "Comparing AppVars");
            if (sent.length !== received.length) {
                msg = 'sent length (' + sent.length + ') does not equal received length (' + received.length + ')';
                console.error(msg);
                resolve(false);
                return;
            } else {
                for (i = 0; i < sent.length; i = i + 1) {
                    if (sent[i] !== received[i]) {
                        msg = 'sent[' + i + '] = ' + sent[i] + ' not equal to received[' + i + '] = ' + received[i];
                        console.error(msg);
                        resolve(false);
                        return;
                    }
                }
            }
            console.info("Done Comparing AppVars");
            resolve(true);
        });
    }
    
    this.stop = function () {
        stop();
    };
        
    this.run = function () {
        var promise,
            i,
            incIteration;
        stopped = false;
        iteration = 0;
        promise = Promise.resolve();
        incIteration = function () {
            iteration = iteration + 1;
        };
        for (i = 0; i < iterations; i = i + 1) {
            promise = promise
                .then(generateAppVar)
                .then(sendAppVar)
                .then(collectAppVar)
                .then(compareAppVars)
                .then(deleteAppVar)
                .then(incIteration);
        }
        promise.then(function () {
            status(3, "Completed");
            stop();
        }, function () {
            status(3, "Error");
            stop();
        }
        );
    };

    return this;
};