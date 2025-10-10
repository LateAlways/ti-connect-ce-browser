/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*jslint bitwise: true, plusplus:true */
/*global Uint8Array */
Uint8Array.prototype.toString0x16 = function () {
    'use strict';
    var hexStr = '', i, str16;
    for (i = 0; i < this.length; i++) {
        str16 = this[i].toString(16);
        hexStr = hexStr.concat('0x').concat(str16.length === 1 ? '0'.concat(str16) : str16).concat(' ');
    }
    return hexStr;
};

Uint8Array.prototype.toString16 = function () {
    'use strict';
    var hexStr = '', i, str16;
    for (i = 0; i < this.length; i++) {
        str16 = this[i].toString(16);
        hexStr = hexStr.concat(str16.length === 1 ? '0'.concat(str16) : str16).concat(' ');
    }
    return hexStr;
};
Uint8Array.prototype.toStringFormat = function () {
    'use strict';
    var hexStr = '', i, str16;
    for (i = 0; i < this.length; i++) {
        str16 = this[i].toString();
        hexStr = hexStr.concat(str16).concat(', ');
    }
    return hexStr.concat(']');
};

Uint8Array.prototype.toCharCode = function () {
    'use strict';
    var objectName = '', i;
    for (i = 0; i < this.length; i++) {
        if (this[i] === 0xe2) {
            switch (this[i + 2]) {
            case 0x81:
                objectName += '\u2081';
                break;
            case 0x82:
                objectName += '\u2082';
                break;
            case 0x83:
                objectName += '\u2083';
                break;
            case 0x84:
                objectName += '\u2084';
                break;
            case 0x85:
                objectName += '\u2085';
                break;
            case 0x86:
                objectName += '\u2086';
                break;
            }
            i += 2;
        } else {
            objectName += String.fromCharCode(this.array[i]);
        }
    }
    return objectName;
};
/**
 * Removes the given item from the array. If there is more than one times the 
 * item it will be removed.
 * @param item The item to be removed
 * @return An array of removed items
 */
Array.prototype.remove = function(item) {
    var removeItems = [];
    for (var i = 0; i < this.length; i++) {
        if (this[i] === item) {
            removeItems.push(this.splice(i, 1)[0]);
            i--;
        }
    }
    return removeItems;
}