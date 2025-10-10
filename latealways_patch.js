if ("serviceWorker" in navigator && !document.location.href.startsWith("file:")) {
    navigator.serviceWorker.register("sw.js");
}
let manifest = {
    update_url: "https://clients2.google.com/service/update2/crx",
    manifest_version: 2,
    name: "TI Connect CE App for Chrome OS",
    short_name: "TI Connect CE App",
    version: "0.1.0.9 Patched by LateAlways",
    version_name: "0.1.0.9",
    description: "Manage USB connected Texas Instruments TIâ€‘84 Plus CE graphing calculators",
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
        get: async (w, then) => {
            if (!localStorage.getItem("emul_storage_sync_"+w)) {
                window.chrome.runtime.lastError = {message: "fail to get key."};
                return then();
            }

            await new Promise(res => setTimeout(res, 100));

            window.chrome.runtime.lastError = undefined;
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
            callback({
                createWriter: (callback2) => {
                    let writer = {
                        truncate: () => {},
                        position: 0,
                        onwriteend: () => {},
                        write: async (blob) => {
                            let arrayBuffer = new TI_File(new Uint8Array(await blob.arrayBuffer())).fileData;
                            // analyze blob to see if its a python appvar
                            let appvarid = arrayBuffer[2] << 24 | arrayBuffer[3] << 16 | arrayBuffer[4] << 8 | arrayBuffer[5];
                            if(appvarid === 1348027204) {
                                // convert to appvar to py
                                lib.FS.writeFile("./"+options.suggestedName, new Uint8Array(await blob.arrayBuffer()));
                                let pythonAppvar = lib.TIVarFile.loadFromFile("./"+options.suggestedName);
                                let pyData = pythonAppvar.getReadableContent();
                                blob = new Blob([pyData], {type: "application/x-python"});

                                options.suggestedName = options.suggestedName.substr(0,options.suggestedName.length-4)+".py";
                                options.accepts[0].extensions = ["py"];
                            }
                            showSaveFilePicker({suggestedName: options.suggestedName, types: [{accept: {"application/octet-stream": options.accepts[0].extensions.map(s => "."+s)}}]}).then(async fileEntry => {
                                let writable = await fileEntry.createWritable();
                                
                                await writable.write(blob);
                                await writable.close();
                                writer.onwriteend();
                            });
                        }
                    }
                    callback2(writer);
                }
            });
            
        } else if(options.type === "openFile") {
            chrome.runtime.lastError = undefined;
            let extensions = options.accepts[0].extensions.map(s => "."+s);
            extensions.push(".py");
            showOpenFilePicker({multiple: options.acceptsMultiple || false, types: [{description: options.accepts[0].description, accept: {"application/octet-stream": extensions}}]}).then(async fileEntries => {
                let returnValue = [];
                let files = new Promise((res, rej) => {
                    fileEntries.forEach(async fileEntry => {
                        if(fileEntry.name.substr(fileEntry.name.length-3, fileEntry.name.length).toLowerCase() === ".py") {
                            let newfilename = fileEntry.name.substr(0,fileEntry.name.length-3).substr(0,8).toUpperCase();
                            let pythonappvar = lib.TIVarFile.createNew(lib.TIVarType.createFromName("PythonAppVar"), newfilename, lib.TIModel.createFromName("84+CEPy"));
    
                            let filecontent = await fileEntry.getFile();
                            await filecontent.arrayBuffer().then(buffer => {
                                pythonappvar.setContentFromString(buffer);
                            });
    
                            let output = pythonappvar.saveVarToFile("", newfilename)
                            let rawdata = lib.FS.readFile(output, {encoding: "binary"});
                            returnValue.push({
                                file: async (s) => {

                                    let out = new File([rawdata], newfilename+".8xv", {type: "application/octet-stream"});
                                    s(out);
                                    return out;
                                },
                                name: newfilename+".8xv"
                            });
                        } else {
                            returnValue.push({
                                file: async (s) => {
                                    let out = await fileEntry.getFile();
                                    console.log(out);
                                    s(out);
                                    return out;
                                },
                                name: fileEntry.name
                            });
                        }
                        if(returnValue.length === fileEntries.length) res();
                    })
                })
                files.then(() => {
                    if(options.acceptsMultiple) {
                        callback(returnValue);
                    } else {
                        callback(returnValue[0]);
                    }
                });
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
                callback2({
                    createWriter: async (callback3) => {
                        let writer = {
                            truncate: () => {},
                            position: 0,
                            write: async (blob) => {
                                let arrayBuffer = new TI_File(new Uint8Array(await blob.arrayBuffer())).fileData;
                                // analyze blob to see if its a python appvar
                                let appvarid = arrayBuffer[2] << 24 | arrayBuffer[3] << 16 | arrayBuffer[4] << 8 | arrayBuffer[5];
                                if(appvarid === 1348027204) {
                                    // convert to appvar to py
                                    lib.FS.writeFile("./"+filename, new Uint8Array(await blob.arrayBuffer()));
                                    let pythonAppvar = lib.TIVarFile.loadFromFile("./"+filename);
                                    let pyData = pythonAppvar.getReadableContent();
                                    blob = new Blob([pyData], {type: "application/x-python"});

                                    filename = filename.substr(0,filename.length-4)+".py";
                                }
                                showSaveFilePicker({suggestedName: filename}).then(async fileEntry => {
                                    let writable = await fileEntry.createWritable();

                                    await writable.write(blob);
                                    await writable.close();
                                    writer.onwriteend();
                                }).catch(err => setTimeout(() => writer.write(blob), 100));
                                
                            },
                            onwriteend: () => {}
                        }
                        callback3(writer);
                    }
                })
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
    pairDevice: () => latealways_patch.setUsbDevice([{vendorId: 1105, productId: 57347}, {vendorId: 1105, productId: 57352}])
}

window.hookfunction = (parent, func, newfunc) => {
    let oldfunc = parent[func];
    parent[func] = newfunc.bind(parent);
    return oldfunc;
}

document.addEventListener("DOMContentLoaded", (event) => {
    document.title = "TI Connect CE";

    let icon = document.createElement("link")
    icon.rel = "icon"
    icon.type = "image/x-icon"
    icon.href = manifest.icons[Object.keys(manifest.icons).map(s => Number(s)).toSorted((a,b) => a>b).reverse()[0]]
    
    document.head.appendChild(icon);
    
    waitForElementToExist("#toolbar_add_from_comp").then(e => {
        angular.element('#toolbar_add_from_comp').controller().fileTypes.PROTECTED_PROGRAM = {name:"Protected Program",icon:"images/filetype_program.svg"}
    })

    let oldHandleDrop;
    oldHandleDrop = hookfunction(angular.element("body").scope(), "handleDrop", async (e) => {
        let newe = {
            preventDefault: () => {},
            stopPropagation: () => {}
        };
        e.preventDefault();
        e.stopPropagation();
        let items = e.dataTransfer.items;
        newe.dataTransfer = {
            items: []
        }
        for(let i = 0; i < items.length; i++) {
            let name = items[i].getAsFile().name;
            if(name.substr(name.length-3, name.length).toLowerCase() === ".py") {
                let newfilename = name.substr(0,name.length-3).substr(0,8).toUpperCase();
                let pythonappvar = lib.TIVarFile.createNew(lib.TIVarType.createFromName("PythonAppVar"), newfilename, lib.TIModel.createFromName("84+CEPy"));

                let filecontent = await items[i].getAsFile().arrayBuffer();
                pythonappvar.setContentFromString(filecontent);

                let output = pythonappvar.saveVarToFile("", newfilename)
                let rawdata = lib.FS.readFile(output, {encoding: "binary"});
                newe.dataTransfer.items.push({
                    webkitGetAsEntry: () => {
                        return {
                            name: newfilename+".8xv",
                            file: async (s) => {
                                let out = new File([rawdata], newfilename+".8xv", {type: "application/octet-stream"});
                                s(out);
                                return out;
                            }
                        }
                    }
                });
            } else {
                newe.dataTransfer.items.push(items[i]);
            }
        }
        return oldHandleDrop(newe);
    })
});
import TIVarsLib from "./TIVarsLib.js"
window.lib = null;
TIVarsLib().then(result => window.lib = result);