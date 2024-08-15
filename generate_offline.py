import generate
import os
import re
import base64

generate.generate_patched(False)

def get_all_files_to_offline():
    files_in_www = []
    for root, _, files in os.walk("www/"):
        for file in files:
            files_in_www.append(os.path.join(root[4:], file).replace("\\", "/"))
    
    return files_in_www

tivarslib = "<script>"+open("www/TIVarsLib.js").read().replace("import.meta.url", "\"\"").replace("export default TIVarsLib;", "window.lib = TIVarsLib();")+"</script>"

offline_file = tivarslib+"""
<script>
let rawOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function () {
    console.log("Fetching: "+arguments[1]+"...");
    this.requestURL = arguments[1];
    return rawOpen.apply(this, arguments)
}
let rawSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function () {
    let parsedURL = new URL(this.requestURL, "http://example.com/");
    this.statusText = "LOADING";
    this.status = 200;
    let response;
"""

def generate_offline(html="index.html"):
    temp = open("www/"+html, "r").read()
    for jsscript in re.findall(r"<script.*?src=\"(.*?)\".*?>", temp):
        temp = temp.replace(jsscript, "data:text/javascript;base64,"+base64.b64encode(open("www/"+jsscript, "rb").read()).decode())
        
    for cssfile in re.findall(r"<link.*?href=\"(.*?)\".*?>", temp):
        temp = temp.replace(cssfile, "data:text/css;base64,"+base64.b64encode(open("www/"+cssfile, "rb").read()).decode())
        
    for imagefile in re.findall(r"<img.*?src=\"(.*?)\".*?>", temp):
        try:
            temp = temp.replace(imagefile, "data:image/png;base64,"+base64.b64encode(open("www/"+imagefile, "rb").read()).decode())
        except:
            pass
        
    return temp

for file in get_all_files_to_offline():
    offline_file += """
    if(parsedURL.pathname == new URL(\""""+file+"""\", "http://example.com/").pathname) {
        response = atob(\""""+base64.b64encode(open("www/"+file, "rb").read() if file[-5:] != ".html" else generate_offline(file).encode()).decode()+"""\");
    }
    """

offline_file += """
if(response) {
Object.defineProperty(this, "response", {
            get: function() {
                return response;
            }
        });
        Object.defineProperty(this, "responseText", {
            get: function() {
                return response;
            }
        });
        Object.defineProperty(this, "responseURL", {
            get: function() {
                return this.requestURL;
            }
        });
        Object.defineProperty(this, "statusText", {
            get: function() {
                return "OK";
            }
        });
        Object.defineProperty(this, "status", {
            get: function() {
                return 200;
            }
        });
        Object.defineProperty(this, "readyState", {
            get: function() {
                return 4;
            }
        });        
        this.onload();
    }
}
</script>"""


offline_file += generate_offline()

with open("www/offline.html", "w") as offline:
    offline.write(offline_file)
    offline.close()