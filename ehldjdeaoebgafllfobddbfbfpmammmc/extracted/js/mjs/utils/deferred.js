var deferredProvider = {
    get: function (func) {
        var resolveOut, rejectOut;
        var p = new Promise(function (resolve, reject){
            resolveOut = resolve;
            rejectOut = reject;
        });
        p.resolve = function (val) {
            resolveOut(val);
            return p;
        };
        p.reject = function (err) {
            rejectOut(err);
            return p;
        };
        if (func){
            func(p);
        }
        return p;
    }
};

export default deferredProvider;