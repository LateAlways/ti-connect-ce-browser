/*
  Copyright (C) 2015-2018, Texas Instruments
  All rights reserved.
*/
/*global angular, $, console, ScreenCapture, chrome, Blob */

(function () {
    'use strict';
    var app = angular.module('device-views-screencapture-slideshow', []);
    app.directive('screenCapturesSlideshow', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/screen-captures-slideshow.html',
            link: function (scope, iElement, iAttrs) {
                var connect = scope.connect;
                connect.screenZoomStart = function () {
                    var i,
                        screen,
                        screens = scope.model.screens;

                    for (i = screens.length - 1; i >= 0; i = i - 1) {
                        if (screens[i].selected || (!screen && i === 0)) {
                            screen = screens[i];
                        }
                    }
                    if (screen) {
                        connect.screenZoomOpen(screen);
                    }
                };

                connect.screenZoomOpen = function (screen, time) {
                    // display the screenZooom interface
                    connect.zoomScreen.screen = screen;
                    $('#ScreenBox' + screen.id)[0].scrollIntoView({behavior: "smooth"});
                    setTimeout(function () {
                        var imgTag,
                            offset,
                            top,
                            left,
                            width,
                            height,
                            background,
                            targetTop,
                            targetLeft,
                            targetWidth,
                            targetHeight,
                            fontSize;

                        if (!time) {
                            time = 500;
                        }
                        $('#screenZoomBackground').focus();
                        fontSize = parseInt($('HTML').css('font-size'), 10);
                        background = $('#screenZoomBackground');
                        // find out destination
                        targetTop = fontSize * 3.5;
                        targetLeft = fontSize * 6;
                        targetWidth = $(window).width() - (fontSize * 12);
                        targetHeight = $(window).height() - (fontSize * 4.5);
                        // find the screen image and location
                        imgTag = $('#ScreenImg' + screen.id);
                        offset = imgTag.offset();
                        top = offset.top + 2;
                        left = offset.left + 2;
                        width = imgTag.width();
                        height = imgTag.height();

                        // move the image to the screenZoomBackground
                        imgTag.appendTo(background);
                        // set it's position to the same as it was
                        imgTag.css('position', 'absolute');
                        imgTag.css('top', top + 'px');
                        imgTag.css('left', left + 'px');
                        imgTag.css('width', width + 'px');
                        imgTag.css('height', height + 'px');
                        imgTag.css('padding', 0);
                        imgTag.css('object-fit', 'contain');
                        // animate it to the placeholder location and size
                        imgTag.animate({
                            top: targetTop,
                            left: targetLeft,
                            width: targetWidth,
                            height: targetHeight
                        }, time, function () {
                            imgTag.css('top', '3.5rem');
                            imgTag.css('left', '6rem');
                            imgTag.css('width', 'calc(100% - 12rem)');
                            imgTag.css('height', 'calc(100% - 4.5rem)');
                            scope.$apply();
                        });
                        scope.$apply();
                    }, 20);

                };

                connect.screenZoomClose = function (time, nextFunc, close) {
                    setTimeout(function () {
                        var screen,
                            imgTag,
                            screenTag,
                            targetOffset,
                            fontSize;

                        if (!time) {
                            time = 500;
                        }
                        if (close === undefined) {
                            close = true;
                        }
                        fontSize = parseInt($('HTML').css('font-size'), 10);
                        imgTag = $('#screenZoomBackground .screenCaptureImg');
                        screen = connect.zoomScreen.screen;
                        screenTag = $('#screen' + screen.id);

                        targetOffset = screenTag.offset();

                        // animate it to the placeholder location and size
                        imgTag.animate({
                            top: targetOffset.top + (fontSize / 2),
                            left: targetOffset.left + (fontSize / 2),
                            width: (320 / 14) * fontSize,
                            height: (240 / 14) * fontSize,
                            padding: 2
                        }, time, function () {
                            imgTag.css('position', '');
                            imgTag.css('top', '');
                            imgTag.css('left', '');
                            imgTag.css('width', '');
                            imgTag.css('height', '');
                            imgTag.css('object-fit', '');
                            imgTag.css('padding', '');
                            // move the image to the screenZoomBackground
                            imgTag.appendTo(screenTag);
                            scope.$apply();
                            if (typeof nextFunc === 'function') {
                                nextFunc();
                            }
                        });
                        if (close) {
                            connect.zoomScreen.screen = undefined;
                        }
                        scope.$apply();
                    }, 0);
                };

                connect.screenZoomNextScreen = function () {
                    var imgTag,
                        currentScreen,
                        screen = false,
                        i,
                        screens;
                    if (connect.currentDevice) {
                        screens = scope.model.screens;
                        imgTag = $('#screenZoomBackground .screenCaptureImg');
                        currentScreen = connect.zoomScreen.screen;

                        for (i = 0; i < screens.length; i = i + 1) {
                            if (screens[i] === currentScreen && (i + 1) < screens.length) {
                                screen = screens[i + 1];
                                break;
                            }
                        }
                    }
                    return screen;
                };

                connect.screenZoomPrevScreen = function () {
                    var imgTag,
                        currentScreen,
                        screen = false,
                        i,
                        screens;
                    if (connect.currentDevice) {
                        screens = scope.model.screens;
                        imgTag = $('#screenZoomBackground .screenCaptureImg');
                        currentScreen = connect.zoomScreen.screen;

                        for (i = 0; i < screens.length; i = i + 1) {
                            if (screens[i] === currentScreen && (i - 1) >= 0) {
                                screen = screens[i - 1];
                                break;
                            }
                        }
                    }
                    return screen;
                };

                connect.screenZoomNext = function () {
                    var screen = connect.screenZoomNextScreen();
                    if (screen) {
                        connect.screenZoomClose(250, function () {
                            connect.screenZoomOpen(screen, 250);
                        }, false);
                    }
                };

                connect.screenZoomPrev = function () {
                    var screen = connect.screenZoomPrevScreen();
                    if (screen) {
                        connect.screenZoomClose(250, function () {
                            connect.screenZoomOpen(screen, 250);
                        }, false);
                    }
                };

                connect.screenZoomKeypress = function (event) {
                    switch (event.which) {
                    case 27: // escape
                        connect.screenZoomClose();
                        break;
                    case 37: // left
                    case 38: // up
                        connect.screenZoomPrev();
                        break;
                    case 39: // right
                    case 40: // down
                        connect.screenZoomNext();
                        break;
                    }
                };
            }
        };
    });

}());


//        connect.shiftKeyScreenAction = function (screen, clear) {
//            if (clear) {
//                connect.clearScreenSelection();
//            }
//            connect.selectAction(lastScreenSelected,
//                                 lastScreenIndex,
//                                 screen,
//                                 scope.model.screens);
//        };
