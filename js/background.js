/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*global chrome */

/**
 * Listens for the app launching then creates the window
 *
 * @see http://developer.chrome.com/apps/app.window.html
 */
var device = undefined;
chrome.app.runtime.onLaunched.addListener(function () {
    'use strict';
    chrome.app.window.create('index.html', {
        id: 'main',
        innerBounds: {
            minWidth: 610,
            minHeight: 436,
            width: 1000,
            height: 600
        }},
        function(win) {
            win.onClosed.addListener(function() {
                if(device != undefined) {
                    chrome.usb.releaseInterface(device.handle, 0, function(){
                    });
                }
            });
        });
});