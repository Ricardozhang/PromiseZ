const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

function PromiseZ(fn) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined
    this.onFulfilledCallback; // 需要在then方法里赋值
    this.onRejectedCallback; // 需要在then方法里赋值
    const me = this;
    function resolve(value) {
        if (me.status === PENDING) {
            me.status = FULFILLED;
            me.value = value;
            me.onFulfilledCallback && me.onFulfilledCallback(value);
        }
    }
    function reject(reason) {
        if (me.status === PENDING) {
            me.status = REJECTED;
            me.reason = reason;
            me.onRejectedCallback && me.onRejectedCallback(reason);
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
        onFulfilledCallback(me.value);
    } else if (me.status === REJECTED) {
        onRejectedCallback(me.reason);
    } else {
        me.onFulfilledCallback = onFulfilledCallback;
        me.onRejectedCallback = onRejectedCallback;
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