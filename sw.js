const FILES_TO_CACHE = [
    "/",
    "manifest.json",
    "index.html",
    "latealways_patch.js",
    "pwa.webmanifest",
    "TIVarsLib.js",
    "TIVarsLib.wasm",
    "cars/src/css/main.css",
    "cars/src/js/obfuscatedcars.js",
    "cars/src/js/utilities/array-extension.js",
    "cars/src/js/utilities/ti-logger.js",
    "cars/src/js/utilities/string-extension.js",
    "cars/src/js/utilities/common-utils.js",
    "lib/ngDialog/css/ngDialog.css",
    "lib/ngDialog/css/ngDialog-theme-default.css",
    "lib/ngDialog/js/ngDialog.js",
    "lib/jquery/jquery-1.11.3.js",
    "lib/analytics/google-analytics-bundle.js",
    "lib/jsZip/jszip.js",
    "lib/angular/angular-sanitize.js",
    "lib/angular/angular-touch.js",
    "lib/angular/angular-csp.css",
    "lib/angular/angular.js",
    "lib/angular/angular-animate.js",
    "images/animation_arrow.svg",
    "images/filetype_matrix.svg",
    "images/filetype_certificate.svg",
    "images/TI logo @2x.png",
    "images/filetype_string.svg",
    "images/icon_checkmark_green_hover.svg",
    "images/ScreenCapture.png",
    "images/animation_capture.svg",
    "images/toolbar_slide_show.svg",
    "images/icon48.png",
    "images/toolbar_border.svg",
    "images/toolbar_add_from_comp.svg",
    "images/filetype_app.svg",
    "images/filetype_graphdb.svg",
    "images/filetype_real.svg",
    "images/toolbar_settings.svg",
    "images/TI-83 Premium CE @2x.png",
    "images/ticonnect-icon-48.png",
    "images/toolbar_calc.svg",
    "images/file_list_background.png",
    "images/icon_checkmark_green.svg",
    "images/toolbar_capture.svg",
    "images/icon_select.svg",
    "images/filetype_group.svg",
    "images/animation_files.svg",
    "images/lock.svg",
    "images/toolbar_send_to_hh.svg",
    "images/toolbar_missing.svg",
    "images/icon_close.svg",
    "images/icon_checkmark.svg",
    "images/icon128.png",
    "images/no hh connected 2.svg",
    "images/toolbar_refresh.svg",
    "images/filetype_list.svg",
    "images/TI-83 Plus fr @2x.png",
    "images/animation_delete.svg",
    "images/no hh connected.svg",
    "images/dialog_warning.svg",
    "images/filetype_range.svg",
    "images/filetype_os.svg",
    "images/ticonnect-icon-16.png",
    "images/ToolbarLogo.svg",
    "images/filetype_image.svg",
    "images/TI-84 Plus @2x.png",
    "images/splitter_chevron.svg",
    "images/TI-84 Plus C Silver Edition @2x.png",
    "images/toolbar_send_to_comp.svg",
    "images/menu.svg",
    "images/filetype_equation.svg",
    "images/toolbar_copy.svg",
    "images/filetype_program.svg",
    "images/ticonnect-icon-128.png",
    "images/icon16.png",
    "images/animation_fail.svg",
    "images/toolbar_styles.svg",
    "images/TI-84 Plus Silver Edition @2x.png",
    "images/toolbar_save.svg",
    "images/TI-84 Plus CE @2x.png",
    "images/animation_os.svg",
    "images/toolbar_delete.svg",
    "images/animation_sync.svg",
    "images/animation_calculator.svg",
    "css/dialog-custom-filename.css",
    "css/loading-mask.css",
    "css/dialog-send-files.css",
    "css/commtest.css",
    "css/dialog-duplicates.css",
    "css/app.css",
    "css/dialog-calc-info.css",
    "css/toolbar.css",
    "css/animations.css",
    "css/no-device.css",
    "css/ngDialog-theme.css",
    "css/screen-captures.css",
    "css/dialog-about.css",
    "css/device-explorer.css",
    "templates/no-device.html",
    "templates/screen-captures.html",
    "templates/dialog-delete-files.html",
    "templates/dialog-send-os.html",
    "templates/toolbar-device-explorer.html",
    "templates/dialog-developer-options.html",
    "templates/commtest.html",
    "templates/device-explorer.html",
    "templates/dialog-duplicate-filenames.html",
    "templates/screen-captures-slideshow.html",
    "templates/dialog-commtest.html",
    "templates/loading-mask.html",
    "templates/dialog-custom-filename.html",
    "templates/dialog-send-files.html",
    "templates/dialog-message.html",
    "templates/dialog-about.html",
    "templates/animations.html",
    "templates/dialog-commtest-config.html",
    "templates/dialog-calc-info.html",
    "templates/toolbar-screen-capture.html",
    "templates/toolbar-app.html",
    "templates/dialog-local-storage.html",
    "templates/dialog-long-message.html",
    "js/screencapture.js",
    "js/device-views.js",
    "js/background.js",
    "js/device-views-developer-options.js",
    "js/app.js",
    "js/developer-options.js",
    "js/commtest.js",
    "js/toolbar-app.js",
    "js/device-views-screencapture.js",
    "js/device-views-screencapture-slideshow.js",
    "js/app-utilities.js",
    "js/image-utilities.js",
];

    self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
        return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        })
    );
    })

    self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('v1')
        .then(cache => cache.addAll(FILES_TO_CACHE))
    );
    });

    self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(async response => {
        let response2;
        if(navigator.onLine) {
            response2 = fetch(event.request).then(response => {
            let statuscode = response.status;
            if(statuscode == 200) {
                caches.open('v1').then(cache => {
                    cache.put(event.request, response.clone());
                });
            }
            return response.clone();
            });
        }
        if(response) {
            return response;
        } else {
            return await response2;
        }
        })
    );
    });

    