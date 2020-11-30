
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
            setTimeout(() => {
                me.onFulfilledCallbacks.forEach(cb => cb(value));
            });
            
        }
    }
    function reject(reason) {
        if (me.status === PENDING) {
            me.status = REJECTED;
            me.reason = reason;
            setTimeout(() => {
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

/**
 * @returns {PromiseZ} 返回一个新的PromiseZ
 * @param {*} onFulfilled 
 * @param {*} onRejected 
 */
PromiseZ.prototype.then = function (onFulfilled, onRejected) {
    const me = this;
    const onFulfilledCallback = typeof onFulfilled === 'function' ? onFulfilled : value => value;
    const onRejectedCallback = typeof onRejected === 'function' ? onRejected : reason => { throw reason };
    let promise2 = new PromiseZ((resolve, reject) => {
        // 这里的status表示上一个PromiseZ的状态
        if (me.status === FULFILLED) {
            setTimeout(() => { // onFulfilled 和 onRejected 应该是微任务，用setTimeout模拟
                try {
                    let x = onFulfilledCallback(me.value);
                    resolvePromise(promise2, x, resolve, reject);
                } catch (e) {
                    reject(e);
                }
            });
        } else if (me.status === REJECTED) {
            setTimeout(() => {
                try {
                    let x = onRejectedCallback(me.reason);
                    resolvePromise(promise2, x, resolve, reject);
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
                    resolvePromise(promise2, x, resolve, reject);
                } catch (e) {
                    reject(e);
                }
            });
        }
    });
    return promise2;
}

function resolvePromise(promise2, x, resolve, reject) {
    if (promise2 === x) { // 
        reject(new TypeError('Chaining cycle'));
    } else if (x && typeof x === 'object' || typeof x === 'function') {
        let called; // PromiseA+2.3.3.3.3 只能调用一次
        try {
            let then = x.then;
            if (typeof then === 'function') {
                then.call(x, y => {
                    if (called) return;
                    called = true;
                    resolvePromise(promise2, y, resolve, reject);
                }, r => {
                    if (called) return;
                    called = true;
                    reject(r);
                });
            } else {
                if (called) return;
                called = true;
                resolve(x);
            }
        } catch (e) {
            if (called) return;
            called = true;
            reject(e);
        }
    } else {
        resolve(x);
    }
}

// 执行测试用例需要用到的代码
PromiseZ.deferred = function() {
    let defer = {};
    defer.promise = new PromiseZ((resolve, reject) => {
        defer.resolve = resolve;
        defer.reject = reject;
    });
    return defer;
}
module.exports = PromiseZ
