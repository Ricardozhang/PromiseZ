
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

function PromiseZ(fn) {
    this.status = PENDING;
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

    let promise2 = new PromiseZ((resolve, reject) => {
        if (me.status === FULFILLED) {
            queueMicrotask(() => {
                try {
                    let x = onFulfilledCallback(me.value);
                    resolvePromise(promise2, x, resolve, reject);
                } catch (e) {
                    reject(e);
                }
            });
        } else if (me.status === REJECTED) {
            queueMicrotask(() => {
                try {
                    let x = onRejectedCallback(me.reason);
                    resolvePromise(promise2, x, resolve, reject); // 这里使用resolve而不是reject
                } catch (e) {
                    reject(e);
                }
            });
        } else {
            me.onFulfilledCallbacks.push((value) => {
                try {
                    let x = onFulfilledCallback(value);
                    resolvePromise(promise2, x, resolve, reject);
                } catch (e) {
                    reject(e);
                }
            });
            me.onRejectedCallbacks.push((reason) => {
                try {
                    let x = onRejectedCallback(reason);
                    resolvePromise(promise2, x, resolve, reject); // 这里使用resolve而不是reject
                } catch (e) {
                    reject(e);
                }
            });
        }
    })
    return promise2;
}
function resolvePromise(promise2, x, resolve, reject) {
    if (x === promise2) {
        reject(new TypeError('chaining cycle'))
    } else if (typeof x === 'object' && x || typeof x === 'function') {
        try {
            let then = x.then;
            if (typeof then === 'function') {
                then.call(x, y => {
                    resolvePromise(promise2, y, resolve, reject);
                }, r => {
                    reject(r);
                });
            } else {
                resolve(x);
            }  
        } catch (e) {
            reject(e);
        }
    } else {
        resolve(x);
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
module.exports = PromiseZ;