/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*global Uint8Array, ArrayBuffer */
var ScreenCapture = function (opts) {
    'use strict';
    var opt;
    this.id = '';
    this.imgSrc = '';
    this.name = '';
    this.selected = false;
    this.border = false;
    // all new screen captures starts as dirty until are saved to disk
    this.dirty = true;

    if (typeof opts !== "undefined") {
        for (opt in opts) {
            if (opts.hasOwnProperty(opt)) {
                this[opt] = opts[opt];
            }
        }
    }
};

ScreenCapture.prototype.getImgArrayData = function () {
    'use strict';
    var data,
        raw,
        rawLength,
        array,
        i;
    if (this.imgSrc === null || typeof this.imgSrc === "undefined") {
        return '';
    }
    data = this.imgSrc.replace(/data:image\/png;base64,/, '');
    raw = window.atob(data);
    rawLength = raw.length;
    array = new Uint8Array(new ArrayBuffer(rawLength));

    for (i = 0; i < rawLength; i = i + 1) {
        array[i] = raw.charCodeAt(i);
    }
    return array.buffer;
};