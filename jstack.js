(function(w,$js,$){
	w.jstack = (function(){
		var j = function(){
			
		};
		
		
		
		return j;
	})();
})(window,$js,jQuery);
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
		var arrayKey = ''
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
jstack.route = (function(w,url){
	
	var routes = [];
	var map = {};

	var Route = function(path, name) {
		this.name = name;
		this.path = path;
		this.keys = [];
		this.fns = [];
		this.params = {};
		this.regex = pathToRegexp(this.path, this.keys, false, false);

	};

	Route.prototype.addHandler = function(fn) {
		this.fns.push(fn);
	};

	Route.prototype.removeHandler = function(fn) {
		for (var i = 0, c = this.fns.length; i < c; i++) {
			var f = this.fns[i];
			if (fn == f) {
				this.fns.splice(i, 1);
				return;
			}
		}
	};

	Route.prototype.run = function(params) {
		for (var i = 0, c = this.fns.length; i < c; i++) {
			this.fns[i].apply(this, params);
		}
	};

	Route.prototype.match = function(path, params){
		var m = this.regex.exec(path);

		if (!m) return false;


		for (var i = 1, len = m.length; i < len; ++i) {
			var key = this.keys[i - 1];

			var val = ('string' == typeof m[i]) ? decodeURIComponent(m[i]) : m[i];

			if (key) {
				this.params[key.name] = val;
			}
			params.push(val);
		}

		return true;
	};

	Route.prototype.toURL = function(params) {
		var path = this.path;
		for (var param in params) {
			path = path.replace('/:'+param, '/'+params[param]);
		}
		path = path.replace(/\/:.*\?/g, '/').replace(/\?/g, '');
		if (path.indexOf(':') != -1) {
			throw new Error('missing parameters for url: '+path);
		}
		return path;
	};

	var pathToRegexp = function(path, keys, sensitive, strict) {
		if (path instanceof RegExp) return path;
		if (path instanceof Array) path = '(' + path.join('|') + ')';
		path = path
			.concat(strict ? '' : '/?')
			.replace(/\/\(/g, '(?:/')
			.replace(/\+/g, '__plus__')
			.replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){
				keys.push({ name: key, optional: !! optional });
				slash = slash || '';
				return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' + (optional || '');
			})
			.replace(/([\/.])/g, '\\$1')
			.replace(/__plus__/g, '(.+)')
			.replace(/\*/g, '(.*)');
		return new RegExp('^' + path + '$', sensitive ? '' : 'i');
	};

	var addHandler = function(path, fn) {
		var s = path.split(' ');
		var name = (s.length == 2) ? s[0] : null;
		path = (s.length == 2) ? s[1] : s[0];

		if (!map[path]) {
			map[path] = new Route(path, name);
			routes.push(map[path]);
		}
		map[path].addHandler(fn);
	};

	var routie = function(path, fn, extendParams) {
		if (typeof fn == 'function') {
			addHandler(path, fn);
			routie.reload();
		} else if (typeof path == 'object') {
			for (var p in path) {
				addHandler(p, path[p]);
			}
			routie.reload();
		} else if (typeof fn === 'undefined') {
			routie.navigate(path);
		}
		else if (typeof fn === 'object') {
			var params = {};
			if(extendParams){
				$.extend(params,getParams());
			}
			$.extend(params,url.getParams(path),fn);
			var query = url.buildQuery(params);
			if(query)
				query = '?'+query;
			path = url.getPath(path);
			routie.navigate(path+query);
		}
	};

	routie.lookup = function(name, obj) {
		for (var i = 0, c = routes.length; i < c; i++) {
			var route = routes[i];
			if (route.name == name) {
				return route.toURL(obj);
			}
		}
	};

	routie.remove = function(path, fn) {
		var route = map[path];
		if (!route)
			return;
		route.removeHandler(fn);
	};

	routie.removeAll = function() {
		map = {};
		routes = [];
	};

	routie.navigate = function(path, options) {
		options = options || {};
		var silent = options.silent || false;

		if (silent) {
			removeListener();
		}
		setTimeout(function() {
			w.location.hash = path;
			if (silent) {
				setTimeout(function() { 
					addListener();
				}, 1);
			}

		}, 1);
	};

	var getHash2 = function() {
		var h2 = '';
		var h = w.location.hash.substring(1);
		var i = h.indexOf('#');
		if(i!==-1){
			h2 = h.substr(i+1);
		}
		return h2;
	};
	var getHash = function() {
		var h = w.location.hash.substring(1);
		var i = h.indexOf('#');
		if(i!==-1){
			h = h.substr(0,i);
		}
		return h;
	};

	var checkRoute = function(hash, route) {
		var params = [];
		if (route.match(hash, params)) {
			route.run(params);
			return true;
		}
		return false;
	};
	
	var hashLoad = function(hash){
		for (var i = 0, c = routes.length; i < c; i++) {
			var route = routes[i];
			if (checkRoute(hash, route)) {
				return;
			}
		}
	};
	routie.load = hashLoad;
	
	var currentHash;
	var hashChanged = function(){
		var h = getHash();
		if(h!=currentHash){
			currentHash = h;
			$(window).trigger('mainHashchange');
			return hashLoad(currentHash);
		}
		else{
			$(window).trigger('subHashchange');
		}
	};
	routie.reload = hashChanged;
	
	var rootClick = function(e){
		var self = $(this);
		var href = self.attr('href');
		if(!href) return;
		if('/'+href==w.location.pathname){
			e.preventDefault();
			jstack.route('');
			return false;
		}
		if(href.substr(0,2)=='##'){
			e.preventDefault();
			subHashchange(href.substr(2));
		}
	};
	
	var mainHashchange = function(h){
		var newhash = h+'#'+getHash2();
		w.location.hash = newhash;
	};
	var subHashchange = function(h){
		var newhash = currentHash+'#'+h;
		w.location.hash = newhash;
	};
	
	var addListener = function() {
		if (w.addEventListener) {
			w.addEventListener('hashchange', hashChanged, false);
		} else {
			w.attachEvent('onhashchange', hashChanged);
		}
		$(document).on('click','a',rootClick);
	};

	var removeListener = function() {
		if (w.removeEventListener) {
			w.removeEventListener('hashchange', hashChanged);
		} else {
			w.detachEvent('onhashchange', hashChanged);
		}
		$(document).off('click','a',rootClick);
	};
	
	routie.start = addListener;
	routie.stop = removeListener;
	
	
	var getQuery = function(){
		return url.getQuery(getHash());
	}
	var getPath = function(){
		return url.getPath(getHash());
	};
	
	var getParams = function(){
		return url.getParams(getHash());
	};
	var getParam = function(k){
		return getParams()[k];
	};
	var getSubParams = function(){
		return url.getParams('?'+getHash2());
	};
	var getSubParam = function(k){
		return getSubParams()[k];
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
	
	var base = document.getElementsByTagName('base')[0];
	if(base){
		routie.baseHref = base.href;
	}
	else{
		var location = window.location;
		var path = location.pathname;
		path = path.split('/');
		path.pop();
		path = path.join('/')||'/';
		var inlineAuth = location.username?location.username+(location.password?':'+location.password:'')+'@':'';
		routie.baseHref = location.protocol+'//'+inlineAuth+location.host+(location.port&&location.port!='80'?':'+location.port:'')+path;
	}
	
	var basePath = w.location.href;
	basePath = basePath.split("/");
	basePath = basePath[0]+'//'+basePath[2];
	basePath = routie.baseHref.substr(basePath.length);
	routie.basePath = basePath;
	
	var baseLocation = w.location.href.substr(routie.baseHref.length);
	var p = baseLocation.indexOf('#');
	if(p>-1){
		baseLocation = baseLocation.substr(0,p);
	}
	routie.baseLocation = baseLocation;
	
	return routie;
	 
})(window,jstack.url);
(function(w,j){
	
	j.templateVarSubstitutions = {};
	
	//var separatorStart = '<%';
	//var separatorEnd = '%>';
	//var escapeRegExp = function(str) {
		//return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|\%]/g, "\\$&");
	//}
	//var separatorEndE = escapeRegExp(separatorEnd);
	//var separatorStartE = escapeRegExp(separatorStart);
	
	var separatorStart = '<%';
	var separatorEnd = '%>';
	var separatorStartE = '<\%';
	var separatorEndE = '\%>';
	
	var cache = {};
	var reg1 = eval("/'(?=[^"+separatorEndE+"]*"+separatorEndE+")/g");
	var reg2 = eval("/"+separatorStartE+"=(.+?)"+separatorEndE+"/g");
	j.template = function(html, data, id, debug){
		var fn;
		if(id&&cache[id]){
			fn = cache[id];
		}
		else{
			var substitutions = j.templateVarSubstitutions;
			html = html.html();
			for(var k in substitutions){
				if(substitutions.hasOwnProperty(k)){
					html = html.replace(k,separatorStart+substitutions[k]+separatorEnd);
				}
			}

			var compile = "var p=[];with(obj){p.push('" + html
				.replace(/[\r\t\n]/g, " ")
				.replace(reg1, "\t")
				.split("'").join("\\'")
				.split("\t").join("'")
				.replace(reg2, "',$1,'")
				.split(separatorStart).join("');")
				.split(separatorEnd).join("p.push('")
				+ "');}return p.join('');";
			try{
				fn = new Function("obj", compile);
				if(id) cache[id] = fn;
			}
			catch(e){
				if(debug){
					console.log(e);
					console.log(compile);
					console.log(html);
				}
			}
		}
		return data ? fn( data ) : fn;
	};

})(window,jstack);
(function(w,j){
	var registry = {};
	j.controller = function(id){
		var fn,sync,deps = true;
		for(var i = 0; i < arguments.length; i++){
			switch(typeof(arguments[i])){
				case 'boolean':
					sync = arguments[i];
				break;
				case 'function':
					fn = arguments[i];
				break;
				case 'object':
					deps = arguments[i];
				break;
			}
		}
		if(deps instanceof Array){
			$js.require(deps,sync);
		}
		
		if(fn){
			var ctrl = function(){
				return fn.apply(ctrl,arguments);
			};
			ctrl.jstack = {};
			registry[id] = ctrl;
		}
		return registry[id];
	};

})(window,jstack);
/*
 DEVELOPED BY GIL LOPES BUENO gilbueno.mail@gmail.com FORK: https://github.com/melanke/Watch.JS
 WORKS WITH: * IE8*, IE 9+, FF 4+, SF 5+, WebKit, CH 7+, OP 12+, BESEN, Rhino 1.7+, For IE8 (and other legacy browsers) WatchJS will use dirty checking  
 modifs by surikat 
	put watch methods in jstack instead of window
	lazy launch interval
*/

"use strict";
(function (factory) {
	jstack.watcher = factory();
	jstack.watch = jstack.watcher.watch;
	jstack.unwatch = jstack.watcher.unwatch;
	jstack.callWatchers = jstack.watcher.callWatchers;
}(function () {

    var WatchJS = {
        noMore: false,        // use WatchJS.suspend(obj) instead
        useDirtyCheck: false // use only dirty checking to track changes.
    },
    lengthsubjects = [];
    
    var dirtyChecklist = [];
    var pendingChanges = []; // used coalesce changes from defineProperty and __defineSetter__
    
    var supportDefineProperty = false;
    try {
        supportDefineProperty = Object.defineProperty && Object.defineProperty({},'x', {});
    } catch(ex) {  /* not supported */  }

    var isFunction = function (functionToCheck) {
        var getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) == '[object Function]';
    };

    var isInt = function (x) {
        return x % 1 === 0;
    };

    var isArray = function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    };

    var isObject = function(obj) {
        return {}.toString.apply(obj) === '[object Object]';
    };
    
    var getObjDiff = function(a, b){
        var aplus = [],
        bplus = [];

        if(!(typeof a == "string") && !(typeof b == "string")){

            if (isArray(a)) {
                for (var i=0; i<a.length; i++) {
                    if (b[i] === undefined) aplus.push(i);
                }
            } else {
                for(var i in a){
                    if (a.hasOwnProperty(i)) {
                        if(b[i] === undefined) {
                            aplus.push(i);
                        }
                    }
                }
            }

            if (isArray(b)) {
                for (var j=0; j<b.length; j++) {
                    if (a[j] === undefined) bplus.push(j);
                }
            } else {
                for(var j in b){
                    if (b.hasOwnProperty(j)) {
                        if(a[j] === undefined) {
                            bplus.push(j);
                        }
                    }
                }
            }
        }

        return {
            added: aplus,
            removed: bplus
        }
    };

    var clone = function(obj){

        if (null == obj || "object" != typeof obj) {
            return obj;
        }

        var copy = obj.constructor();

        for (var attr in obj) {
            copy[attr] = obj[attr];
        }

        return copy;        

    }

    var defineGetAndSet = function (obj, propName, getter, setter) {
        try {
            Object.observe(obj, function(changes) {
                changes.forEach(function(change) {
                    if (change.name === propName) {
                        setter(change.object[change.name]);
                    }
                });
            });            
        } 
        catch(e) {
            try {
                Object.defineProperty(obj, propName, {
                    get: getter,
                    set: function(value) {        
                        setter.call(this,value,true); // coalesce changes
                    },
                    enumerable: true,
                    configurable: true
                });
            } 
            catch(e2) {
                try{
                    Object.prototype.__defineGetter__.call(obj, propName, getter);
                    Object.prototype.__defineSetter__.call(obj, propName, function(value) {
                        setter.call(this,value,true); // coalesce changes
                    });
                } 
                catch(e3) {
                    observeDirtyChanges(obj,propName,setter);
                    //throw new Error("watchJS error: browser not supported :/")
                }
            }
        }
    };

    var defineProp = function (obj, propName, value) {
        try {
            Object.defineProperty(obj, propName, {
                enumerable: false,
                configurable: true,
                writable: false,
                value: value
            });
        } catch(error) {
            obj[propName] = value;
        }
    };

    var observeDirtyChanges = function(obj,propName,setter) {
        dirtyChecklist[dirtyChecklist.length] = {
            prop:       propName,
            object:     obj,
            orig:       clone(obj[propName]),
            callback:   setter
        }        
    }
    
    var watch = function () {
        if (isFunction(arguments[1])) {
            watchAll.apply(this, arguments);
        } else if (isArray(arguments[1])) {
            watchMany.apply(this, arguments);
        } else {
            watchOne.apply(this, arguments);
        }

    };


    var watchAll = function (obj, watcher, level, addNRemove) {

        if ((typeof obj == "string") || (!(obj instanceof Object) && !isArray(obj))) { //accepts only objects and array (not string)
            return;
        }

        if(isArray(obj)) {
            defineWatcher(obj, "__watchall__", watcher, level); // watch all changes on the array
            if (level===undefined||level > 0) {
                for (var prop = 0; prop < obj.length; prop++) { // watch objects in array
                   watchAll(obj[prop],watcher,level, addNRemove);
                }
            }
        } 
        else {
            var prop,props = [];
            for (prop in obj) { //for each attribute if obj is an object
                if (prop == "$val" || (!supportDefineProperty && prop === 'watchers')) {
                    continue;
                }

                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    props.push(prop); //put in the props
                }
            }
            watchMany(obj, props, watcher, level, addNRemove); //watch all items of the props
        }


        if (addNRemove) {
            pushToLengthSubjects(obj, "$$watchlengthsubjectroot", watcher, level);
        }
    };


    var watchMany = function (obj, props, watcher, level, addNRemove) {

        if ((typeof obj == "string") || (!(obj instanceof Object) && !isArray(obj))) { //accepts only objects and array (not string)
            return;
        }

        for (var i=0; i<props.length; i++) { //watch each property
            var prop = props[i];
            watchOne(obj, prop, watcher, level, addNRemove);
        }

    };

    var watchOne = function (obj, prop, watcher, level, addNRemove) {
        if ((typeof obj == "string") || (!(obj instanceof Object) && !isArray(obj))) { //accepts only objects and array (not string)
            return;
        }

        if(isFunction(obj[prop])) { //dont watch if it is a function
            return;
        }
        if(obj[prop] != null && (level === undefined || level > 0)){
            watchAll(obj[prop], watcher, level!==undefined? level-1 : level); //recursively watch all attributes of this
        }

        defineWatcher(obj, prop, watcher, level);

        if(addNRemove && (level === undefined || level > 0)){
            pushToLengthSubjects(obj, prop, watcher, level);
        }

    };

    var unwatch = function () {

        if (isFunction(arguments[1])) {
            unwatchAll.apply(this, arguments);
        } else if (isArray(arguments[1])) {
            unwatchMany.apply(this, arguments);
        } else {
            unwatchOne.apply(this, arguments);
        }

    };

    var unwatchAll = function (obj, watcher) {

        if (obj instanceof String || (!(obj instanceof Object) && !isArray(obj))) { //accepts only objects and array (not string)
            return;
        }

        if (isArray(obj)) {
            var props = ['__watchall__'];
            for (var prop = 0; prop < obj.length; prop++) { //for each item if obj is an array
                props.push(prop); //put in the props
            }
            unwatchMany(obj, props, watcher); //watch all itens of the props
        } else {
            var unwatchPropsInObject = function (obj2) {
                var props = [];
                for (var prop2 in obj2) { //for each attribute if obj is an object
                    if (obj2.hasOwnProperty(prop2)) {
                        if (obj2[prop2] instanceof Object) {
                            unwatchPropsInObject(obj2[prop2]); //recurs into object props
                        } else {
                            props.push(prop2); //put in the props
                        }
                    }
                }
                unwatchMany(obj2, props, watcher); //unwatch all of the props
            };
            unwatchPropsInObject(obj);
        }
    };


    var unwatchMany = function (obj, props, watcher) {

        for (var prop2 in props) { //watch each attribute of "props" if is an object
            if (props.hasOwnProperty(prop2)) {
                unwatchOne(obj, props[prop2], watcher);
            }
        }
    };

    var timeouts = [],
        timerID = null;
    function clearTimerID() {
        timerID = null;
        for(var i=0; i< timeouts.length; i++) {
            timeouts[i]();
        }
        timeouts.length = 0;
    }
    var getTimerID= function () {
        if (!timerID)  {
            timerID = setTimeout(clearTimerID);
        }
        return timerID;
    }
    var registerTimeout = function(fn) { // register function to be called on timeout
        if (timerID==null) getTimerID();
        timeouts[timeouts.length] = fn;
    }
    
    // Track changes made to an array, object or an object's property 
    // and invoke callback with a single change object containing type, value, oldvalue and array splices
    // Syntax: 
    //      trackChange(obj, callback, recursive, addNRemove)
    //      trackChange(obj, prop, callback, recursive, addNRemove)
    var trackChange = function() {
        var fn = (isFunction(arguments[2])) ? trackProperty : trackObject ;
        fn.apply(this,arguments);
    }

    // track changes made to an object and invoke callback with a single change object containing type, value and array splices
    var trackObject= function(obj, callback, recursive, addNRemove) {
        var change = null,lastTimerID = -1;
        var isArr = isArray(obj);
        var level,fn = function(prop, action, newValue, oldValue) {
            var timerID = getTimerID();
            if (lastTimerID!==timerID) { // check if timer has changed since last update
                lastTimerID = timerID;
                change = {
                    type: 'update'
                }
                change['value'] = obj;
                change['splices'] = null;
                registerTimeout(function() {
                    callback.call(this,change);
                    change = null;
                });
            }
            // create splices for array changes
            if (isArr && obj === this && change !== null)  {                
                if (action==='pop'||action==='shift') {
                    newValue = [];
                    oldValue = [oldValue];
                }
                else if (action==='push'||action==='unshift') {
                    newValue = [newValue];
                    oldValue = [];
                }
                else if (action!=='splice') { 
                    return; // return here - for reverse and sort operations we don't need to return splices. a simple update will do
                }
                if (!change.splices) change.splices = [];
                change.splices[change.splices.length] = {
                    index: prop,
                    deleteCount: oldValue ? oldValue.length : 0,
                    addedCount: newValue ? newValue.length : 0,
                    added: newValue,
                    deleted: oldValue
                };
            }

        }  
        level = (recursive==true) ? undefined : 0;        
        watchAll(obj,fn, level, addNRemove);
    }
    
    // track changes made to the property of an object and invoke callback with a single change object containing type, value, oldvalue and splices
    var trackProperty = function(obj,prop,callback,recursive, addNRemove) { 
        if (obj && prop) {
            watchOne(obj,prop,function(prop, action, newvalue, oldvalue) {
                var change = {
                    type: 'update'
                }
                change['value'] = newvalue;
                change['oldvalue'] = oldvalue;
                if (recursive && isObject(newvalue)||isArray(newvalue)) {
                    trackObject(newvalue,callback,recursive, addNRemove);
                }               
                callback.call(this,change);
            },0)
            
            if (recursive && isObject(obj[prop])||isArray(obj[prop])) {
                trackObject(obj[prop],callback,recursive, addNRemove);
            }                           
        }
    }
    
    
    var defineWatcher = function (obj, prop, watcher, level) {
        var newWatcher = false;
        var isArr = isArray(obj);
        
        if (!obj.watchers) {
            defineProp(obj, "watchers", {});
            if (isArr) {
                // watch array functions
                watchFunctions(obj, function(index,action,newValue, oldValue) {
                    addPendingChange(obj, index, action,newValue, oldValue);
                    if (level !== 0 && newValue && (isObject(newValue) || isArray(newValue))) {
                        var i,n, ln, wAll, watchList = obj.watchers[prop];
                        if ((wAll = obj.watchers['__watchall__'])) {
                            watchList = watchList ? watchList.concat(wAll) : wAll;
                        }
                        ln = watchList ?  watchList.length : 0;
                        for (i = 0; i<ln; i++) {
                            if (action!=='splice') {
                                watchAll(newValue, watchList[i], (level===undefined)?level:level-1);
                            }
                            else {
                                // watch spliced values
                                for(n=0; n < newValue.length; n++) {
                                    watchAll(newValue[n], watchList[i], (level===undefined)?level:level-1);
                                }
                            }
                        }
                    }
                });
            }
        }

        if (!obj.watchers[prop]) {
            obj.watchers[prop] = [];
            if (!isArr) newWatcher = true;
        }

        for (var i=0; i<obj.watchers[prop].length; i++) {
            if(obj.watchers[prop][i] === watcher){
                return;
            }
        }

        obj.watchers[prop].push(watcher); //add the new watcher to the watchers array

        if (newWatcher) {
            var val = obj[prop];            
            var getter = function () {
                return val;                        
            };

            var setter = function (newval, delayWatcher) {
                var oldval = val;
                val = newval;                
                if (level !== 0 
                    && obj[prop] && (isObject(obj[prop]) || isArray(obj[prop]))
                    && !obj[prop].watchers) {
                    // watch sub properties
                    var i,ln = obj.watchers[prop].length; 
                    for(i=0; i<ln; i++) {
                        watchAll(obj[prop], obj.watchers[prop][i], (level===undefined)?level:level-1);
                    }
                }

                //watchFunctions(obj, prop);
                
                if (isSuspended(obj, prop)) {
                    resume(obj, prop);
                    return;
                }

                if (!WatchJS.noMore){ // this does not work with Object.observe
                    //if (JSON.stringify(oldval) !== JSON.stringify(newval)) {
                    if (oldval !== newval) {
                        if (!delayWatcher) {
                            callWatchers(obj, prop, "set", newval, oldval);
                        }
                        else {
                            addPendingChange(obj, prop, "set", newval, oldval);
                        }
                        WatchJS.noMore = false;
                    }
                }
            };

            if (WatchJS.useDirtyCheck) {
                observeDirtyChanges(obj,prop,setter);
            }
            else {
                defineGetAndSet(obj, prop, getter, setter);
            }
        }

    };

    var callWatchers = function (obj, prop, action, newval, oldval) {
        if (prop !== undefined) {
            var ln, wl, watchList = obj.watchers[prop];
            if ((wl = obj.watchers['__watchall__'])) {
                watchList = watchList ? watchList.concat(wl) : wl;
            }
            ln = watchList ? watchList.length : 0;
            for (var wr=0; wr< ln; wr++) {
                watchList[wr].call(obj, prop, action, newval, oldval);
            }
        } else {
            for (var prop in obj) {//call all
                if (obj.hasOwnProperty(prop)) {
                    callWatchers(obj, prop, action, newval, oldval);
                }
            }
        }
    };

    var methodNames = ['pop', 'push', 'reverse', 'shift', 'sort', 'slice', 'unshift', 'splice'];
    var defineArrayMethodWatcher = function (obj, original, methodName, callback) {
        defineProp(obj, methodName, function () {
            var index = 0;
            var i,newValue, oldValue, response;                        
            // get values before splicing array 
            if (methodName === 'splice') {
               var start = arguments[0];
               var end = start + arguments[1];
               oldValue = obj.slice(start,end);
               newValue = [];
               for(i=2;i<arguments.length;i++) {
                   newValue[i-2] = arguments[i];
               }
               index = start;
            } 
            else {
                newValue = arguments.length > 0 ? arguments[0] : undefined;
            } 

            response = original.apply(obj, arguments);
            if (methodName !== 'slice') {
                if (methodName === 'pop') {
                    oldValue = response;
                    index = obj.length;
                }
                else if (methodName === 'push') {
                    index = obj.length-1;
                }
                else if (methodName === 'shift') {
                    oldValue = response;
                }
                else if (methodName !== 'unshift' && newValue===undefined) {
                    newValue = response;
                }
                callback.call(obj, index, methodName,newValue, oldValue)
            }
            return response;
        });
    };

    var watchFunctions = function(obj, callback) {

        if (!isFunction(callback) || !obj || (obj instanceof String) || (!isArray(obj))) {
            return;
        }

        for (var i = methodNames.length, methodName; i--;) {
            methodName = methodNames[i];
            defineArrayMethodWatcher(obj, obj[methodName], methodName, callback);
        }

    };

    var unwatchOne = function (obj, prop, watcher) {
        if (obj.watchers[prop]) {
            if (watcher===undefined) {
                delete obj.watchers[prop]; // remove all property watchers
            }
            else {
                for (var i=0; i<obj.watchers[prop].length; i++) {
                    var w = obj.watchers[prop][i];
    
                    if (w == watcher) {
                        obj.watchers[prop].splice(i, 1);
                    }
                }
            }
        }
        removeFromLengthSubjects(obj, prop, watcher);
        removeFromDirtyChecklist(obj, prop);
    };
    
    // suspend watchers until next update cycle
    var suspend = function(obj, prop) {
        if (obj.watchers) {
            var name = '__wjs_suspend__'+(prop!==undefined ? prop : '');
            obj.watchers[name] = true;
        }
    }
    
    var isSuspended = function(obj, prop) {
        return obj.watchers 
               && (obj.watchers['__wjs_suspend__'] || 
                   obj.watchers['__wjs_suspend__'+prop]);
    }
    
    // resumes preivously suspended watchers
    var resume = function(obj, prop) {
        registerTimeout(function() {
            delete obj.watchers['__wjs_suspend__'];
            delete obj.watchers['__wjs_suspend__'+prop];
        })
    }

    var pendingTimerID = null;
    var addPendingChange = function(obj,prop, mode, newval, oldval) {
        pendingChanges[pendingChanges.length] = {
            obj:obj,
            prop: prop,
            mode: mode,
            newval: newval,
            oldval: oldval
        };
        if (pendingTimerID===null) {
            pendingTimerID = setTimeout(applyPendingChanges);
        }
    };
    
    
    var applyPendingChanges = function()  {
        // apply pending changes
        var change = null;
        pendingTimerID = null;
        for(var i=0;i < pendingChanges.length;i++) {
            change = pendingChanges[i];
            callWatchers(change.obj, change.prop, change.mode, change.newval, change.oldval);
        }
        if (change) {
            pendingChanges = [];
            change = null;
        }        
    }

    var loop = function(){		
        // check for new or deleted props
        for(var i=0; i<lengthsubjects.length; i++) {

            var subj = lengthsubjects[i];

            if (subj.prop === "$$watchlengthsubjectroot") {

                var difference = getObjDiff(subj.obj, subj.actual);

                if(difference.added.length || difference.removed.length){
                    if(difference.added.length){
                        watchMany(subj.obj, difference.added, subj.watcher, subj.level - 1, true);
                    }

                    subj.watcher.call(subj.obj, "root", "differentattr", difference, subj.actual);
                }
                subj.actual = clone(subj.obj);


            } else {

                var difference = getObjDiff(subj.obj[subj.prop], subj.actual);

                if(difference.added.length || difference.removed.length){
                    if(difference.added.length){
                        for (var j=0; j<subj.obj.watchers[subj.prop].length; j++) {
                            watchMany(subj.obj[subj.prop], difference.added, subj.obj.watchers[subj.prop][j], subj.level - 1, true);
                        }
                    }

                    callWatchers(subj.obj, subj.prop, "differentattr", difference, subj.actual);
                }

                subj.actual = clone(subj.obj[subj.prop]);

            }

        }
        
        // start dirty check
        var n, value;
        if (dirtyChecklist.length > 0) {
            for (var i = 0; i < dirtyChecklist.length; i++) {
                n = dirtyChecklist[i];
                value = n.object[n.prop];
                if (!compareValues(n.orig, value)) {
                    n.orig = clone(value);
                    n.callback(value);
                }
            }
        }

    };

    var compareValues =  function(a,b) {
        var i, state = true;
        if (a!==b)  {
            if (isObject(a)) {
                for(i in a) {
                    if (!supportDefineProperty && i==='watchers') continue;
                    if (a[i]!==b[i]) {
                        state = false;
                        break;
                    };
                }
            }
            else {
                state = false;
            }
        }
        return state;
    }
    
    var pushToLengthSubjects = function(obj, prop, watcher, level){

        var actual;

        if (prop === "$$watchlengthsubjectroot") {
            actual =  clone(obj);
        } else {
            actual = clone(obj[prop]);
        }

        lengthsubjects.push({
            obj: obj,
            prop: prop,
            actual: actual,
            watcher: watcher,
            level: level
        });
    };

    var removeFromLengthSubjects = function(obj, prop, watcher){

        for (var i=0; i<lengthsubjects.length; i++) {
            var subj = lengthsubjects[i];

            if (subj.obj == obj && subj.prop == prop && subj.watcher == watcher) {
                lengthsubjects.splice(i, 1);
            }
        }

    };
    
    var removeFromDirtyChecklist = function(obj, prop){
        var notInUse;
        for (var i=0; i<dirtyChecklist.length; i++) {
            var n = dirtyChecklist[i];
            var watchers = n.object.watchers;
            notInUse = (
                n.object == obj 
                && n.prop == prop 
                && watchers
                && ( !watchers[prop] || watchers[prop].length == 0 )
            );
            if (notInUse)  {
                dirtyChecklist.splice(i, 1);
            }
        }

    };    

	var interval;
    WatchJS.intervalLength = 50;
    WatchJS.start = function(ms){
		if(interval) return;
		if(ms) WatchJS.intervalLength = ms;
		loop();
		interval = setInterval(loop, WatchJS.intervalLength);
	};
    WatchJS.stop = function(){
		if(interval) clearInterval(interval);
		interval = false;
	};
	
    WatchJS.watch = watch;
    WatchJS.unwatch = unwatch;
    WatchJS.callWatchers = callWatchers;
    WatchJS.suspend = suspend; // suspend watchers    
    WatchJS.onChange = trackChange;  // track changes made to object or  it's property and return a single change object

    return WatchJS;
}));
/*
jstack fork of http://gwendall.github.io/way/

surikat modifs:
	lazy load init
	focus update
	bugfix loop with $.each
	add global jstack register
	remove "use strict" and fix the code with ;
	update to support new type html5 input types
	eventDOMChange to new MutationObserver standard
	set default data value by value attribute
	handle $.val() change event
	use jquery (add a framework dependency but jstack is built on jquery so...)
	enforcing synchro
*/
jstack.way = (function () {
	
	var origValFn = $.fn.val;
	$.fn.val = function(){
		var returnValue = origValFn.apply(this, arguments);
		if (arguments.length){
			this.trigger('val');
		}
		return returnValue;
	};
	
	
	var way, w, tagPrefix = "way";

	// EVENT EMITTER DEFINITION
	var EventEmitter = function () {
		this._watchers = {};
		this._watchersAll = {};

	};
	EventEmitter.prototype.constructor = EventEmitter;
	EventEmitter.prototype.watchAll = function(handler) {
		this._watchersAll = this._watchersAll || [];
		if (!_w.contains(this._watchersAll, handler)) { this._watchersAll.push(handler); }
	};
	EventEmitter.prototype.watch = function(selector, handler) {
		if (!this._watchers) { this._watchers = {}; }
		this._watchers[selector] = this._watchers[selector] || [];
		this._watchers[selector].push(handler);
	};
	EventEmitter.prototype.findWatcherDeps = function(selector) {
		// Go up to look for parent watchers
		// ex: if "some.nested.value" is the selector, it should also trigger for "some"
		var result = [];
		var watchers = _w.keys(this._watchers);
		watchers.forEach(function(watcher) {
			if (startsWith(selector, watcher)) { result.push(watcher); }
		});
		return result;
	};
	EventEmitter.prototype.emitChange = function(selector /* , arguments */) {
		if (!this._watchers) { this._watchers = {}; }
		var self = this;
		// Send data down to the local watchers
		var deps = self.findWatcherDeps(selector);
		deps.forEach(function(item) {
			if (self._watchers[item]) {
				self._watchers[item].forEach(function(handler) {
					handler.apply(self, [self.get(item)]);
				});
			}
		});
		// Send data down to the global watchers
		if (!self._watchersAll || !_w.isArray(self._watchersAll)) { return; }
		self._watchersAll.forEach(function(watcher) {
			if (_w.isFunction(watcher)) { watcher.apply(self, [selector, self.get(selector)]); }
		});
	};

	// WAY DEFINITION
	var WAY = function () {
		this.data = {};
		this._bindings = {};
		this.options = {
			persistent: true,
			timeoutInput: 50,
			timeoutDOM: 500
		};
	};

	// Inherit from EventEmitter
	WAY.prototype = Object.create(EventEmitter.prototype);
	WAY.constructor = WAY;

	// DOM METHODS CHAINING
	WAY.prototype.dom = function(element) {
		this._element = w.dom(element).get(0);
		return this;
	};
	
	// DOM METHODS: DOM -> JSON
	WAY.prototype.toStorage = function(options, element) {
		var self = this,
			element = element || self._element,
			options = options || self.dom(element).getOptions(),
			data = self.dom(element).toJSON(options),
			scope = self.dom(element).scope(),
			selector = scope ? scope + "." + options.data : options.data;
		if (options.readonly) { return false; }
		self.set(selector, data, options);

	};
	WAY.prototype.toJSON = function(options, element) {
		var self = this,
			element = element || self._element,
			data = self.dom(element).getValue(),
			options = options || self.dom(element).getOptions();
		if (_w.isArray(options.pick)) { data = selectNested(data, options.pick, true); }
		if (_w.isArray(options.omit)) { data = selectNested(data, options.omit, false); }
		return data;
	};

	// DOM METHODS: JSON -> DOM
	WAY.prototype.fromStorage = function(options, element) {
		var self = this,
			element = element || self._element,
			options = options || self.dom(element).getOptions();
			
		if(element.tagName=='INPUT'&&element.type=='file') return;
		
		if (options.writeonly) { return false; }
		var scope = self.dom(element).scope(),
			selector = scope ? scope + "." + options.data : options.data,
			data = self.get(selector);
		
		if(typeof(data)=='undefined'){ //set default data value by value attribute
			//if(!(element.tagName=='INPUT'&&element.type=='file')){
				data = $(element).val();
				self.set(selector,data,options)
			//}
		}
		self.dom(element).fromJSON(data, options);
	};
	WAY.prototype.fromJSON = function(data, options, element) {
		var self = this,
			element = element || self._element,
			options = options || self.dom(element).getOptions();
		if (options.writeonly) { return false; }
		if (_w.isObject(data)) {
			if (_w.isArray(options.pick)) { data = selectNested(data, options.pick, true); }
			if (_w.isArray(options.omit)) { data = selectNested(data, options.omit, false); }
			var currentData = _w.isObject(self.dom(element).toJSON()) ? self.dom(element).toJSON() : {};
			data = _w.extend(currentData, data);
		}
		if (options.json) { data = _json.isStringified(data) ? data : _json.prettyprint(data); }
		self.dom(element).setValue(data, options);
	};

	// DOM METHODS: GET - SET HTML
	WAY.prototype.getValue = function(element) {
		var self = this,
			element = element || self._element;
		var getters = {
			"SELECT": function() {
				return w.dom(element).val();
			},
			"INPUT": function() {
				var type = w.dom(element).type();
				if (_w.contains(["checkbox", "radio"], type)) {
					return w.dom(element).prop("checked") ? w.dom(element).val() : null;
				}
				else if (type=='file') {
					return element.files;
				}
				else if (type!="submit"){
					return $(element).val();
				}

			},
			"TEXTAREA": function() {
				return w.dom(element).val();
			}
		}
		var defaultGetter = function(a) {
			return w.dom(element).html();
		}
		var elementType = w.dom(element).get(0).tagName;
		var getter = getters[elementType] || defaultGetter;
		return getter();
	};
	WAY.prototype._transforms = {
		uppercase: function(data) {
			return _w.isString(data) ? data.toUpperCase() : data;
		},
		lowercase: function(data) {
			return _w.isString(data) ? data.toLowerCase() : data;
		},
		reverse: function(data) {
			return data && data.split && _w.isFunction(data.split) ? data.split("").reverse().join("") : data;
		}
	};
	WAY.prototype.registerTransform = function(name, transform) {
		var self = this;
		if (_w.isFunction(transform)) { self._transforms[name] = transform; }
	};
	WAY.prototype.setValue = function(data, options, element) {
		var self = this,
			element = element || self._element,
			options = options || self.dom(element).getOptions();
		options.transform = options.transform || [];
		options.transform.forEach(function(transformName) {
			var transform = self._transforms[transformName] || function(data) { return data };
			data = transform(data);
		});
		var setters = {
			"SELECT": function(a) {
				w.dom(element).val(a);
			},
			"INPUT": function(a) {
				if (!_w.isString(a)) { a = $.isEmptyObject(a)?"":JSON.stringify(a); }
				var type = w.dom(element).get(0).type;
				if (_w.contains(["checkbox", "radio"], type)) {
					if (a === w.dom(element).val()) {
						w.dom(element).prop("checked", true);
					} else {
						w.dom(element).prop("checked", false);
					}
				}
				else if (type=='file') {
					return;
				}
				else if (type!='submit') {
					w.dom(element).val(a || "");
				}
			},
			"TEXTAREA": function(a) {
				if (!_w.isString(a)) { a = $.isEmptyObject(a)?"":JSON.stringify(a); }
				w.dom(element).val(a||"");
			},
			"PRE": function(a) {
				if (options.html) {
					w.dom(element).html(a);
				}
				else {
					w.dom(element).text(a);
				}
			},
			"IMG": function(a) {
				if (!a) {
					a = options.default || "";
					w.dom(element).attr("src", a);
					return false;
				}
				var isValidImageUrl = function(url, cb) {
					w.dom(element).addClass("way-loading");
					w.dom("img", {
						src: url,
						onerror: function() { cb(false); },
						onload: function() { cb(true); }
					});
				}
				isValidImageUrl(a, function(response) {
					w.dom(element).removeClass("way-loading");
					if (response) {
						w.dom(element).removeClass("way-error").addClass("way-success");
					}
					else {
						if (a) {
							w.dom(element).addClass("way-error");
						}
						else {
							w.dom(element).removeClass("way-error").removeClass("way-success");
						}
						a = options.default || "";
					}
					w.dom(element).attr("src", a);
				});
			}
		}
		var defaultSetter = function(a) {
			if (options.html) {
				w.dom(element).html(a||'');
			}
			else {
				w.dom(element).text(a||'');
			}
		};
		var elementType = w.dom(element).get(0).tagName;
		var setter = setters[elementType] || defaultSetter;
		if(data===null||typeof(data)=='undefined') data = '';
		setter(data);
	};
	WAY.prototype.setDefault = function(force, options, element) {
		var self = this,
			element = element || self._element,
			force = force || false,
			options = options ? _w.extend(self.dom(element).getOptions(), options) : self.dom(element).getOptions();
		// Should we just set the default value in the DOM, or also in the datastore?
		if (!options.default) { return false; }
		if (force) {
			self.set(options.data, options.default, options);
		}
		else {
			self.dom(element).setValue(options.default, options);
		}
	};
	WAY.prototype.setDefaults = function() {
		var self = this,
			dataSelector = "[" + tagPrefix + "-default]";

		var elements = w.dom(dataSelector).get();
		$.each(elements,function(i,element){
			var options = self.dom(element).getOptions(),
				selector = options.data || null,
				data = selector ? self.get(selector) : null;
			if (!data) { self.dom(element).setDefault(); }
		});

	};

	// DOM METHODS: GET - SET BINDINGS

	// Scans the DOM to look for new bindings
	WAY.prototype.registerBindings = function() {

		// Dealing with bindings removed from the DOM by just resetting all the bindings all the time.
		// Isn't there a better way?
		// One idea would be to add a "way-bound" class to bound elements
		// self._bindings = {};

		var self = this;
		var selector = "[" + tagPrefix + "-data]";
		self._bindings = {};

		var elements = w.dom(selector).get();
		$.each(elements,function(i,element){
			var options = self.dom(element).getOptions(),
				scope = self.dom(element).scope(),
				selector = scope ? scope + "." + options.data : options.data;

			self._bindings[selector] = self._bindings[selector] || [];
			if (!_w.contains(self._bindings[selector], w.dom(element).get(0))) {
				self._bindings[selector].push(w.dom(element).get(0));
			}

		});

	};
	WAY.prototype.updateBindings = function(selector) {
		var self = this;
			self._bindings = self._bindings || {};

		// Set bindings for the data selector
		var bindings = pickAndMergeParentArrays(self._bindings, selector);
		bindings.forEach(function(element) {
			var focused = (w.dom(element).get(0) === w.dom(":focus").get(0)) ? true : false;
			if (!focused
				||element.getAttribute('data-way-focus-nosync')!='true' //surikat patch for focus don't break sync
			){
				self.dom(element).fromStorage();
			}
		});

		// Set bindings for the global selector
		if (self._bindings["__all__"]) {
			self._bindings["__all__"].forEach(function(element) {
				self.dom(element).fromJSON(self.data);
			});
		}
	};

	// DOM METHODS: GET - SET REPEATS
	WAY.prototype.registerRepeats = function() {

		// Register repeats
		var self = this;
		var selector = "[" + tagPrefix + "-repeat]";
		self._repeats = self._repeats || {};
		self._repeatsCount = self._repeatsCount || 0;

		var elements = w.dom(selector).get();
		$.each(elements,function(i,element){
			var options = self.dom(element).getOptions();

			self._repeats[options.repeat] = self._repeats[options.repeat] || [];

			var wrapperAttr = tagPrefix + "-repeat-wrapper=\"" + self._repeatsCount + "\"",
					parent = w.dom(element).parent("[" + wrapperAttr + "]");
			if (!parent.length) {

				self._repeats[options.repeat].push({
					id: self._repeatsCount,
					element: w.dom(element).clone(true).removeAttr(tagPrefix + "-repeat").removeAttr(tagPrefix + "-filter").get(0),
					selector: options.repeat,
					filter: options.filter
				});

				var wrapper = document.createElement("div");
				w.dom(wrapper).attr(tagPrefix + "-repeat-wrapper", self._repeatsCount);
				w.dom(wrapper).attr(tagPrefix + "-scope", options.repeat);
				if (options.filter) { w.dom(wrapper).attr(tagPrefix + "-filter", options.filter); }

				w.dom(element).replaceWith(wrapper);
				self.updateRepeats(options.repeat);

				self._repeatsCount++;

			}

		});

	};
	
	WAY.prototype.updateRepeats = function(selector) {
		var self = this;
			self._repeats = self._repeats || {};
		var repeats = pickAndMergeParentArrays(self._repeats, selector);
		repeats.forEach(function(repeat) {

			var wrapper = "[" + tagPrefix + "-repeat-wrapper=\"" + repeat.id + "\"]",
				data = self.get(repeat.selector),
				items = [];

			repeat.filter = repeat.filter || [];
			w.dom(wrapper).empty();

			for (var key in data) {
				if(!data.hasOwnProperty(key)) continue;
				w.dom(repeat.element).attr(tagPrefix + "-scope", key);
				var html = w.dom(repeat.element).get(0).outerHTML;
				html = html.replace(/\$\$key/gi, key);
				items.push(html);

			}

			w.dom(wrapper).html(items.join(""));
			self.registerBindings();
			self.updateBindings();

		});

	};

	// DOM METHODS: FORMS
	WAY.prototype.updateForms = function() {
		// If we just parse the forms with form2js (see commits before 08/19/2014) and set the data with way.set(),
		// we reset the entire data for this pathkey in the datastore. It causes the bug
		// reported here: https://github.com/gwendall/way.js/issues/10
		// Solution:
		// 1. watch new forms with a [way-data] attribute
		// 2. remove this attribute
		// 3. attach the appropriate attributes to its child inputs
		// -> so that each input is set separately to way.js' datastore
		var self = this;
		var selector = "form[" + tagPrefix + "-data], form[" + tagPrefix + "-data-binded]";
		//var selector = "form";
		var elements = w.dom(selector).get();
		$.each(elements,function(i,form){
			var options = self.dom(form).getOptions(),
				formDataSelector = options.data;
			
			if(formDataSelector){
				$(form).data('formDataSelector',formDataSelector);
			}
			else{
				formDataSelector = $(form).data('formDataSelector');
			}
			
			w.dom(form).removeAttr(tagPrefix + "-data").attr(tagPrefix+'-data-binded',true);

			// Reverse needed to set the right index for "[]" names
			var inputs = w.dom(form).find("[name]:not([way-data])").reverse().get();
			$.each(inputs,function(ii,input){
				//if(w.dom(input).attr("type")=='file') return;
				var name = w.dom(input).attr("name");
				if (endsWith(name, "[]")){
					var array = name.split("[]")[0],
							arraySelector = "[name^='" + array + "']",
							arrayIndex = w.dom(form).find(arraySelector).get().length;
					name = array + "." + arrayIndex;
				}
				var selector = formDataSelector + "." + name;
				options.data = selector;
				self.dom(input).setOptions(options);
				//w.dom(input).removeAttr("name");

			});

		});

	};

	// DOM METHODS: GET - SET ALL DEPENDENCIES
	WAY.prototype.registerDependencies = function() {
		this.registerBindings();
		this.registerRepeats();

	};
	WAY.prototype.updateDependencies = function(selector) {
		this.updateBindings(selector);
		this.updateRepeats(selector);
		this.updateForms(selector);
	};

	// DOM METHODS: OPTIONS PARSING
	WAY.prototype.setOptions = function(options, element) {
		var self = this,
			element = self._element || element;
		for (var k in options) {
			if(!options.hasOwnProperty(k)) continue;
			var attr = tagPrefix + "-" + k,
				value = options[k];
			w.dom(element).attr(attr, value);
		}
	};
	WAY.prototype.getOptions = function(element) {
		var self = this,
			element = element || self._element,
			defaultOptions = {
				data: null,
				html: false,
				readonly: false,
				writeonly: false,
				persistent: false
			};
		return _w.extend(defaultOptions, self.dom(element).getAttrs(tagPrefix));

	};

	WAY.prototype.getAttrs = function(prefix, element) {
		var self = this,
			element = element || self._element;

		var parseAttrValue = function(key, value) {
			var attrTypes = {
				pick: "array",
				omit: "array",
				readonly: "boolean",
				writeonly: "boolean",
				json: "boolean",
				html: "boolean",
				persistent: "boolean"
			};
			var parsers = {
				array: function(value) {
					return value.split(",");
				},
				boolean: function(value) {
					if (value === "true") { return true; }
					if (value === "false") { return false; }
					return true;
				}
			};
			var defaultParser = function() { return value; };
			var valueType = attrTypes[key] || null;
			var parser = parsers[valueType] || defaultParser;
			return parser(value);
		};

		var attributes = {};
		var attrs = [].slice.call(w.dom(element).get(0).attributes);
		attrs.forEach(function(attr){
			var include = (prefix && startsWith(attr.name, prefix + "-")) ? true : false;
			if (include) {
				var name = (prefix) ? attr.name.slice(prefix.length + 1, attr.name.length) : attr.name;
				var value = parseAttrValue(name, attr.value);
				if (_w.contains(["transform", "filter"], name)) { value = value.split("|"); }
				attributes[name] = value;
			}
		});
		return attributes;
	};

	// DOM METHODS: SCOPING
	WAY.prototype.scope = function(options, element) {
		var self = this,
			element = element || self._element,
			scopeAttr = tagPrefix + "-scope",
			scopeBreakAttr = tagPrefix + "-scope-break",
			scopes = [],
			scope = "";

		var parentsSelector = "[" + scopeBreakAttr + "], [" + scopeAttr + "]";
		var elements = w.dom(element).parents(parentsSelector).get();
		$.each(elements,function(i,el){
			if (w.dom(el).attr(scopeBreakAttr)) { return false; }
			var attr = w.dom(el).attr(scopeAttr);
			scopes.unshift(attr);
		});
		if (w.dom(element).attr(scopeAttr)) { scopes.push(w.dom(element).attr(scopeAttr)); }
		if (w.dom(element).attr(scopeBreakAttr)) { scopes = []; }
		scope = _w.compact(scopes).join(".");
		return scope;

	};

	// DATA METHODS //
	WAY.prototype.get = function(selector) {
		var self = this;
		if (selector !== undefined && !_w.isString(selector)) { return false; }
		if (!self.data) { return {}; }
		return selector ? _json.get(self.data, selector) : self.data;
	};
	WAY.prototype.set = function(selector, value, options) {
		if (!selector) { return false; }
		if (selector.split(".")[0] === "this") {
			console.log("Sorry, \"this\" is a reserved word in way.js");
			return false;
		}
		var self = this;
		options = options || {};
		if (selector) {
			if (!_w.isString(selector)) { return false; }			
			
			self.data = self.data || {};
			
			self.data = selector ? _json.set(self.data, selector, value) : {};	
			self.updateDependencies(selector);
			self.emitChange(selector, value);
			if (options.persistent) { self.backup(selector); }
		}
	};
	WAY.prototype.push = function(selector, value, options) {
		if(!selector) return false;
		var self = this;
		options = options || {};
		if (selector) {
			self.data = selector ? _json.push(self.data, selector, value, true) : {};
		}
		self.updateDependencies(selector);
		self.emitChange(selector, null);
		if (options.persistent) { self.backup(selector); }
	};
	WAY.prototype.remove = function(selector, options) {
		var self = this;
		options = options || {};
		if (selector) {
			self.data = _json.remove(self.data, selector);
		}
		else {
			self.data = {};
		}
		self.updateDependencies(selector);
		self.emitChange(selector, null);
		if (options.persistent) { self.backup(selector); }
	};
	WAY.prototype.clear = function() {
		this.remove(null, { persistent: true });
	};

	// LOCALSTORAGE METHODS
	WAY.prototype.backup = function() {
		var self = this;
		if (!self.options.persistent) { return; }
		try {
			var data = self.data || {};
			localStorage.setItem(tagPrefix, JSON.stringify(data));
		}
		catch(e) {
			console.log("Your browser does not support localStorage.");
		}
	};
	WAY.prototype.restore = function() {
		var self = this;
		if (!self.options.persistent) { return; }
		try {
			var data = localStorage.getItem(tagPrefix);
			try {
				data = JSON.parse(data);
				for (var key in data) {
					if(!data.hasOwnProperty(key)) continue;
					self.set(key, data[key]);
				}
			} catch(e) {}
		}
		catch(e) {
			console.log("Your browser does not support localStorage.");
		}
	};

	// MISC //
	var matchesSelector = function(el, selector) {
		var matchers = ["matches", "matchesSelector", "webkitMatchesSelector", "mozMatchesSelector", "msMatchesSelector", "oMatchesSelector"],
			fn = null;
		var r = false;
		$.each(matchers,function(i,fn){
			if (_w.isFunction(el[fn])) {
				r = el[fn](selector);
				return false;
			}
		});
		return r;
	};
	var startsWith = function(str, starts) {
		if (starts === "") { return true; }
		if (str === null || starts === null) { return false; }
		str = String(str); starts = String(starts);
		return str.length >= starts.length && str.slice(0, starts.length) === starts;
	};
	var endsWith = function(str, ends) {
		if (ends === "") { return true; }
		if (str === null || ends === null) { return false; }
		str = String(str); ends = String(ends);
		return str.length >= ends.length && str.slice(str.length - ends.length, str.length) === ends;
	};
	var cleanEmptyKeys = function(object) {
		return _w.pick(object, _w.compact(_w.keys(object)));
	};
	var filterStartingWith = function(object, string, type) { // true: pick - false: omit
		var keys = _w.keys(object);
		keys.forEach(function(key) {
			if (type) {
				if (!startsWith(key, string)) { delete object[key]; }
			}
			else {
				if (startsWith(key, string)) { delete object[key]; }
			}
		});
		return object;
	};

	var selectNested = function(data, keys, type) { // true: pick - false: omit
		// Flatten / unflatten to allow for nested picks / omits (doesn't work with regular pick)
		// ex:  data = {something:{nested:"value"}}
		//		keys = ['something.nested']
		var flat = _json.flatten(data);
		$.each(keys,function(i,key){
			flat = filterStartingWith(flat, key, type);
		});
		var unflat = _json.unflatten(flat);
		// Unflatten returns an object with an empty property if it is given an empty object
		return cleanEmptyKeys(unflat);
	};

	var pickAndMergeParentArrays = function(object, selector) {
		// Example:
		// object = { a: [1,2,3], a.b: [4,5,6], c: [7,8,9] }
		// fn(object, "a.b")
		// > [1,2,3,4,5,6]
		var keys = [];
		if (selector) {
			// Set bindings for the specified selector

			// (bindings that are repeat items)
			var split = selector.split("."),
					lastKey = split[split.length - 1],
					isArrayItem = !isNaN(lastKey);

			if (isArrayItem) {
					split.pop();
					var key = split.join(".");
					keys = object[key] ? _w.union(keys, object[key]) : keys;
			}

			// (bindings with keys starting with, to include nested bindings)
			for (var key in object) {
				if(!object.hasOwnProperty(key)) continue;
				if (startsWith(key, selector)) { keys = _w.union(keys, object[key]); }
			}

		}
		else {
			// Set bindings for all selectors
			for (var key in object) {
				if(!object.hasOwnProperty(key)) continue;
				keys = _w.union(keys, object[key]);
			}
		}
		return keys;
	};

	var isPrintableKey = function(e) {
		var keycode = e.keyCode;
		if (!keycode) { return true; }
		var valid =
			(keycode === 8)					 || // delete
			(keycode > 47 && keycode < 58)   || // number keys
			keycode === 32 || keycode === 13   || // spacebar & return key(s) (if you want to allow carriage returns)
			(keycode > 64 && keycode < 91)   || // letter keys
			(keycode > 95 && keycode < 112)  || // numpad keys
			(keycode > 185 && keycode < 193) || // ;=,-./` (in order)
			(keycode > 218 && keycode < 223);   // [\]' (in order)
		return valid;
	};

	var escapeHTML = function(str) {
		return str && _w.isString(str) ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : str;
	};

	// _w (strip of the required underscore methods)
	var _w = {};
	var
		slice            = Array.prototype.slice,
		concat           = Array.prototype.concat,
		toString         = Object.prototype.toString,
		hasOwnProperty   = Object.prototype.hasOwnProperty;

	var flatten = function(input, shallow, strict, output) {
		if (shallow && _w.every(input, _w.isArray)) {
			return concat.apply(output, input);
		}
		for (var i = 0, length = input.length; i < length; i++) {
			var value = input[i];
			if (!_w.isArray(value) && !_w.isArguments(value)) {
				if (!strict) output.push(value);
			}
			else if (shallow) {
				Array.prototype.push.apply(output, value);
			}
			else {
				flatten(value, shallow, strict, output);
			}
		}
		return output;
	};
	var createCallback = function(func, context, argCount) {
		if (context === void 0) return func;
		switch (argCount == null ? 3 : argCount) {
			case 1: return function(value) {
				return func.call(context, value);
			};
			case 2: return function(value, other) {
				return func.call(context, value, other);
			};
			case 3: return function(value, index, collection) {
				return func.call(context, value, index, collection);
			};
			case 4: return function(accumulator, value, index, collection) {
				return func.call(context, accumulator, value, index, collection);
			};
		}
		return function() {
			return func.apply(context, arguments);
		};
	};

	_w.compact = function(array) {
		return _w.filter(array, _w.identity);
	};

	_w.filter = function(obj, predicate, context) {
		var results = [];
		if (obj == null) return results;
		predicate = _w.iteratee(predicate, context);
		_w.each(obj, function(value, index, list) {
			if (predicate(value, index, list)) results.push(value);
		});
		return results;
	};

	_w.identity = function(value) {
		return value;
	};

	_w.every = function(obj, predicate, context) {
		if (obj == null) return true;
		predicate = _w.iteratee(predicate, context);
		var keys = obj.length !== +obj.length && _w.keys(obj),
				length = (keys || obj).length,
				index, currentKey;
		for (index = 0; index < length; index++) {
			currentKey = keys ? keys[index] : index;
			if (!predicate(obj[currentKey], currentKey, obj)) return false;
		}
		return true;
	};

	_w.union = function() {
		return _w.uniq(flatten(arguments, true, true, []));
	};

	_w.uniq = function(array, isSorted, iteratee, context) {
		if (array == null) return [];
		if (!_w.isBoolean(isSorted)) {
			context = iteratee;
			iteratee = isSorted;
			isSorted = false;
		}
		if (iteratee != null) iteratee = _w.iteratee(iteratee, context);
		var result = [];
		var seen = [];
		for (var i = 0, length = array.length; i < length; i++) {
			var value = array[i];
			if (isSorted) {
				if (!i || seen !== value) result.push(value);
				seen = value;
			} else if (iteratee) {
				var computed = iteratee(value, i, array);
				if (_w.indexOf(seen, computed) < 0) {
					seen.push(computed);
					result.push(value);
				}
			} else if (_w.indexOf(result, value) < 0) {
				result.push(value);
			}
		}
		return result;
	};

	_w.pick = function(obj, iteratee, context) {
		var result = {}, key;
		if (obj == null) return result;
		if (_w.isFunction(iteratee)) {
			iteratee = createCallback(iteratee, context);
			for (key in obj) {
				if(!obj.hasOwnProperty(key)) continue;
				var value = obj[key];
				if (iteratee(value, key, obj)) result[key] = value;
			}
		} else {
			var keys = concat.apply([], slice.call(arguments, 1));
			obj = new Object(obj);
			for (var i = 0, length = keys.length; i < length; i++) {
				key = keys[i];
				if (key in obj) result[key] = obj[key];
			}
		}
		return result;
	};

	_w.has = function(obj, key) {
		return obj != null && hasOwnProperty.call(obj, key);
	};

	_w.keys = function(obj) {
		if (!_w.isObject(obj)) return [];
		if (Object.keys) return Object.keys(obj);
		var keys = [];
		for (var key in obj) if (_w.has(obj, key)) keys.push(key);
		return keys;
	};

	_w.contains = function(obj, target) {
		if (obj == null) return false;
		if (obj.length !== +obj.length) obj = _w.values(obj);
		return _w.indexOf(obj, target) >= 0;
	};

	_w.sortedIndex = function(array, obj, iteratee, context) {
		iteratee = _w.iteratee(iteratee, context, 1);
		var value = iteratee(obj);
		var low = 0, high = array.length;
		while (low < high) {
			var mid = low + high >>> 1;
			if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
		}
		return low;
	};

	_w.property = function(key) {
		return function(obj) {
			return obj[key];
		};
	};

	_w.iteratee = function(value, context, argCount) {
		if (value == null) return _w.identity;
		if (_w.isFunction(value)) return createCallback(value, context, argCount);
		if (_w.isObject(value)) return _w.matches(value);
		return _w.property(value);
	};

	_w.pairs = function(obj) {
		var keys = _w.keys(obj);
		var length = keys.length;
		var pairs = Array(length);
		for (var i = 0; i < length; i++) {
			pairs[i] = [keys[i], obj[keys[i]]];
		}
		return pairs;
	};

	_w.matches = function(attrs) {
		var pairs = _w.pairs(attrs), length = pairs.length;
		return function(obj) {
			if (obj == null) return !length;
			obj = new Object(obj);
			for (var i = 0; i < length; i++) {
				var pair = pairs[i], key = pair[0];
				if (pair[1] !== obj[key] || !(key in obj)) return false;
			}
			return true;
		};
	};

	_w.indexOf = function(array, item, isSorted) {
		if (array == null) return -1;
		var i = 0, length = array.length;
		if (isSorted) {
			if (typeof isSorted == 'number') {
				i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
			} else {
				i = _w.sortedIndex(array, item);
				return array[i] === item ? i : -1;
			}
		}
		for (; i < length; i++) if (array[i] === item) return i;
		return -1;
	};

	_w.values = function(obj) {
		var keys = _w.keys(obj);
		var length = keys.length;
		var values = Array(length);
		for (var i = 0; i < length; i++) {
			values[i] = obj[keys[i]];
		}
		return values;
	};

	_w.extend = function(obj) {
		if (!_w.isObject(obj)) return obj;
		var source, prop;
		for (var i = 1, length = arguments.length; i < length; i++) {
			source = arguments[i];
			for (prop in source) {
				if (hasOwnProperty.call(source, prop)) {
					obj[prop] = source[prop];
				}
			}
		}
		return obj;
	};

	_w.isArray = function(obj) {
		return toString.call(obj) === '[object Array]';
	};

	_w.isBoolean = function(obj) {
		return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
	};

	_w.isUndefined = function(obj) {
		return obj === void 0;
	};

	_w.isObject = function(obj) {
		var type = typeof obj;
		return type === 'function' || type === 'object' && !!obj;
	};

	_w.each = function(obj, iteratee, context) {
		if (obj == null) return obj;
		iteratee = createCallback(iteratee, context);
		var i, length = obj.length;
		if (length === +length) {
			for (i = 0; i < length; i++) {
				iteratee(obj[i], i, obj);
			}
		} else {
			var keys = _w.keys(obj);
			for (i = 0, length = keys.length; i < length; i++) {
				iteratee(obj[keys[i]], keys[i], obj);
			}
		}
		return obj;
	};

	_w.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
		_w['is' + name] = function(obj) {
			return toString.call(obj) === '[object ' + name + ']';
		};
	});

	///////////////////////////////////////////////////////////
	// _json (strip of the required underscore.json methods) //
	///////////////////////////////////////////////////////////

	var deepJSON = function (obj, key, value, remove) {

		var keys = key.replace(/\[(["']?)([^\1]+?)\1?\]/g, '.$2').replace(/^\./, '').split('.'),
				root,
				i = 0,
				n = keys.length;

		// Set deep value
		if (arguments.length > 2) {

			root = obj;
			n--;

			while (i < n) {
				key = keys[i++];
				obj = obj[key] = _w.isObject(obj[key]) ? obj[key] : {};
			}

			if (remove) {
				if (_w.isArray(obj)) {
					obj.splice(keys[i], 1);
				} else {
					delete obj[keys[i]];
				}
			} else {
				obj[keys[i]] = value;
			}

			value = root;

		// Get deep value
		} else {
			while ((obj = obj[keys[i++]]) != null && i < n) {};
			value = i < n ? void 0 : obj;
		}

		return value;

	};

	var _json = {}

	_json.VERSION = '0.1.0';
	_json.debug = true;

	_json.exit = function(source, reason, data, value) {

		if (!_json.debug) return;

		var messages = {};
		messages.noJSON = "Not a JSON";
		messages.noString = "Not a String";
		messages.noArray = "Not an Array";
		messages.missing = "Missing argument";

		var error = { source: source, data: data, value: value };
		error.message = messages[reason] ? messages[reason] : "No particular reason";
		console.log("Error", error);
		return;

	};

	_json.is = function(json) {

		return (toString.call(json) == "[object Object]");

	};

	_json.isStringified = function(string) {

		var test = false;
		try {
			test = /^[\],:{}\s]*$/.test(string.replace(/\\["\\\/bfnrtu]/g, '@').
			replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
			replace(/(?:^|:|,)(?:\s*\[)+/g, ''));
		} catch (e) {}
		return test;

	};

	_json.get = function(json, selector) {

		if (json == undefined) return _json.exit("get", "missing", "json", json);
		if (selector == undefined) return _json.exit("get", "missing", "selector", selector);
		if (!_w.isString(selector)) return _json.exit("get", "noString", "selector", selector);
		return deepJSON(json, selector);

	};

	_json.set = function(json, selector, value) {

		if (json == undefined) return _json.exit("set", "missing", "json", json);
		if (selector == undefined) return _json.exit("set", "missing", "selector", selector);
		if (!_w.isString(selector)) return _json.exit("set", "noString", "selector", selector);
		//return value ? deepJSON(json, selector, value) : _json.remove(json, selector);
		 return deepJSON(json, selector, value); // Now removes the property if the value is empty. Maybe should keep it instead? surikat answer: indeed

	};

	_json.remove = function(json, selector) {

		if (json == undefined) return _json.exit("remove", "missing", "json", json);
		if (selector == undefined) return _json.exit("remove", "missing", "selector", selector);
		if (!_w.isString(selector)) return _json.exit("remove", "noString", "selector", selector);
		return deepJSON(json, selector, null, true);

	};

	_json.push = function(json, selector, value, force) {

		if (json == undefined) return _json.exit("push", "missing", "json", json);
		if (selector == undefined) return _json.exit("push", "missing", "selector", selector);
		var array = _json.get(json, selector);
		if (!_w.isArray(array)) {
			if (force) {
				array = [];
			} else {
				return _json.exit("push", "noArray", "array", array);
			}
		}
		array.push(value);
		return _json.set(json, selector, array);

	};

	_json.unshift = function(json, selector, value) {

		if (json == undefined) return _json.exit("unshift", "missing", "json", json);
		if (selector == undefined) return _json.exit("unshift", "missing", "selector", selector);
		if (value == undefined) return _json.exit("unshift", "missing", "value", value);
		var array = _json.get(json, selector);
		if (!_w.isArray(array)) return _json.exit("unshift", "noArray", "array", array);
		array.unshift(value);
		return _json.set(json, selector, array);

	};

	_json.flatten = function(json) {

		if (json.constructor.name != "Object") return _json.exit("flatten", "noJSON", "json", json);

		var result = {};
		function recurse (cur, prop) {
			if (Object(cur) !== cur) {
				result[prop] = cur;
			} else if (Array.isArray(cur)) {
				for (var i = 0, l = cur.length; i < l; i++) {
					recurse(cur[i], prop ? prop + "." + i : "" + i);
					if (l == 0) result[prop] = [];
				}
			} else {
				var isEmpty = true;
				for (var p in cur) {
					if(!cur.hasOwnProperty(p)) continue;
					isEmpty = false;
					recurse(cur[p], prop ? prop + "." + p : p);
				}
				if (isEmpty) result[prop] = {};
			}
		}
		recurse(json, "");
		return result;

	};

	_json.unflatten = function(data) {

		if (Object(data) !== data || Array.isArray(data))
			return data;
		var result = {}, cur, prop, idx, last, temp;
		for (var p in data) {
			if(!data.hasOwnProperty(p)) continue;
			cur = result, prop = "", last = 0;
			do {
				idx = p.indexOf(".", last);
				temp = p.substring(last, idx !== -1 ? idx : undefined);
				cur = cur[prop] || (cur[prop] = (!isNaN(parseInt(temp)) ? [] : {}));
				prop = temp;
				last = idx + 1;
			} while(idx >= 0);
			cur[prop] = data[p];
		}
		return result[""];

	};

	_json.prettyprint = function(json) {

		return JSON.stringify(json, undefined, 2);

	};

	//////////////////////////////////////////
	// wQuery (mini replacement for jQuery) //
	//////////////////////////////////////////

	var wQuery = function () {};
	wQuery.constructor = wQuery;

	wQuery.prototype.dom = function(selector, createOptions) {

		var self = this,
				elements = [];

		if (createOptions) {
			var element = document.createElement(selector);
			for (var k in createOptions) {
				if(!createOptions.hasOwnProperty(k)) continue;
				element[k] = createOptions[k];
			}
		} else {
			if (_w.isString(selector)) {
				elements = [].slice.call(document.querySelectorAll(selector));
			} else {
				if (_w.isObject(selector) && selector.attributes) { elements = [selector]; }
			}
			self._elements = elements;
			self.length = elements.length;
			return self;
		}

	};

	wQuery.prototype.find = function(selector) {

			var self = this,
					element = self.get(0),
					elements = [];

			if (_w.isString(selector)) {
				elements = [].slice.call(element.querySelectorAll(selector));
			}
			self._elements = elements;
			return self;

	};

	wQuery.prototype.get = function(index, chain) {

			var self = this,
					elements = self._elements || [],
					element = elements[index] || {};

			if (chain) {
				self._element = element;
				return self;
			} else {
				return _w.isNumber(index) ? element : elements;
			}

	};

	wQuery.prototype.reverse = function() {
		this._elements = this._elements.reverse();
		return this;
	};

	wQuery.prototype.val = function(value) {
		return this.prop("value", value);
	};

	wQuery.prototype.type = function(value) {
		return this.prop("type", value);
	};

	wQuery.prototype.html = function(value) {
		return this.prop("innerHTML", value);
	}

	wQuery.prototype.text = function(value) {
		return this.prop("innerHTML", escapeHTML(value));
	};

	wQuery.prototype.prop = function(prop, value) {

		var self = this,
				elements = self._elements;
		var r;
		$.each(elements,function(i,element){
			if (_w.isUndefined(value)) {
				r = element[prop];
				return false;
			} else {
				element[prop] = value;
			}
		});
		return r;
	};

	wQuery.prototype.attr = function(attr, value) {
		var r = this;
		$.each(this._elements,function(i,element){
			if (value === undefined){
				r = element.getAttribute(attr);
				return false;
			}
			element.setAttribute(attr, value);
		});
		return r;
	};

	wQuery.prototype.removeAttr = function(attr) {
		$.each(this._elements,function(i,element){
			element.removeAttribute(attr);
		});
		return this;
	};

	wQuery.prototype.addClass = function(c) {
		$.each(this._elements,function(i,element){
			element.classList.add(c);
		});
		return this;
	};

	wQuery.prototype.removeClass = function(c) {
		$.each(this._elements,function(i,element){
			element.classList.remove(c);
		});
		return this;
	};

	wQuery.prototype.parents = function(selector) {
		var self = this,
				element = self.get(0),
				parent = element.parentNode,
				parents = [];

		while (parent !== null) {
			var o = parent,
					matches = matchesSelector(o, selector),
					isNotDomRoot = (o.doctype === undefined) ? true : false;
			if (!selector) { matches = true; }
			if (matches && isNotDomRoot) { parents.push(o); }
			parent = o.parentNode;
		}
		self._elements = parents;
		return self;
	};

	wQuery.prototype.parent = function(selector) {
		var self = this,
				element = self.get(0),
				o = element.parentNode,
				matches = matchesSelector(o, selector);
		if (!selector) { matches = true; }
		return matches ? o : {};
	};

	wQuery.prototype.clone = function(chain) {
		var self = this,
				element = self.get(0),
				clone = element.cloneNode(true);
		self._elements = [clone];
		return chain ? self : clone;
	};

	wQuery.prototype.empty = function(chain) {
		var self = this,
				element = self.get(0);
		if (!element || !element.hasChildNodes) { return chain ? self : element; }

		while (element.hasChildNodes()) {
			element.removeChild(element.lastChild);
		}
		return chain ? self : element;
	};

	wQuery.prototype.replaceWith = function(newDOM) {
		var self = this,
				oldDOM = self.get(0),
				parent = oldDOM.parentNode;
		parent.replaceChild(newDOM, oldDOM);
	};
	
	wQuery.prototype.observeDOM = function(){
		var self = this, elements = self._elements;
		if(window.MutationObserver){
			var observer = new MutationObserver(function(mutations){
				mutations.forEach(function(mutation) {
					if(mutation.type=='childList'||mutation.type=='subtree'){
						eventDOMChange();
					}
				});
			});
			for (var i = 0, lenEl = elements.length; i < lenEl; i++) {
				var element = elements[i];
				observer.observe(element,{
					subtree: true,  // observe the subtree rooted at myNode
					childList: true,  // include information childNode insertion/removals
					attribute: true  // include information about changes to attributes within the subtree
				});
			}
		}
		else{
			for (var i = 0, lenEl = elements.length; i < lenEl; i++) {
				var element = elements[i];
				if(element.addEventListener){
					element.addEventListener('DOMSubtreeModified', eventDOMChange, false);
				}
			}
		}
	};

	// WATCH DOM EVENTS
	way = new WAY();
	var timeoutInput = null;
	var eventInputChange = function(e) {
		if (timeoutInput) { clearTimeout(timeoutInput); }
		timeoutInput = setTimeout(function() {
			var element = w.dom(e.target).get(0);
			way.dom(element).toStorage();
		}, way.options.timeout);
	};
	var eventClear = function(e) {
		e.preventDefault();
		var options = way.dom(this).getOptions();
		way.remove(options.data, options);
	};
	var eventPush = function(e) {
		e.preventDefault();
		var options = way.dom(this).getOptions();
		if (!options || !options["action-push"]) { return false; }
		var split = options["action-push"].split(":"),
				selector = split[0] || null,
				value = split[1] || null;
		way.push(selector, value, options);
	};
	var eventRemove = function(e) {
		e.preventDefault();
		var options = way.dom(this).getOptions();
		if (!options || !options["action-remove"]) { return false; }
		way.remove(options["action-remove"], options);
	};

	var timeoutDOM = null;
	var eventDOMChange = function() {
		// We need to register dynamically added bindings so we do it by watching DOM changes
		// We use a timeout since "DOMSubtreeModified" gets triggered on every change in the DOM (even input value changes)
		// so we can limit the number of scans when a user is typing something
		if (timeoutDOM) { clearTimeout(timeoutDOM); }
		timeoutDOM = setTimeout(function(){
			
			//way.registerDependencies();
			way.updateForms();
			way.registerDependencies();
			way.updateDependencies();
			
			setEventListeners();
			
		}, way.options.timeoutDOM);

	};

	//INITIATE
	w = new wQuery();
	way.w = w;
	
	var setEventListeners = function(){
		w.dom("body").observeDOM();
		$("[" + tagPrefix + "-data]").on("input change val", eventInputChange);	
		$("[" + tagPrefix + "-clear]").on("click", eventClear);
		$("[" + tagPrefix + "-action-remove]").on("click", eventRemove);
		$("[" + tagPrefix + "-action-push]").on("click", eventPush);
	};
	
	setEventListeners();
	
	way.restore();
	//way.setDefaults();
	//way.registerDependencies();
	//way.updateDependencies();
	
	return way;
})();
(function(w,j,$){
	var directives = {};
	j.directive = function(id, fn){
		if(fn){
			directives[id] = fn;
		}
		return directives[id];
	};
	j.directiveCompileLoaded = function(el){
		el.find('*').each(function(){
			var self = $(this);
			$.each(this.attributes, function(){
				var key = this.name;
				if(key.substr(0,9)=='j-loaded-'){
					self.attr(key.substr(9),this.value);
					self.removeAttr(key);
				}
			});
		});
		return el;
	};
	j.directiveCompile = function(el,templatesPath){
		var deferreds = [];
		$.each(directives,function(k,d){
			el.find('[j-'+k+'],'+k+'[j]').each(function(){
				var ctag = this.tagName==k.toUpperCase();
				var self = $(this);
				var val = ctag?self.attr('j'):self.attr('j-'+k);
				var deferred = d(val,self,templatesPath);
				if(deferred){
					deferreds.push(deferred);
				}
				if(ctag){
					self.removeAttr('j');
					if(deferred){
						deferred.then(function(){
							self.replaceWith(self.html());
						});
					}
					else{
						self.replaceWith(self.html());
					}
				}
				else{
					self.removeAttr('j-'+k);
				}
			});
		});
		return deferreds;
	};
	
	$.fn.jmlInject = function(jq, snippet){
		return this.each(function(){
			var $this = $(this);
			var uid = uniqid('tmpl');
			j.templateVarSubstitutions[uid] = snippet;
			$this[jq](uid);
		});
	};
	
})(window,jstack,jQuery);
(function(w,j){
	
	j.directive('if',function(val,el){
		el.jmlInject('before','if('+val+'){');
		el.jmlInject('after','}');
	});
	
	j.directive('foreach',function(val,el){
		var sp;
		if(val.indexOf(' as ')!==-1){
			sp = val.split(' as ');
			el.jmlInject('before','$.each('+sp[0]+', function(i,'+sp[1]+'){');
		}
		else{
			sp = val.split(' in ');
			el.jmlInject('before','$.each('+sp[1]+', function('+sp[0]+'){');
		}
		el.jmlInject('after','});');
	});
	
	j.directive('href',function(val,el){
		href = j.route.baseLocation+'#'+val;
		el.attr('href',href);
	});
	
	j.directive('src',function(val,el){
		el.attr('j-loaded-src',val);
	});
	
	j.directive('model',function(val,el){
		el.attr('way-data',val);
	});
	
	j.directive('include',function(val,el,templatesPath){
		var ext = val.split('.').pop();
		var include = templatesPath+val;
		if(ext!='jml'){
			include += '.jml';
		}
		var deferred = $.Deferred();
		jstack.getTemplate(include).then(function(html){
			var inc = $('<tmpl>'+html+'</tmpl>');
			$.when.apply($, jstack.directiveCompile(inc,templatesPath) ).then(function(){
				el.html(inc.contents());
				deferred.resolve();
			});
		});
		return deferred;
	});
	
	j.directive('extend',function(val,el,templatesPath){
		var extend = templatesPath+val;
		var ext = val.split('.').pop();
		if(ext!='jml'&&ext!='xjml'){
			extend += '.xjml';
		}
		var deferred = $.Deferred();
		jstack.getTemplate(extend).then(function(html){
			var inc = $('<tmpl>'+html+'</tmpl>');
			$.when.apply($, jstack.directiveCompile(inc,templatesPath) ).then(function(){
				var tmp = $('<tmpl />');
				tmp.html(el.contents());
				el.html(inc.contents());
				tmp.find('>*').each(function(){
					var $this = $(this);
					var selector = $this.attr('selector');
					if(!selector) selector = $this.attr('j');
					var method = this.tagName.toLowerCase();
					var contents = $this.contents();
					var target = el.find(selector);
					if(contents.length){
						target[method]($this.contents());
					}
					else{
						target[method]();
					}
				});
				deferred.resolve();
			});
		});
		return deferred;
	});
	
	j.directive('open',function(val,el){
		el.jmlInject('prepend',val);
		var jclose = el.attr('j-close');
		if(jclose){
			el.jmlInject('append',jclose);
			el.removeAttr('j-close');
		}
	});
	j.directive('close',function(val,el){
		var jopen = el.attr('j-open');
		if(jopen){
			el.jmlInject('prepend',jopen);
			el.removeAttr('j-open');
		}
		el.jmlInject('append',val);
	});
	j.directive('before',function(val,el){
		var jafter = el.attr('j-after');
		if(jafter){
			el.jmlInject('after',jafter);
			el.removeAttr('j-after');
		}
		el.jmlInject('before',val);
	});
	j.directive('after',function(val,el){
		var jbefore = el.attr('j-before');
		if(jbefore){
			el.jmlInject('before',jbefore);
			el.removeAttr('j-before');
		}
		el.jmlInject('after',val);
	});
	
})(window,jstack);
function uniqid(prefix, more_entropy) {
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

  if (typeof prefix === 'undefined') {
    prefix = '';
  }

  var retId;
  var formatSeed = function(seed, reqWidth) {
    seed = parseInt(seed, 10)
      .toString(16); // to hex str
    if (reqWidth < seed.length) {
      // so long we split
      return seed.slice(seed.length - reqWidth);
    }
    if (reqWidth > seed.length) {
      // so short we pad
      return Array(1 + (reqWidth - seed.length))
        .join('0') + seed;
    }
    return seed;
  };

  // BEGIN REDUNDANT
  if (!this.php_js) {
    this.php_js = {};
  }
  // END REDUNDANT
  if (!this.php_js.uniqidSeed) {
    // init seed with big random int
    this.php_js.uniqidSeed = Math.floor(Math.random() * 0x75bcd15);
  }
  this.php_js.uniqidSeed++;

  // start with prefix, add current milliseconds hex string
  retId = prefix;
  retId += formatSeed(parseInt(new Date()
    .getTime() / 1000, 10), 8);
  // add seed hex string
  retId += formatSeed(this.php_js.uniqidSeed, 5);
  if (more_entropy) {
    // for more entropy we add a float lower to 10
    retId += (Math.random() * 10)
      .toFixed(8)
      .toString();
  }

  return retId;
}
function trim (str, charlist){
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
    ' ',
    '\n',
    '\r',
    '\t',
    '\f',
    '\x0b',
    '\xa0',
    '\u2000',
    '\u2001',
    '\u2002',
    '\u2003',
    '\u2004',
    '\u2005',
    '\u2006',
    '\u2007',
    '\u2008',
    '\u2009',
    '\u200a',
    '\u200b',
    '\u2028',
    '\u2029',
    '\u3000'
  ].join('')
  var l = 0
  var i = 0
  str += ''

  if (charlist) {
    whitespace = (charlist + '').replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^:])/g, '$1')
  }

  l = str.length
  for (i = 0; i < l; i++) {
    if (whitespace.indexOf(str.charAt(i)) === -1) {
      str = str.substring(i)
      break
    }
  }

  l = str.length
  for (i = l - 1; i >= 0; i--) {
    if (whitespace.indexOf(str.charAt(i)) === -1) {
      str = str.substring(0, i + 1)
      break
    }
  }

  return whitespace.indexOf(str.charAt(0)) === -1 ? str : ''
}
function ltrim (str, charlist) {
  //  discuss at: http://locutusjs.io/php/ltrim/
  // original by: Kevin van Zonneveld (http://kvz.io)
  //    input by: Erkekjetter
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  //   example 1: ltrim('    Kevin van Zonneveld    ')
  //   returns 1: 'Kevin van Zonneveld    '

  charlist = !charlist ? ' \\s\u00A0' : (charlist + '')
    .replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^:])/g, '$1')

  var re = new RegExp('^[' + charlist + ']+', 'g')

  return (str + '')
    .replace(re, '')
}
function rtrim (str, charlist) {
  //  discuss at: http://locutusjs.io/php/rtrim/
  // original by: Kevin van Zonneveld (http://kvz.io)
  //    input by: Erkekjetter
  //    input by: rem
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  // bugfixed by: Brett Zamir (http://brett-zamir.me)
  //   example 1: rtrim('    Kevin van Zonneveld    ')
  //   returns 1: '    Kevin van Zonneveld'

  charlist = !charlist ? ' \\s\u00A0' : (charlist + '')
    .replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^:])/g, '\\$1')

  var re = new RegExp('[' + charlist + ']+$', 'g')

  return (str + '').replace(re, '')
}
(function(w,j){
	var templates = {};
	var requests = {};
	j.getTemplate = function(templatePath){
		if(!requests[templatePath]){
			if($js.dev){
				var ts = (new Date().getTime()).toString();
				var url = templatePath;
				if(url.indexOf('_t=')===-1)
					url += (url.indexOf('?')<0?'?':'&')+'_t='+ts;
			}
			requests[templatePath] = $.Deferred();
			$.ajax({
				url:url,
				cache:true,
				success:function(tpl){				
					var substitutions = {};
					var html = '';
					var sp = tpl.split('<%');
					for(var i = 0, l = sp.length; i<l; i++){
						if(i){
							var sp2 = sp[i].split('%>');
							for(var i2 = 0, l2 = sp2.length; i2<l2; i2++){
								if(i2%2){
									html += sp2[i2];
								}
								else{
									var uid = uniqid('tmpl');
									html += uid;
									substitutions[uid] = sp2[i2];
								}
							}
						}
						else{
							html += sp[i];
						}
					}
					$.extend(j.templateVarSubstitutions,substitutions);
					templates[templatePath] = html;
					requests[templatePath].resolve(templates[templatePath]);
				}
			});
		}
		return requests[templatePath];
	};
	
})(window,jstack);
jstack.processTemplate = function(el, cacheId, templatesPath, debug){
	if(typeof(debug)=='undefined') debug = $js.dev;
	var defer = $.Deferred();
	$.when.apply( $, jstack.directiveCompile(el, templatesPath) ).then(function(){
		var templateProcessor = function(data){
			return jstack.directiveCompileLoaded( $( '<tmpl>'+jstack.template(el, data, cacheId, debug)+'</tmpl>' ) ).contents();
		};
		defer.resolve(templateProcessor);
	});
	return defer;
};
jstack.loadView = (function(){
	return function(o){
		var html = $('<tmpl>'+o.templateHtml+'</tmpl>');
		if(!html.find('> *').length){
			html.wrapInner('<div />');
		}
		var controllers = html.find('[j-controller]');
		var processors = {};
		if(!controllers.length){
			html.children(0).attr('j-controller',o.path||'');
			controllers = html.find('[j-controller]');
		}
		var readyControllers = 0;
		var totalControllers = controllers.length;
		var renderCallbacksParams = [];
		
		if(!o.defaultController){
			o.defaultController = function(controllerPath){
				jstack.controller(controllerPath,function(){
					this.jstack.render();
				});
			};
		}
		
		controllers.each(function(){
			var self = $(this);
			var controllerPath = self.attr('j-controller');
			var controllerName = controllerPath.replace('/','.');
			self.attr('way-scope',controllerName);

			var cacheId = o.templatePath+'#'+controllerPath;
			
			var templatesPath = o.templatePath.split('/');
			templatesPath.pop();
			templatesPath = templatesPath.join('/');
			if(templatesPath) templatesPath += '/';
			
			var compileView = jstack.processTemplate(self,cacheId,templatesPath).then(function(templateProcessor){
				processors[controllerPath] = function(data){
					var processedTemplate = templateProcessor(data);
					self.html(processedTemplate);
					jstack.way.set(controllerName, data);
				};
			});
			var loadOnce;
			var initController = function(ctrl){
				if(loadOnce) return;
				loadOnce = true;
				
				ctrl.jstack.bindUpdate = function(){
					jstack.way.set(controllerName, ctrl.jstack.data);
				};
				ctrl.jstack.bindWatch = function(){
					var data = ctrl.jstack.data;
					ctrl.jstack.bindUpdate();
					
					jstack.watcher.start();
					jstack.watch(data,function(prop, action, newvalue, oldvalue){
						jstack.way.set(controllerName+'.'+prop,newvalue);
						if(ctrl.jstack.bindSyncReload)
							processors[controllerPath]();
					});
					jstack.watch(data,function(prop, action, difference, oldvalue){
						var update, added = difference.added, removed = difference.removed;
						for(var i = 0, length = added.length; i < length; i++){
							jstack.way.set(controllerName+'.'+added[i],data[added[i]]);
						}
						for(var i = 0, length = removed.length; i < length; i++){
							jstack.way.set(controllerName+'.'+removed[i],data[added[i]]);
						}
						if(update&&ctrl.jstack.bindSyncReload)
							processors[controllerPath]();
					},0,true);
					
				};
				
				if(ctrl.jstack.bindSync){
					ctrl.jstack.bindWatch();
				}
			};
			var controllerRendered = $.Deferred();
			var loadController = function(){
				var ctrl = jstack.controller(controllerPath);
				if(!ctrl)
					console.log('jstack controller "'+controllerPath+'" not found as expected (or parse error) in "'+o.controllersPath+controllerPath+'"');
				
				initController(ctrl);
				
				ctrl.jstack.render = function(data){
					if(!data) data = {};
					ctrl.jstack.data = data;
					var processedTemplate = processors[controllerPath](ctrl.jstack.data);
					renderCallbacksParams.push([self,ctrl]);
					controllerRendered.resolve();
					return data;
				};
				ctrl.jstack.element = self;
				return ctrl;
			};
			var controllerReady = $.Deferred();
			var viewReady = $.Deferred();
			$.when(controllerReady,viewReady).then(function(){
				var ctrl = loadController();
				readyControllers++;
				if(readyControllers==totalControllers){
					$.when(controllerRendered).then(function(){
						$('[j-view]').html(html.contents());						
						if(o.renderCallback){
							$.each(renderCallbacksParams,function(i,params){
								o.renderCallback.apply(o,params);
							});
						}
					});
				}
				ctrl();
			});
			compileView.then(function(){
				viewReady.resolve();
			});
			$js.onExists(o.controllersPath+controllerPath,
				function(){
					controllerReady.resolve();
				},
				function(){
					o.defaultController(controllerPath);
					controllerReady.resolve();
				}
			);
			
		});
	};
})();
(function($,j){
	
	var toParams = function(params) {
		var pairs, proc;
		pairs = [];
		(proc = function(object, prefix) {
		var el, i, key, value, _results;
		if (object == null) object = params;
		if (prefix == null) prefix = null;
		_results = [];
		for (key in object) {
			if (!object.hasOwnProperty(key)) continue;
			value = object[key];
			if(value === null)
				value = '';
			if (value instanceof Array) {
			_results.push((function() {
				var _len, _results2;
				_results2 = [];
				for (i = 0, _len = value.length; i < _len; i++) {
				el = value[i];
				_results2.push(proc(el, prefix != null ? "" + prefix + "[" + encodeURIComponent(key) + "]["+i+"]" : "" + encodeURIComponent(key) + "["+i+"]"));
				}
				return _results2;
			})());
			} else if (value instanceof Object) {
			if (prefix != null) {
				prefix += "[" + key + "]";
			} else {
				prefix = key;
			}
			_results.push(proc(value, prefix));
			} else {
			_results.push(pairs.push(prefix != null ? "" + prefix + "[" + encodeURIComponent(key) + "]=" + encodeURIComponent(value) : "" + encodeURIComponent(key) + "=" + encodeURIComponent(value)));
			}
		}
		return _results;
		})();
		return pairs.join('&');
	};
	var toParamsPair = function(data){
		var pair = [];
		var params = toParams(data).split('&');
		for(var i=0;i<params.length;i++){
			var x = params[i].split('=');
			var val = x[1]!==null?decodeURIComponent(x[1]):'';
			pair.push([decodeURIComponent(x[0]), val]);
		}
		return pair;
	};
	
	var recurseExtractFiles = function(data,files,prefix,deepness){
		if(!prefix)
			prefix = '';
		for(var k in data){
			if(!data.hasOwnProperty(k)) continue;
			var key = prefix+k;
			var value = data[k];
			if(value instanceof FileList){
				if(value.length==1){
					files[key] = value[0];
				}
				else{
					files[key] = [];
					for(var i=0;i<value.length;i++){
						files[key].push(value[i]);
					}
				}
				delete(data[k]);
			}
			else if(value instanceof $){
				data[k] = value.jsonml();
			}
			else if(value instanceof HTMLCollection || value instanceof HTMLElement){
				data[k] = $(value).jsonml();
			}
			else if(typeof(value)=='object'){
				recurseExtractFiles(value,files,key+'_',deepness+1);
			}
		}
	};
	
	j.ajax = function(){
		var settings,files = {};
		if(arguments.length==2){
			settings = arguments[1]||{};
			settings.url = arguments[0];
		}
		else{
			settings = arguments[0];
		}
		
		if(settings.data){
			recurseExtractFiles(settings.data,files);
		}
		if(!$.isEmptyObject(files)){
			var haveFiles;
			var fd = new FormData();
			var params = toParamsPair(settings.data);
			for(var i=0;i<params.length;i++){
				fd.append(params[i][0], params[i][1]);
			}
			for(var k in files){
				if(files.hasOwnProperty(k)){
					var file = files[k];
					if(file instanceof Array){
						for(var i=0;i<file.length;i++){
							if(typeof(file[i])!='undefined'){
								fd.append(k+'[]',file[i]);
								haveFiles = true;
							}
						}
					}
					else{
						if(typeof(file)!='undefined'){
							fd.append(k,file);
							haveFiles = true;
						}
					}
				}
			}
			if(haveFiles){
				settings.type = "POST";
				settings.processData = false;
				settings.contentType = false;
				settings.data = fd;
			}
		}
		return $.ajax(settings);
	};
	
	j.post = function(url,data,success,dataType){
		return j.ajax({
			type: "POST",
			url: url,
			data: data,
			success: success,
			dataType: dataType
		});
	};
	
})(jQuery,jstack);
jstack.paramsReflection = function(f){
	var args = f.toString().match(/^\s*function\s+(?:\w*\s*)?\((.*?)\)\s*{/);
	var r = {};
	if(args&&args[1]){
		args = args[1];
		args = args.replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,'');
		args = args.trim().split(/\s*,\s*/);
		for(var i=0;i<args.length;i++){
			var arg = args[i];
			var idf = arg.indexOf('=');
			if(idf===-1){
				r[arg] = undefined;
			}
			else{
				r[arg.substr(0,idf)] = eval(arg.substr(idf+1).trim());
			}
		}
	}
	return r;
};
(function(jstack){
	
	var moduleDomElement = function(module,el,attrNs){
		var o = {};
		var attributes = el.attributes;
		var prefixNs = attrNs+'-';
		var prefixNsL = prefixNs.length;
		for(var k in attributes){
			if(attributes.hasOwnProperty(k)){
				var attribute = attributes[k];
				if(attribute.name&&attribute.name.substr(0,prefixNsL)==prefixNs){
					o[attribute.name.substr(prefixNsL).toCamelCase()] = attribute.value;
				}
			}
		}
		el.$js = o;
		var loadModuleDomElement = function(){
			var
				func = $js.module(module),
				apply = [],
				params
			;
			if(func instanceof Array){
				var tmpParams = func;
				func = tmpParams.pop();
				params = {};
				for(var k in tmpParams){
					if(tmpParams.hasOwnProperty(k)){
						params[tmpParams[k]] = null;
					}
				}
			}
			else{
				params = jstack.paramsReflection(func);
			}
			for(var k in params){
				if(params.hasOwnProperty(k)){
					if(k=='$di'){
						apply.push(o);
					}
					else if(typeof(o[k])!='undefined'){
						apply.push(o[k]);
					}
					else{
						apply.push(params[k]);
					}
				}
			}
			func.apply(el,apply);
		};
		if($js.module(module)){
			loadModuleDomElement();
		}
		else if($js.waitingModule[module]){
			$js.waitingModule[module](loadModuleDomElement);
		}
		else{
			$js(module,loadModuleDomElement);
		}
	};
	
	jstack.moduleDomNs = 'js';
	jstack.moduleDomPath = 'js-module-dom/';
	jstack.moduleDom = function(prefixPath,attrNs){
		if(!prefixPath)
			prefixPath = jstack.moduleDomPath;
		if(!attrNs)
			attrNs = jstack.moduleDomNs;
		var all = document.getElementsByTagName('*');
		for(var i=0;i<all.length;i++){
			if(!all[i].$js){
				var js = all[i].getAttribute(attrNs);
				if(js){
					moduleDomElement(prefixPath+js,all[i],attrNs);
				}
			}
		}
	};
	
})(jstack);
jstack.replaceAllRegExp = function(str, find, replace){
  return str.replace(new RegExp(find, 'g'), replace);
};
jstack.escapeRegExp = function(find){
	return find.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
};
jstack.replaceAll = function(str, find, replace){
	find = jstack.escapeRegExp(find);
	return jstack.replaceAllRegExp(str, find, replace);
};
jstack.camelCaseDataToObject = function(k,v,r){
	var s = k.replace(/([A-Z])/g, ' $1').toLowerCase().split(' ');
	if(typeof(r)=='undefined') r = {};
	var ref = r;
	var l = s.length-1;
	$.each(s,function(i,key){
		if(i==l){
			ref[key] = v;
		}
		else{
			if(!ref[key]) ref[key] = {};
			ref = ref[key];
		}
	});
	return r;
};
jstack.jml = function(url,data){
	if(!data) data = {};
	var templatesPath = url.split('/');
	templatesPath.pop();
	templatesPath = templatesPath.join('/')+'/';
	var cacheId = url;
	var defer = $.Deferred();
	jstack.getTemplate(url).then(function(html){
		var el = $('<tmpl>'+html+'</tmpl>');
		jstack.processTemplate(el, cacheId, templatesPath).then(function(templateProcessor){
			defer.resolve( templateProcessor(data) );
		});
	});
	return defer;
};
/*jslint browser: true */
/*global jQuery */

/**
 * This script is extending the jQuery library to handle JsonML array format.
 *
 * Documentation of the format can be found at: <http://jsonml.org/>
 *
 * Author: KARASZI Istvan <github@spam.raszi.hu>
 * License: LGPL
 *
 */
(function( $ ) {
  /**
   * Creates a DOM tree from a JsonML object in the provided document.
   * <p>
   * Documentation of the format can be found at: <a href="http://jsonml.org/">jsonml.org</a>.
   *
   * @example $.jsonml( [ "span", { "class" : "code-example-third" }, "Third" ] )
   *
   * @param {Array} jsonML
   *    the JsonML in array format
   * @param {Object} ownerDoc
   *    the owner document
   * @return {Object} the jQuery object
   */
  $.jsonml = function( jsonML, ownerDoc ) {
    if (typeof ownerDoc == "undefined") {
      ownerDoc = document;
    }

    if (typeof jsonML == "string") {
      return $(ownerDoc.createTextNode(jsonML));
    }

    if ($.isArray(jsonML)) {
      var length = jsonML.length;

      if (length >= 1 && typeof jsonML[0] == "string") {
        var $item = $(ownerDoc.createElement(jsonML[0]));

        if (length == 1) {
          return $item;
        }

        var start = 1;

        /* add attributes */
        if ($.isPlainObject(jsonML[1])) {
          $item.attr(jsonML[1]);

          if (length == 2) {
            return $item;
          }

          start++;
        }

        var
          item = $item.get(0),
          scriptEval = $item.is("script") && !$.support.scriptEval(),
          ieObject = $.browser.msie && $item.is("object");

        for (var i = start; i < length; i++) {
          try {
            if (scriptEval && typeof jsonML[i] == "string") {
              item.text = jsonML[i];
              continue;
            }

            var $node = $.jsonml(jsonML[i], ownerDoc);

            if (ieObject) {
              var object = $item.get(0);
              object.innerHTML = object.innerHTML + $node.get(0).outerHTML;
            } else {
              $node.appendTo($item);
            }
          } catch (e) {
            throw "Could not insert " + $node.get(0).nodeName + " to " + $item.get(0).nodeName + ": " + e;
          }
        }

        return $item;
      }
    }

    throw "Invalid JsonML format: " + jsonML;
  };
  
	//addon by surikat
	$.fn.jsonml = function(){
		var a = [];
		if(this.length>1){
			this.each(function(){
				a.push($(this).jsonml());
			});
		}
		else{
			var el = this[0];
			if(!el) return;
			a.push(el.tagName.toLowerCase());
			var props = {}, propNotEmpty;
			$.each(el.attributes,function(i,v){
				props[v.name] = v.value;
				propNotEmpty = true;
			});
			if(propNotEmpty){
				a.push(props);
			}
			var c = this.children().each(function(){
				a.push($(this).jsonml());
			});
		}
		return a;
	};
  
})(jQuery);

// vim: set ai ts=2 sw=2 et:

String.prototype.trim = function(charlist){
	return trim(this,charlist);
};
String.prototype.ltrim = function(charlist){
	return ltrim(this,charlist);
};
String.prototype.rtrim = function(charlist){
	return rtrim(this,charlist);
};

String.prototype.camelCase = function(){
	return this.replace(/(\_[a-z])/g, function($1){return $1.toUpperCase().replace('_','');});
};

String.prototype.snakeCase = function(){
	return this.replace(/([A-Z])/g, function($1){return "_"+$1.toLowerCase();});
};

String.prototype.camelCaseDash = function(){
	return this.replace(/(\-[a-z])/g, function($1){return $1.toUpperCase().replace('-','');});
};

String.prototype.snakeCaseDash = function(){
	return this.replace(/([A-Z])/g, function($1){return "-"+$1.toLowerCase();});
};

String.prototype.lcfirst = function(){
	return this.charAt(0).toLowerCase() + this.substr(1);
};
String.prototype.ucfirst = function(){
	return this.charAt(0).toUpperCase() + this.substr(1);
};
(function($){
	
	$.fn.changeVal = function(v){
		return $(this).val(v).trigger("change");
	};
	
	$.uniqid = function(){
		var id;
		do{
			id = uniqid('uid-');
		}
		while($('#'+id).length);
		return id;
	}
	$.fn.getId = function(force){
		var id = this.attr('id');
		if(!id||force){
			id = $.uniqid();
			this.attr('id',id);
		}
		return id;
	};
	
	$.fn.serializeAssoc = function(){
		var data = {};
		this.each(function(){
			$.each($(this).serializeArray(),function(i,o){
				data[o.name] = o.value;
			});
		});
		return data;
	};
	
	$.fn.hasVerticalScrollBar = function(){
		return this.get(0) ? this.get(0).scrollHeight > this.innerHeight() : false;
	};
	
	$.fn.hasHorizontalScrollBar = function() {
		return this.get(0) ? this.get(0).scrollWidth > this.innerWidth() : false;
	};
	
	$.fn.attrParams = function(attr){
		if(!attr) attr = 'data';
		var data = {},
			l = attr.length;
		this.each(function(){
			$.each(this.attributes, function(){
				var key = this.name, value = this.value;
				if(key.substr(0,l)==attr){
					key = key.substr(l+1);
					key = key.camelCaseDash();
					key = key.lcfirst();
					
					if(value=='true')
						value = true;
					else if(value=='false')
						value = false;
					else if($.isNumeric(value))
						value = parseInt(value,10);
					
					data[key] = value;
				}
			});
		});
		return data;
	};
	
	
	$.extend($.expr[":"], {
		scrollable: function(element) {
			var vertically_scrollable, horizontally_scrollable;
			if ($(element).css('overflow') == 'scroll' || $(element).css('overflowX') == 'scroll' || $(element).css('overflowY') == 'scroll') return true;

			vertically_scrollable = (element.clientHeight < element.scrollHeight) && (
			$.inArray($(element).css('overflowY'), ['scroll', 'auto']) != -1 || $.inArray($(element).css('overflow'), ['scroll', 'auto']) != -1);

			if (vertically_scrollable) return true;

			horizontally_scrollable = (element.clientWidth < element.scrollWidth) && (
			$.inArray($(element).css('overflowX'), ['scroll', 'auto']) != -1 || $.inArray($(element).css('overflow'), ['scroll', 'auto']) != -1);
			return horizontally_scrollable;
		},
		parents: function(a,i,m){
			return $(a).parents(m[3]).length < 1;
		}
	});
	
	var findForks = {
		'nth-level': function(selector,param){
			param = parseInt(param,10);
			var a = [];
			var $this = this;
			this.each(function(){
				var level = param+$(this).parents(selector).length;
				$this.find(selector).each(function(){
					if($(this).parents(selector).length == param-1){
						a.push(this);
					}
				});
			});
			return $(a);
		}
	};
	
	$.fn.findOrig = $.fn.find;
	$.fn.find = function(selector){
		
		var fork, THIS = this;
		$.each(findForks,function(k,v){
			var i = selector.indexOf(':'+k);
			if(i!==-1){
				var l = k.length;
				var selectorPart = selector.substr(0,i);
				var param = selector.substr(i+l+2,selector.length-i-l-3);
				fork = findForks[k].call(THIS,selectorPart,param);
				return false;
			}
		});
		if(fork) return fork;
		
		return this.findOrig(selector);
	};
	
	$.fn.populateForm = function(data,force){
		var $this = this;
		var populateSelect = function($ctrls,value){
			var found = false;
			$('option', $ctrls).each(function(){
				if($(this).val()==value){
					$(this).prop('selected',true);
					found = true;
				}
			});
			if(!found&&force){
				$ctrls.append('<option value="'+value+'" selected="selected">'+value+'</option>');
			}
		};
		$.each(data, function(key, value){
			var $ctrls = $this.find('[name="'+key+'"]');
			if ($ctrls.is('select')){
				if(value instanceof Array){
					for(var i = 0, l = value.length;i<l;i++){
						populateSelect($ctrls,value[i]);
					}
				}
				else{
					populateSelect($ctrls,value);
				}
			} 
			else if ($ctrls.is('textarea')) {
				$ctrls.val(value);
			} 
			else {
				switch($ctrls.attr("type")){
					case "text":
					case "hidden":
						$ctrls.val(value);   
						break;
					case "radio":
						if ($ctrls.length >= 1) {
							$.each($ctrls,function(index){
								var elemValue = $(this).attr("value");
								var elemValueInData = singleVal = value;
								if(elemValue===value){
									$(this).prop('checked', true);
								}
								else{
									$(this).prop('checked', false);
								}
							});
						}
						break;
					case "checkbox":
						if ($ctrls.length > 1) {
							$.each($ctrls,function(index){
								var elemValue = $(this).attr("value");
								var elemValueInData = undefined;
								var singleVal;
								for (var i=0; i<value.length; i++){
									singleVal = value[i];
									if (singleVal === elemValue){elemValueInData = singleVal};
								}

								if(elemValueInData){
									$(this).prop('checked', true);
								}
								else{
									$(this).prop('checked', false);
								}
							});
						}
						else if($ctrls.length == 1){
							$ctrl = $ctrls;
							if(value) {$ctrl.prop('checked', true);}
							else {$ctrl.prop('checked', false);}

						}
						break;
				}
			}
		});
		return this;
	};
	
	$.fn.childrenHeight = function(outer){
		var topOffset = bottomOffset = 0;
		if(typeof(outer)=='undefined') outer = true;
		this.children().each(function(i, e){
			var $e = $(e);
			var eTopOffset = $e.offset().top;
			var eBottomOffset = eTopOffset + (outer ? $e.outerHeight() : $e.height());

			if(eTopOffset < topOffset)
				topOffset = eTopOffset;
			if(eBottomOffset > bottomOffset)
				bottomOffset = eBottomOffset;
		});
		return bottomOffset - topOffset - this.offset().top;
	};

})(jQuery)
/**
 * jQuery serializeObject
 * @copyright 2014, macek <paulmacek@gmail.com>
 * @link https://github.com/macek/jquery-serialize-object
 * @license BSD
 * @version 2.5.0
 */
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
    fixed:    /^\d+$/,
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
        else if (patterns.fixed.test(k)) {
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
      addPairs(this.serializeArray()).
      serialize();
  };

  FormSerializer.serializeJSON = function serializeJSON() {
    return new FormSerializer($, this).
      addPairs(this.serializeArray()).
      serializeJSON();
  };

  if (typeof $.fn !== "undefined") {
    $.fn.serializeObject = FormSerializer.serializeObject;
    $.fn.serializeJSON   = FormSerializer.serializeJSON;
  }

  exports.FormSerializer = FormSerializer;

  return FormSerializer;
}));

