/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
// these utilities are based on its counterpart ImageManipulationUtilities.java
/**
 * Image manipulation utility class. Contains a variety of functionalities to manipulate images
 */
var ImageUtilities = {};
ImageUtilities.DEFAULT_TI84CE_IMG_WIDTH = 134;
ImageUtilities.DEFAULT_TI84CE_IMG_HEIGHT = 83;
/**
 * Converts the given image in base64 to its RGB565 representation with a width 183 and a height 
 * 83 (img.onload will get called)
 * @param {Object}   img      the Image object to convert.
 * @param {function} callback the function to call once conversion is done. 
 */
ImageUtilities.imgBase64ToRgb565 = function (img, callback) {
    "use strict";
    callback = callback || function() {}; // Fail over for callback
    if (!(img instanceof Image)) {
        AppLogger.error("Invalid img parameter");
        callback();
        return;
    }
    img.onload = function() {
        var canvas,
            ctx,
            counter = 0,
            bufferSize = 0,
            image565,
            image565Counter = 0,
            i = 0,
            rgb565 = 0x00,
            sWidth = this.width,
            sHeight = this.height,
            sAspect = sWidth / sHeight,
            dx = 0,
            dy = 0,
            dWidth = ImageUtilities.DEFAULT_TI84CE_IMG_WIDTH,
            dHeight = ImageUtilities.DEFAULT_TI84CE_IMG_HEIGHT,
            dAspect = dWidth / dHeight,
            data;

        canvas = document.createElement('canvas');
        canvas.width = ImageUtilities.DEFAULT_TI84CE_IMG_WIDTH;
        canvas.height = ImageUtilities.DEFAULT_TI84CE_IMG_HEIGHT;
        ctx = canvas.getContext('2d');
        ctx.save();
        
        // Image Scaling Algorithms
        if (sAspect > dAspect) { // wide image
            dWidth = ImageUtilities.DEFAULT_TI84CE_IMG_WIDTH;
            dHeight = ((ImageUtilities.DEFAULT_TI84CE_IMG_WIDTH*sHeight)/sWidth);
            dy = ((ImageUtilities.DEFAULT_TI84CE_IMG_HEIGHT-dHeight)/2);

        } else if (dAspect > sAspect) { // tall image
            dWidth = ((ImageUtilities.DEFAULT_TI84CE_IMG_HEIGHT*sWidth)/sHeight);
            dHeight = ImageUtilities.DEFAULT_TI84CE_IMG_HEIGHT;
            dx = ((ImageUtilities.DEFAULT_TI84CE_IMG_WIDTH - dWidth)/2);

        } // Not need to calculate on equal aspect ratios, just fill canvas with the given image
        
        // white space will be added to the remaining image area to fill in to the 133x83 area
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Flip vertically
        ctx.scale(1,-1);
        ctx.translate(0,-canvas.height);
        ctx.drawImage(this, dx, dy, dWidth, dHeight);
        
        data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        counter = data.length;
        bufferSize = (counter/2); // remove decimal places
        if (bufferSize !== (canvas.width * canvas.height * 2)) {
            AppLogger.error("Corrupted image size. It should be 4 bytes per pixel");
        }
        image565 = new Uint8Array(bufferSize + 3); // 3 extra bytes for length and img var type
        image565Counter = 3;
        for (i = 0; i < counter; i = i + 4) {
            rgb565 = ImageUtilities.mode_565_RGB16BIT(
                data[i],     // r
                data[i+1],   // g
                data[i+2]    // b
                // data[i+3] // a  (Not used for 565 conversion)
            );
            image565[image565Counter++] = (rgb565 & 0xFF);
            image565[image565Counter++] = ((rgb565 >> 8) & 0xFF);
        }
        image565[0] = ((bufferSize + 1) & 0xFF);  //MSB
        image565[1] = ((bufferSize >> 8) & 0xFF);  //LSB
        image565[2] = 0x81;  // tag as an imageVar
        
        callback(image565);
    };  
};
/**
 * Converts the given image src string in base64 to its RGB565 representation.
 * @param {String}   img      the Image src string to convert.
 * @param {function} callback the function to call once conversion is done
 * @see ImageUtilities.imgBase64ToRgb565(img,callback)
 */
ImageUtilities.imgSrcBase64ToRgb565 = function (imgSrc, callback) {
    "use strict";
    var img;
    img = new Image();
    this.imgBase64ToRgb565(img, callback);
    img.src = imgSrc;
};
/**
 * Returns the given RGB pixes converted to its RGB565 represenation in a single int value.
 * 
 * Example: 
 * <ul>
 * Given the next RGB color 0x123456 it will be (R -> 18, G -> 52, B -> 86), it will be converted
 * to its RGB565: 
 * <ul>
 * (( r >> 3 ) & 0x1F)  // 5-bits
 * (( g >> 2 ) & 0x3F)  // 6-bits
 * (( b >> 3 ) & 0x1F)  // 5-bits
 * </ul>
 * Returning (( b >> 3 ) & 0x1F) |= (( g >> 2 ) & 0x3F) |= (( r >> 3 ) & 0x1F) int value
 * </ul>
 * 
 * @param   {int} r the red value
 * @param   {int} g the green value
 * @param   {int} b the blue value
 * @returns {int} the given RGB pixes converted to its RGB565 represenation
 */
ImageUtilities.mode_565_RGB16BIT = function(r, g, b ) {
    "use strict";
    var rgb565 = 0, r1, g1, b1;

    r1 = (( r >> 3) & 0x1F);   // 5-bits
    g1 = (( g >> 2 ) & 0x3F);  // 6-bits
    b1 = (( b >> 3 ) & 0x1F);  // 5-bits

    rgb565 = b1;
    rgb565 |= ( g1 << 5 );
    rgb565 |= ( r1 << 11 );
    return rgb565;
};