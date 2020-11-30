const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

function PromiseZ(fn) {this.status = PENDING;
    this.value = undefined;
    this.reason = undefined
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    const me = this;
    function resolve(value) {
        if (me.status === PENDING) {
            me.status = FULFILLED;
            me.value = value;
            queueMicrotask(() => {
                me.onFulfilledCallbacks.forEach(cb => cb(value));
            });
            
        }
    }
    function reject(reason) {
        if (me.status === PENDING) {
            me.status = REJECTED;
            me.reason = reason;
            queueMicrotask(() => {
                me.onRejectedCallbacks.forEach(cb => cb(reason));
            });
        }
    }
    try {
        fn(resolve, reject);
    } catch (e) {
        reject(e);
    }
}

PromiseZ.prototype.then = function (onFulfilled, onRejected) {
    const me = this;
    const onFulfilledCallback = typeof onFulfilled === 'function' ? onFulfilled : value => value;
    const onRejectedCallback = typeof onRejected === 'function' ? onRejected : reason => { throw reason };
    if (me.status === FULFILLED) {
        queueMicrotask(() => {
            onFulfilledCallback(me.value);
        });
    } else if (me.status === REJECTED) {
        queueMicrotask(() => {
            onRejectedCallback(me.reason);
        });
    } else {
        me.onFulfilledCallbacks.push(onFulfilledCallback);
        me.onFulfilledCallbacks.push(onFulfilledCallback);
    }
}

PromiseZ.deferred = function() {
    let defer = {};
    defer.promise = new PromiseZ((resolve, reject) => {
        defer.resolve = resolve;
        defer.reject = reject;
    });
    return defer;
}
module.exports = PromiseZ