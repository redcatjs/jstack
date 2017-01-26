jstackClass = function(){
	this.config = {
		templatesPath: 'view-js/',
		controllersPath: 'controller-js/',
		defaultController: {},
		defaultTarget: '[j-app]',
		debug: $js.dev,
	};
	this.controllers = {};
};
jstackClass.prototype.extend = function(c,parent){
	c.prototype = Object.create(parent.prototype);
};
jstack = new jstackClass();
//from https://github.com/eface2face/object-observable

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ObjectObservable = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
var asap = require('asap');
var EventEmitter = require('events');
// var debug = require('debug')('object-observable');

var prefix = '__OBJECT_OBSERVABLE__PREFIX__' + new Date()+'__';

var ObjectObservable = {};

ObjectObservable.create = function (object,params)
{
	//IF no args
	if (!arguments.length)
		//Create empty object;
		object = {};

	//Set defaults
	var params = Object.assign(
		{},
		{
			clone: false,
			recursive: true
		},
		params
	);
	//Create emitter
	var emitter = new EventEmitter();
	var changes = [];
	var timer = false;
	var listeners = new WeakMap();

	//Trigger changes
	var changed = function(change,prefix) {
		//Duplicate
		var c = Object.assign({},change);
		//Add prefix
		if (prefix)
			//Append it
			c.path = change.path ? prefix + "." + change.path : prefix;
		//Add change
		changes.push(c);
		//Emit inmediate change
		emitter.emit('change',c);
		//If first change
		if (!timer)
		{
			//Set timer at end of this execution
			asap(function(){
				//Trigger changes
				emitter.emit('changes',changes);
				//Clear timer
				timer = false;
				//Clear changes
				changes = [];
			});
			//We have scheduled it already
			timer = true;
		}
	};

	//Create listener for key
	function addListener(key) {
		//Create listener for specific key
		var l =  function(change){
			//Fire it again
			changed(change,key);
		};
		//Add to map
		listeners[key] = l;
		//Return listener callback
		return l;
	}


	//Do not clone by default
	var cloned = object;
	//If we need to do it recursively
	if (params.recursive)
	{
		//Check if it is an array
		if (Array.isArray (object))
		{
			//Check if we need to clone object
			if (params.clone)
				//Create empty one
				cloned = [];
			//Convert each
			for (var i=0; i<object.length;++i)
			{
				//Get value
				var value = object[i];
				//It is a not-null object?
				if (typeof(value)==='object' && value )
				{
					//Is it already observable?
					if( !ObjectObservable.isObservable(value))
					{
						//Create a new proxy
						value = ObjectObservable.create(value);
						//Set it back
						cloned[i] = value;
					}
					//Set us as listeners
					ObjectObservable.observeInmediate(value,addListener(i));
				}
			}
		} else {
			//Check if we need to clone object
			if (params.clone)
				//Create empty one
				cloned = {};
			//Append each property
			for (var key in object)
			{
				//If it is a property
				if (object.hasOwnProperty (key))
				{
					//Get value
					var value = object[key];
					//It is a not-null object?
					if (typeof(value)==='object' && value )
					{
						//Is it already observable?
						if( !ObjectObservable.isObservable(value))
						{
							//Create a new proxy
							value = ObjectObservable.create(value);
							//Set it back
							cloned[key] = value;
						}
						//Set us as listeners
						ObjectObservable.observeInmediate(value,addListener(key));
					}
				}
			}
		}
	}

	//Create proxy for object
	return new Proxy(
			cloned,
			//Proxy handler object
			{
				get: function (target, key) {
					//Check if it is requesting listeners
					if (key===prefix)
						return emitter;

					//debug("%o get %s",target,key);
					return target[key];
				},
				set: function (target, key, value) {
					//Get the previous value
					var old = target[key];
					//Get listener
					var listener = listeners[key];
					//Remove us from the listener just in case
					old && listener && ObjectObservable.unobserveInmediate (old,listener);

					//debug("%o set %s from %o to %o",target,key,old,value);

					//It is a not-null object?
					if (params.recursive && typeof(value)==='object' && value )
					{
						//Is it already observable?
						if( !ObjectObservable.isObservable(value))
							//Create a new proxy
							value = ObjectObservable.create(value);
						//Set it before setting the listener or we will get events that we don't expect
						target[key] = value;
						//Set us as listeners
						ObjectObservable.observeInmediate(value,addListener(key));
					} else {
						//Set it
						target[key] = value;
					}

					//Fire change
					changed({
						type: 'set',
						target: target,
						key: key,
						value: value,
						old: old
					},key);
					//return new value
					return value;
				},
				deleteProperty: function (target, key) {
					//debug("%o deleteProperty %s",target,key);
					//Old value
					var old = target[key];

					//Get listener
					var listener = listeners[key];
					//Remove us from the listener just in case
					old && listener && ObjectObservable.unobserveInmediate (old,listener);

					if (Array.isArray (target))
						old = target.splice(key,1);
					else
						old = delete(target[key]);

					//Changed
					changed({
						type: 'deleteProperty',
						target: target,
						key: key,
					},key);
					//OK
					return old;
				},
				has: function (target, key) {
					//debug("%o has %s",target,key);
					return prefix===key || key in target;
				}
			}
		);
};

ObjectObservable.isObservable = function(object)
{
	return typeof(object)==='object' && object &&  prefix in object;
};

ObjectObservable.observe = function(object,listener)
{
	//Get emmiter
	var emitter = object[prefix];
	//Check if it is observable
	if (!emitter)
		throw new Error('Object is not observable');
	
	//Listen
	emitter.addListener('changes',listener);
	
	//reurn listener
	return listener;
};

ObjectObservable.once = function(object,listener)
{
	//Get emmiter
	var emitter = object[prefix];
	//Check if it is observable
	if (!emitter)
		throw new Error('Object is not observable');
	
	//Listen
	emitter.once('changes',listener);
	
	//return listener
	return listener;
};

ObjectObservable.unobserve = function(object,listener)
{
	//Get emmiter
	var emitter = object[prefix];
	//Check if it is observable
	if (!emitter)
		throw new Error('Object is not observable');
	
	//UnListen
	emitter.removeListener('changes',listener);
};

ObjectObservable.observeInmediate = function(object,listener)
{
	//Get emmiter
	var emitter = object[prefix];
	//Check if it is observable
	if (!emitter)
		throw new Error('Object is not observable');
	
	//UnListen
	emitter.addListener('change',listener);
};

ObjectObservable.unobserveInmediate = function(object,listener)
{
	//Get emmiter
	var emitter = object[prefix];
	//Check if it is observable
	if (!emitter)
		throw new Error('Object is not observable');
	
	//Listen
	return emitter.removeListener('change',listener);
};

module.exports = ObjectObservable;

},{"asap":3,"events":1}],3:[function(require,module,exports){
"use strict";

// rawAsap provides everything we need except exception management.
var rawAsap = require("./raw");
// RawTasks are recycled to reduce GC churn.
var freeTasks = [];
// We queue errors to ensure they are thrown in right order (FIFO).
// Array-as-queue is good enough here, since we are just dealing with exceptions.
var pendingErrors = [];
var requestErrorThrow = rawAsap.makeRequestCallFromTimer(throwFirstError);

function throwFirstError() {
    if (pendingErrors.length) {
        throw pendingErrors.shift();
    }
}

/**
 * Calls a task as soon as possible after returning, in its own event, with priority
 * over other events like animation, reflow, and repaint. An error thrown from an
 * event will not interrupt, nor even substantially slow down the processing of
 * other events, but will be rather postponed to a lower priority event.
 * @param {{call}} task A callable object, typically a function that takes no
 * arguments.
 */
module.exports = asap;
function asap(task) {
    var rawTask;
    if (freeTasks.length) {
        rawTask = freeTasks.pop();
    } else {
        rawTask = new RawTask();
    }
    rawTask.task = task;
    rawAsap(rawTask);
}

// We wrap tasks with recyclable task objects.  A task object implements
// `call`, just like a function.
function RawTask() {
    this.task = null;
}

// The sole purpose of wrapping the task is to catch the exception and recycle
// the task object after its single use.
RawTask.prototype.call = function () {
    try {
        this.task.call();
    } catch (error) {
        if (asap.onerror) {
            // This hook exists purely for testing purposes.
            // Its name will be periodically randomized to break any code that
            // depends on its existence.
            asap.onerror(error);
        } else {
            // In a web browser, exceptions are not fatal. However, to avoid
            // slowing down the queue of pending tasks, we rethrow the error in a
            // lower priority turn.
            pendingErrors.push(error);
            requestErrorThrow();
        }
    } finally {
        this.task = null;
        freeTasks[freeTasks.length] = this;
    }
};

},{"./raw":4}],4:[function(require,module,exports){
(function (global){
"use strict";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including IO, animation, reflow, and redraw
// events in browsers.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Equivalent to push, but avoids a function call.
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// `requestFlush` is an implementation-specific method that attempts to kick
// off a `flush` event as quickly as possible. `flush` will attempt to exhaust
// the event queue before yielding to the browser's own event loop.
var requestFlush;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index = 0;
// If a task schedules additional tasks recursively, the task queue can grow
// unbounded. To prevent memory exhaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

// `requestFlush` is implemented using a strategy based on data collected from
// every available SauceLabs Selenium web driver worker at time of writing.
// https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

// Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
// have WebKitMutationObserver but not un-prefixed MutationObserver.
// Must use `global` instead of `window` to work in both frames and web
// workers. `global` is a provision of Browserify, Mr, Mrs, or Mop.
var BrowserMutationObserver = global.MutationObserver || global.WebKitMutationObserver;

// MutationObservers are desirable because they have high priority and work
// reliably everywhere they are implemented.
// They are implemented in all modern browsers.
//
// - Android 4-4.3
// - Chrome 26-34
// - Firefox 14-29
// - Internet Explorer 11
// - iPad Safari 6-7.1
// - iPhone Safari 7-7.1
// - Safari 6-7
if (typeof BrowserMutationObserver === "function") {
    requestFlush = makeRequestCallFromMutationObserver(flush);

// MessageChannels are desirable because they give direct access to the HTML
// task queue, are implemented in Internet Explorer 10, Safari 5.0-1, and Opera
// 11-12, and in web workers in many engines.
// Although message channels yield to any queued rendering and IO tasks, they
// would be better than imposing the 4ms delay of timers.
// However, they do not work reliably in Internet Explorer or Safari.

// Internet Explorer 10 is the only browser that has setImmediate but does
// not have MutationObservers.
// Although setImmediate yields to the browser's renderer, it would be
// preferrable to falling back to setTimeout since it does not have
// the minimum 4ms penalty.
// Unfortunately there appears to be a bug in Internet Explorer 10 Mobile (and
// Desktop to a lesser extent) that renders both setImmediate and
// MessageChannel useless for the purposes of ASAP.
// https://github.com/kriskowal/q/issues/396

// Timers are implemented universally.
// We fall back to timers in workers in most engines, and in foreground
// contexts in the following browsers.
// However, note that even this simple case requires nuances to operate in a
// broad spectrum of browsers.
//
// - Firefox 3-13
// - Internet Explorer 6-9
// - iPad Safari 4.3
// - Lynx 2.8.7
} else {
    requestFlush = makeRequestCallFromTimer(flush);
}

// `requestFlush` requests that the high priority event queue be flushed as
// soon as possible.
// This is useful to prevent an error thrown in a task from stalling the event
// queue if the exception handled by Node.js’s
// `process.on("uncaughtException")` or by a domain.
rawAsap.requestFlush = requestFlush;

// To request a high priority event, we induce a mutation observer by toggling
// the text of a text node between "1" and "-1".
function makeRequestCallFromMutationObserver(callback) {
    var toggle = 1;
    var observer = new BrowserMutationObserver(callback);
    var node = document.createTextNode("");
    observer.observe(node, {characterData: true});
    return function requestCall() {
        toggle = -toggle;
        node.data = toggle;
    };
}

// The message channel technique was discovered by Malte Ubl and was the
// original foundation for this library.
// http://www.nonblocking.io/2011/06/windownexttick.html

// Safari 6.0.5 (at least) intermittently fails to create message ports on a
// page's first load. Thankfully, this version of Safari supports
// MutationObservers, so we don't need to fall back in that case.

// function makeRequestCallFromMessageChannel(callback) {
//     var channel = new MessageChannel();
//     channel.port1.onmessage = callback;
//     return function requestCall() {
//         channel.port2.postMessage(0);
//     };
// }

// For reasons explained above, we are also unable to use `setImmediate`
// under any circumstances.
// Even if we were, there is another bug in Internet Explorer 10.
// It is not sufficient to assign `setImmediate` to `requestFlush` because
// `setImmediate` must be called *by name* and therefore must be wrapped in a
// closure.
// Never forget.

// function makeRequestCallFromSetImmediate(callback) {
//     return function requestCall() {
//         setImmediate(callback);
//     };
// }

// Safari 6.0 has a problem where timers will get lost while the user is
// scrolling. This problem does not impact ASAP because Safari 6.0 supports
// mutation observers, so that implementation is used instead.
// However, if we ever elect to use timers in Safari, the prevalent work-around
// is to add a scroll event listener that calls for a flush.

// `setTimeout` does not call the passed callback if the delay is less than
// approximately 7 in web workers in Firefox 8 through 18, and sometimes not
// even then.

function makeRequestCallFromTimer(callback) {
    return function requestCall() {
        // We dispatch a timeout with a specified delay of 0 for engines that
        // can reliably accommodate that request. This will usually be snapped
        // to a 4 milisecond delay, but once we're flushing, there's no delay
        // between events.
        var timeoutHandle = setTimeout(handleTimer, 0);
        // However, since this timer gets frequently dropped in Firefox
        // workers, we enlist an interval handle that will try to fire
        // an event 20 times per second until it succeeds.
        var intervalHandle = setInterval(handleTimer, 50);

        function handleTimer() {
            // Whichever timer succeeds will cancel both timers and
            // execute the callback.
            clearTimeout(timeoutHandle);
            clearInterval(intervalHandle);
            callback();
        }
    };
}

// This is for `asap.js` only.
// Its name will be periodically randomized to break any code that depends on
// its existence.
rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

// ASAP was originally a nextTick shim included in Q. This was factored out
// into this ASAP package. It was later adapted to RSVP which made further
// amendments. These decisions, particularly to marginalize MessageChannel and
// to capture the MutationObserver implementation in a closure, were integrated
// back into ASAP proper.
// https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[2])(2)
});
jstack.controller = function(controller,element){
	
	if(typeof(controller)=='object'){
		jstack.controllers[controller.name] = function(element){
			
			var self = this;
			
			var data = element.data('jModel') || {};
			if(element.hasAttr('j-view-inherit')){
				var parent = element.parent().closest('[j-controller]');
				if(parent.length){
					var inheritProp = element.attr('j-view-inherit');
					var parentData = parent.data('jModel') || {};
					if(inheritProp){
						data[inheritProp] = parentData;
					}
					else{
						data = $.extend({},parentData,data);
					}
				}
			}
			
			var defaults = {
				domReady: function(){},
				setData: function(){},
				data: data,
			};
			
			
			$.extend(true,this,defaults,controller);
			
			
			this.ready = $.Deferred();
			this.element = element;
			element.data('jController',this);
			
			this.startDataObserver = function(){
				self.data = ObjectObservable.create(self.data);
				ObjectObservable.observe(self.data,function(change){
					//console.log('j:model:update',change);
					jstack.dataBinder.update();
				});
			};
			
			this.setDataArguments = [];
			this.setDataCall = function(){
				var r = this.setData.apply( this, this.setDataArguments );
				if(r==false){
					this.noRender = true;
				}
				else if($.type(r)=='object'&&r!==ctrl.data){
					$.extend(this.data,r);
				}
				this.startDataObserver();
			};			
			
			this.render = function(html){
				if(this.noRender) return;
				
				html = $(html);
				
				html.find(':input[name],[j-input],[j-select]').each(function(){
					var key = jstack.dataBinder.getScopedInput(this);
					var val = jstack.dataBinder.getInputVal(this);
					jstack.dataBinder.dotSet(key,self.data,val,true);
					
				});
				
				
				var el = this.element;
				el.data('jModel',this.data);
				el.attr('j-controller',this.name);
				if(Boolean(el.attr('j-view-append'))){
					el.append( html );
				}
				else{
					el.html( html );
				}
				this.domReady();
			};
			
		};
		return jstack.controllers[controller.name];
	}

	
	controller = jstack.controllers[controller] || jstack.controller($.extend(true,{name:controller},jstack.config.defaultController));
	
	controller = new controller(element);
	
	var name = controller.name;
	
	var dependencies = [];
	
	if(controller.dependencies&&controller.dependencies.length){		
		var dependenciesJsReady = $.Deferred();
		$js(controller.dependencies,function(){
			dependenciesJsReady.resolve();
		});
		dependencies.push(dependenciesJsReady);
	}
	
	
	var dependenciesData = controller.dependenciesData;
	if(dependenciesData){
		if(typeof(dependenciesData)=='function'){
			controller.dependenciesData = dependenciesData = controller.dependenciesData();
		}
		if(dependenciesData&&dependenciesData.length){
			var dependenciesDataRun = [];
			for(var i = 0, l = dependenciesData.length; i < l; i++){
				var dependencyData = dependenciesData[i];
				if(typeof(dependencyData)=='function'){
					dependencyData = dependencyData.call(controller);
				}
				
					
				if($.type(dependencyData)=='object'){
					if('abort' in dependencyData){
						var ddata = dependencyData;
						dependencyData = $.Deferred();
						(function(dependencyData){
							ddata.then(function(ajaxReturn){
								dependencyData.resolve(ajaxReturn);
							});
						})(dependencyData);
					}
				}
				if(!($.type(dependencyData)=='object'&&('then' in dependencyData))){
					var ddata = dependencyData;
					dependencyData = $.Deferred();
					dependencyData.resolve(ddata);
				}
					

				dependenciesDataRun.push(dependencyData);
			}
			var resolveDeferred = $.when.apply($, dependenciesDataRun).then(function(){
				for(var i = 0, l = arguments.length; i < l; i++){
					controller.setDataArguments.push(arguments[i]);
				}
			});
			dependencies.push(resolveDeferred);
		}
	}
	
	$.when.apply($, dependencies).then(function(){
		controller.setDataCall();
		controller.ready.resolve();
	});
	
	return controller;
};
jstack.url = (function(){
	var Url = function(){};
	var recursiveArrayToObject = function(o){
		var params = {};
		for(var k in o){
			if(o.hasOwnProperty(k)){
				if(o[k] instanceof Array)
					params[k] = recursiveArrayToObject(o[k]);
				else
					params[k] = o[k];
			}
		}
		return params;
	};
	Url.prototype.params = new Array();
	Url.prototype.getQuery = function(url) {
		var str = url;
		var strpos = str.indexOf('?');
		if (strpos == -1) return '';
		str = str.substr(strpos + 1, str.length);
		strpos = str.indexOf('#');
		if(strpos == -1) return str;
		return str.substr(0,strpos);
	};
	Url.prototype.getPath = function(url) {
		var strpos = url.indexOf('?');
		if (strpos == -1) return url;
		return url.substr(0, strpos);
	};
	Url.prototype.buildParamFromString =  function(param){
		var p = decodeURIComponent(param);
		var strpos = p.indexOf('=');
		if(strpos == -1 ){
			if(p!==''){
				this.params[p] = '';
				this.params.length++;
			}
			return true;
		}
		var name = p.substr(0,strpos);
		var value = p.substr(strpos+1,p.length);
		var openBracket = name.indexOf('[');
		var closeBracket = name.indexOf(']');
		if(openBracket == -1 || closeBracket == -1){
			if(!(openBracket == -1 && closeBracket == -1)){
				name = name.replace(new RegExp('[\\[\\]]'),'_');
			}
			this.params[name] = value;
			return true;
		}
		var matches = name.match(new RegExp('\\[.*?\\]','g'));
		name = name.substr(0,openBracket);
		p = 'this.params';
		var key = name;
		for(var i in matches){
			if(!matches.hasOwnProperty(i)) continue;
			p += '[\''+key+'\']';
			if(eval(p) == undefined || typeof(eval(p)) != 'object'){
				eval(p +'= new Array();');
			}
			key = matches[i].substr(1,matches[i].length-2);
			if(key == ''){
				key = eval(p).length;
			}
		}
		p += '[\''+key+'\']';
		eval(p +'= \''+value+'\';');
	};
	Url.prototype.parseQuery = function(queryString){
		var str = queryString;
		str = str.replace(new RegExp('&'), '&');
		this.params = new Array();
		this.params.length = 0;
		str = str.split('&');		
		var p = '';
		var startPos = -1;
		var endPos = -1;
		var arrayName = '';
		var arrayKey = '';
		for ( var i = 0; i < str.length; i++) {
			this.buildParamFromString(str[i]);
		}
		
		return recursiveArrayToObject(this.params);
	};
	Url.prototype.buildStringFromParam = function(object,prefix){
		var p = '';
		var value ='';
		if(prefix != undefined){
			p = prefix;
		}
		if(typeof(object) == 'object'){
			for(var name in object){
				value = object[name];
				name = p == '' ? name : '['+name+']';
				if(typeof(value) == 'object')
				{
					this.buildStringFromParam(value,p+name);
				}
				else
				{
					this.params[this.params.length] = p+name+'='+value;
				}
			}
		}
	};
	Url.prototype.buildQuery = function(params) {
		this.params = new Array();
		this.buildStringFromParam(params);
		return this.params.join('&');
	};
	Url.prototype.getParams = function(str){
		return this.parseQuery(this.getQuery(str));
	};
	Url.prototype.getParamsFromHash = function(){
		return this.getParams(document.location.hash);
	};
	return new Url();
})();
jstack.uniqid = function( prefix, more_entropy ) {
  //  discuss at: http://phpjs.org/functions/uniqid/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //  revised by: Kankrelune (http://www.webfaktory.info/)
  //        note: Uses an internal counter (in php_js global) to avoid collision
  //        test: skip
  //   example 1: uniqid();
  //   returns 1: 'a30285b160c14'
  //   example 2: uniqid('foo');
  //   returns 2: 'fooa30285b1cd361'
  //   example 3: uniqid('bar', true);
  //   returns 3: 'bara20285b23dfd1.31879087'

  if ( typeof prefix === "undefined" ) {
    prefix = "";
  }

  var retId;
  var formatSeed = function( seed, reqWidth ) {
    seed = parseInt( seed, 10 )
      .toString( 16 ); // To hex str
    if ( reqWidth < seed.length ) {
      // So long we split
      return seed.slice( seed.length - reqWidth );
    }
    if ( reqWidth > seed.length ) {
      // So short we pad
      return Array( 1 + ( reqWidth - seed.length ) )
        .join( "0" ) + seed;
    }
    return seed;
  };

  // BEGIN REDUNDANT
  if ( !this.php_js ) {
    this.php_js = {};
  }
  // END REDUNDANT
  if ( !this.php_js.uniqidSeed ) {
    // Init seed with big random int
    this.php_js.uniqidSeed = Math.floor( Math.random() * 0x75bcd15 );
  }
  this.php_js.uniqidSeed++;

  // Start with prefix, add current milliseconds hex string
  retId = prefix;
  retId += formatSeed( parseInt( new Date()
    .getTime() / 1000, 10 ), 8 );
  // Add seed hex string
  retId += formatSeed( this.php_js.uniqidSeed, 5 );
  if ( more_entropy ) {
    // For more entropy we add a float lower to 10
    retId += ( Math.random() * 10 )
      .toFixed( 8 )
      .toString();
  }

  return retId;
};
jstack.isPositiveInteger = function(n) { 6 // good for all numeric values which are valid up to Number.MAX_VALUE, i.e. to about 1.7976931348623157e+308:
    return 0 === n % (!isNaN(parseFloat(n)) && 0 <= ~~n);
};
jstack.isIntKey = function(n) {
    return n >>> 0 === parseFloat(n);
};
jstack.arrayRemove = function(a, from, to) {
  var rest = a.slice((to || from) + 1 || a.length);
  a.length = from < 0 ? a.length + from : from;
  return Array.prototype.push.apply(a, rest);
};
jstack.flatObservable = function(){
	var args = [];
	for(var i=0,l=arguments.length;i<l;i++){
		var arg = arguments[i];
		arg = JSON.parse(JSON.stringify(arg));
		args.push(arg);
	}
	return args;
};
jstack.log = function(){
	
	console.log((new Error()).stack.split('\n')[1]);
	
	var args = jstack.flatObservable.apply(jstack,arguments);
	console.log.apply(console,args);
};
String.prototype.camelCase = function() {
	return this.replace( /(\_[a-z])/g, function( $1 ) {return $1.toUpperCase().replace( "_", "" );} );
};
String.prototype.camelCaseDash = function() {
	return this.replace( /(\-[a-z])/g, function( $1 ) {return $1.toUpperCase().replace( "-", "" );} );
};
String.prototype.lcfirst = function() {
	return this.charAt( 0 ).toLowerCase() + this.substr( 1 );
};
String.prototype.escapeRegExp = function() {
	//return this.replace( /([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1" );
	return this.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};
String.prototype.replaceAllRegExp = function(find, replace){
  return this.replace( new RegExp( find, "g" ), replace );
};
String.prototype.replaceAll = function(find, replace){
	find = find.escapeRegExp();
	return this.replaceAllRegExp(find, replace);
};
String.prototype.snakeCase = function() {
	return this.replace( /([A-Z])/g, function( $1 ) {return "_" + $1.toLowerCase();} );
};
String.prototype.snakeCaseDash = function() {
	return this.replace( /([A-Z])/g, function( $1 ) {return "-" + $1.toLowerCase();} );
};
(function(){

function trim ( str, charlist ) {
  //  discuss at: http://locutusjs.io/php/trim/
  // original by: Kevin van Zonneveld (http://kvz.io)
  // improved by: mdsjack (http://www.mdsjack.bo.it)
  // improved by: Alexander Ermolaev (http://snippets.dzone.com/user/AlexanderErmolaev)
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // improved by: Steven Levithan (http://blog.stevenlevithan.com)
  // improved by: Jack
  //    input by: Erkekjetter
  //    input by: DxGx
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  //   example 1: trim('    Kevin van Zonneveld    ')
  //   returns 1: 'Kevin van Zonneveld'
  //   example 2: trim('Hello World', 'Hdle')
  //   returns 2: 'o Wor'
  //   example 3: trim(16, 1)
  //   returns 3: '6'

  var whitespace = [
    " ",
    "\n",
    "\r",
    "\t",
    "\f",
    "\x0b",
    "\xa0",
    "\u2000",
    "\u2001",
    "\u2002",
    "\u2003",
    "\u2004",
    "\u2005",
    "\u2006",
    "\u2007",
    "\u2008",
    "\u2009",
    "\u200a",
    "\u200b",
    "\u2028",
    "\u2029",
    "\u3000"
  ].join( "" );
  var l = 0;
  var i = 0;
  str += "";

  if ( charlist ) {
    whitespace = ( charlist + "" ).replace( /([\[\]\(\)\.\?\/\*\{\}\+\$\^:])/g, "$1" );
  }

  l = str.length;
  for ( i = 0; i < l; i++ ) {
    if ( whitespace.indexOf( str.charAt( i ) ) === -1 ) {
      str = str.substring( i );
      break;
    }
  }

  l = str.length;
  for ( i = l - 1; i >= 0; i-- ) {
    if ( whitespace.indexOf( str.charAt( i ) ) === -1 ) {
      str = str.substring( 0, i + 1 );
      break;
    }
  }

  return whitespace.indexOf( str.charAt( 0 ) ) === -1 ? str : "";
}


function ltrim ( str, charlist ) {
  //  discuss at: http://locutusjs.io/php/ltrim/
  // original by: Kevin van Zonneveld (http://kvz.io)
  //    input by: Erkekjetter
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  //   example 1: ltrim('    Kevin van Zonneveld    ')
  //   returns 1: 'Kevin van Zonneveld    '

  charlist = !charlist ? " \\s\u00A0" : ( charlist + "" )
    .replace( /([\[\]\(\)\.\?\/\*\{\}\+\$\^:])/g, "$1" );

  var re = new RegExp( "^[" + charlist + "]+", "g" );

  return ( str + "" )
    .replace( re, "" );
}

function rtrim ( str, charlist ) {
  //  discuss at: http://locutusjs.io/php/rtrim/
  // original by: Kevin van Zonneveld (http://kvz.io)
  //    input by: Erkekjetter
  //    input by: rem
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  // bugfixed by: Brett Zamir (http://brett-zamir.me)
  //   example 1: rtrim('    Kevin van Zonneveld    ')
  //   returns 1: '    Kevin van Zonneveld'

  charlist = !charlist ? " \\s\u00A0" : ( charlist + "" )
    .replace( /([\[\]\(\)\.\?\/\*\{\}\+\$\^:])/g, "\\$1" );

  var re = new RegExp( "[" + charlist + "]+$", "g" );

  return ( str + "" ).replace( re, "" );
}


String.prototype.trim = function( charlist ) {
	return trim( this, charlist );
};
String.prototype.ltrim = function( charlist ) {
	return ltrim( this, charlist );
};
String.prototype.rtrim = function( charlist ) {
	return rtrim( this, charlist );
};

})();
String.prototype.ucfirst = function() {
	return this.charAt( 0 ).toUpperCase() + this.substr( 1 );
};
jstack.reflection = {};
jstack.reflection.arguments = function( f ) {
	var args = f.toString().match( /^\s*function\s+(?:\w*\s*)?\((.*?)\)\s*{/ );
	var r = {};
	if ( args && args[ 1 ] ) {
		args = args[ 1 ];
		args = args.replace( /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, "" );
		args = args.trim().split( /\s*,\s*/ );
		for ( var i = 0; i < args.length; i++ ) {
			var arg = args[ i ];
			var idf = arg.indexOf( "=" );
			if ( idf === -1 ) {
				r[ arg ] = undefined;
			} else {
				r[ arg.substr( 0, idf ) ] = eval( arg.substr( idf + 1 ).trim() );
			}
		}
	}
	return r;
};
jstack.reflection.isCyclic = function(obj){
  var keys = [];
  var stack = [];
  var stackSet = new Set();
  var detected = false;

  function detect(obj, key) {
    if (typeof obj != 'object') { return; }
    
    if (stackSet.has(obj)) { // it's cyclic! Print the object and its locations.
      var oldindex = stack.indexOf(obj);
      var l1 = keys.join('.') + '.' + key;
      var l2 = keys.slice(0, oldindex + 1).join('.');
      console.log('CIRCULAR: ' + l1 + ' = ' + l2 + ' = ' + obj);
      console.log(obj);
      detected = true;
      return;
    }

    keys.push(key);
    stack.push(obj);
    stackSet.add(obj);
    for (var k in obj) { //dive on the object's children
      if (obj.hasOwnProperty(k)) { detect(obj[k], k); }
    }

    keys.pop();
    stack.pop();
    stackSet.delete(obj);
    return;
  }

  detect(obj, 'obj');
  return detected;
};
$.arrayCompare = function (a, b) {
	return $(a).not(b).get().length === 0 && $(b).not(a).get().length === 0;
};
$.fn.attrStartsWith = function(s) {
	var attrs = {};
	this.each(function(index){
		$.each(this.attributes, function(index, attr){
			if(attr.name.indexOf(s)===0){
			   attrs[attr.name] = attr.value;
			}
		});
	});
	return attrs;
};
$.attrsToObject = function( k, v, r ) {
	if(!r) r = {};
	var s = k.split('--');
	if ( typeof( r ) == "undefined" ) r = {};
	var ref = r;
	var l = s.length - 1;
	$.each( s, function( i, key ) {
	key = $.camelCase(key);
		if ( i == l ) {
			ref[ key ] = v;
		}
		else {
			if ( !ref[ key ] ) ref[ key ] = {};
			ref = ref[ key ];
		}
	} );
	return r;
};
$.fn.changeVal = function( v ) {
	return $( this ).val( v ).trigger( "change" );
};
$.fn.childrenHeight = function( outer, marginOuter, filterVisible ) {
	var topOffset = bottomOffset = 0;
	if ( typeof( outer ) == "undefined" ) outer = true;
	if ( typeof( marginOuter ) == "undefined" ) marginOuter = true;
	if ( typeof( filterVisible ) == "undefined" ) filterVisible = true;
	var children = this.children();
	if(filterVisible){
		children = children.filter(':visible');
	}
	children.each( function( i, e ) {
		var $e = $( e );
		var eTopOffset = $e.offset().top;
		var eBottomOffset = eTopOffset + ( outer ? $e.outerHeight(marginOuter) : $e.height() );
		
		if ( eTopOffset < topOffset )
			topOffset = eTopOffset;
		if ( eBottomOffset > bottomOffset )
			bottomOffset = eBottomOffset;
	} );
	return bottomOffset - topOffset - this.offset().top;
};
$.fn.dataAttrConfig = function(prefix){
	if(!prefix){
		prefix = 'data-';
	}
	var substr = prefix.length;
	var attrData = this.attrStartsWith(prefix);
	var data = {};
	$.each(attrData,function(k,v){
		$.attrsToObject( k.substr(substr), v, data );
	});
	return data;
};
$.fn.findExclude = function (Selector, Mask, Parent) {
	var result = $([]);
	$(this).each(function (Idx, Elem) {
		$(Elem).find(Selector).each(function (Idx2, Elem2) {
			var el = $(Elem2);
			if(Parent)
				el = el.parent();
			var closest = el.closest(Mask);
			if (closest[0] == Elem || !closest.length) {
				result =  result.add(Elem2);
			}
		});
	});
	return result;
};
$.fn.hasHorizontalScrollBar = function() {
	return this.get( 0 ) ? this.get( 0 ).scrollWidth > this.innerWidth() : false;
};
$.fn.hasVerticalScrollBar = function() {
	return this.get( 0 ) ? this.get( 0 ).scrollHeight > this.innerHeight() : false;
};
(function(){

var findForks = {
	"nth-level": function( selector, param ) {
		param = parseInt( param, 10 );
		var a = [];
		var $this = this;
		this.each( function() {
			var level = param + $( this ).parents( selector ).length;
			$this.find( selector ).each( function() {
				if ( $( this ).parents( selector ).length == param - 1 ) {
					a.push( this );
				}
			} );
		} );
		return $( a );
	}
};

$.fn.findOrig = $.fn.find;
$.fn.find = function( selector ) {

	if ( typeof( selector ) == "string" ) {
		var fork, THIS = this;
		$.each( findForks, function( k, v ) {
			var i = selector.indexOf( ":" + k );
			if ( i !== -1 ) {
				var l = k.length;
				var selectorPart = selector.substr( 0, i );
				var param = selector.substr( i + l + 2, selector.length - i - l - 3 );
				fork = findForks[ k ].call( THIS, selectorPart, param );
				return false;
			}
		} );
		if ( fork ) return fork;
	}

	return this.findOrig( selector );
};

})();
$.on = function(event,selector,callback){
	return $(document).on(event,selector,callback);
};

$.off = function(event,selector,callback){
	return $(document).off(event,selector,callback);
};

$.one = function(event,selector,callback){
	return $(document).one(event,selector,callback);
};
$.extend( $.expr[ ":" ], {
	scrollable: function( element ) {
		var vertically_scrollable, horizontally_scrollable;
		if ( $( element ).css( "overflow" ) == "scroll" || $( element ).css( "overflowX" ) == "scroll" || $( element ).css( "overflowY" ) == "scroll" ) return true;

		vertically_scrollable = ( element.clientHeight < element.scrollHeight ) && (
		$.inArray( $( element ).css( "overflowY" ), [ "scroll", "auto" ] ) != -1 || $.inArray( $( element ).css( "overflow" ), [ "scroll", "auto" ] ) != -1 );

		if ( vertically_scrollable ) return true;

		horizontally_scrollable = ( element.clientWidth < element.scrollWidth ) && (
		$.inArray( $( element ).css( "overflowX" ), [ "scroll", "auto" ] ) != -1 || $.inArray( $( element ).css( "overflow" ), [ "scroll", "auto" ] ) != -1 );
		return horizontally_scrollable;
	},
	parents: function( a, i, m ) {
		return $( a ).parents( m[ 3 ] ).length < 1;
	},
	
	attrStartsWith: function (el, _, b) {
		for (var i = 0, atts = el.attributes, n = atts.length; i < n; i++) {
			if(atts[i].nodeName.toLowerCase().indexOf(b[3].toLowerCase()) === 0) {
				return true; 
			}
		}
		return false;
	},
	attrEndsWith: function (el, _, b) {
		for (var i = 0, atts = el.attributes, n = atts.length; i < n; i++) {
		  var att = atts[i].nodeName.toLowerCase(),
			  str = b[3].toLowerCase();
			if(att.length >= str.length && att.substr(att.length - str.length) === str) {
				return true; 
			}
		}
		
		return false;
	},
	data: function( elem, i, match ) {
		return !!$.data( elem, match[ 3 ] );
	},
	
} );
$.fn.removeClassPrefix = function(prefix) {
	this.each(function(i, el) {
		var classes = el.className.split(" ").filter(function(c) {
			return c.lastIndexOf(prefix, 0) !== 0;
		});
		el.className = $.trim(classes.join(" "));
	});
	return this;
};
$.fn.requiredId = function(){
	var id = this.attr('id');
	if(this.length>1){
		return this.each(function(){
			$(this).requiredId();
		});
	}
	if(!id){
		id = jstack.uniqid('uid-');
		this.attr('id', id);
	}
	return id;
};
$.fn.reverse = function(){
	return $(this.get().reverse());
};
$.fn.setVal = $.fn.val;
$.fn.val = function() {
	var returnValue = $.fn.setVal.apply( this, arguments );
	if ( arguments.length ) {
		this.trigger( "val" );
	}
	return returnValue;
};
(function(){

var populateSelect = function( input, value, config ) {
	var isSelect2 = input.hasClass('select2-hidden-accessible');
	if(input[0].hasAttribute('data-preselect')&&!isSelect2){
		if(config.push){
			var v = input.data('preselect') || [];
			if(typeof(v)!='object'){
				v = [v];
			}
			if(v.indexOf(value)===-1){
				v.push(value);
			}
			input.data('preselect',v);
		}
		else{
			input.data('preselect',value);
		}
		return;
	}
	
	//if(input.hasClass('select2-hidden-accessible')){
		//if(config.push){
			//var v = input.val();
			//if(v===null){
				//v = [];
			//}
			//if(typeof(v)!='object'){
				//v = [v];
			//}
			//if(v.indexOf(value)===-1){
				//v.push(value);
			//}
			//console.log(input,value);
			//setValue(input,value);
		//}
		//else{
			//setValue(input,value);
		//}
		//if(!config.preventValEvent){
			//input.trigger('change');
		//}
		//return;
	//}
	
	var found = false;
	var optFirstTagName = 'option';
	input.children().each(function(i){
		var opt = $(this);
		if(opt.is('option')){
			if (opt.val() == value){
				opt.prop('selected', true);
				found = true;
			}
			else{
				if(!config.push){
					opt.prop('selected', false);
				}
			}
		}
		else{
			if(i==0){
				optFirstTagName = opt[0].tagName.toLowerCase();
			}
			if(opt.attr('value') == value) {
				opt.attr('selected', 'selected');
				found = true;
			}
			else{
				if(!config.push){
					opt.removeAttr('selected');
				}
			}
		}
	} );
	
	if ( !found && config.addMissing && typeof(value)!='undefined' && value!==null ) {
		var optionValue;
		var optionText;
		if($.type(value)=='object'){
			optionValue = value.value;
			optionText = value.text;
		}
		else{
			optionValue = value;
		}
		if(typeof(optionText)=='undefined'){
			optionText = optionValue;
		}
		if(!optionValue){
			optionValue = optionText;
		}
		input.append( '<'+optFirstTagName+' value="' + optionValue + '" selected="selected">' + optionText + '</'+optFirstTagName+'>' );
	}
	
	if(isSelect2&&!config.preventValEvent){
		input.trigger('change');
	}
	
};

$.fn.populateInput = function( value, config ) {
	config = $.extend({
		addMissing: this.hasAttr('j-add-missing'),
		preventValEvent: false,
		push: false,
	},config);
	var setValue;
	if(config.preventValEvent){
		setValue = function(input,val){
			input.setVal(val);
		};
	}
	else{
		setValue = function(input,val){
			input.val(val);
		};
	}
	return this.each(function(){
		var input = $(this);
		if(input.data('j:populate:prevent')) return;
		if ( input.is( 'select, [j-select]' ) ) {
			if ( value instanceof Array ) {
				if(input.attr('name').substr(-2)=='[]'||input.hasAttr('multiple')){
					populateSelect( input, value, config );
				}
				else{
					for ( var i = 0, l = value.length; i < l; i++ ) {
						populateSelect( input, value[ i ], config );
					}
				}
			}
			else {
				populateSelect( input, value, config );
			}
		}
		else if ( input.is( "textarea" ) ) {
			setValue(input, value);
		}
		else {
			switch ( input.attr( "type" ) ){
				case "file":
				
				return;
				default:
				case "number":
				case "range":
				case "email":
				case "data":
				case "text":
				case "hidden":
					setValue(input, value);
				break;
				case "radio":
					if ( input.length >= 1 ) {
						$.each( input, function( index ) {
							var elemValue = $( this ).attr( "value" );
							var elemValueInData = singleVal = value;
							if ( elemValue === value ) {
								$( this ).prop( "checked", true );
							}
							else {
								if(!config.push){
									$( this ).prop( "checked", false );
								}
							}
						} );
					}
				break;
				case "checkbox":
					if ( input.length > 1 ) {
						$.each( input, function( index ) {
							var elemValue = $( this ).attr( "value" );
							var elemValueInData = undefined;
							var singleVal;
							for ( var i = 0; i < value.length; i++ ) {
								singleVal = value[ i ];
								if ( singleVal === elemValue ){
									elemValueInData = singleVal;
								};
							}

							if ( elemValueInData ) {
								$( this ).prop( "checked", true );
							}
							else {
								if(!config.push){
									$( this ).prop( "checked", false );
								}
							}
						} );
					}
					else if ( input.length == 1 ) {
						$ctrl = input;
						if ( value ) {
							$ctrl.prop( "checked", true );
						}
						else {
							$ctrl.prop( "checked", false );
						}

					}
				break;
			}
		}
	});
};
$.fn.populateForm = function( data, config ) {
	config = $.extend({
		not: false,
		notContainer: false
	},config);
	var $this = this;
	
	var assignValue = function(key, value){
		if(value===null){
			value = '';
		}
		var inputs = $this.find(':input[name="'+key+'"]');
		if(config.addMissing&&!inputs.length){
			$this.append('<input type="hidden" name="'+key+'" value="'+value+'">');
		}
		inputs.each(function(){
			var input = $(this);
			if(config.not&&input.is(config.not)) return;
			if(config.notContainer&&input.closest(config.notContainer).length) return;
			input.populateInput(value, config);
		});
	};
	var assignValueMulti = function(key, value){
		var inputs = $this.find(':input[name="'+key+'"],:input[name="'+key+'[]"]');
		inputs.each(function(){
			var input = $(this);
			if(config.not&&input.is(config.not)) return;
			if(config.notContainer&&input.closest(config.notContainer).length) return;
			input.populateInput(value, config);
		});	
	};
	
	var assignValueRecursive = function(key, value){
		assignValueMulti(key,value);
		$.each(value,function(k,v){
			var keyAssign = key+'['+k+']';
			if(typeof(v)=='object'&&v!=null){
				assignValueRecursive(keyAssign, v);
			}
			else{
				assignValue(keyAssign, v);
			}
		});
	};
	
	$.each(data, function(key, value){
		if(typeof(value)=='object'&&value!=null){
			assignValueRecursive(key, value);
		}
		else{
			assignValue(key, value);
		}
	});
	
	return this;
};
$.fn.populate = function( value, config ){
	return this.each(function(){
		var el = $(this);
		if(el.is('form')){
			el.populateForm(value, config);
		}
		else{
			el.populateInput(value, config);
		}
	});
};
$.fn.populateReset = function(){
	return this.each(function(){
		var el = $(this);
		if(el.is('form')){
			el.find(':input[name]').populateReset();
		}
		else{
			var type = el.prop('type');
			if(type=="checkbox"||type=="radio"){
				el.prop('checked',this.defaultChecked);
			}
			else{
				el.populateInput(this.defaultValue,{preventValEvent:true});
			}
			el.trigger('input');
		}
	});
};

})();
$.fn.outerHTML = function(){
	if (this.length){
		var div = $('<tmpl style="display:none;"></tmpl>');
		var clone = $(this[0].cloneNode(false)).html(this.html()).appendTo(div);
		var outer = div.html();
		div.remove();
		return outer;
	}
	else{
		return null;
	}
};
$.fn.hasAttr = function(attr){
	return this[0].hasAttribute(attr);
};
$.fn.jComponentReady = function(callback){
	var self = this;
	var defer = $.Deferred();
	defer.then(callback);
	var check = function(){
		var ok = true;
		self.each(function(){
			if(!$(this).data('j.component.loaded')){
				ok = false;
				return false;
			}
		});
		if(ok){
			defer.resolve();
		}
	};
	this.on('j:component:loaded',function(){
		check();
	});
	check();	
	return defer;
};
/**
 * jQuery serializeObject
 * @copyright 2014, macek <paulmacek@gmail.com>
 * @link https://github.com/macek/jquery-serialize-object
 * @license BSD
 * @version 2.5.0
 * @patched by surikat
 */

//surikat
var rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i,
	rcheckableType = ( /^(?:checkbox|radio)$/i );
jQuery.fn.serializeArrayWithEmpty = function() {
	return this.map( function() {

		// Can add propHook for "elements" to filter or add form elements
		var elements = jQuery.prop( this, "elements" );
		return elements ? jQuery.makeArray( elements ) : this;
	} )
	.filter( function() {
		var type = this.type;

		// Use .is( ":disabled" ) so that fieldset[disabled] works
		return this.name && !jQuery( this ).is( ":disabled" ) &&
			rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
			( this.checked || !rcheckableType.test( type ) );
	} )
	.map( function( i, elem ) {
		var val = jQuery( this ).val();

		if ( val == null ) {
			//return null;
			val = ''; //surikat
		}

		if ( jQuery.isArray( val ) ) {
			return jQuery.map( val, function( val ) {
				return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
			} );
		}

		return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
	} ).get();
}; 

(function(root, factory) {

  // AMD
  if (typeof define === "function" && define.amd) {
    define(["exports", "jquery"], function(exports, $) {
      return factory(exports, $);
    });
  }

  // CommonJS
  else if (typeof exports !== "undefined") {
    var $ = require("jquery");
    factory(exports, $);
  }

  // Browser
  else {
    factory(root, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(this, function(exports, $) {

  var patterns = {
    validate: /^[a-z_][a-z0-9_]*(?:\[(?:\d*|[a-z0-9_]+)\])*$/i,
    key:      /[a-z0-9_]+|(?=\[\])/gi,
    push:     /^$/,
    //fixed:    /^\d+$/, //surikat
    named:    /^[a-z0-9_]+$/i
  };

  function FormSerializer(helper, $form) {

    // private variables
    var data     = {},
        pushes   = {};

    // private API
    function build(base, key, value) {
      base[key] = value;
      return base;
    }

    function makeObject(root, value) {

      var keys = root.match(patterns.key), k;

      // nest, nest, ..., nest
      while ((k = keys.pop()) !== undefined) {
        // foo[]
        if (patterns.push.test(k)) {
          var idx = incrementPush(root.replace(/\[\]$/, ''));
          value = build([], idx, value);
        }

        // foo[n]
        //else if (patterns.fixed.test(k)) { //surikat
          //value = build([], k, value);
        //}
        else if (k==0) { //surikat
          value = build([], k, value);
        }
        // foo; foo[bar]
        else if (patterns.named.test(k)) {
          value = build({}, k, value);
        }
      }

      return value;
    }

    function incrementPush(key) {
      if (pushes[key] === undefined) {
        pushes[key] = 0;
      }
      return pushes[key]++;
    }

    function encode(pair) {
      switch ($('[name="' + pair.name + '"]', $form).attr("type")) {
        case "checkbox":
          return pair.value === "on" ? true : pair.value;
        default:
          return pair.value;
      }
    }

    function addPair(pair) {
      if (!patterns.validate.test(pair.name)) return this;
      var obj = makeObject(pair.name, encode(pair));
      data = helper.extend(true, data, obj);
      return this;
    }

    function addPairs(pairs) {
      if (!helper.isArray(pairs)) {
        throw new Error("formSerializer.addPairs expects an Array");
      }
      for (var i=0, len=pairs.length; i<len; i++) {
        this.addPair(pairs[i]);
      }
      return this;
    }

    function serialize() {
      return data;
    }

    function serializeJSON() {
      return JSON.stringify(serialize());
    }

    // public API
    this.addPair = addPair;
    this.addPairs = addPairs;
    this.serialize = serialize;
    this.serializeJSON = serializeJSON;
  }

  FormSerializer.patterns = patterns;

  FormSerializer.serializeObject = function serializeObject() {
    return new FormSerializer($, this).
      //addPairs(this.serializeArray()).
      addPairs(this.serializeArrayWithEmpty()). //surikat
      serialize();
  };

  FormSerializer.serializeJSON = function serializeJSON() {
    return new FormSerializer($, this).
      //addPairs(this.serializeArray()).
      addPairs(this.serializeArrayWithEmpty()). //surikat
      serializeJSON();
  };

  if (typeof $.fn !== "undefined") {
    $.fn.serializeObject = FormSerializer.serializeObject;
    $.fn.serializeJSON   = FormSerializer.serializeJSON;
  }

  exports.FormSerializer = FormSerializer;

  return FormSerializer;
}));
//from https://github.com/jayedul/html-minifier-prettifier
$.prettifyHTML = function(el){
	el = $(el);
	if(el.parent().length>0 && el.parent().data('assign')){
		el.data('assign', el.parent().data('assign')+1);
	}
	else{
		el.data('assign', 1);
	}
	if(el.children().length>0){
		el.children().each(function(){
			tbc='';
			for(i=0; i<$(this).parent().data('assign'); i++)
			{
				tbc+='\t';
			}
			$(this).before('\n'+tbc);
			$(this).prepend('\t');
			$(this).append('\n'+tbc);
			$.prettifyHTML($(this));				
		});
	}
	else{
		tbc='';
		for(i=0; i<el.parent().data('assign'); i++){
			tbc+='\t';
		}
		el.prepend('\n'+tbc);
	}
	return el.outerHTML();
};
$.walkTheDOM = function(node, func, reverse){
	if(!reverse&&func(node)===false){
		return false;
	}
	var children = node.childNodes;
	for(var i = 0; i < children.length; i++){
		if(!children[i]) continue;
		if(this.walkTheDOM(children[i], func)===false){
			return false;
		}
	}
	if(reverse&&func(node)===false){
		return false;
	}
};
$.fn.walkTheDOM = function(func){
	var r = $();
	this.each(function(){
		$.walkTheDOM(this,function(node){
			r.add(node);
			if(func){
				return func.call(node);
			}
		});
	});
	return r;
};
$.fn.replaceTagName = function(replaceWith) {
	var tags = [],
		i    = this.length;
	while (i--) {
		var newElement = document.createElement(replaceWith),
			thisi      = this[i],
			thisia     = thisi.attributes;
		for (var a = thisia.length - 1; a >= 0; a--) {
			var attrib = thisia[a];
			newElement.setAttribute(attrib.name, attrib.value);
		};
		newElement.innerHTML = thisi.innerHTML;
		$(thisi).replaceWith(newElement);
		tags[i] = newElement;
	}
	return $(tags);
};
$.fn.jModel = function(key,defaultValue){
	if(this.length<=1){
		var r = jstack.dataBinder.getScopeValue(this);
		if(typeof(key)!='undefined'){
			return typeof(r[key])=='undefined'?defaultValue:r[key];
		}
		return r;
	}
	else{
		var data = [];
		this.each(function(){
			data.push($(this).jModel(key,defaultValue));
		});
		return data;
	}
};
$.fn.findComments = function(tag){
	var arr = [];
	var nt = Node.COMMENT_NODE;
	this.each(function(){
		for(var i = 0; i < this.childNodes.length; i++) {
			var node = this.childNodes[i];
			if(node.nodeType === nt && (!tag || node.nodeValue.split(' ')[0]==tag)){
				arr.push(node);
			}
			else{
				arr.push.apply( arr, $.fn.findComments.call( $(node) ) );
			}
		}
	});
	return $(arr);
};

$.fn.findCommentsChildren = function(tag){
	var arr = [];
	var comment = Node.COMMENT_NODE;
	this.each(function(){
		for(var i = 0; i < this.childNodes.length; i++) {
			var node = this.childNodes[i];
			if(node.nodeType === comment && node.nodeValue.split(' ')[0]==tag){
				arr.push.apply( arr, $(node).commentChildren() );
			}
			else{
				arr.push.apply( arr, $.fn.findCommentsChildren.call( $(node), tag ) );
			}
		}
	});
	return $(arr);
};

$.fn.commentChildren = function(){
	var arr = [];
	var comment = Node.COMMENT_NODE;
	this.each(function(){
		var endTag = '/'+this.nodeValue.split(' ')[0];
		var n = this.nextSibling;
		while(n && (n.nodeType!==comment || n.nodeValue!=endTag) ){
			arr.push(n);
			n = n.nextSibling;
		}
	});
	return $(arr);
};

$.fn.parentComment = function(tag){
	var comment = Node.COMMENT_NODE;
	var a = [];
	n = this[0].previousSibling;
	while(n){
		if(n.nodeType===comment&&n.nodeValue.split(' ')[0]===tag){
			a.push(n);
			break;
		}
		n = n.previousSibling;
	}
	return $(a);
};

$.fn.dataCommentJSON = function(){
	if(arguments.length>1||$.type(arguments[0])=='object'){
		var setData;
		if(arguments.length>1){
			setData = {};
			setData[arguments[0]] =	arguments[1];
		}
		else{
			var setData = arguments[0];
		}
		return this.each(function(){
			var x = this.nodeValue.split(' ');
			var nodeName = x.shift();
			var data = x.length ? JSON.parse( x.join(' ') ) : {};
			$.extend(data,setData);
			this.nodeValue = nodeName+' '+JSON.stringify(data);
		});
	}
	var x = this[0].nodeValue.split(' ');
	x.shift();
	var data = x.length ? JSON.parse( x.join(' ') ) : {};
	if(arguments.length){
		data = data[arguments[0]];
	}
	return data;
};

(function(){

var commentPrimary = 0;
var commentRegister = {};

$.fn.removeDataComment = function(key){
	var el = this[0];
	var x = el.nodeValue.split(' ');
	if(x[1]){
		var primary = x[1];
		if(commentRegister[primary]){
			if(key){
				if(commentRegister[primary][key]){
					delete commentRegister[primary][key];
				}
			}
			else{
				delete commentRegister[primary];
			}
		}
	}
};
$.fn.dataComment = function(){
  
	if(arguments.length>1||$.type(arguments[0])=='object'){
		var setData;
		if(arguments.length>1){
			setData = {};
			setData[arguments[0]] =	arguments[1];
		}
		else{
			var setData = arguments[0];
		}
		return this.each(function(){
			var data = $(this).dataComment();
			$.extend(data,setData);
		});
	}
	
  var el = this[0];
  var x = el.nodeValue.split(' ');
  var nodeName = x.shift();
  var primary;
  if(x.length){
    primary =  x[0]; 
  }
  else{
    primary =  ++commentPrimary;
    el.nodeValue = nodeName+' '+primary;
  }
  if(!commentRegister[primary]){
    commentRegister[primary] = {};
  }
  var data = commentRegister[primary];
	
  if(arguments.length){
		data = data[arguments[0]];
	}
	return data;
};

})();
$.fn.jData = function(key){
	if(this.length>1){
		var a = [];
		this.each(function(){
			a.push( $.fn.jData.call( $(this), key ) );
		});
		return a;
	}
	else{
			
		var a = {};
		var el = this[0];
		$.each(this.attrStartsWith('j-data-'),function(k,v){
			var parsed = jstack.dataBinder.textParser(v);
			var value = (typeof(parsed)=='string') ? jstack.dataBinder.getValueEval(el,parsed) : v;
			a[k] = value;
		});
		var data = {};
		$.each(a,function(k,v){
			$.attrsToObject( k.substr(7), v, data );
		});
		
		if(key){
			data = jstack.dataBinder.dotGet(key,data);
		}
		
		return data;
	
	}
};
(function(){
	var templates = {};
	var requests = {};
	jstack.getTemplate = function( templatePath, absolute ) {
		if(!absolute){
			templatePath = jstack.config.templatesPath+templatePath;
		}
		if ( !requests[ templatePath ] ) {
			if ( $js.dev ) {
				var ts = ( new Date().getTime() ).toString();
				var url = templatePath;
				if ( url.indexOf( "_t=" ) === -1 )
					url += ( url.indexOf( "?" ) < 0 ? "?" : "&" ) + "_t=" + ts;
			}
			requests[ templatePath ] = $.Deferred();
			$.ajax( {
				url:url,
				cache:true,
				success:function( html ) {
					templates[ templatePath ] = html;
					requests[ templatePath ].resolve( templates[ templatePath ], templatePath );
				}
			} );
		}
		return requests[ templatePath ];
	};

})();
jstack.component = {};

//use j:load event to make loader definition helper
jstack.loader = function(selector,handler,unloader){
	$.on('j:load',selector,function(){
		handler.call(this);
	});
	if(typeof(unloader)=='function'){
		$.on('j:unload',selector,function(){
			unloader.call(this);
		});
	}
	$(selector).each(function(){
		handler.call(this);
	});
};

//define loaders
jstack.loader(':attrStartsWith("j-on-")',function(){
	var $this = $(this);
	var attrs = $this.attrStartsWith('j-on-');
	$.each(attrs,function(k,v){
		var event = k.substr(5);
		$this.removeAttr(k);
		$this.on(event,function(e){
			var controller = jstack.dataBinder.getControllerObject(this);
			if(typeof(controller.methods)!='object'||typeof(controller.methods[v])!='function'){
				throw new Error('Call to undefined method "'+v+'" by '+k+' and expected in controller '+controller.name);
			}
			var method = controller.methods[v];
			if(typeof(method)!='function'){
				return;
			}
			var r = method.call(controller,e,this);
			if(r===false){
				return false;
			}
		});
	});
});

//j-component
jstack.loader('[j-component]',function(){
	var el = this;
	var $el = $(el);
	var component = $el.attr('j-component');
	if(!component){
		return;
	}
	if($el.attr('j-component-handled')){
		return;
	}
	$el.attr('j-component-handled','true');
	var config = $el.jData();
	var paramsData = $el.attr('j-params-data');
	var load = function(){
		var o;
		var c = jstack.component[component];
		if(paramsData){
			var params = [];
			params.push(el);
			o = new (Function.prototype.bind.apply(c, params));
		}
		else{
			o = new c(el,config);
		}
		$el.data('j:component',o);			
		if(o.deferred){
			o.deferred.then(function(){
				$el.data('j.component.loaded',true);
				$el.trigger('j:component:loaded');
			});
		}
		else{
			$el.data('j.component.loaded',true);
			$el.trigger('j:component:loaded');
		}
	};
	if(jstack.component[component]){
		load();
	}
	else{					
		$js('jstack.'+component,load);
	}
},function(){
	var o = $(this).data('j:component');
	if(o&&typeof(o.unload)=='function'){
		o.unload();
	}
});
jstack.route = ( function( w, url ) {

	var routes = [];
	var map = {};

	var Route = function( path, name ) {
		this.name = name;
		this.path = path;
		this.keys = [];
		this.fns = [];
		this.params = {};
		this.regex = pathToRegexp( this.path, this.keys, false, false );

	};

	Route.prototype.addHandler = function( fn ) {
		this.fns.push( fn );
	};

	Route.prototype.removeHandler = function( fn ) {
		for ( var i = 0, c = this.fns.length; i < c; i++ ) {
			var f = this.fns[ i ];
			if ( fn == f ) {
				this.fns.splice( i, 1 );
				return;
			}
		}
	};

	Route.prototype.run = function( params ) {
		for ( var i = 0, c = this.fns.length; i < c; i++ ) {
			var defer = this.fns[ i ].apply( this, params );
			if($.type(defer)=='object'&&'then' in defer){
				defer.then(function(){
					$(document).trigger('j:route:loaded');
				});
			}
			else{
				$(document).trigger('j:route:loaded');
			}
		}
	};

	Route.prototype.match = function( path, params ) {
		var m = this.regex.exec( path );

		if ( !m ) return false;

		for ( var i = 1, len = m.length; i < len; ++i ) {
			var key = this.keys[ i - 1 ];

			var val = ( "string" == typeof m[ i ] ) ? decodeURIComponent( m[ i ] ) : m[ i ];

			if ( key ) {
				this.params[ key.name ] = val;
			}
			params.push( val );
		}

		return true;
	};

	Route.prototype.toURL = function( params ) {
		var path = this.path;
		for ( var param in params ) {
			path = path.replace( "/:" + param, "/" + params[ param ] );
		}
		path = path.replace( /\/:.*\?/g, "/" ).replace( /\?/g, "" );
		if ( path.indexOf( ":" ) != -1 ) {
			throw new Error( "missing parameters for url: " + path );
		}
		return path;
	};

	var pathToRegexp = function( path, keys, sensitive, strict ) {
		if ( path instanceof RegExp ) return path;
		if ( path instanceof Array ) path = "(" + path.join( "|" ) + ")";
		path = path
			.concat( strict ? "" : "/?" )
			.replace( /\/\(/g, "(?:/" )
			.replace( /\+/g, "__plus__" )
			.replace( /(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function( _, slash, format, key, capture, optional ) {
				keys.push( { name: key, optional: !!optional } );
				slash = slash || "";
				return "" + ( optional ? "" : slash ) + "(?:" + ( optional ? slash : "" ) + ( format || "" ) + ( capture || ( format && "([^/.]+?)" || "([^/]+?)" ) ) + ")" + ( optional || "" );
			} )
			.replace( /([\/.])/g, "\\$1" )
			.replace( /__plus__/g, "(.+)" )
			.replace( /\*/g, "(.*)" );
		return new RegExp( "^" + path + "$", sensitive ? "" : "i" );
	};

	var addHandler = function( path, fn ) {
		var s = path.split( " " );
		var name = ( s.length == 2 ) ? s[ 0 ] : null;
		path = ( s.length == 2 ) ? s[ 1 ] : s[ 0 ];

		if ( !map[ path ] ) {
			map[ path ] = new Route( path, name );
			routes.push( map[ path ] );
		}
		
		routes = routes.sort(function(a,b){
			if(a.path=='*'){
				return true;
			}
			return routes.indexOf(a) > routes.indexOf(b);
		});
		
		map[ path ].addHandler( fn );
	};

	var routie = function( path, fn, extendParams ) {
		if ( typeof fn == "function" ) {
			addHandler( path, fn );
		} else if ( typeof path == "object" ) {
			for ( var p in path ) {
				addHandler( p, path[ p ] );
			}
		} else if ( typeof fn === "undefined" ) {
			routie.navigate( path );
		} else if ( typeof fn === "object" ) {
			var params = {};
			if ( extendParams ) {
				$.extend( params, getParams() );
			}
			$.extend( params, url.getParams( path ), fn );
			var query = url.buildQuery( params );
			if ( query )
				query = "?" + query;
			path = url.getPath( path );
			routie.navigate( path + query );
		}
	};

	routie.lookup = function( name, obj ) {
		for ( var i = 0, c = routes.length; i < c; i++ ) {
			var route = routes[ i ];
			if ( route.name == name ) {
				return route.toURL( obj );
			}
		}
	};

	routie.remove = function( path, fn ) {
		var route = map[ path ];
		if ( !route )
			return;
		route.removeHandler( fn );
	};

	routie.removeAll = function() {
		map = {};
		routes = [];
	};

	routie.navigate = function( path, options ) {
		options = options || {};
		var silent = options.silent || false;

		if ( silent ) {
			removeListener();
		}
		setTimeout( function() {
			w.location.hash = path;
			if ( silent ) {
				setTimeout( function() {
					addListener();
				}, 1 );
			}

		}, 1 );
	};

	var getHash2 = function() {
		var h2 = "";
		var h = w.location.hash.substring( 1 );
		var i = h.indexOf( "#" );
		if ( i !== -1 ) {
			h2 = h.substr( i + 1 );
		}
		return h2;
	};
	var getHash = function() {
		var h = w.location.hash.substring( 1 );
		var i = h.indexOf( "#" );
		if ( i !== -1 ) {
			h = h.substr( 0, i );
		}
		return h;
	};

	var checkRoute = function( hash, route ) {
		var params = [];
		if ( route.match( hash, params ) ) {
			route.run( params );
			return true;
		}
		return false;
	};

	var hashLoad = function( hash ) {
		for ( var i = 0, c = routes.length; i < c; i++ ) {
			var route = routes[ i ];
			if ( checkRoute( hash, route ) ) {
				return;
			}
		}
	};
	routie.load = hashLoad;

	var currentHash;
	var hashChanged = function() {
		var h = getHash();
		if ( h != currentHash ) {
			currentHash = h;
			$(document).trigger( "j:route:load" );
			hashLoad( currentHash );
		}
		else {
			$(document).trigger("j:subroute:change" );
		}
	};
	routie.reload = hashChanged;

	var rootClick = function( e ) {
		var self = $( this );
		var href = self.attr( "href" );
		if ( !href ) return;
		if ( "/" + href == w.location.pathname ) {
			e.preventDefault();
			jstack.route( "" );
			return false;
		}
		if ( href.substr( 0, 2 ) == "##" ) {
			e.preventDefault();
			subHashchange( href.substr( 2 ) );
		}
	};

	var mainHashchange = function( h ) {
		var newhash = h + "#" + getHash2();
		w.location.hash = newhash;
	};
	var subHashchange = function( h ) {
		var newhash = currentHash + "#" + h;
		w.location.hash = newhash;
	};

	var addListener = function() {
		if ( w.addEventListener ) {
			w.addEventListener( "hashchange", hashChanged, false );
		} else {
			w.attachEvent( "onhashchange", hashChanged );
		}
		$( document ).on( "click", "a", rootClick );
		routie.reload();
	};

	var removeListener = function() {
		if ( w.removeEventListener ) {
			w.removeEventListener( "hashchange", hashChanged );
		} else {
			w.detachEvent( "onhashchange", hashChanged );
		}
		$( document ).off( "click", "a", rootClick );
	};

	routie.start = addListener;
	routie.stop = removeListener;

	var getQuery = function() {
		return url.getQuery( getHash() );
	};
	var getPath = function() {
		return url.getPath( getHash() );
	};

	var getParams = function() {
		return url.getParams( getHash() );
	};
	var getParam = function( k ) {
		return getParams()[ k ];
	};
	var getSubParams = function() {
		return url.getParams( "?" + getHash2() );
	};
	var getSubParam = function( k ) {
		return getSubParams()[ k ];
	};

	routie.getHash = getHash;
	routie.getHash2 = getHash2;
	routie.getParams = getParams;
	routie.getParam = getParam;
	routie.getSubParams = getSubParams;
	routie.getSubParam = getSubParam;
	routie.getQuery = getQuery;
	routie.getPath = getPath;

	routie.setMainHash = mainHashchange;
	routie.setSubHash = subHashchange;

	var base = document.getElementsByTagName( "base" )[ 0 ];
	if ( base ) {
		routie.baseHref = base.href;
	} else {
		var location = window.location;
		var path = location.pathname;
		path = path.split( "/" );
		path.pop();
		path = path.join( "/" ) || "/";
		var inlineAuth = location.username ? location.username + ( location.password ? ":" + location.password : "" ) + "@" : "";
		
		var port;
		if(location.port){
			port = (location.protocol=='https'&&location.port!="443") || location.port!="80" ? ":" + location.port : "";
		}
		else{
			port = '';
		}
		routie.baseHref = location.protocol + "//" + inlineAuth + location.host + port + path;
	}

	var basePath = w.location.href;
	basePath = basePath.split( "/" );
	basePath = basePath[ 0 ] + "//" + basePath[ 2 ];
	basePath = routie.baseHref.substr( basePath.length );
	routie.basePath = basePath;

	var baseLocation = w.location.href.substr( routie.baseHref.length );
	var p = baseLocation.indexOf( "#" );
	if ( p > -1 ) {
		baseLocation = baseLocation.substr( 0, p );
	}
	routie.baseLocation = baseLocation;

	return routie;

} )( window, jstack.url );
jstack.dataBinder = (function(){
	var dataBinder = function(){
		
	};
	dataBinder.prototype = {
		dotGet: function(key,data,defaultValue){
			return key.split('.').reduce(function(obj,i){
				if(typeof(obj)=='object'&&obj!==null){
					return typeof(obj[i])!='undefined'?obj[i]:defaultValue;
				}
				else{
					return defaultValue;
				}
			}, data);
		},
		dotSet: function(key,data,value,isDefault){
			if(typeof(data)!='object'){
				return;
			}
			key.split('.').reduce(function(obj,k,index,array){
				if(array.length==index+1){
					if(isDefault&&obj[k]){
						value = obj[k];
					}
					if(!isDefault||!obj[k]){
						obj[k] = value;
					}
				}
				else{
					if(typeof(obj[k])!='object'||obj[k]===null){
						obj[k] = {};
					}					
					return obj[k];
				}
			}, data);
			return value;
		},
		dotDel: function(key,data,value){
			key.split('.').reduce(function(obj,k,index,array){
				if(typeof(obj)!='object'){
					return;
				}
				if(array.length==index+1){
					if(typeof(obj[k])!='undefined'){
						delete obj[k];
					}
				}
				else{
					return obj[k];
				}
			}, data);
		},
		getKey: function(key){
			return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" ).replace(/\[\]/g, '.');
		},
		getValue: function(el,varKey,defaultValue){
			var self = this;
			var data = self.getControllerData(el);
			var key = self.getScoped(el,varKey);
			return self.dotGet(key,data,defaultValue);
		},
		getValueEval: function(el,varKey,defaultValue){
			var self = this;
			var scopeValue = self.getScopeValue(el);
			scopeValue = JSON.parse(JSON.stringify(scopeValue)); //clone Proxy
			if(typeof(varKey)=='undefined'){
				varKey = 'undefined';
			}
			else if(varKey===null){
				varKey = 'null';
			}
			else if(varKey.trim()==''){
				varKey = 'undefined';
			}
			else{
				varKey = varKey.replace(/[\r\t\n]/g,'');
				varKey = varKey.replace(/(?:^|\b)(this)(?=\b|$)/g,'$this');
			}
			
			var parent;
			parent = function(depth){
				if(!depth) depth = 1;
				depth += 1;
				var parentEl = el;
				for(var i=0;i<depth;i++){
					parentEl = self.getParentScope(parentEl);
				}
				var scopeV = self.getScopeValue(parentEl);
				return scopeV;
			};
			var controllerData = self.getControllerData(el);
			var controller = self.getControllerObject(el);
			
			var params = [ "$model, $scope, $controller, $this, $default, $parent" ];
			var args = [ controllerData, scopeValue, controller, el, defaultValue, parent ];
			
			var forParams = [];
			var forArgs = [];
			
			var forCollection = [];
			if($(el).is('[j-for-id]')){
				forCollection.push( el );
			}
			$(el).parents('[j-for-id]').each(function(){
				forCollection.push( this );
			});
			
			
			var addToScope = function(param,arg){
				scopeValue[param] = arg;
			};
			$(forCollection).each(function(){
				var parentFor = $(this);
				var parentForList = parentFor.parentComment('j:for');
				
				if(!parentForList.length) return;
				
				var jforCommentData = parentForList.dataCommentJSON();
				var value = jforCommentData.value;
				forParams.push(value);
				
				var forData = parentFor.data('j:for:data');
				forArgs.push(forData);
				
				var key = jforCommentData.key;
				var index = jforCommentData.index;
				if(index){
					addToScope(index,parentFor.index()+1);
				}
				if(key){
					var id = parentFor.attr('j-for-id');
					addToScope(key,id);
				}
			});
			
			for(var i=0,l=forParams.length;i<l;i++){
				params.push(forParams[i]);
			}
			for(var i=0,l=forArgs.length;i<l;i++){
				args.push(forArgs[i]);
			}
			
			
			params.push("with($scope){var $return = "+varKey+"; return typeof($return)=='undefined'?$default:$return;}");
			
			var value;
			try{
				var func = Function.apply(null,params);
				value = func.apply(null,args);
			}
			catch(jstackException){
				if(jstack.config.debug){
					var warn = [jstackException.message, ", expression: "+varKey, "element", el];
					if(el.nodeType==Node.COMMENT_NODE){
						warn.push($(el).parent().get());
					}
					console.warn.apply(console,warn);
				}
			}
			
			return value;
		},
		getAttrValueEval: function(el,attr,defaultValue){
			var self = this;
			var attrKey = $(el).attr(attr);
			return self.getValueEval(el,attrKey,defaultValue);
		},
		getAttrValue: function(el,attr,defaultValue){
			var self = this;
			var attrKey = $(el).attr(attr);
			return self.getValue(el,attrKey,defaultValue);
		},
		getScopeValue: function(el){
			var self = this;
			var scope = $(el).closest('[j-scope]');
			if(!scope.length){
				return self.getControllerData(el);
			}
			return self.getAttrValue(scope,'j-scope',{});
		},
		getScope: function(input){
			return $(input).parents('[j-scope]')
				.map(function() {
					return $(this).attr('j-scope');
				})
				.get()
				.reverse()
				.join('.')
			;
		},
		getScopedInput: function(input){
			var self = this;
			var $input = $(input);
			var name = $input.attr('name');
			var key = self.getKey(name);
			if(key.substr(-1)=='.'&&$input.is(':checkbox')){
				var index;
				var scope = self.getParentScope(input);
				scope.find(':checkbox[name="'+name+'"]').each(function(i){
					if(this===input){
						index = i;
						return false;
					}
				});
				key += index;
			}
			return self.getScoped(input,key);
		},
		getScoped: function(input,suffix){
			if(suffix.substr(0,1)==='.'){
				return suffix.substr(1);
			}
			var scope = this.getScope(input);
			if(scope){
				scope += '.';
			}
			scope += suffix;
			return scope;
		},
		getters: {
			select: function(el){
				el = $(el);
				if(el.children('option[value]').length){
					return el.val();
				}
			},
			input: function(element) {
				var type = $( element ).prop('type');
				if ( type=="checkbox" || type=="radio" ) {
					return $( element ).prop( "checked" ) ? $( element ).val() : null;
				}
				else if ( type == "file" ) {
					return element.files;
				}
				else if ( type != "submit" ) {
					return $( element ).val();
				}
			},
			textarea: function(element){
				return $( element ).val();
			},
			jselect: function(el){
				el = $(el);
				var multiple = el.hasAttr('multiple');
				var data = el.data('preselect');
				if(!data){
					if(multiple){
						data = [];
					}
					el.children().each(function(){
						if($(this).hasAttr('selected')){
							var val = $(this).attr('value');
							if(multiple){
								data.push(val);
							}
							else{
								data = val;
								return false;
							}
						}
					});
				}
				return data;
			},
		},
		defaultGetter: function(element){
			return $( element ).html();
		},
		getInputVal: function(element){
			var elementType = element.tagName.toLowerCase();
			if(elementType!='select'&&$(element).hasAttr('j-select')){
				elementType = 'jselect';
			}
			var getter = this.getters[elementType] || this.defaultGetter;
			return getter(element);
		},
		inputToModel: function(el,eventType){
			var input = $(el);
			if(input.closest('[j-unscope]').length) return;

			var self = this;
			
			var data = self.getControllerData(el);
			var name = input.attr('name');

			var performInputToModel = function(){
				var key = self.getScopedInput(el);
				if(filteredValue!=value){
					value = filteredValue;
					input.populateInput(value,{preventValEvent:true});
				}
				
				var oldValue = self.dotGet(key,data);
				
				value = self.dotSet(key,data,value);
				input.trigger('j:input',[value]);
				
				if(eventType=='j:update'){
					input.trigger('j:input:update',[value]);
				}
				else{
					input.trigger('j:input:user',[value]);
				}
				
				if(oldValue!==value){
					input.trigger('j:change',[value,oldValue]);
				}
			};
			
			var value = self.getInputVal(el);
			var filteredValue = self.filter(el,value);
			
			
			if(typeof(filteredValue)=='object'&&filteredValue!==null&&typeof(filteredValue.promise)=='function'){
				filteredValue.then(function(val){
					filteredValue = val;
					performInputToModel();
				});
			}
			else{
				performInputToModel();
			}
			
		},
		validNodeEvent: function(n,excludeRepeat){
			if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
				return false;
			}
			if(excludeRepeat){
				var jn = $(n);
				if(jn.closest('[j-for]').length){
					return false;
				}
			}
			return true;
		},
		watchersPrimary: 0,
		watchers: {},
		addWatcher: function(node, render,level){
			if(!level) level = 0;
			if(!this.watchers[level]) this.watchers[level] = {};
			this.watchers[level][++this.watchersPrimary] = render;
		},
		checkRemoved: function(ancestor){
			while(ancestor.parentNode){
				ancestor = ancestor.parentNode;
			}
			return $(ancestor).data('j:if:state')!==false;
		},
		runWatchers: function(){
			var self = this;
			//console.log('update');
			$.each(this.watchers,function(level,couch){
				$.each(couch,function(primary,render){
					var el = render();
					if(el&&self.checkRemoved(el)){
						delete couch[primary];
					}
				});
			});
			
		},
		
		updateTimeout: null,
		updateDeferStateObserver: null,
		updateWait: 100,
		update: function(){
			if(this.updateTimeout){
				if(this.updateTimeout!==true){
					clearTimeout(this.updateTimeout);
				}
				this.updateTimeout = setTimeout(this.runUpdate, this.updateWait);
			}
			else{
				this.updateTimeout = true;
				this.runUpdate();
			}
		},
		runUpdate: function(element){
			var self = this;
			if(this.updateDeferStateObserver){
				this.updateDeferStateObserver.then(function(){
					self.update();
				});
				return;
			}
			else{
				this.updateDeferStateObserver = $.Deferred();
			}
			
			this.runWatchers();
			
			this.updateDeferStateObserver.resolve();
			this.updateDeferStateObserver = false;
			this.updateTimeout = false;
		},
		
		loadMutations: function(mutations){
			var self = this;
			//console.log(mutations);
			
			var compilerTexts = [];
			var compilerJloads = [];
			$.each(mutations,function(i,mutation){
				$.each(mutation.addedNodes,function(ii,node){
					$.walkTheDOM(node,function(n){
						
						if(!document.body.contains(n)) return;
						
						var $n = $(n);
						
						if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
							var render = jstack.dataBinder.compilerText.call(n);
							if(render){
								compilerTexts.push(function(){
									self.addWatcher(n, render, 99);
									render();
								});
							}
							return;
						}
						
						if(n.nodeType!=Node.ELEMENT_NODE) return;
						
						$.each(self.compilers,function(iii,compiler){
							if($n.is(compiler.selector)){								
								
								var render = compiler.callback.call(n);
								
								if(render){
									if(!n.hasAttribute('j-static')){
										self.addWatcher(n, render, iii);
									}
									render();
								}
							}
						});
						
						if($n.data('j:load:state')){
							return;
						}
						$n.data('j:load:state',1);
						compilerJloads.push(function(){
							setTimeout(function(){
								if($n.data('j:load:state')==2){
									return;
								}
								$n.data('j:load:state',3);
								$n.trigger('j:load');
								$n.data('j:load:state',3);
							},0);
						});
						
					});
				});
				
				$.each(mutation.removedNodes,function(ii,node){
					$.walkTheDOM(node,function(n){
						if(n.nodeType===Node.COMMENT_NODE&&self.checkRemoved(n)){
							$(n).removeDataComment();
						}
						if(!self.validNodeEvent(n,true)) return;
						setTimeout(function(){
							$(n).trigger('j:unload');
						},0);
					});
				});
			});
			
			for(var i = 0, l=compilerTexts.length;i<l;i++){
				compilerTexts[i]();
			}
			for(var i = 0, l=compilerJloads.length;i<l;i++){
				compilerJloads[i]();
			}
		},
		eventListener: function(){
			var self = this;
			
			var observer = new MutationObserver(function(mutations){
				//console.log('mutations',mutations);
				self.loadMutations(mutations);
			});
			observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true, attributeFilter: ['name','value'], });
			
			$(document.body).on('input change j:update', ':input[name]', function(e){
				if(e.type=='input'&&$(this).is('select[name], input[name][type=checkbox], input[name][type=radio], input[name][type=file]'))
					return;
					
				var value = self.getInputVal(this);
				
				if(e.type=='change'){
					var handled = $(this).data('jHandledValue');
					if(typeof(handled)!='undefined'&&value==handled){
						return;
					}
				}
				
				//console.log('input user',e);
				
				$(this).data('jHandledValue',value);
				
				self.inputToModel(this,e.type);
			});
		},
		filter:function(el,value){
			var self = this;
			var filter = self.getFilter(el);
			if(typeof(filter)=='function'){
				value = filter(value);
			}
			return value;
		},
		getFilter:function(el){
			var self = this;
			el = $(el);
			var filter = el.data('j-filter');
			if(!filter){
				var attrFilter = el.attr('j-filter');
				if(attrFilter){
					var method = self.getValue(el,attrFilter);
					el.data('j-filter',method);
				}
			}
			return filter;
		},
		getControllerData:function(input){
			return this.getController(input).data('jModel');
		},
		getParentScope:function(el){
			var parent = $(el).parent().closest('[j-scope]');
			if(!parent.length){
				parent = this.getController(el);
			}
			return parent;
		},
		getController:function(input){
			var controller = $(input).closest('[j-controller]');
			
			if(!controller.length){
				var controller = $(document.body);
				if(!controller.data('jModel')){
					controller.data('jModel',{});
				}
				var o = jstack.controller('',controller);
			}
			
			if(!controller.data('jController')){
				if(!controller.data('jModel')){
					controller.data('jModel',{});
				}
				jstack.controller('',controller);
			}
			
			
			return controller;
		},
		getControllerObject:function(input){
			return this.getController(input).data('jController');
		},
		
		compilers:[
			{
				selector:'[j-for]',
				callback:function(){
					
					var el = this;
					var $this = $(this);
					var jfor = $('<!--j:for-->');
					var jforClose = $('<!--/j:for-->');
					$this.replaceWith(jfor);
					jforClose.insertAfter(jfor);
					
					var attrFor = $this.attr('j-for');
					$this.removeAttr('j-for');
					attrFor = attrFor.trim();
					var index, key, value, myvar;
					
					var p = new RegExp('(\\()(.*)(,)(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
					var m = p.exec(attrFor);
					if (m != null){
						index = m[2].trim();
						key = m[4].trim();
						value = m[6];
						myvar = m[11].trim();
					}
					else{
						var p = new RegExp('(\\()(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
						var m = p.exec(attrFor);
						if (m != null){
							key = m[2].trim();
							value = m[4];
							myvar = m[9].trim();
						}
						else{
							var p = new RegExp('(.*)(\\s+)(in)(\\s+)(.*)',["i"]);
							var m = p.exec(attrFor);
							if (m != null){
								value = m[1];
								myvar = m[5].trim();
							}
							else{
								throw new Error('Malformed for clause: '+attrFor);
							}
						}
					}
					
					var currentData;
					var getData = function(){
						return jstack.dataBinder.getValueEval(jfor,myvar);
					};
					
					//parentForList
					jfor.dataCommentJSON({
						value:value,
						key:key,
						index:index,
					});
					
					var render = function(){
						if(!document.body.contains(jfor[0])) return jfor[0];
						
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						var forIdList = [];
						var collection = jfor.commentChildren();
						
						//add
						$.each(data,function(k,v){
							var row = collection.filter('[j-for-id="'+k+'"]');
							var create = !row.length;
							if(create){
								row = $this.clone();
								row.attr('j-for-id',k);
							}
							row.data('j:for:data',v);
							if(create){
								row.insertBefore(jforClose);
							}
							forIdList.push(k.toString());
						});
						
						//remove
						collection.each(function(){
							var forId = $(this).attr('j-for-id');
							if(forIdList.indexOf(forId)===-1){
								$(this).remove();
							}
						});
						
					};
					
					return render;
					
					
				},
			},
			{
				selector:'[j-if]',
				callback:function(){
					var el = this;
					var $this = $(this);
					var jif = $('<!--j:if-->');
					$this.before(jif);
					
					var jelseifEl = $this.nextAll('[j-else-if]');
					var jelseEl = $this.nextAll('[j-else]');
					
					var lastBlock;
					if(jelseEl.length){
						lastBlock = jelseEl;
					}
					else if(jelseifEl.length){
						lastBlock = jelseifEl.last();
					}
					else{
						lastBlock = jif;
					}
					$('<!--/j:if-->').insertAfter(lastBlock);
					
					var myvar = $this.attr('j-if');
					this.removeAttribute('j-if');
					var currentData;
					var getData = function(){
						return Boolean(jstack.dataBinder.getValueEval(jif,myvar));
					};
					
					var getData2;
					var currentData2 = null;
					if(jelseifEl.length){
						var myvar2 = [];
						jelseifEl.each(function(){
							var jel = $(this);
							myvar2.push( jel.attr('j-else-if') );
							jel.removeAttr('j-else-if');
						});
						getData2 = function(){
							var data = false;
							for(var i=0, l=myvar2.length;i<l;i++){
								if( Boolean(jstack.dataBinder.getValueEval(jif,myvar2[i])) ){
									data = i;
									break;
								}
							}
							return data;
						};
					}
					
					if(jelseEl.length){
						jelseEl.removeAttr('j-else');
					}
					
					var render = function(){
						if(!document.body.contains(jif[0])) return jif[0];
						
						var data = getData();
						var data2 = null;
						if(getData2){
							data2 = data?false:getData2();
						}
						if( currentData===data && data2===currentData2 ) return;
						currentData = data;
						currentData2 = data2;
						
						$this.data('j:if:state',data);
						if(data){
							$this.insertAfter(jif);
							
							if(jelseifEl.length){
								jelseifEl.data('j:if:state',false);
								jelseifEl.detach();
							}
							if(jelseEl.length){
								jelseEl.data('j:if:state',false);
								jelseEl.detach();
							}
						}
						else{
							$this.detach();
							
							if(jelseifEl.length){
								jelseifEl.data('j:if:state',false);
								if(data2===false){
									jelseifEl.detach();
								}
								else{
									var jelseifElMatch = $(jelseifEl[data2]);
									jelseifElMatch.data('j:if:state',true);
									jelseifElMatch.insertAfter(jif);
								}
							}
							if(jelseEl.length){
								if(data2===false||data2===null){
									jelseEl.data('j:if:state',true);
									jelseEl.insertAfter(jif);
								}
								else{
									jelseEl.data('j:if:state',false);
									jelseEl.detach();
								}
							}
						}
					};
					
					return render;
				},
			},
			{
				selector:'[j-switch]',
				callback:function(){
					var el = this;
					var $this = $(this);
					var myvar = $this.attr('j-switch');
					this.removeAttribute('j-switch');
					
					var cases = $this.find('[j-case],[j-case-default]');
					
					var currentData;
					var getData = function(){
						return Boolean(jstack.dataBinder.getValueEval(el,myvar));
					};
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						var found = false;
						cases.filter('[j-case]').each(function(){
							var jcase = $(this);
							var caseVal = jcase.attr('j-case');
							if(caseVal==data){
								jcase.appendTo($this);
								found = true;
							}
							else{
								jcase.detach();
							}
						});
						cases.filter('[j-case-default]').each(function(){
							var jcase = $(this);
							if(found){
								jcase.detach();
							}
							else{
								jcase.appendTo($this);
							}
						});
						
					};
					
					return render;
				},
			},
			{
				selector:'[j-show]',
				callback:function(){
					var el = this;
					var $this = $(this);
					
					var myvar = $this.attr('j-show');
					this.removeAttribute('j-show');
					var currentData;
					var getData = function(){
						return Boolean(jstack.dataBinder.getValueEval(el,myvar));
					};
					
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						if(data){
							$this.show();
						}
						else{
							$this.hide();
						}
					};
					
					return render;
				},
			},
			{
				selector:'[j-href]',
				callback:function(){
					
					var el = this;
					var $this = $(this);
					
					var original = $this.attr('j-href');
					this.removeAttribute('j-href');
					
					var parsed = jstack.dataBinder.textParser(original);
					
					if(typeof(parsed)!='string'){
						$this.attr('href',jstack.route.baseLocation + "#" + original);
						return;
					}
					
					var currentData;
					var getData = function(){
						return jstack.dataBinder.getValueEval(el,parsed);
					};
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						$this.attr('href',jstack.route.baseLocation + "#" + data);
					};
					
					return render;
				},
			},
			{
				selector:':attrStartsWith("j-model-")',
				callback:function(){
					var el = this;
					var $this = $(this);
					var attrs = $this.attrStartsWith('j-model-');
					var attrsVars = {};
					var attrsVarsCurrent = {};
					$.each(attrs,function(k,v){
						var parsed = jstack.dataBinder.textParser(v);
						var key = k.substr(8);
						if(typeof(parsed)=='string'){
							attrsVars[k] = parsed;
						}
						else{
							$this.attr(key,v);
						}
						$this.removeAttr(k);
					});
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						$.each(attrsVars,function(k,v){
							var value =  jstack.dataBinder.getValueEval(el,v);
							if(attrsVarsCurrent[k]===value) return;
							attrsVarsCurrent[k] = value;
							$this.attr(k,value);
						});
					};
					return render;
				},
			},
			{
				selector:':attrStartsWith("j-shortcut-model-")',
				callback:function(){
					var propAttrs = ['selected','checked'];
					
					var el = this;
					var $this = $(this);
					var attrs = $this.attrStartsWith('j-shortcut-model-');
					var attrsVars = {};
					var attrsVarsCurrent = {};
					$.each(attrs,function(k,v){
						attrsVars[k.substr(17)] = v;
						$this.removeAttr(k);
					});
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						$.each(attrsVars,function(k,v){
							var value = Boolean(jstack.dataBinder.getValueEval(el,v));
							
							if(attrsVarsCurrent[k]===value) return;
							attrsVarsCurrent[k] = value;
							
							if(propAttrs.indexOf(k)!==-1){
								$this.prop(k,value);
							}
							else{						
								if(value){
									$this.attr(k,k);
								}
								else{
									$this.removeAttr(k);
								}
							}
						});
					};
					return render;
				},
			},
			{
				selector:':input[name],[j-input],[j-select]',
				callback:function(){
					var el = this;
					var $el = $(this);
					if($el.closest('[j-unscope]').length) return;
					if($el.attr('type')=='file') return;
					
					var currentData;
					var getData = function(){
						var defaultValue = jstack.dataBinder.getInputVal(el);
						var key = jstack.dataBinder.getKey( $el.attr('name') );
						return jstack.dataBinder.getValue(el,key,defaultValue);
					};
					
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						if($el.data('j:populate:prevent')) return;
						$el.populateInput(data,{preventValEvent:true});
						$el.trigger('j:val',[data]);
					};
					return render;
				},
			},
		],
		compilerText:function(){
			if(!this.textContent) return;
			var textString = this.textContent.toString();
			var parsed = jstack.dataBinder.textParser(textString);
			if(typeof(parsed)!='string') return;
			
			
			var el = this;
			var $this = $(this);
			
			
			var text = $('<!--j:text-->');
			var textClose = $('<!--/j:text-->');
			$this.replaceWith(text);
			textClose.insertAfter(text);
			
			var currentData;
			var getData = function(){
				return jstack.dataBinder.getValueEval(text,parsed);
			};
			var render = function(){
				if(!document.body.contains(text[0])) return text[0];
				var data = getData();
				if(currentData===data) return;
				currentData = data;
				text.commentChildren().remove();
				text.after(data);
			};
			return render;
		},
		textParser:function(text){
			var tagRE = /\{\{((?:.|\n)+?)\}\}/g; //regex from vue.js :)
			if (!tagRE.test(text)) {
				return;
			}
			var tokens = [];
			var lastIndex = tagRE.lastIndex = 0;
			var match, index;
			while ((match = tagRE.exec(text))) {
				index = match.index;
				// push text token
				if (index > lastIndex) {
					tokens.push(JSON.stringify(text.slice(lastIndex, index)));
				}
				// tag token
				var exp = match[1].trim();
				tokens.push("(" + exp + ")");
				lastIndex = index + match[0].length;
			}
			if (lastIndex < text.length) {
				tokens.push(JSON.stringify(text.slice(lastIndex)));
			}
			return tokens.join('+');
		}
	};
	var o = new dataBinder();
	o.eventListener();
	return o;
})();
$.on('reset','form[j-scope]',function(){
	$(this).populateReset();
});
( function( $, j ) {
	var hasOwnProperty2 = function(o,k){
		var v = o[k];
		return v!==Object[k]&&v!==Object.__proto__[k]&&v!==Array[k]&&v!==Array.__proto__[k];
	};
	var toParamsPair = function( data ) {
		var pair = [];
		var params = $.param( data ).split( "&" );
		for ( var i = 0; i < params.length; i++ ) {
			var x = params[ i ].split( "=" );
			var val = x[ 1 ] !== null ? decodeURIComponent( x[ 1 ] ) : "";
			pair.push( [ decodeURIComponent( x[ 0 ] ), val ] );
		}
		return pair;
	};

	var recurseExtractFiles = function( data, files, prefix, deepness ) {
		if ( !prefix )
			prefix = "";
		for ( var k in data ) {
			if ( !data.hasOwnProperty( k ) ) continue;
			var key = prefix + k;
			var value = data[ k ];
			if ( value instanceof FileList ) {
				if ( value.length == 1 ) {
					files[ key ] = value[ 0 ];
				} else {
					files[ key ] = [];
					for ( var i = 0; i < value.length; i++ ) {
						files[ key ].push( value[ i ] );
					}
				}
				delete( data[ k ] );
			} else if ( value instanceof $ ) {
				data[ k ] = value.jsonml();
			} else if ( value instanceof HTMLCollection || value instanceof HTMLElement ) {
				data[ k ] = $( value ).jsonml();
			} else if ( typeof( value ) == "object" ) {
				recurseExtractFiles( value, files, key + "_", deepness + 1 );
			}
		}
	};
	
	var recurseCleanNull = function(o){
		for(var k in o){
			if(hasOwnProperty2(o,k)){
				if(typeof(o[k])=='undefined'||o[k]===null){
					o[k] = '';
				}
				else if(typeof(o[k])=='object'){
					o[k] = recurseCleanNull(o[k]);
				}
			}
		}
		return o;
	};

	j.ajax = function() {
		var settings, files = {};
		if ( arguments.length == 2 ) {
			settings = arguments[ 1 ] || {};
			settings.url = arguments[ 0 ];
		} else {
			settings = arguments[ 0 ];
		}

		if ( settings.data ) {
			recurseExtractFiles( settings.data, files );
		}
		if ( !$.isEmptyObject( files ) ) {
			var haveFiles;
			var fd = new FormData();
			var params = toParamsPair( settings.data );
			for ( var i = 0; i < params.length; i++ ) {
				fd.append( params[ i ][ 0 ], params[ i ][ 1 ] );
			}
			for ( var k in files ) {
				if ( files.hasOwnProperty( k ) ) {
					var file = files[ k ];
					if ( file instanceof Array ) {
						for ( var i = 0; i < file.length; i++ ) {
							if ( typeof( file[ i ] ) != "undefined" ) {
								fd.append( k + "[]", file[ i ] );
								haveFiles = true;
							}
						}
					} else {
						if ( typeof( file ) != "undefined" ) {
							fd.append( k, file );
							haveFiles = true;
						}
					}
				}
			}
			if ( haveFiles ) {
				settings.type = "POST";
				settings.processData = false;
				settings.contentType = false;
				settings.data = fd;
			}
		}
		settings.data = recurseCleanNull(settings.data);
		return $.ajax( settings );
	};

	j.post = function( url, data, success, dataType ) {
		return j.ajax( {
			type: "POST",
			url: url,
			data: data,
			success: success,
			dataType: dataType
		} );
	};

} )( jQuery, jstack );
jstack.mvc = function(config){
	
	if(typeof(arguments[0])=='string'){
		config = {
			view: arguments[0],
			controller: typeof(arguments[1])=='string'?arguments[1]:arguments[0]
		};
	}
	
	if(!config.controller){
		config.controller = config.view;
	}
	if(!config.target){
		config.target = jstack.config.defaultTarget;
	}
	
	var target = $(config.target);
	var controller = config.controller;
	
	var controllerPath = jstack.config.controllersPath+config.controller;
	
	var controllerReady = $.Deferred();
	var processor;
	
	if(jstack.controllers[config.controller]){
		controllerReady.resolve();
	}
	else{
		$js.onExists(controllerPath,controllerReady.resolve,controllerReady.resolve);
	}
	var viewReady = jstack.getTemplate(config.view+'.jml');
	
	var ready = $.Deferred();
	
	controllerReady.then(function(){
		
		var ctrl = jstack.controller(config.controller,target);
		
		$.when(viewReady, ctrl.ready).then(function(view){
			var html = view[0];
			ctrl.render(html);
			ready.resolve(target,ctrl);
		});		
		
	});

	return ready;
};
jstack.viewReady = function(el){
	if(typeof(arguments[0])=='string'){
		var selector = '[j-view="'+arguments[0]+'"]';
		if(typeof(arguments[1])=='object'){
			el = $(arguments[1]).find(selector);
		}
		else{
			el = $(selector);
		}
	}
	
	el = $(el);
	var ready = el.data('jViewReady');
	if(!ready){
		ready = $.Deferred();
		el.data('jViewReady',ready);
	}
	return ready;
};
$.on('j:load','[j-view]:not([j-view-loaded])',function(){
	
	var el = $(this);
	el.attr('j-view-loaded',true);
	
	var view = el.attr('j-view');
	
	var controller;
	if(el[0].hasAttribute('j-controller')){
		controller = el.attr('j-controller');
	}
	else{
		controller = view;
	}

	var ready = jstack.viewReady(this);
	var mvc = jstack.mvc({
		view:view,
		controller:controller,
		target:this,
	});
	mvc.then(function(){
		setTimeout(function(){
			ready.resolve();
		},0);
	});
});
(function(){

	jstack.app = function(el,app){
		if(!app){
			app = el.attr('j-app');
		}
		jstack.config.templatesPath += app+'/';
		jstack.config.controllersPath += app+'/';
		
		jstack.route('*', function(path){
			path = jstack.url.getPath(path);
			return jstack.mvc(path);
		});
	};

	var el = $('[j-app]');
	if(el.length){
		jstack.app(el);
	}
	
}());