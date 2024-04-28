import sys
import os
import re
import struct
import zipfile

try:
    set
except NameError:
    from sets import Set as set
if sys.version_info.major >= 3:
    import urllib.request

    request = urllib.request
    from urllib.request import urlopen
else:
    import urllib2 as urllib

    request = urllib
    urlopen = urllib.urlopen

url = "https://clients2.google.com/service/update2/crx?response=redirect&os=cros&arch=x86-64&os_arch=x86-64&nacl_arch=x86-64&prod=chromiumcrx&prodchannel=unknown&prodversion=124.0.0.0&acceptformat=crx2,crx3&x=id%3Daokihcpccmdjjkebakdanncddpdnkfla%26uc"

def fetch(url):
    try:
        return urlopen(url).read()
    except Exception as e:
        print("Error fetching url", url, e)
        sys.exit(1)

# remove old dir
if os.path.exists("temp"):
    import shutil
    shutil.rmtree("temp")

if os.path.exists("www"):
    import shutil
    shutil.rmtree("www")

os.makedirs("temp", exist_ok=True)
print("Preparing to download extension...")

furl = urlopen(url)
print("Downloading extension...")
size = 0
with open("temp/extension.crx", "wb") as crx_out:
    chunk = True
    while chunk:
        chunk = furl.read(1024)
        if len(chunk) < 1:
            break
        crx_out.write(chunk)
        size += len(chunk)
    
    crx_out.close()

print("Extension downloaded")

print("Decoding extension...")
with open("temp/extension.crx", "rb") as crx:
    magic_number = crx.read(4)
    magic_number_s = None
    magic_number_s = magic_number.decode("utf-8")
    if magic_number_s != "Cr24":
        print("Invalid extension file. Something went wrong...")
        sys.exit(1)
    
    version = struct.unpack(b"<I", crx.read(4))[0]

    public_key_length = struct.unpack(b"<I", crx.read(4))[0]
    zip_sig = b"\x50\x4b\x03\x04"

    if version <= 2:
        signature_key_length = struct.unpack(b"<I", crx.read(4))[0]
        if signature_key_length > 1024*4/8:
            print("Signature key length larget than normal.", signature_key_length)

        
        crx.seek(public_key_length+signature_key_length, os.SEEK_CUR)

    wrote = 0

    try:
        print("Saving extension zip...")
        with open("temp/extension.zip", "wb") as zip_out:
            buf = " "
            while buf:
                buf = crx.read(1)
                if buf:
                    zip_out.write(buf)
                    wrote += 1
            
            zip_out.close()
    except IOError as e:
        print("Error writing extension zip file", e)

    print("Saved extension zip file.")
    crx.close()

print("Extracting extension...")
with zipfile.ZipFile("temp/extension.zip", "r") as zip_ref:
    zip_ref.extractall("temp/www")
    zip_ref.close()

print("Extension extracted.")

print("Downloading patch file...")

patch_url = "https://raw.githubusercontent.com/LateAlways/ti-connect-ce-browser/main/latealways_patch.js"

content = fetch(patch_url)

print("Patch file downloaded.")
with open("temp/www/latealways_patch.js", "wb") as patch_out:
    patch_out.write(content)
    patch_out.close()

print("Patch file saved.")

print("Patching index.html...")

newhtml = ""
with open("temp/www/index.html", "r") as index_file:
    newhtml = "<script src=\"latealways_patch.js\"></script>\n"+index_file.read()
    index_file.close()

with open("temp/www/index.html", "w") as index_file:
    index_file.write(newhtml)
    index_file.close()

print("Patched index.html")

print("Patching dialog-about")
dialog_content = None
with open("temp/www/templates/dialog-about.html", "r") as dialog_file:
    dialog_content = dialog_file.read().replace("../images/TI logo @2x.png", "images/TI logo @2x.png")
    dialog_file.close()

with open("temp/www/templates/dialog-about.html", "w") as dialog_file:
    dialog_file.write(dialog_content)
    dialog_file.close()

print("Patched dialog-about")

print("Moving from temp to www...")
import shutil
shutil.move("temp/www", "./")

print("Moved to www")

print("Cleaning up...")

shutil.rmtree("temp")

print("Cleaned up.")

print("Done.")
