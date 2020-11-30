
## 前言
Promise作为异步编程的一种解决方案，已经变得十分常用。而手写Promise也是面试中的高频题，今天我们就来一步一步完成一个完美符合PromiseA+规范的Promise吧

## 准备工作

[PromiseA+规范翻译](https://juejin.cn/post/6897093832320811022)

我们使用 [promises-aplus-tests](https://github.com/promises-aplus/promises-tests) (版本 2.1.2) 来测试 我们写的 PromiseZ

全局安装

```
npm install promises-aplus-tests -g
```
在PromiseZ (例如 index.js) 中添加
```
PromiseZ.deferred = function() {
    let defer = {};
    defer.promise = new PromiseZ((resolve, reject) => {
        defer.resolve = resolve;
        defer.reject = reject;
    });
    return defer;
}
module.exports = PromiseZ;
```
执行脚本

```
promises-aplus-tests index.js
```

> 在手写过程中，如果遇到某些地方不理解的情况，可以根据控制台中爆红的提示，在promises-aplus-tests 定位相应的测试用例，便于加深理解


## 1· 基本使用

首先呢，先来看看比较常用的写法


```
new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve('resolved');
    }, 2000);
}).then(res => {
    console.log(res);
})
// 输出结果 resolved
```

我们知道 Promise有三种状态: **pending, fulfilled, rejected**

状态只能由 pending 转为 fulfilled 或者 rejected， 且状态不可逆。

Promise作为构造函数时，会将一个函数作为它的参数传入

并且Promise是一个含有 then方法的函数

基于此，先写一个最基本的


```
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
```
解析： 当PromiseZ的参数fn是同步执行resolve或者reject时，在调用.then时，状态已经不再是pending，则直接调用 onFulfilledCallback 或者 onRejectedCallback即可；

当fn是异步执行resolve或者reject时，调用.then时状态还处于 pending。 需要将onFulfilledCallback、onRejectedCallback赋值到this，通过resolve/reject来执行回调。

## 2.多次调用.then

我们知道，Promise是可以多次调用then方法的，例如


```
let p = new Promise((res) => {
    setTimeout(() => {
        res(10);
    }, 1000)
});
p.then(v => {
    console.log(v + 1);
});
p.then(v => {
    console.log(v + 2);
});
// 输出结果 11  12
```
所以 this.onFulfilledCallback 和 this.onRejectedCallback 应当是个数组结构，接收多个then内传入的方法；

```diff
function PromiseZ(fn) {
    /** 省略 **/
-   this.onFulfilledCallback;
-   this.onRejectedCallback;
+   this.onFulfilledCallbacks = [];
+   this.onRejectedCallbacks = [];
    function resolve(value) {
        if (me.status === PENDING) {
            me.status = FULFILLED;
            me.value = value;
-           me.onFulfilledCallback && me.onFulfilledCallback(value);
+           me.onFulfilledCallbacks.forEach(cb => cb(value));
        }
    }
    function reject(reason) {
        if (me.status === PENDING) {
            me.status = REJECTED;
            me.reason = reason;
-           me.onRejectedCallback && me.onRejectedCallback(reason);
+           me.onRejectedCallbacks.forEach(cb => cb(reason));
        }
    }
    /** 省略 **/
}

PromiseZ.prototype.then = function (onFulfilled, onRejected) {
    /** 省略 **/
    else {
-      me.onFulfilledCallback = onFulfilledCallback;
-      me.onRejectedCallback = onRejectedCallback;
+      me.onFulfilledCallbacks.push(onFulfilledCallback);
+      me.onFulfilledCallbacks.push(onFulfilledCallback);
    }
}
```
这下我们可以一个Promise多次调用then方法了

## 3.onFulfilled 和 onRejected 应该是微任务

Promise A+ 规范里有以上这么一条规范，该怎么理解呢，我们来看看下面这两个栗子。


```
console.log('start');
new Promise(resolve => {
    resolve('resolved');
}).then(() => {
    console.log('then');
});
console.log('end');
// 输出顺序为  start resolved  end  then
```
然而使用我们的PromiseZ的输出顺序 是  start resolved  then end

原因是在执行 then方法时 状态已经变为 FULFILLED/REJECTED，我们立刻执行了onFulfilledCallback/onRejectedCallback，导致整个执行顺序并不符合PromiseA+规范。

再看一个栗子


```
let resolve1;
console.log('start');
new Promise(resolve => {
    console.log('pending');
    resolve1 = resolve;
}).then(() => {
    console.log('then');
});
resolve1();
console.log('end');
// 输出顺序为 start pending  end  then
```
使用我们的PromiseZ的输出顺序为 start pending then end
在执行 then方法时, 状态为pending，所以将我们立刻执行了onFulfilledCallback 推入数组队列中。当执行resolve1 后，状态发生变更，立刻将队列中的所有方法都执行，导致不符合预期。

为解决以上问题，我们使用setTimeout来模拟 微任务

```diff
function PromiseZ(fn) {
    /** 省略 **/
    function resolve(value) {
        if (me.status === PENDING) {
            me.status = FULFILLED;
            me.value = value;
+           setTimeout(() => {
                me.onFulfilledCallbacks.forEach(cb => cb(value));
+           });
           
        }
    }
    function reject(reason) {
        if (me.status === PENDING) {
            me.status = REJECTED;
            me.reason = reason;
+           setTimeout(() => {
                me.onRejectedCallbacks.forEach(cb => cb(reason));
+           });
        }
    }
}

PromiseZ.prototype.then = function (onFulfilled, onRejected) {
    /** 省略 **/
    if (me.status === FULFILLED) {
+       setTimeout(() => {
            onFulfilledCallback(me.value);
+       });
    } else if (me.status === REJECTED) {
+       setTimeout(() => {
            onRejectedCallback(me.reason);
+       });
    } else {
        /** 省略 **/
    }
}
```

## 4.链式调用

new Promise().then(dothing1).then(dothing2) 这种调用已经非常常见了，本质上是每次执行then方法后都返回一个新的Promise（注：是新的Promise，不再是初始的那个）


```
let p = new Promise(res => res(2));
let then = p.then(v => v);
then instanceof Promise // true
then === p // false
```
对then方法进行重写,让其返回一个新的PromiseZ: promise2

```diff
PromiseZ.prototype.then = function (onFulfilled, onRejected) {
    /** 省略 **/
+   let promise2 = new PromiseZ((resolve, reject) => {
        if (me.status === FULFILLED) {
            setTimeout(() => {
+               try {
-                   onFulfilledCallback(me.value);
+                   let x = onFulfilledCallback(me.value);
+                   resolve(x);
+               } catch(e) {
+                   reject(e);
+               }
            });
        } else if (me.status === REJECTED) {
            setTimeout(() => {
+               try {
-                   onRejectedCallback(me.reason);
+                   let x = onRejectedCallback(me.reason);
+                   resolve(x); // 这里使用resolve而不是reject
+               } catch(e) {
+                   reject(e);
+               }
            });
        } else {
-           me.onFulfilledCallbacks.push(onFulfilledCallback);
-           me.onFulfilledCallbacks.push(onFulfilledCallback);
+           me.onFulfilledCallbacks.push((value) => {
+               try {
+                    let x = onFulfilledCallback(value);
+                    resolve(x);
+               } catch (e) {
+                    reject(e);
+               }
+           });
+            me.onRejectedCallbacks.push((reason) => {
+               try {
+                   let x = onRejectedCallback(reason);
+                   resolve(x); // 这里使用resolve而不是reject
+               } catch(e) {
+                   reject(e);
+               }
+            });
        }
+   })
+   return promise2;
}
```
> 这里使用resolve而不是reject
> 是因为当我们在then方法中的onRejected 接收到了上一个错误，说明我们对预期的错误进行了处理，进行下一层传递时应该执行下一个then的onFulfilled，除非在执行本次resolve时又出现了其他错误


测试一下 

```
console.log('start');
new PromiseZ(res => {
    setTimeout(() => {
        console.log('resolve');
        res(10);
    }, 3000)
}).then(v => {
    console.log('then1');
    return v + 3;
}).then(v => {
    console.log('then2');
    console.log(v);
})
console.log('end');
// 输出 start end resolve then1 then2 13
// 符合预期
```
## 5. x是一个Promise
在上一个环节，我们定义了一个变量x用来接收 onFulfilledCallback/onRejectedCallback 的结果。
提供的测试用例也都不是PromiseZ类型的。

如果x也是一个PromiseZ的话，那么promise2的状态就要取决于 x 的状态

例如


```
console.log('start');
new Promise((res) => {
    console.log('promise1 pending');
    setTimeout(() => {
        console.log('promise1 resolve');
        res(1);
    }, 2000);
}).then(v => {
    console.log(`then1: ${v}`);
    return new Promise(res => {
        console.log(`promise2 pending: ${v}`);
        setTimeout(() => {
            console.log(`promise2 resolve: ${v}`);
            res(v + 3);
        }, 2000);
    })
}).then(v => {
    console.log(`then2: ${v}`);
});
console.log('end');
// 输出结果
start
promise1 pending
end
promise1 resolve
then1: 1
promise2 pending: 1
promise2 resolve: 1
then2: 4
```

我们这里定义一个resolvePromise桥梁函数，用于对x与promise2的状态进行连接 resolve(promise2, x, resolve, reject);
其中resolve、reject都是由promise2提供的，可以理解为 当x的状态变为FULFILLED/REJECTED时，再来调用resolve/reject来改变promise2的状态

```diff
PromiseZ.prototype.then = function (onFulfilled, onRejected) {
    /** 省略 **/
    let promise2 = new PromiseZ((resolve, reject) => {
            /** 省略 **/
-           resolve(x);
+           resolvePromise(promise2, x, resolve, reject);
            /** 省略 **/
        
    });
}
```

```
function resolvePromise(promise2, x, resolve, reject) {
    if (x instanceof PromiseZ) {
        try {
            let then = x.then;
            // 递归调用
            then.call(x, y => {
                resolvePromise(promise2, y, resolve, reject);
            }, r => {
                reject(r);
            });
        } catch (e) {
            reject(e);
        }
    } else {
        resolve(x);
    }
}
```
> 递归调用：当x的状态变为FULFILLED，resolve的结果 y 可能又是一个PromiseZ，promise2的状态又再次依赖于y......
所以我们需要对此进行递归调用；

## 6. x 是一个 thenable

首先，Promise规范给出的的 
thenable定义
> 'thenable' 是一个定义then方法的对象或者函数

我们先来举几个栗子

```
new Promise(res => res(10)).then(v => {
    return {
        other: v,
        then: v + 2
    }
}).then(ans => {
    console.log(ans);
});

new Promise(res => res(10)).then(v => {
    return {
        other: v,
        then: () => {
            return v + 2;
        }
    }
}).then(ans => {
    console.log(ans);
});

new Promise(res => res(10)).then(v => {
    return {
        other: v,
        then: (res, rej) => {
            res(v + 2);
        }
    }
}).then(ans => {
    console.log(ans);
});
```
来猜测一下上面三个then方法的输出结果，下面是正确的返回结果


```
// 第一个
{
    other: 10,
    then: 12
}
// 第二个 
// 不会打印，即不会then方法里的代码（Promise状态一直在pending）
// 第三个
12
```
综上，Promise对thenable做特殊处理，将其也当做一个Promise来进行处理

```diff
function resolvePromise(promise2, x, resolve, reject) {
-   if (x instanceof PromiseZ) {
+   if (typeof x === 'object' && x || typeof x === 'function') {
       try {
            let then = x.then;
+           if (type of then === 'function')
                then.call(x, y => {
                    resolvePromise(promise2, y, resolve, reject);
                }, r => {
                    reject(r);
                });
+           } else {
+               resolve(x);
+           }
        } catch (e) {
            reject(e);
        }
    } else {
        /** 省略 **/
    }
}
```
【x 是一个thenable】 实际上是包含了【x是一个Promise】的情况

到这里，我们已经实现了Promise的大部分功能，但是要想完全符合Promise规范，还得继续调整一下

## 7. x === promise2

在运行测试用例时，发现当 x === promise2时，产生了循环引用。 来看个简单的测试用例


```
let promise = new PromiseZ(res => res()).then(function () {
    return promise;
});
```
当产生了循环引用时, 直接reject出一个TypeError

```diff
function resolvePromise(promise2, x, resolve, reject) {
+   if (x === promise2) {
+       reject(new TypeError('chaining cycle'));
+   } else if (typeof x === 'object' && x || typeof x === 'function') {
        /** 省略 **/
    } else {
        resolve(x);
    }
}
```

## 8. thenable中只能resolve/reject一次

在前面我们就提过，Promise的状态是不可逆的，在执行完resolve或者reject之后，再次执行resolve或者reject应该被忽略掉，在PromiseZ中我们已经加入了这样逻辑（判断状态）。同样的，在thenable中，我们也应该遵守这种规定。看下面的测试用例。


```
new Promise(res => res()).then(() => {
    return {
        then: function (onFulfilled) {
            // 第一个onFulfilled
            onFulfilled({
                then: function (onFulfilled) {
                    setTimeout(function () {
                        onFulfilled('onFulfilled1');
                    }, 0);
                }
            });
            // 第二个onFulfilled
            onFulfilled('onFulfilled2');
        }
    };
}).then(value => {
    console.log(value);
});
// 正确输出 onFulfilled1
```
然而在我们的PromiseZ中确会打印 **onFulfilled2** 
因为在执行第一个onFulfilled后返回了一个thenable，在该thenable中是异步执行 onFulfilled，所以当前PromiseZ的状态依旧处于 pending，因此便继续执行第二个onFulfilled了。
所以我们需要增加一个标识符 **called**，从而忽略之后的调用

```diff
function resolvePromise(promise2, x, resolve, reject) {
    if (x === promise2) {
        reject(new TypeError('chaining cycle'))
    } else if (typeof x === 'object' && x || typeof x === 'function') {
+       let called
        try {
            let then = x.then;
            if (typeof then === 'function') {
                then.call(x, y => {
+                   if (called) return;
+                   called = true;
                    resolvePromise(promise2, y, resolve, reject);
                }, r => {
+                   if (called) return;
+                   called = true;
                    reject(r);
                });
            } else {
+               if (called) return;
+               called = true;
                resolve(x);
            }  
        } catch (e) {
+               if (called) return;
+               called = true;
            reject(e);
        }
    } else {
        resolve(x);
    }
}
```
到这里，一个完美符合PromiseA+ 规范的 PromiseZ就完成啦

## 参考链接

[Promise的源码实现（完美符合Promise/A+规范）](https://juejin.cn/post/6844903796129136654)

[ECMAScript 6 入门 Promise]( https://es6.ruanyifeng.com/#docs/promise)

[PromiseA+](https://promisesaplus.com/)

[[翻译] We have a problem with promises](http://fex.baidu.com/blog/2015/07/we-have-a-problem-with-promises/)
