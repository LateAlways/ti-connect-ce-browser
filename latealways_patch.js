let manifest = {
    update_url: "https://clients2.google.com/service/update2/crx",
    manifest_version: 2,
    name: "TI Connect CE App for Chrome OS",
    short_name: "TI Connect CE App",
    version: "0.1.0.9 Patched by LateAlways",
    version_name: "0.1.0.9",
    description: "Manage USB connected Texas Instruments TI‑84 Plus CE graphing calculators",
    icons: {
        16: "images/icon16.png",
        48: "images/icon48.png",
        128: "images/icon128.png"
    },
    permissions: [
        {
            fileSystem: [
                "write",
                "retainEntries",
                "directory"
            ]
        },
        "usb",
        {
            usbDevices: [
                {
                    vendorId: 1105,
                    productId: 57352
                }
            ]
        },
        "https://www.google-analytics.com/",
        "storage"
    ],
    app: {
        background: {
            scripts: [
                "js/background.js"
            ]
        }
    },
    file_handlers: {
        tic_handler: {
            extensions: [
                "8xv"
            ]
        }
    },
    minimum_chrome_version: "41"
};

// runtime api
window.chrome.runtime = {
    lastError: 0,
    getManifest: () => {
        return manifest
    },
    getBackgroundPage: (s) => {
        s(window)
        return window
    }
};

// storage api

window.chrome.storage = {
    local: {
        QUOTA_BYTES: 5242880,
        set: (w, then) => {
            for (let key in w) {
                localStorage.setItem("emul_storage_local_"+key, JSON.stringify(w[key]));
            }
            then();
        },
        get: (w, then) => {
            if (!localStorage.getItem("emul_storage_local_"+w)) {
                window.chrome.runtime.lastError = {message: "fail to get key."};
            } else {
                window.chrome.runtime.lastError = undefined;
            }

            then({ [w]: JSON.parse(localStorage.getItem("emul_storage_local_"+w)) });
        },
        getBytesInUse: (w, then) => {
            if (then) {
                then(0);
            } else {
                return new Promise((res, rej) => {
                    res(0);
                });
            }
        },
    },
    sync: {
        QUOTA_BYTES: 5242880,
        set: (w, then) => {
            for (let key in w) {
                localStorage.setItem("emul_storage_sync_"+key, JSON.stringify(w[key]));
            }
            then();
        },
        get: (w, then) => {
            if (!localStorage.getItem("emul_storage_sync_"+w)) {
                window.chrome.runtime.lastError = {message: "fail to get key."};
            } else {
                window.chrome.runtime.lastError = undefined;
            }

            then({ [w]: JSON.parse(localStorage.getItem("emul_storage_sync_"+w)) });
        },
        getBytesInUse: (w, then) => {
            if (then) {
                then(0);
            } else {
                return new Promise((res, rej) => {
                    res(0);
                });
            }
        },
    },
    onChanged: {
        addListener: () => { }
    }
}

// usb api

let currentDevice = null;
let events = {
    onDeviceAdded: [],
    onDeviceRemoved: []
};

window.chrome.usb = {
    closeDevice: (w,s) => {chrome.runtime.lastError = undefined; s(); },
    onDeviceAdded: {
        addListener: (s) => {
            events.onDeviceAdded.push(s);
        }
    },
    onDeviceRemoved: {
        addListener: (s) => {
            events.onDeviceRemoved.push(s);
        }
    },
    getDevices: (w, then) => {
        chrome.runtime.lastError = undefined;
        then(currentDevice ? [currentDevice] : []);
    },
    openDevice: (w, then) => {
        chrome.runtime.lastError = undefined;
        then(w);
    },
    getConfiguration: (usbdevice, then) => {
        chrome.runtime.lastError = undefined;
        let patchedConfiguration = {
            configurationValue: usbdevice._device.configuration.configurationValue,
            interfaces: []
        }

        for (let i = 0; i < usbdevice._device.configuration.interfaces.length; i++) {
            let patchedInterface = {endpoints: []};

            for (let j = 0; j < usbdevice._device.configuration.interfaces[i].alternate.endpoints.length; j++) {
                let endpoint = usbdevice._device.configuration.interfaces[i].alternate.endpoints[j];
                let patchedEndpoint = {
                    address: endpoint.address,
                    type: endpoint.type,
                    direction: endpoint.direction,
                    maximumPacketSize: endpoint.maximumPacketSize
                };
                patchedInterface.endpoints.push(patchedEndpoint);
            }

            patchedConfiguration.interfaces.push(patchedInterface);
        }

        
        then(patchedConfiguration);
    },
    claimInterface: async (usbdevice, interfaceNumber, then) => {
        chrome.runtime.lastError = {message: "fail to open interface"};
        await usbdevice._device.open();
        if (usbdevice._device.configuration === null) await usbdevice._device.selectConfiguration(1);
        await usbdevice._device.claimInterface(interfaceNumber);
        chrome.runtime.lastError = undefined;
        then();
    },
    bulkTransfer: async (usbdevice, transferInfo, then) => {
        //let endpoint = usbdevice._device.configuration.interfaces[0].alternate.endpoints.find(e => e.direction === transferInfo.direction).endpointNumber;
        //console.warn(endpoint, transferInfo.direction)
        if(transferInfo.direction === "out") {
            usbdevice._device.transferOut(2, transferInfo.data).then(result => then({resultCode: result.status == "ok" ? 0 : 1})).catch(e => {chrome.runtime.lastError = "fail to write to usb "+e; then({resultCode: 1}); });
        } else {
            usbdevice._device.transferIn(1, transferInfo.length).then(result => then({resultCode: result.status == "ok" ? 0 : 1, data: result.data.buffer})).catch(e => {chrome.runtime.lastError = "fail to write to usb "+e; then({resultCode: 1}); });
        }
        chrome.runtime.lastError = undefined;
    },
    releaseInterface:  (device, interfacenum, callback) => {
        callback();
    }
}


navigator.usb.addEventListener("disconnect", () => {
    if(currentDevice) {
        events.onDeviceRemoved.forEach(e => e(currentDevice));
    }
    currentDevice = null;
})


// file system api

window.chrome.fileSystem = {
    chooseEntry: async (options, callback) => {
        if(options.type === "saveFile") {
            chrome.runtime.lastError = undefined;
            showSaveFilePicker({suggestedName: options.suggestedName, types: [{accept: {"application/octet-stream": options.accepts[0].extensions.map(s => "."+s)}}]}).then(fileEntry => {
                callback({
                    createWriter: async (callback2) => {
                        let writable = await fileEntry.createWritable();
                        let writer = {
                            truncate: () => {},
                            position: 0,
                            onwriteend: () => {},
                            write: async (blob) => {
                                await writable.write(blob);
                                await writable.close();
                                writer.onwriteend();
                            }
                        }
                        callback2(writer);
                    }
                });
            }).catch(err => alert(err));
        } else if(options.type === "openFile") {
            chrome.runtime.lastError = undefined;
            showOpenFilePicker({multiple: true, types: [{description: options.accepts[0].description, accept: {"application/octet-stream": options.accepts[0].extensions.map(s => "."+s)}}]}).then(fileEntries => {
                let returnValue = [];
                fileEntries.forEach(fileEntry => {
                    returnValue.push({
                        file: async (s) => {
                            s(await fileEntry.getFile());
                            return await fileEntry.getFile();
                        },
                        name: fileEntry.name
                    });
                })
                callback(returnValue);
            });
        }else if(options.type === "openDirectory") {
            callback([1]);
        } else {
            console.log("invalid option: ", options)
        }
    },
    getWritableEntry: (filehandle, callback) => {
        let retval = {
            getFile: async (filename, options, callback2) => {
                showSaveFilePicker({suggestedName: filename}).then(fileEntry => {
                    callback2({
                        createWriter: async (callback3) => {
                            let writable = await fileEntry.createWritable();
                            let writer = {
                                truncate: () => {},
                                position: 0,
                                write: async (blob) => {
                                    await writable.write(blob);
                                    await writable.close();
                                    writer.onwriteend();
                                },
                                onwriteend: () => {}
                            }
                            callback3(writer);
                        }
                    })
                }).catch(err => setTimeout(() => retval.getFile(filename,options,callback2), 100));
                
            }
        }
        callback(retval)
    }
}


function waitForElementToExist(selector) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
    });
  });
}

window.latealways_patch = {
    setUsbDevice: (w) => {
        return navigator.usb.requestDevice({filters: w}).then(device => {
            window.chrome.runtime.lastError = undefined;
            if(currentDevice) {
                events.onDeviceRemoved.forEach(e => e(currentDevice));
            }
            let device_ret = {
                _device: device,
                configuration: device.configuration,
            };
            currentDevice = device_ret
            events.onDeviceAdded.forEach(e => e(device_ret));
            setTimeout(() => angular.element("#refresh").controller().refresh(), 500);
            
            return device
        })
    },
}


document.addEventListener("DOMContentLoaded", (event) => {
    waitForElementToExist("#TOOLBAR_LOGO").then(e => {
        document.title = "TI Connect CE";

        const pairDevice = () => latealways_patch.setUsbDevice([{vendorId: 1105, productId: 57347}, {vendorId: 1105, productId: 57352}]);
    
        TOOLBAR_LOGO.addEventListener("click", pairDevice)
        document.querySelectorAll(".ConnectCalcsHelp").values().forEach(e => e.addEventListener("click", pairDevice))
    
        TOOLBAR_LOGO.getElementsByTagName("text")[0].innerHTML = "Click here to select Calculator device"
        
    });
    let icon = document.createElement("link")
    icon.rel = "icon"
    icon.type = "image/x-icon"
    icon.href = manifest.icons[Object.keys(manifest.icons).map(s => Number(s)).toSorted((a,b) => a>b).reverse()[0]]
    
    document.head.appendChild(icon);
    
    waitForElementToExist("#toolbar_add_from_comp").then(e => {
        angular.element('#toolbar_add_from_comp').controller().fileTypes.PROTECTED_PROGRAM = {name:"Protected Program",icon:"images/filetype_program.svg"}
    })
});
