/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*jslint bitwise: true, plusplus:true */
/*global Uint8Array*/
String.prototype.asByteArray = function () {
	'use strict';
	var bytes = [], i, charCode;
	for (i = 0; i < this.length; i++) {
		charCode = this.charCodeAt(i);
		switch (charCode) {
		case 0x2081:
			bytes.push(0xe2);
			bytes.push(0x82);
			bytes.push(0x81);
			break;
		case 0x2082:
			bytes.push(0xe2);
			bytes.push(0x82);
			bytes.push(0x82);
			break;
		case 0x2083:
			bytes.push(0xe2);
			bytes.push(0x82);
			bytes.push(0x83);
			break;
		case 0x2084:
			bytes.push(0xe2);
			bytes.push(0x82);
			bytes.push(0x84);
			break;
		case 0x2085:
			bytes.push(0xe2);
			bytes.push(0x82);
			bytes.push(0x85);
			break;
		case 0x2086:
			bytes.push(0xe2);
			bytes.push(0x82);
			bytes.push(0x86);
			break;
		default:
			bytes.push(charCode);
			break;
		}
	}
	return bytes;
};

String.prototype.asByteUint8Array = function () {
	'use strict';
	return new Uint8Array(this.asByteArray());
};