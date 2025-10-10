/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*jslint bitwise: true, plusplus: true, unused: false */
/*global atob*/
/*global console*/
/*global Uint8Array*/
/*global Uint8ClampedArray*/
/*global TIErrorCodes*/
/*global carsErrorCode*/
/*global typeFlashOSUpdate */
/*global typeFlashApplication */
/*global typeFlashCertificate */
/*global typeCertMemory8x */
/*global typeFlashUserProgram */
/*global typeFlashLicense*/
/*global unescape */
/*global encodeURIComponent */
/*global TILogger */

var rgb565torgba8888 = function (source, width, height) {
    "use strict";

    /** @const */
    var BIT_5_FACTOR = 0xff / 0x1f;
    /** @const */
    var BIT_6_FACTOR = 0xff / 0x3f;

    var length = width * height * 4,
        ret = new Uint8ClampedArray(length),
        color565,
        r,
        g,
        b,
        i,
        j;

    for (i = 0, j = 0; j < length; i += 2, j += 4) {
        color565 = (source[i + 1] << 8) | source[i];
        r = Math.round((color565 >> 11) * BIT_5_FACTOR) & 0xff;
        g = Math.round(((color565 >> 5) & 0x3f) * BIT_6_FACTOR) & 0xff;
        b = Math.round((color565 & 0x1f) * BIT_5_FACTOR) & 0xff;
        ret[j] = r;
        ret[j + 1] = g;
        ret[j + 2] = b;
        ret[j + 3] = 255; //alpha to fully opaque
    }
    return ret;
};

var retrieve16BigEndian = function (array, offset) {
    "use strict";
    var retVal = 0;
    retVal = (array[offset] << 8) & 0xff00;
    retVal |= array[offset + 1] & 0xff;
    return retVal;
};

var store16BigEndian = function (array, offset, value) {
    "use strict";
    array[offset] = (value & 0xff00) >> 8;
    array[offset + 1] = (value & 0xff) >>> 0;
    return offset + 2;
};

var retrieve32BigEndian = function (array, offset) {
    "use strict";
    var retVal = 0;
    retVal = (array[offset] << 24) & 0xff000000;
    retVal |= (array[offset + 1] << 16) & 0x00ff0000;
    retVal |= (array[offset + 2] << 8) & 0x0000ff00;
    retVal |= (array[offset + 3] << 0) & 0x000000ff;
    return retVal;
};

var store32BigEndian = function (array, offset, value) {
    "use strict";
    array[offset] = (value & 0xff000000) >> 24;
    array[offset + 1] = (value & 0x00ff0000) >> 16;
    array[offset + 2] = (value & 0x0000ff00) >> 8;
    array[offset + 3] = (value & 0x000000ff) >>> 0;
    return offset + 4;
};

var retrieve64BigEndian = function (array, offset) {
    "use strict";
    var retVal = 0;
    retVal = (array[offset] << 56) & 0xff00000000000000;
    retVal |= (array[offset + 1] << 48) & 0x00ff000000000000;
    retVal |= (array[offset + 2] << 40) & 0x0000ff0000000000;
    retVal |= (array[offset + 3] << 32) & 0x000000ff00000000;
    retVal |= (array[offset + 4] << 24) & 0x00000000ff000000;
    retVal |= (array[offset + 5] << 16) & 0x0000000000ff0000;
    retVal |= (array[offset + 6] << 8) & 0x000000000000ff00;
    retVal |= (array[offset + 7] << 0) & 0x00000000000000ff;
    return retVal;
};

var store64BigEndian = function (array, offset, value) {
    "use strict";
    array[offset] = (value & 0xff00000000000000) >> 56;
    array[offset + 1] = (value & 0x00ff000000000000) >> 48;
    array[offset + 2] = (value & 0x0000ff0000000000) >> 40;
    array[offset + 3] = (value & 0x000000ff00000000) >> 32;
    array[offset + 4] = (value & 0x00000000ff000000) >> 24;
    array[offset + 5] = (value & 0x0000000000ff0000) >> 16;
    array[offset + 6] = (value & 0x000000000000ff00) >> 8;
    array[offset + 7] = (value & 0x00000000000000ff) >>> 0;
    return offset + 8;
};

var myTI_IsFlashObject = function (typeCode) {
    'use strict';
    return (typeCode === typeFlashOSUpdate ||
        typeCode === typeFlashApplication ||
        typeCode === typeFlashCertificate ||
        typeCode === typeCertMemory8x ||
        typeCode === typeFlashUserProgram ||
        typeCode === typeFlashLicense);
};


var myTI_MapCARSErrorToTIError = function (inValue, operationInProgress) {
    'use strict';
    var returnValue = ((inValue) & 0x3fff); // just in case there is already cars info in place.

    switch (returnValue) {

    case carsErrorCode.None:
        returnValue = 0;
        break;

    case carsErrorCode.UnknownPacket:
    case carsErrorCode.PacketLengthNotValid:
    case carsErrorCode.UnexpectedPacket:
        returnValue = TIErrorCodes.errTIBadCommunicationsSequence;
        break;

    case carsErrorCode.CannotReceiveOS:
    case carsErrorCode.CannotLoadAnEarlierOS:
        returnValue = TIErrorCodes.errTICantUseThisOSUpdate;
        break;

    case carsErrorCode.Timeout:
        returnValue = TIErrorCodes.errTICommunicationsTimeout;
        break;

    case carsErrorCode.PathDoesNotExist:
    case carsErrorCode.FileDoesNotExist:
        returnValue = TIErrorCodes.errTIItemDoesNotExist;
        break;


    case carsErrorCode.ProtocolIDNotRecognized:
        returnValue = TIErrorCodes.errTIChannelIsNotAvailable;
        break;

    case carsErrorCode.InsufficientMemory:
        returnValue = TIErrorCodes.errTICalculatorMemoryIsFull;
        break;

    case carsErrorCode.InvalidPathName:
    case carsErrorCode.InvalidFileName:
        returnValue = TIErrorCodes.errTINameIsIllegalOrInvalid;
        break;

    case carsErrorCode.FileArchived:
        returnValue = TIErrorCodes.errTIItemIsArchived;
        break;

    case carsErrorCode.FileLocked:
        returnValue = TIErrorCodes.errTIItemIsLocked;
        break;

    case carsErrorCode.FileAlreadyExists:
        returnValue = TIErrorCodes.errTICantOverwriteExistingFile;
        break;

    case carsErrorCode.FileCannotBeArchived:
        returnValue = TIErrorCodes.errTICannotDeleteObject;
        break;

    case carsErrorCode.BatteryIsTooLowForOperation:
        returnValue = TIErrorCodes.errTIBatteriesTooLow;
        break;

    case carsErrorCode.CertificateIsInvalid:
        returnValue = TIErrorCodes.errTIFlashInvalidCertificateHdr;
        break;

    case carsErrorCode.NoCertificatePresent:
        returnValue = TIErrorCodes.errTIFlashNoCertificate;
        break;

    case carsErrorCode.BadSignature:
        returnValue = TIErrorCodes.errTIFlashBadSignature;
        break;

    case carsErrorCode.ExpiredCertificate:
        returnValue = TIErrorCodes.errTIFlashCertificateExpired;
        break;

    case carsErrorCode.CertificateCannotBeReplaced:
        returnValue = TIErrorCodes.errTIFlashCannotReplaceCert;
        break;

    case carsErrorCode.VersionIsUnsupported:
    case carsErrorCode.AttributeValueNotValid:
        returnValue = TIErrorCodes.errTIItemIsTooNew;
        break;

    case carsErrorCode.NoDataForVariable:
        returnValue = TIErrorCodes.errTINoDataDescriptorPresent;
        break;

    case carsErrorCode.BadLoadAddress:
        returnValue = TIErrorCodes.errTIFlashBadLoadAddress;
        break;

    case carsErrorCode.CalculatorIsBusy:
        returnValue = TIErrorCodes.errTIDeviceIsBusy;
        break;
        // 89T returns this when trying to delete an active localizer
        //    case carsErrorCode.YouDoNotHaveRights:
        //        //            #ifndef _WINDOWS
        //        if (operationInProgress === kAEDelete)
        //            returnValue = TIErrorCodes.errTIUnableToDeleteItem;
        //        else if (operationInProgress === kAESetData)
        //            returnValue = TIErrorCodes.errTIItemIsTooNew;
        //        else
        //        //                #endif
        //            returnValue = TIErrorCodes.errTIRequestIsUnsupported;
        //        break;


    case carsErrorCode.Cancel:
    case carsErrorCode.CancelAll:
        // oops.  add these two codes in...
    case 0x0CCC:
    case 0x0CCD:
        returnValue = TIErrorCodes.errTIOperationCanceledOnDevice;
        break;

        //        case carsErrorCode.AttributeNotRecognized:
        //        case carsErrorCode.CannotCreateDirectory:
        //        case carsErrorCode.CannotCreateNullFile:
        //        case carsErrorCode.ListElementOutOfRange:
        //        case carsErrorCode.ListElementNotApplicable:
        //        case carsErrorCode.FilterNotSupported:
        //        case carsErrorCode.FilterNotApplicable:
        //        case carsErrorCode.FilterNotRecognized:
        //        case carsErrorCode.MulipleFilesMatched:
        //        case carsErrorCode.FileSizeExceedsMaximumAcceptableSize:
        //        case carsErrorCode.TimeoutTooShort:
        //        case carsErrorCode.TimeoutTooLong:
        //        case carsErrorCode.ProtocolVersionUnsupported:
        //        case carsErrorCode.UnsupportedStringCharacter:
        //        case carsErrorCode.AttributeCountDoesntMatchRequest:
        //        case carsErrorCode.AttributeDoesntMatchRequest:
        //        case carsErrorCode.AttributeNotSupported:
        //        case carsErrorCode.OptionNotRecognize:
        //        case carsErrorCode.OptionNotSupported:
        //        case carsErrorCode.OptionNotValid:
        //        case carsErrorCode.FilterValueNotValid:
        //        case carsErrorCode.InsufficientInformationToPerformWrite:
        //        case carsErrorCode.InvalidPacketField:
        //        case carsErrorCode.WaitTimeExceeded:
        //            break;

    default:
        break;
    }

    CarsLogger.log("MyTI_MapCARSErrorToTIError carsErr=", inValue & 0x3fff, " TIerr=", returnValue & 0xFFFF);
    return returnValue;
};

var decodeUTF8 = function (utf8Array, length, offset) {
    'use strict';
    var c, c2, c3, firstNibble,
        result = "",
        i = 0;
    while (i < length) {
        c = utf8Array[offset + i++];
        firstNibble = c >> 4;
        if (firstNibble === 0) {
            break;
        } else if (firstNibble > 0 && firstNibble <= 7) {
            result += String.fromCharCode(c);
        } else if ((firstNibble === 12 || firstNibble === 13) && (i < length)) {
            c2 = utf8Array[offset + i++];
            result += String.fromCharCode(((c & 0x1F) << 6) | (c2 & 0x3F));
        } else if (firstNibble === 14 && i < (length + 1)) {
            c2 = utf8Array[offset + i++];
            c3 = utf8Array[offset + i++];
            result += String.fromCharCode(((c & 0x0F) << 12) | ((c2 & 0x3F) << 6) | ((c3 & 0x3F) << 0));
        } else {
            i++;
            CarsLogger.log('invalid utf-8 sequence, skipping character');
        }
    }
    return result;
};

var encodeUTF8 = function (string) {
    'use strict';
    var utf8String,
        utf8Array,
        i;

    utf8String = unescape(encodeURIComponent(string));
    utf8Array = new Uint8Array(utf8String.length);
    for (i = 0; i < utf8String.length; i = i + 1) {
        utf8Array[i] = utf8String.charCodeAt(i);
    }
    return utf8Array;
};

var toTIDataURLtoUint8Array = function (dataurl) {
    "use strict";
    var arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length - 1,
        u8arr = new Uint8Array(n);
    while (n >= 0) {
        u8arr[n] = bstr.charCodeAt(n);
        n -= 1;
    }
    return u8arr;
};

var DefaultCarsLoggerLevel = TILogger.LEVEL.DEBUG;
/*jshint -W079 */ // Redefinition of '{a}' GLOBAL
var CarsLogger;
var setCarsLoggerLevel = function (level) {
    "use strict";
    /*jshint -W020 */ // {a} is a read-only native object
    CarsLogger = TILogger.createLogger(level, "CARS:")
};
setCarsLoggerLevel(DefaultCarsLoggerLevel);