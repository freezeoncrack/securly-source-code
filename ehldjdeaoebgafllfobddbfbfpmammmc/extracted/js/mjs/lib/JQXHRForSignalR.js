import _ from "/js/lib/underscore.js";

export default class JQXHRForSignalR{
    constructor(){
        this.abortController = new AbortController();
        this.status = 0;//default status for error
        this.abortText = null;
    }

    abort(statusText) {
        //only way to truly abort the request.
        //do we need to fake the abort though bc of the dfd?
        this.abortController.abort();
        this.abortText = statusText;
    }

    async runFetch(url, options, timeout){
        var respErr;
        try{
            options.signal = this.abortController.signal;
            if (timeout){
                this.timeout = _.delay(()=> this.abortController.abort(), timeout);
            }
            var resp = await fetch(url, options);
            this.status = resp.status;
            if (!resp.ok){
                respErr = new Error();
                respErr.json = {
                    status: resp.status,
                    statusText: resp.statusText
                };
            }
            //in both cases we want to try to get the text
            var text = await resp.text();
            if (text === ""){ 
                if (respErr){
                    var errToThrow = respErr;
                    respErr = null;
                    throw errToThrow;
                }
            }
            var obj;
            try{
                obj = JSON.parse(text);
            } catch(parseErr){
                if (respErr){
                    respErr.json.error_descrption = text;
                    throw respErr;
                }
                return text;//not JSON, but we still expect to resolve bc 
            }
            if (respErr){
                var oldjson = err.json;
                respErr.json = obj;
                respErr.json.status = oldjson.status;
                respErr.json.statusText = oldjson.statusText;
            } else {
                return obj;
            }
        }catch (err){
            //need to preserve the abortText 
            if (err.name === "AbortError" && this.abortText){
                throw new DOMException(this.abortText, "AbortError");
            }
            throw err;
        }
    }
}