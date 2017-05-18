(function(factory){
	if(typeof module === "object" && typeof module.exports === "object"){
		module.exports = factory( require('jquery') );
	}
	else if( typeof define === "function" && define.amd ) {
		define(['jquery'],factory);
	}
	else{
		factory(jQuery);
	}
})(function($){

var jstackClass = function(){
	this.config = {
		templatesPath: 'app/',
		controllersPath: 'app/',
		debug: window.APP_DEV_MODE || false,
	};
};
jstackClass.prototype.extend = function(c,parent){
	c.prototype = Object.create(parent.prototype);
};
var jstack = new jstackClass();

(function(){

let prefix = '__JSTACK__OBSERVABLE__';

let observable = function(obj,options,parentProxy,parentKey){
	
	let observer = obj[prefix];
	if(observer){
		observer.parentKey = parentKey;
		observer.parentProxy = parentProxy;
		return obj;
	}
	
	if(!options){
		options = {};
	}
	
	if(options.factory){
		obj = options.factory(obj);
	}
	
	let notify = function(change,preventPropagation){
		observer.namespaces.each(function(callbackStack,namespace){
			
			if(preventPropagation[namespace]){
				return;
			}
			
			change.preventImmediatePropagation = false;
			change.stopPropagation = function(){
				preventPropagation[namespace] = true;
			};
			change.stopImmediatePropagation = function(){
				change.preventImmediatePropagation = true;
				preventPropagation[namespace] = true;
			};
			
			for(let i=0, l = callbackStack.length; i<l; i++){
				let callbackDef = callbackStack[i];
				if( !callbackDef.recursive && change.keyStack.length ){
					continue;
				}
				if( callbackDef.key !== false && callbackDef.key !== change.key ){
					continue;
				}
				let r = callbackDef.callback(change);
				if(r===false||change.preventImmediatePropagation){
					return;
				}
			}
		});
		
		if(observer.parentProxy){
			let parentObserver = observer.parentProxy[prefix];
			let bubbleChange = $.extend({},change);
			bubbleChange.keyStack.push(observer.parentKey);
			parentObserver.notify(bubbleChange,preventPropagation);
		}
	};
	
	let proxy;
	
	let factory = function(key,value){
		if(typeof(value)=='object'&&value!==null){
			value = observable(value, options, proxy, key);
		}
		return value;
	};
	
	observer = {
		namespaces:{},
		parentProxy:parentProxy,
		parentKey:parentKey,
		notify: notify,
		proxyTarget: obj,
		factory: factory,
	};
	
	proxy = new Proxy(obj,{
		get: function (target, key) {
			if(key===prefix){
				return observer;
			}
			return target[key];
		},
		set: function(target, key, value){
			
			let oldValue = target[key];
			
			value = factory(key,value);
			
			target[key] = value;
			
			notify({
				type:'set',
				target:target,
				keyStack: [],
				key:key,
				oldValue:oldValue,
				value:value,
			},{});
			
			return true;
		},
		deleteProperty: function (target, key) {
			
			let oldValue = target[key];
			
			
			if(Array.isArray(target))
				target.splice(key,1);
			else
				delete(target[key]);
			
			if(typeof(oldValue)=='object'&&oldValue!==null){
				let removedObserver = oldValue[prefix];
				if(removedObserver.parentProxy===proxy && removedObserver.parentKey===key){
					delete removedObserver.parentProxy;
					delete removedObserver.parentKey;
				}
			}
			
			notify({
				type:'unset',
				target:target,
				keyStack: [],
				key:key,
				oldValue:oldValue,
			},{});
			
			return true;
		},
		ownKeys: function(target){
			return Reflect.ownKeys(target);
		},
		
	});
	
	if(obj instanceof Array){
		for(let i = 0, l=obj.length; i<l; i++){
			let v = obj[i];
			if(typeof(v)=='object'&&v!==null){
				obj[i] = observable( v, options, proxy, i );
			}
		}
	}
	else{
		for(let k in obj){
			if(!obj.hasOwnProperty(k)){
				continue;
			}
			obj[k] = factory(k,obj[k]);
		}
	}
	
	if(options.factoryProxy){
		proxy = options.factoryProxy(proxy);
	}
	
	return proxy;
};

let observe = function(obj,key,callback,namespace,recursive){
	
	if(typeof(key)=='function'){
		recursive = namespace;
		namespace = callback;
		callback = key;
		key = false;
	}
	if(key===false||typeof(key)=='string'||typeof(key)=='number'){
		key = [key];
	}
	if(!namespace){
		namespace = 0;
	}
	
	let observer = obj[prefix];
	if(!observer){
		throw new Error('object is not observable');
	}
	if(!observer.namespaces[namespace]){
		observer.namespaces[namespace] = [];
	}
	let callbackStack = observer.namespaces[namespace];
	
	for(let i=0, l=key.length; i<l; i++){
		callbackStack.push({
			key: key[i],
			callback: callback,
			recursive: recursive,
		});
	}
};

let unobserve = function(obj,key,callback,namespace){
			
	if(key instanceof Array){
		for(let i=0, l = key.length; i<l; i++){
			unobserve(obj,key[i],callback,namespace);
		}
		return;
	}
	
	if(typeof(key)=='function'){
		namespace = callback;
		callback = key;
		key = false;
	}
	if(!namespace){
		namespace = 0;
	}
	
	let observer = obj[prefix];
	if(!observer){
		throw new Error('object is not observable');
	}
	
	let callbackStack = observer.namespaces[namespace];
	
	if(!callbackStack){
		return;
	}
	
	if(key || callback){
		for(let i=0, l = callbackStack.length; i<l; i++){
			let callbackDef = callbackStack[i];
			if( ( key === callbackDef.key ) && ( !callback || callback===callbackDef.callback ) ){
				callbackStack.splice(i,1);
			}
		}
	}
	else{
		callbackStack.length = 0;
	}
	
};

let getObserverTarget = function(obj){
	let original = obj;
	let observer = obj[prefix];
	if(observer){
		original = observer.proxyTarget;
	}
	return original;
};
let getObserver = function(obj){
	return obj[prefix];
};

jstack.observable = observable;
jstack.observe = observe;
jstack.unobserve = unobserve;
jstack.getObserverTarget = getObserverTarget;
jstack.getObserver = getObserver;

})();

jstack.Component = class {
	constructor(element,options,config){
		
		if(options.extendWith){
			$.extend(this,options.extendWith);
		}
		
		let $el = $(element);
		
		this.element = $el;
		this.options = options || {};
		this.config = config || {};
		
		let data = config.data || $el.data('jModel') || {};
		
		let route = this.config.route || {};
		let hash = route.hash;
		
		if(typeof(hash)=='undefined'){
			hash = window.location.hash.ltrim('#');
		}
		
		if($el[0].hasAttribute('j-view-inherit')){
			let parent = $el.parent().closest(':data(jModel)');
			if(parent.length){
				let inheritProp = $el[0].getAttribute('j-view-inherit');
				let parentData = parent.data('jModel') || {};
				if(inheritProp){
					data[inheritProp] = parentData;
				}
				else{
					data = $.extend({},parentData,data);
				}
			}
		}
		this.data = data;
		this.hash = hash;
		this.route = route;
		
		$el.data('jModel',data);
		$el.data('jController',this);
		
		//build
		let self = this;
		
		this.setDataArguments = [];
		
		
		let dependenciesReady = $.Deferred();
		
		let dependenciesStack = [];
		
		let getData = typeof(this.getData)=='function'?this.getData():this.getData;
		
		if(this.templateUrl){
			let templateUrl = this.templateUrl;
			if(typeof(templateUrl)=='function'){
				templateUrl = templateUrl.call(this);
			}
			let templateReady = $.Deferred();
			dependenciesStack.push(templateReady);
			jstack.getTemplate( templateUrl+'.jml' ).then( function(html){
				self.templateUrlLoaded = html;
				templateReady.resolve();
			} );
		}
		
		$.when.apply($, dependenciesStack).then(function(){
			
			
			let getDataReady = [];
			if(getData&&getData.length){
				let getDataRun = [];
				for(let i = 0, l = getData.length; i < l; i++){
					let dependencyData = getData[i];
					if(typeof(dependencyData)=='function'){
						dependencyData = dependencyData.call(this);
					}
					
						
					if($.type(dependencyData)=='object'){
						if('abort' in dependencyData){
							let ddata = dependencyData;
							dependencyData = $.Deferred();
							(function(dependencyData){
								ddata.then(function(ajaxReturn){
									dependencyData.resolve(ajaxReturn);
								});
							})(dependencyData);
						}
					}
					if(!($.type(dependencyData)=='object'&&('then' in dependencyData))){
						let ddata = dependencyData;
						dependencyData = $.Deferred();
						dependencyData.resolve(ddata);
					}
						

					getDataRun.push(dependencyData);
				}
				let resolveDeferred = $.when.apply($, getDataRun).then(function(){
					for(let i = 0, l = arguments.length; i < l; i++){
						self.setDataArguments.push(arguments[i]);
					}
				});
				getDataReady.push(resolveDeferred);
			}
			
			$.when.apply($, getDataReady).then(function(){
				self.setDataCall();
				dependenciesReady.resolve();
			});
			
		});
		
		let ready = $.Deferred();
		this.ready = ready.promise();
		
		dependenciesReady.then(function(){
			let domReady = self.render();
			domReady.then(function(){
				ready.resolve();
			});
		});
	}
	domReady(){}
	setData(){}
	getData(){}
	
	template(){
		return this.templateUrlLoaded || this.element.contents();
	}
	
	setDataCall(){
		let r = this.setData.apply( this, this.setDataArguments );
		if(r==false){
			this.noRender = true;
		}
		else if($.type(r)=='object'&&r!==this.data){
			$.extend(this.data,r);
		}
		this.startDataObserver();
	}
	
	startDataObserver(){		
		this.dataBinder = new jstack.dataBinder(this.data,this.element[0],this,this.config.noscope);
		this.data = this.dataBinder.model;
		this.dataBinder.eventListener();
	}
	
	render(){
		let domReady = $.Deferred();
		
		if(this.noRender){
			domReady.resolve();
			return domReady;
		}
		
		let self = this;
		let $el = this.element;
		
		let template = typeof(this.template)=='function'?this.template():this.template;
		
		let html;
		if(typeof(template)=='string'){
			html = this.dataBinder.compileHTML(template);
			if(Boolean($el[0].getAttribute('j-view-append'))){
				$el.append( html );
			}
			else{
				$el.html( html );
			}
		}
		else{
			html = template;
			html.each(function(){
				self.dataBinder.compile(this);
			});
		}
		jstack.triggerLoaded($el);

		$.when.apply($,this.dataBinder.waiters).then(function(){
		
			self.dataBinder.launchModelObserver();
			self.domReady();
			domReady.resolve();
			
		});
		
		return domReady;
	}
	
	reload(){
		
	}
	
	static factory(componentClass, element, options, config){		
		let newInstance = function(className){
			return new className(element,options,config);
		};
		
		let component;
		switch(typeof(componentClass)){
			case 'string':
				let componentUrl = jstack.config.controllersPath+componentClass+'.js';
				componentClass = requirejs(componentUrl);
			case 'function':
				if(!(componentClass.prototype instanceof jstack.Component)){ //light component syntax
					let lightComponent = componentClass;
					componentClass = class extends jstack.Component{
						domReady(){
							lightComponent(this.element,this.options);
						}
					};
				}
				component = newInstance(componentClass);
			break;
			case 'object':
				component = newInstance(jstack.Component);
				$.extend(component, componentClass);
			break;
		}
		
		return component;
	}
	
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
		//arg = JSON.parse(JSON.stringify(arg));
		if(typeof(arg)=='object'&&arg!==null){
			arg = $.extend(true,{},arg);
		}
		args.push(arg);
	}
	return args;
};
jstack.log = function(){
	
	console.log((new Error()).stack.split('\n')[1]);
	
	var args = jstack.flatObservable.apply(jstack,arguments);
	console.log.apply(console,args);
};

jstack.randomColor = function(){
    //var letters = '0123456789ABCDEF';
    //var color = '#';
    //for (var i = 0; i < 6; i++ ) {
        //color += letters[Math.floor(Math.random() * 16)];
    //}
    //return color;
    return '#'+Math.random().toString(16).substr(2,6);
};
(function(){

var re = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
jstack.isMobile = function(userAgent){
	if(!userAgent) userAgent = navigator.userAgent;
	return re.test()
};

})();
jstack.dot = function(){
	if(arguments.length<=2){
		return jstack.dotGet.apply(this,arguments);
	}
	else{
		return jstack.dotSet.apply(this,arguments);
	}
};
jstack.dotGet = function(data,key){
	if(typeof(data)!='object'||data===null){
		return;
	}
	return key.split('.').reduce(function(obj,i){
		if(typeof(obj)=='object'&&obj!==null){
			return typeof(obj[i])!='undefined'?obj[i]:undefined;
		}
		else{
			return undefined;
		}
	}, data);
};
jstack.dotSet = function(data,key,value,isDefault,setterCallback){
	if(typeof(data)!='object'||data===null){
		return;
	}
	key.split('.').reduce(function(obj,k,index,array){
		if(array.length==index+1){
			if(isDefault){
				if(typeof(obj[k])==='undefined'){
					if(setterCallback){
						setterCallback(obj,k,value);
					}
					else{
						obj[k] = value;
						value = obj[k];
					}
				}
				else{
					value = obj[k];
				}
			}
			else{
				if(setterCallback){
					setterCallback(obj,k,value);
				}
				else{
					obj[k] = value;
				}
			}
		}
		else{
			if(typeof(obj[k])!='object'||obj[k]===null){
				if(setterCallback){
					setterCallback(obj,k,{});
				}
				else{
					obj[k] = {};
				}
			}
			return obj[k];
		}
	}, data);
	return value;
};
jstack.dotDel = function(data,key,value){
	if(typeof(data)!='object'||data===null){
		return;
	}
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
};

jstack.camelCase = function(str){
	return str.replace(/([A-Z])/g, function($1){ return "-" + $1.toLowerCase(); });
};
jstack.snakeCase = function(str){
	return str.replace( /([A-Z])/g, function( $1 ) {return "-" + $1.toLowerCase();} );
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


if(!String.prototype.trim){

	Object.defineProperty(String.prototype, 'trim', {
		value: function( charlist ) {
			return trim( this, charlist );
		},
		enumerable:false,
		writable: true,
	});
	
}

if(!String.prototype.ltrim){
	Object.defineProperty(String.prototype, 'ltrim', {
		value: function( charlist ) {
			return ltrim( this, charlist );
		},
		enumerable: false
	});
}
if(!String.prototype.rtrim){
	Object.defineProperty(String.prototype, 'rtrim', {
		value: function( charlist ) {
			return rtrim( this, charlist );
		},
		enumerable: false,
		writable: true,
	});
}

if(!String.prototype.escapeRegExp){
	Object.defineProperty(String.prototype, 'escapeRegExp', {
		value: function() {
			//return this.replace( /([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1" );
			return this.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		},
		enumerable: false,
		writable: true,
	});
}
if(!String.prototype.replaceAllRegExp){
	Object.defineProperty(String.prototype, 'replaceAllRegExp', {
		value: function(find, replace){
			return this.replace( new RegExp( find, "g" ), replace );
		},
		enumerable: false,
		writable: true,
	});
}
if(!String.prototype.replaceAll){
	Object.defineProperty(String.prototype, 'replaceAll', {
		value: function(find, replace){
		find = find.escapeRegExp();
			return this.replaceAllRegExp(find, replace);
		},
		enumerable: false,
		writable: true,
	});
}
if(!String.prototype.camelCase){
	Object.defineProperty(String.prototype, 'camelCase', {
		value: function() {
			return this.replace( /(\_[a-z])/g, function( $1 ) {return $1.toUpperCase().replace( "_", "" );} );
		},
		enumerable: false,
		writable: true,
	});
}
if(!String.prototype.camelCaseDash){
	Object.defineProperty(String.prototype, 'camelCaseDash', {
		value: function() {
			return this.replace( /(\-[a-z])/g, function( $1 ) {return $1.toUpperCase().replace( "-", "" );} );
		},
		enumerable: false,
		writable: true,
	});
}


if(!String.prototype.snakeCase){
	Object.defineProperty(String.prototype, 'snakeCase', {
		value: function() {
			return this.replace( /([A-Z])/g, function( $1 ) {return "_" + $1.toLowerCase();} );
		},
		enumerable: false,
		writable: true,
	});
}

if(!String.prototype.snakeCaseDash){
	Object.defineProperty(String.prototype, 'snakeCaseDash', {
		value: function() {
			return this.replace( /([A-Z])/g, function( $1 ) {return "-" + $1.toLowerCase();} );
		},
		enumerable: false,
		writable: true,
	});
}
if(!String.prototype.ucfirst){
	Object.defineProperty(String.prototype, 'ucfirst',{
		value: function(){
			return this.charAt( 0 ).toUpperCase() + this.substr( 1 );
		},
		enumerable: false,
		writable: true,
	});
}

if(!String.prototype.lcfirst){
	Object.defineProperty(String.prototype, 'lcfirst', {
		value: function() {
			return this.charAt( 0 ).toLowerCase() + this.substr( 1 );
		},
		enumerable: false,
		writable: true,
	});
}


})();

if(!Object.prototype.observable){
	Object.defineProperty(Object.prototype, 'observable', {
		value: function(options){
			return jstack.observable(this,options);
		},
		enumerable: false,
		writable: true,
	});
}
if(!Object.prototype.observe){
	Object.defineProperty(Object.prototype, 'observe', {
		value: function(key,callback,namespace,recursive){
			return jstack.observe(this,key,callback,namespace,recursive);
		},
		enumerable: false,
		writable: true,
	});
}
if(!Object.prototype.unobserve){
	Object.defineProperty(Object.prototype, 'unobserve', {
		value: function(key,callback,namespace,recursive){
			return jstack.unobserve(this,key,callback,namespace,recursive);
		},
		enumerable: false,
		writable: true,
	});
}
if(!Object.prototype.each){
	Object.defineProperty(Object.prototype, 'each', {
		value: function(callback){
			let o = this;
			Object.keys(this).map(function(k){
				callback(o[k],k,o);
			});
			return this;
		},
		enumerable: false,
		writable: true,
	});
}

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
jstack.traverseDomBreak = {
	DESC:2,
	ASC:4,
	ADJ:8,
	BOTH:6,
	ALL:14,
};
jstack.traverseDom = function(node, func, asc, wholeRest){
	let result;
	if(!asc){
		result = func(node);
	}
	if(asc || ! (result&jstack.traverseDomBreak.DESC) ){
		let children = Object.values(node.childNodes);
		if(!wholeRest){
			wholeRest = children;
		}
		while(children.length){
			let adjResult = this.traverseDom(children.shift(), func, undefined, wholeRest);
			if(adjResult&jstack.traverseDomBreak.ASC){
				result = result|adjResult;
			}
			if(adjResult&jstack.traverseDomBreak.ADJ){
				break;
			}
		}
	}
	if(asc && !(result&jstack.traverseDomBreak.ASC) ){
		result = func(node, children, wholeRest);
	}
	return result;
};

var walkTheDOM = function(node, func, nocache){
	if(func(node)===false){
		return false;
	}
	
	let children;
	let childNodes = node.childNodes;
	if(nocache){
		children = childNodes;
	}
	else{
		children = [];
		for(let i = 0, l = childNodes.length; i<l ;i++){
			children.push(childNodes[i]);
		}
	}
	
	children.forEach(function(n){
		walkTheDOM(n, func, nocache);
	});
};

jstack.walkTheDOM = walkTheDOM;

jstack.copyAttributes = function(from,to){
	for(let i = 0, attrs = from.attributes, l = attrs.length; i < l; i++) {
		let attr = attrs[i];
		to.setAttribute(attr.name,attr.value);
	}
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
	if(this.length>1){
		return this.each(function(){
			$(this).requiredId();
		});
	}
	var id = this[0].id;
	if(!id){
		id = jstack.uniqid('uid-');
		this[0].setAttribute('id', id);
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
	
	if(isSelect2){
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
		if(config.push){
			var v = input.val();
			if(v===null){
				v = [];
			}
			if(typeof(v)!='object'){
				v = [v];
			}
			if(v.indexOf(value)===-1){
				v.push(value);
			}
			setValue(input,value);
		}
		else{
			setValue(input,value);
		}
		if(!config.preventValEvent){
			//console.log(input,value);
			input.trigger('change');
		}
		return;
	}
	
	var found = false;
	var optFirstTagName = 'option';
	input.children().each(function(i){
		var opt = $(this);
		if(this.tagName.toLowerCase()=='option'){
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
			if(opt[0].getAttribute('value') == value) {
				opt[0].setAttribute('selected', 'selected');
				found = true;
			}
			else{
				if(!config.push){
					opt[0].removeAttribute('selected');
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
	
};

$.fn.populateInput = function( value, config ) {
	if(typeof(value)=='undefined'||value===null){
		value = '';
	}
	config = $.extend({
		addMissing: this[0].hasAttribute('j-add-missing'),
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
		var nodeName = this.tagName.toLowerCase();
		if (nodeName =='select' || nodeName == 'j-select' ) {
			if ( value instanceof Array ) {
				if(this.getAttribute('name').substr(-2)=='[]'||this.hasAttribute('multiple')){
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
		else if ( input[0].tagName.toLowerCase()=="textarea" ) {
			setValue(input, value);
		}
		else {
			switch ( input[0].getAttribute( "type" ) ){
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
					if ( input.length ) {
						input.each(function(){
							$(this).prop("checked",this.value==value);
						});
					}
				break;
				case "checkbox":
					if ( input.length > 1 ) {
						$.each( input, function( index ) {
							var elemValue = this.value;
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
						if ( value ) {
							input.prop( "checked", true );
						}
						else {
							input.prop( "checked", false );
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
		if(this.tagName.toLowerCase()=='form'){
			$(this).populateForm(value, config);
		}
		else{
			$(this).populateInput(value, config);
		}
	});
};
$.fn.populateReset = function(){
	return this.each(function(){
		if(this.tagName.toLowerCase()=='form'){
			$(this).find(':input[name]').populateReset();
		}
		else{
			var el = $(this);
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
/**
 * jQuery serializeObject
 * @copyright 2014, macek <paulmacek@gmail.com>
 * @link https://github.com/macek/jquery-serialize-object
 * @license BSD
 * @version 2.5.0
 * @patched by surikat
 */
 
(function(){

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


var patterns = {
	validate: /^[a-z_][a-z0-9_]*(?:\[(?:\d*|[a-z0-9_]+)\])*$/i,
	key:			/[a-z0-9_]+|(?=\[\])/gi,
	push:		 /^$/,
	//fixed:		/^\d+$/, //surikat
	named:		/^[a-z0-9_]+$/i
};

function FormSerializer(helper, $form) {

	// private variables
	var data		 = {},
			pushes	 = {};

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
	$.fn.serializeJSON	 = FormSerializer.serializeJSON;
}
	
})();

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
$.fn.findComments = function(tag){
	var arr = [];
	this.each(function(){
		for(var i = 0; i < this.childNodes.length; i++) {
			var node = this.childNodes[i];
			if(node.nodeType === Node.COMMENT_NODE && (!tag || node.nodeValue.split(' ')[0]==tag)){
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
	this.each(function(){
		for(var i = 0; i < this.childNodes.length; i++) {
			var node = this.childNodes[i];
			if(node.nodeType === Node.COMMENT_NODE && node.nodeValue.split(' ')[0]==tag){
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
	this.each(function(){
		var endTag = '/'+this.nodeValue.split(' ')[0];
		var n = this.nextSibling;
		while(n && (n.nodeType!==Node.COMMENT_NODE || n.nodeValue!=endTag) ){
			arr.push(n);
			n = n.nextSibling;
		}
	});
	return $(arr);
};

$.fn.parentComment = function(tag){
	var a = [];
	n = this[0].previousSibling;
	while(n){
		if(n.nodeType===Node.COMMENT_NODE&&n.nodeValue.split(' ')[0]===tag){
			a.push(n);
			break;
		}
		n = n.previousSibling;
	}
	return $(a);
};

$.fn.parentsComment = function(tag){
	var a = [];
	n = this[0].previousSibling;
	while(n){
		if(n.nodeType===Node.COMMENT_NODE&&n.nodeValue.split(' ')[0]===tag){
			a.push(n);
			n = n.parentNode;
		}
		if(n){
			n = n.previousSibling;
		}
	}
	return $(a);
};


$.fn.dataComment = function(){
  
	if(arguments.length>1||$.type(arguments[0])=='object'){
		var setData;
		if(arguments.length>1){
			setData = {};
			setData[arguments[0]] =	arguments[1];
		}
		else{
			setData = arguments[0];
		}
		return this.each(function(){
			var data = $(this).dataComment();
			$.extend(data,setData);
		});
	}
	
	var el = this[0];

	if(!el.__jstackData){
		el.__jstackData = {};
	}
	let data = el.__jstackData;

	if(arguments.length){
		data = data[arguments[0]];
	}
	return data;
};

$.fn.jData = function(key){
	if(this.length>1){
		let a = [];
		this.each(function(){
			a.push( $.fn.jData.call( $(this), key ) );
		});
		return a;
	}
	else{
		let el = this[0];
		let data = {};
		this.attrStartsWith('j-data-').each(function(v,k){
			$.attrsToObject( k.substr(7), v, data );
		});
		if(key){
			data = jstack.dotGet(data,key);
		}
		return data;
	}
};

$.xhrPool = [];
$.xhrPool.abortAll = function(namespace){
	$(this).each(function(i, jqXHR){
		if(namespace===true||namespace==jqXHR.jstackNS){
			jqXHR.abort();
			$.xhrPool.splice(i, 1);
		}
	});
};
$(document).ajaxSend(function(e,jqXHR){
	$.xhrPool.push(jqXHR);
});
$(document).ajaxComplete(function(e,jqXHR){
	var i = $.xhrPool.indexOf(jqXHR);
	if (i > -1) $.xhrPool.splice(i, 1);
});
$.ajaxPrefilter(function(options, originalOptions, jqXHR){
	jqXHR.jstackNS = options.namespace || jstack.ajaxNamespace;
});
//inspired from https://gist.github.com/infostreams/6540654
$.fn.onFirst = function(which, handler) {
      // ensures a handler is run before any other registered handlers, 
      // independent of the order in which they were bound
      var $el = $(this);
      $el.off(which, handler);
      $el.on(which, handler);

      var events = $._data($el[0]).events;
      var registered = events[which];
      registered.unshift(registered.pop());

      events[which] = registered;
};

//inspired from from https://github.com/nickyleach/jQuery.bindLast
$.fn.onLast = function(event, cbFunc){
	return this.each(function(){
		var highIndex = 1000000;
		var eventData = event.split('.');
		var eventName = eventData[0];
		
		$(this).on(event, cbFunc);
		
		var events = $._data(this,'events'),
			ourIndex = false,
			usedIndicies = {};
		
		$.each(events[eventName], function(index, func){
			if(func === cbFunc){
				ourIndex = index;
			}
			
			usedIndicies[index] = 1;
		});
		
		if(ourIndex !== false){
			while(usedIndicies[highIndex] == 1){
				highIndex++;
			}
			
			events[eventName][highIndex] = events[eventName][ourIndex];
			delete events[eventName][ourIndex];
		}
	});
};
$.fn.selectRange = function(start, end) {
    if(end === undefined) {
        end = start;
    }
    return this.each(function() {
        if('selectionStart' in this) {
            this.selectionStart = start;
            this.selectionEnd = end;
        } else if(this.setSelectionRange) {
            this.setSelectionRange(start, end);
        } else if(this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    });
};

$.fn.serializeForm = function(){
	let data = {};
	this.find(':input[name]').each(function(){
		let key = jstack.dataBinder.getScopedInput(this);
		let val = jstack.dataBinder.getInputVal(this);
		jstack.dotSet(data,key,val);
	});
	return data;
};

(function(){
	let templates = {};
	let requests = {};
	let registerTemplate = function(id, html){
		templates[id] = html;
	};
	let getTemplate = function( templatePath, absolute ) {
		if(!absolute){
			templatePath = jstack.config.templatesPath+templatePath;
		}
		if(templates[ templatePath ]){
			if ( !requests[ templatePath ] ) {
				requests[ templatePath ] = $.Deferred().resolve(templates[ templatePath ]);
			}
		}
		else if ( !requests[ templatePath ] ) {
			var url = templatePath;
			if ( jstack.config.debug ) {
				var ts = ( new Date().getTime() ).toString();
				if ( url.indexOf( "_t=" ) === -1 )
					url += ( url.indexOf( "?" ) < 0 ? "?" : "&" ) + "_t=" + ts;
			}
			requests[ templatePath ] = $.Deferred();
			$.ajax({
				url:url,
				cache:true,
			}).then(function(html){
				registerTemplate(templatePath, html);
				requests[ templatePath ].resolve( html, templatePath );				
			});
		}
		return requests[ templatePath ].promise();
	};
	jstack.templates = templates;
	jstack.registerTemplate = registerTemplate;
	jstack.getTemplate = getTemplate;
})();

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

	Route.prototype.run = function( params, hash ) {
		$(document).trigger('j:route:unload');
		var path = params.shift();
		for ( var i = 0, c = this.fns.length; i < c; i++ ) {
			var defer = this.fns[ i ].call( this, path, params, hash );
			if($.type(defer)=='object'&&'then' in defer){
				defer.then(function(){
					$(document).trigger('j:route:loaded',[path, params, hash]);
				});
			}
			else{
				$(document).trigger('j:route:loaded',[path, params, hash]);
			}
		}
	};

	Route.prototype.match = function( path, params ) {
		var m = this.regex.exec( path );

		if ( !m ) return false;
		
		params.push(path);
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
		
		
		if(routie.singleHandler){
			map[ path ].fns = [];
		}
		
		
		map[ path ].addHandler( fn );
		
	};

	var routie = function( path, fn, options ) {		
		if ( typeof fn == "function" ) {
			addHandler( path, fn );
		} else if ( typeof path == "object" ) {
			for ( var p in path ) {
				addHandler( p, path[ p ] );
			}
		} else if ( typeof fn === "undefined" ) {
			routie.navigate( path );
		} else if ( typeof fn === "object" ) {
			options.queryParams = fn;
			routie.navigate( path, options );
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
		
		let params = {};
		if ( options.extendParams ) {
			$.extend( params, getParams() );
		}
		$.extend( params, url.getParams( path ) );
		if( options.queryParams ){
			$.extend( params, options.queryParams );
		}
		var query = url.buildQuery( params );
		if ( query )
			query = "?" + query;
			
		path = url.getPath( path );
		path += query;
		
		//setTimeout( function() {
		
		if(options.replaceState){
			path = w.location.href.split("#")[0]+'#'+path;
			history.replaceState(null, null, path);
		}
		else{
			w.location.hash = path;
		}
		
		//}, 1);
	};

	var getHash2 = function() {
		var h2 = "";
		//var h = w.location.hash.substring( 1 );
		var h = hashLocation.substring( 1 );
		var i = h.indexOf( "#" );
		if ( i !== -1 ) {
			h2 = h.substr( i + 1 );
		}
		return h2;
	};
	var getHash = function() {
		//var h = w.location.hash.substring( 1 );
		var h = hashLocation.substring( 1 );
		var i = h.indexOf( "#" );
		if ( i !== -1 ) {
			h = h.substr( 0, i );
		}
		return h;
	};

	var checkRoute = function( hashPath, route, hash ) {
		var params = [];
		if ( route.match( hashPath, params ) ) {
			route.run( params, hash );
			return true;
		}
		return false;
	};

	var hashLoad = function( hash ) {
		var hashPath = routie.getPath(hash);
		for ( var i = 0, c = routes.length; i < c; i++ ) {
			var route = routes[ i ];
			if ( checkRoute( hashPath, route, hash ) ) {
				return;
			}
		}
	};
	routie.load = hashLoad;

	var currentHash;
	var hashLocation = w.location.hash;
	var hashChanged = function(e) {
		hashLocation = e ? e.newURL.substr(e.newURL.indexOf('#')):w.location.hash;
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
		var href = this.getAttribute('href');
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
	
	routie.singleHandler = true;

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

(function(){
const loadRoute = function($el,route){
	//route.children.each(function(){
		
	//});
	
	let component = route.component;
	
	if(typeof component == 'object' && component.__esModule){
		component = component.default;
	}
	
	jstack.registerComponent(route.path, component);
	
	jstack.route(route.path, function(path, params, hash){
		return jstack.load( $('<div/>').appendTo($el), {
			component:component,
			route:{
				path: jstack.url.getPath(path),
				hash: hash,
				params: params,
			},
			clear: $el[0],
		} );
		
	});
};

const Router = function(config){
	
	let $el = $(config.el);
	let routes  = config.routes;
	
	if(routes instanceof Array){
		routes.forEach(function(route){
			loadRoute($el,route);
		});
	}
	else{
		routes.each(function(component,path){
			loadRoute($el,{
				path:path,
				component:component,
			});
		});
	}
	
	this.run = function(){
		jstack.route.start();
	};
};

jstack.Router = Router;

})();

jstack.routeComponent = function(path,component){
	return jstack.route(path,function(path,params,hash){
		let container = $('[j-app]');
		container.empty();
		return jstack.load($('<div/>').appendTo(container),{
			component:component,
			hash:hash,
		});
	});
};

const inputPseudoNodeNamesExtended = {input:1 ,select:1, textarea:1, button:1, 'j-input':1, 'j-select':1};
const inputPseudoNodeNames = {input:1 ,select:1, textarea:1};

class dataBinder {
	
	constructor(model,view,controller,noscope){
		this.build(model,view,controller,noscope);
	}
	
	build(model,view,controller,noscope){
		let self = this;
		
		this.noscope = noscope;
		if(!noscope){
			model = model.observable({
				factoryProxy: function(obj){
					jstack.modelObservable(obj,self);
					return obj;
				},
			});	
		}
		
		this.model = model;
		this.view = view;
		this.controller = controller;
		
		this.updateDeferQueued = false;
		this.updateDeferInProgress = false;
		this.updateDeferStateObserver = $.Deferred();
		
		this.watchers = new WeakMap();
		
		this.waiters = [];
	}
	
	waitFor(promise){
		this.waiters.push(promise);
	}
	
	launchModelObserver(){
		if(!this.noscope){
			let self = this;
			this.model.observe(function(change){
				//console.log('j:model:update',change);
				self.update();
			},'jstack.model',true);
		}
	}
	
	ready(callback){
		if(this.updateDeferInProgress){
			this.updateDeferStateObserver.then(callback);
		}
		else{
			callback();
		}
	}
	getValue(el,expression,defaultValue){
		let key = '';

		let ns = dataBinder.getClosestFormNamespace(el.parentNode);
		if(ns){
			key += ns+'.';
		}

		key += expression;

		let value = jstack.dotGet(this.model,key);
		return typeof(value)!='undefined'?value:defaultValue;
	}
	static getValueEval(el,expression,scope){

		if(typeof(expression)=='undefined'){
			expression = 'undefined';
		}
		else if(expression===null){
			expression = 'null';
		}
		else if(expression.trim()==''){
			expression = '';
		}
		
		let params = Object.keys(scope);
		let args = Object.values(scope);
		
		params.push("return "+expression+";");

		let value;
		try{
			let func = Function.apply(null,params);
			value = func.apply(el,args);
		}
		catch(jstackException){
			if(jstack.config.debug){
				let warn = [jstackException.message, ", expression: "+expression, "element", el];
				if(el.nodeType==Node.COMMENT_NODE){
					warn.push($(el).parent().get());
					warn.push(scope);
				}
				console.warn.apply(console,warn);
			}
		}
		
		return typeof(value)=='undefined'?'':value;
	}
	inputToModel(el,eventType,triggeredValue){
		let self = this;
		
		let name = el.getAttribute('name');

		let value;
		if(typeof(triggeredValue)!=='undefined'){
			value = triggeredValue;
		}
		else{
			value = dataBinder.getInputVal(el);
		}
		
		let filteredValue = this.filter(el,value);

		if(typeof(filteredValue)=='object'&&filteredValue!==null&&typeof(filteredValue.promise)=='function'){
			filteredValue.then(function(val){
				filteredValue = val;
				self.performInputToModel(el,value,filteredValue,eventType);
			});
		}
		else{
			self.performInputToModel(el,value,filteredValue,eventType);
		}

	}
	performInputToModel(el,value,filteredValue,eventType){
		let self = this;
		let data = this.model;
		let input = $(el);
		let key = dataBinder.getScopedInput(el);
		if(filteredValue!=value){
			value = filteredValue;
			input.populateInput(value,{preventValEvent:true});
		}
		
		let oldValue = jstack.dotGet(data,key);
		
		//value = jstack.dotSet(data,key,value);
		let setterCallback = function(target,k,v){
			let oldValue = target[k];
			target[k] = v;
			target.modelTrigger({
				type:'set',
				target:target,
				key:k,
				oldValue:oldValue,
				value:value,
			});
		};
		value = jstack.dotSet(data,key,value,false,setterCallback);
		
		input.trigger('j:input:model',[value]);
		
		self.ready(function(){
		
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
		
		});

	}
	
	addWatcher(el,render){
		let w = this.watchers;
		let watchers = w.get(el);
		if(!watchers){
			watchers = [];
			w.set(el,watchers);
		}
		watchers.push(render);
	}
	runWatchers(){
		let self = this;
		let w = this.watchers;
		
		//let now = new Date().getTime();
		//console.log('runWatchers START');
		//let c = 0;
		
		jstack.walkTheDOM( this.view, function(n){
			let watchers = w.get(n);
			if(watchers){
				for(let i = 0, l = watchers.length; i < l; i++){
					watchers[i]();
					//c++;
				}
			}
		},true);
		
		//console.log('runWatchers END',c,(((new Date().getTime())-now)/1000)+'s');
	}

	update(){
		let self = this;
		if(this.updateDeferQueued){
			//console.log('update updateDeferQueued');
			return;
		}
		if(this.updateDeferInProgress){
			//console.log('update updateDeferInProgress');
			this.updateDeferQueued = true;
			self.updateDeferStateObserver.then(function(){
				self.update();
			});
		}
		else{
			//console.log('update setTimeout');
			this.updateDeferInProgress = true;
			setTimeout(function(){
				self.updateDeferQueued = false;
				//console.log('update perform');
				self.runWatchers();
				self.updateDeferInProgress = false;
				let defer = self.updateDeferStateObserver;
				self.updateDeferStateObserver = $.Deferred();
				defer.resolve();
				self.updateDeferQueued = false;
			},10);
			
		}
	}

	eventListener(){
		let self = this;		
		$(this.view).on('input change j:update', ':input[name]', function(e,value){
			
			e.stopPropagation();
			
			if(this.type=='file') return;
			let el = this;
			
			self.inputToModel(el,e.type,value);
			
		});
		
	}
	
	compile(el){
		this.compileDom(el, this.model);
	}
	
	compileHTML(html){
		
		let dom = $('<html><rootnode>'+html+'</rootnode></html>').get(0);
		
		
		this.compileDom(dom, this.model);

		return dom.childNodes;
	}
	
	compileDom(dom,scope){
		
		let self = this;
		
		jstack.walkTheDOM(dom,function(n){
			let breaker;
			if(n.nodeType === Node.ELEMENT_NODE){
				jstack.dataBindingElementCompiler.every(function(compiler){
					if(compiler.match(n)){
						breaker = compiler.callback(n,self,scope);
					}
					return breaker!==false;
				});
			}
			else if(n.nodeType === Node.TEXT_NODE && n instanceof Text){
				jstack.dataBindingTextCompiler.every(function(compiler){
					if(compiler.match(n)){
						breaker = compiler.callback(n,self,scope);
					}
					return breaker!==false;
				});
			}
			return breaker;
		});
			
	}
	
	filter(el,value){
		let filter = this.getFilter(el);
		if(typeof(filter)=='function'){
			value = filter(value);
		}
		return value;
	}
	getFilter(el){
		let $el = $(el);
		let filter = $el.data('j-filter');
		if(!filter){
			let attrFilter = el.getAttribute('j-filter');
			if(attrFilter){
				let method = this.getValue(el,attrFilter);
				$el.data('j-filter',method);
			}
		}
		return filter;
	}
	compilerAttrRender(el,tokens,scope){
		let r = '';
		for(let i = 0, l = tokens.length; i<l; i++){
			let token = tokens[i];
			if(token.substr(0,2)=='{{'){
				token = token.substr(2,token.length-4);
				
				let freeze = false;
				if(token.substr(0,2)=='::'){
					token = token.substr(2);
					freeze = true;
				}
				
				token = dataBinder.getValueEval(el,token,scope);
			}
			r += typeof(token)!=='undefined'&&token!==null?token:'';
		}
		return r;
	}
	static textTokenizer(text){
		let tagRE = /\{\{((?:.|\n)+?)\}\}/g;
		if (!tagRE.test(text)) {
			return false;
		}
		let tokens = [];
		let lastIndex = tagRE.lastIndex = 0;
		let match, index;
		while ((match = tagRE.exec(text))) {
			index = match.index;
			// push text token
			if (index > lastIndex) {
				tokens.push(text.slice(lastIndex, index));
			}
			// tag token
			let exp = match[1].trim();
			tokens.push("{{" + exp + "}}");
			lastIndex = index + match[0].length;
		}
		if (lastIndex < text.length) {
			tokens.push(text.slice(lastIndex));
		}
		return tokens;
	}
	static getKey(key){
		return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" ).replace(/\[\]/g, '.');
	}
	static getClosestFormNamespace(p){
		while(p){
			if(p.tagName&&p.tagName.toLowerCase()=='form'){
				if(p.hasAttribute('j-name')){
					return p.getAttribute('j-name');
				}
				break;
			}
			p = p.parentNode;
		}
	}
	static getScopedInput(input){
		let name = input.getAttribute('name');
		let key = dataBinder.getKey(name);
		if(key.substr(-1)=='.'&&input.type=='checkbox'){
			let index;
			$(input).closest('form').find(':checkbox[name="'+name+'"]').each(function(i){
				if(this===input){
					index = i;
					return false;
				}
			});
			key += index;
		}
		let scopeKey = '';
		let ns = dataBinder.getClosestFormNamespace(input.parentNode);
		if(ns){
			scopeKey += ns+'.';
		}
		scopeKey += key;
		return scopeKey;
	}
	static getInputVal(el){
		let nodeName = el.tagName.toLowerCase();
		switch(nodeName){
			case 'input':
				switch(el.type){
					case 'checkbox':
						let $el = $(el);
						return $el.prop('checked')?$el.val():'';
					break;
					case 'radio':
						let form;
						let p = el.parentNode;
						while(true){
							if(p.tagName&&p.tagName.toLowerCase()=='form' || !p.parentNode){
								form = p;
								break;
							}
							p = p.parentNode;
						}
						let checked = $(form).find('[name="'+el.getAttribute('name')+'"]:checked');
						return checked.val();
					break;
					case 'file':
						return el.files;
					break;
					case 'submit':
					break;
					default:
						return $(el).val();
					break;
				}
			break;
			case 'textarea':
			case 'select':
				return $(el).val();
			break;
			case 'j-select':
				el = $(el);
				let multiple = el[0].hasAttribute('multiple');
				let data = el.data('preselect');
				if(!data){
					if(multiple){
						data = [];
					}
					el.children().each(function(){
						if(this.hasAttribute('selected')){
							let val = this.value;
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
			break;
			default:
				return $(el).html();
			break;
		}
	}
}


jstack.dataBinder = dataBinder;


jstack.dataBindingElementCompiler = [];
jstack.dataBindingTextCompiler = [];

$(document.body).on('reset','form',function(){
	$(this).populateReset();
});

class modelObserver{
	constructor(o,dataBinder){
		this.o = o;
		this.dataBinder = dataBinder;
		this.keysObservers = {};
		this.observers = [];
	}
	
	modelTrigger(change){
		for(let i=0, l=this.observers.length;i<l;i++){
			this.observers[i](change);
		}
		let observers = this.keysObservers[change.key];
		if(observers){
			for(let i=0, l=observers.length;i<l;i++){
				observers[i](change);
			}
		}
	}
	addObserver(callback,key){
		let observers
		if(typeof(key)=='undefined'||key===false){
			observers = this.observers;
		}
		else{
			if(!this.keysObservers[key]){
				this.keysObservers[key] = [];
			}	
			observers = this.keysObservers[key];
		}
		observers.push(callback);
	}
	removeObserver(callback,key){
		let observers
		if(typeof(key)=='undefined'||key===false){
			observers = this.observers;
		}
		else{
			observers = this.keysObservers[key];
		}
		if(observers){
			for(let i=0, l=observers.length;i<l;i++){
				if(callback===observers[i]){
					observers.splice(i,1);
				}
			}
		}
	}
	
	modelObserve(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		if(args.length){
			for(let i = 0, l = args.length;i<l;i++){
				let arg = args[i];
				if(arg instanceof Array){
					for(let i2 = 0, l2 = arg.length;i2<l2;i2++){
						this.addObserver(callback,arg[i2]);
					}
				}
				else{
					this.addObserver(callback,arg);
				}
			}
		}
		else{
			this.addObserver(callback);
		}
	}
	modelUnobserve(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		if(args.length){
			for(let i = 0, l = args.length;i<l;i++){
				let arg = args[i];
				if(arg instanceof Array){
					for(let i2 = 0, l2 = arg.length;i2<l2;i2++){
						this.removeObserver(callback,arg[i2]);
					}
				}
				else{
					this.removeObserver(callback,arg);
				}
			}
		}
		else{
			this.removeObserver(callback);
		}
	}
	
	modelSet(key,value,callback){
		this.o[key] = value;
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelDelete(key,callback){
		delete this.o[key];
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	
	modelPush(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		Array.prototype.push.apply(this.o,args);
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelUnshift(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		Array.prototype.unshift.apply(this.o,args);
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelSplice(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		Array.prototype.splice.apply(this.o,args);
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelShift(callback){
		this.o.shift();
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelPop(callback){
		this.o.pop();
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	
	modelDot(){
		if(arguments.length<=1){
			jstack.dotGet(this.o,arguments[0]);
		}
		else{
			jstack.dotSet(this.o,arguments[0],arguments[1]);
		}
	}
}

let modelObservable = function(obj,dataBinder){

	//modelObserve
	//modelSet
	//modelPush
	//modelUnshift
	//modelShift
	//modelPop
	//modelSplice
	//modelDelete
	
	if(obj.modelObserve||obj instanceof FileList||obj instanceof File){
		return obj;
	}
	
	let modelObserverObject = new modelObserver(obj,dataBinder);
	
	Object.defineProperty(obj, 'modelObserve', {
		value: function(){
			return modelObserverObject.modelObserve.apply(modelObserverObject,arguments);
		},
		enumerable: false,
		writable: true,
	});
	Object.defineProperty(obj, 'modelTrigger', {
		value: function(){
			return modelObserverObject.modelTrigger.apply(modelObserverObject,arguments);
		},
		enumerable: false,
		writable: true,
	});
	Object.defineProperty(obj, 'modelSet', {
		value: function(){
			return modelObserverObject.modelSet.apply(modelObserverObject,arguments);
		},
		enumerable: false,
		writable: true,
	});
	Object.defineProperty(obj, 'modelDelete', {
		value: function(){
			return modelObserverObject.modelSet.apply(modelObserverObject,arguments);
		},
		enumerable: false,
		writable: true,
	});

	if(Array.isArray(obj)){
		Object.defineProperty(obj, 'modelPush', {
			value: function(){
				return modelObserverObject.modelPush.apply(modelObserverObject,arguments);
			},
			enumerable: false,
			writable: true,
		});
		Object.defineProperty(obj, 'modelUnshift', {
			value: function(){
				return modelObserverObject.modelUnshift.apply(modelObserverObject,arguments);
			},
			enumerable: false,
			writable: true,
		});
		Object.defineProperty(obj, 'modelPop', {
			value: function(){
				return modelObserverObject.modelPop.apply(modelObserverObject,arguments);
			},
			enumerable: false,
			writable: true,
		});
		Object.defineProperty(obj, 'modelShift', {
			value: function(){
				return modelObserverObject.modelShift.apply(modelObserverObject,arguments);
			},
			enumerable: false,
			writable: true,
		});
		Object.defineProperty(obj, 'modelSplice', {
			value: function(){
				return modelObserverObject.modelSplice.apply(modelObserverObject,arguments);
			},
			enumerable: false,
			writable: true,
		});
		Object.defineProperty(obj, 'modelDot', {
			value: function(){
				return modelObserverObject.modelDot.apply(modelObserverObject,arguments);
			},
			enumerable: false,
			writable: true,
		});
	}
};

jstack.modelObservable = modelObservable;

const REGEX_FOR_1 = new RegExp('(\\()(.*)(,)(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
const REGEX_FOR_2 = new RegExp('(\\()(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
const REGEX_FOR_3 = new RegExp('(.*)(\\s+)(in)(\\s+)(.*)',["i"]);
	
jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-for');
	},
	callback(el,dataBinder,scope){
		let $this = $(el);
		let jfor = $('<!--j:for-->');
		let jforClose = $('<!--/j:for-->');
		$this.replaceWith(jfor);
		jforClose.insertAfter(jfor);

		let attrFor = el.getAttribute('j-for');
		el.removeAttribute('j-for');
		attrFor = attrFor.trim();
		let index, key, value, myvar;

		let m = REGEX_FOR_1.exec(attrFor);
		if (m != null){
			index = m[2].trim();
			key = m[4].trim();
			value = m[6];
			myvar = m[11].trim();
		}
		else{
			let m = REGEX_FOR_2.exec(attrFor);
			if (m != null){
				key = m[2].trim();
				value = m[4];
				myvar = m[9].trim();
			}
			else{
				let m = REGEX_FOR_3.exec(attrFor);
				if (m != null){
					value = m[1];
					myvar = m[5].trim();
				}
				else{
					throw new Error('Malformed for clause: '+attrFor);
				}
			}
		}

		
		let isTemplate = el.tagName.toLowerCase()=='template';
		
		
		let buildNewRow;
		
		$(el).detach();
		if(isTemplate){
			let content = el.content;
			buildNewRow = function(k, jforClose, scopeExtend){
				let addRow = document.createElement('div');
				addRow.appendChild( document.importNode(content, true) );
				
				jstack.copyAttributes(el,addRow);
				
				let contents = $(addRow).contents();
				
				jforClose.before(contents);
				
				contents.each(function(){
					dataBinder.compileDom( this, scopeExtend );
				});
				
				return addRow;
			};
			
		}
		else{
			buildNewRow = function(k, jforClose, scopeExtend){
				//let addRow = $(document.createElement('div'));
				let addRow = $this.clone();
				addRow.attr('j-for-id',k);
				
				jforClose.before(addRow);
				
				dataBinder.compileDom( addRow[0], scopeExtend );
				
				return addRow;
			};
			
		}
		
		let forStack = {};
		
		let render = function(){
			let data = jstack.dataBinder.getValueEval(jfor[0],myvar,scope);
			
			if(!data){
				forStack.each(function(n){
					n.el.remove();
				});
				return;
			}
			
			let method = data instanceof Array?'forEach':'each';
						
			//add
			let i = 1;
			data[method](function(v,k){
				let scopeExtend = $.extend({},dataBinder.model,scope);
				scopeExtend[value] = v;
				if(key){
					scopeExtend[key] = k;
				}
				if(index){
					scopeExtend[index] = i;
				}
				let row = forStack[k];
				if(typeof(row)==='undefined'){
					forStack[k] = {
						el:buildNewRow(k,jforClose,scopeExtend),
						scope:scopeExtend,
					};
				}
				else if(row.scope[value]!==v){
					row.el.remove(); //remove
					forStack[k] = {
						el:buildNewRow(k,jforClose,scopeExtend),
						scope:scopeExtend,
					};
				}
				else if(index){
					row.scope[index] = i;
				}
				i++;
			});

			//remove
			i = 0;
			forStack.each(function(row,k){
				if(typeof(data[k])==='undefined'){
					delete forStack[k];
					row.el.remove();
				}
				i++;
			});
			
		};
		
		dataBinder.addWatcher(jfor[0],render);
		render();
		
		return false;
		
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-if');
	},
	callback(el,dataBinder,scope){
		let $this = $(el);
		let jif = $('<!--j:if-->');
		$this.before(jif);

		let jelseifEl = $this.nextUntil('[j-if]','[j-else-if]');
		let jelseEl = $this.nextUntil('[j-if]','[j-else]');
		if(el.tagName.toLowerCase()=='template'){
			
			let div = document.createElement('div');
			div.appendChild( document.importNode(el.content, true) );
			$(div).data('j:is:template',true);
			jstack.copyAttributes(el,div);
			
			$this = $(div);
			
			$(el).detach();
			el = div;
		}

		let lastBlock;
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

		let myvar = el.getAttribute('j-if');
		el.removeAttribute('j-if');
		let currentData;
		let getData = function(){
			return Boolean(jstack.dataBinder.getValueEval(jif[0],myvar,scope));
		};

		let getData2;
		let currentData2 = null;
		if(jelseifEl.length){
			let myvar2 = [];
			let newJelseifEl = [];
			jelseifEl.each(function(){
				myvar2.push( this.getAttribute('j-else-if') );
				if(this.tagName.toLowerCase()=='template'){
					
					let div = document.createElement('div');
					div.appendChild( document.importNode(this.content, true) );
					$(div).data('j:is:template',true);
					jstack.copyAttributes(el,div);
					
					newJelseifEl.push(div);
					
					$(this).detach();
				}
				else{
					newJelseifEl.push(this);
				}
				
			});
			jelseifEl = $(newJelseifEl);

			getData2 = function(){
				let data = false;
				for(let i=0, l=myvar2.length;i<l;i++){
					if( Boolean(jstack.dataBinder.getValueEval(jif[0],myvar2[i],scope)) ){
						data = i;
						break;
					}
				}
				return data;
			};
		}

		if(jelseEl.length){
			let newJelseEl = [];
			jelseEl.each(function(){
				if(this.tagName.toLowerCase()=='template'){
					
					let div = document.createElement('div');
					div.appendChild( document.importNode(this.content, true) );
					
					$(div).data('j:is:template',true);
					jstack.copyAttributes(el,div);
					
					newJelseEl.push(div);
					
					$(this).detach();
				}
				else{
					newJelseEl.push(this);
				}
			});
			jelseEl = $(newJelseEl);
		}
		
		let jIfCompiled;
		
		let render = function(){

			let data = getData();
			let data2 = null;
			if(getData2){
				data2 = data?false:getData2();
			}
			if( currentData===data && data2===currentData2 ) return;
			currentData = data;
			currentData2 = data2;

			if(data){
				
				if(!jIfCompiled){
					jIfCompiled = true;
					dataBinder.compileDom( el, scope );
					if($this.data('j:is:template')){
						$this = $this.contents();
					}
				}
				
				$this.insertAfter(jif);
				if(jelseifEl.length){
					jelseifEl.detach();
				}
				if(jelseEl.length){
					jelseEl.detach();
				}
			}
			else{
				$this.detach();

				if(jelseifEl.length){
					if(data2===false){
						jelseifEl.detach();
					}
					else{
						let jelseifElMatch = $(jelseifEl[data2]);
						
						if(!jelseifElMatch.data('j:if:compiled')){
							jelseifElMatch.data('j:if:compiled',true);
							
							dataBinder.compileDom( jelseifElMatch.get(0), scope );
							if(jelseifElMatch.data('j:is:template')){
								jelseifElMatch = jelseifElMatch.contents();
								jelseifEl[data2] = jelseifElMatch;
							}
						}
						
						jelseifElMatch.insertAfter(jif);
					}
				}
				if(jelseEl.length){
					if(data2===false||data2===null){
						
						if(!jelseEl.data('j:is:compiled')){
							jelseEl.data('j:is:compiled', true);
							dataBinder.compileDom( jelseEl.get(0), scope );
							
							if(jelseEl.data('j:is:template')){
								jelseEl = jelseEl.contents();
							}
							
						}
						
						
						jelseEl.insertAfter(jif);
					}
					else{
						jelseEl.detach();
					}
				}
			}
		};
		
		dataBinder.addWatcher(jif[0],render);
		render();
		
		return false;
	},
});


jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-else-if');
	},
	callback(n,dataBinder,scope){
		n.removeAttribute('j-else-if');
		return false;
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-else');
	},
	callback(n,dataBinder,scope){
		n.removeAttribute('j-else');
		return false;
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-switch');
	},
	callback(el,dataBinder,scope){
		let jswitch = $('<!--j:switch-->');
		let $this = $(el);
		
		let myvar = el.getAttribute('j-switch');
		el.removeAttribute('j-switch');

		if(el.tagName.toLowerCase()=='template'){
			$this.before(jswitch);
			$this.after('<!--/j:switch-->');
			let div = document.createElement('div');
			div.appendChild( document.importNode(el.content, true) );
			$(el).detach();
			el = div;
			$this = $(el);
		}
		else{
			$this.append(jswitch);
			$this.append('<!--/j:switch-->');
		}
		
		let registerCase = function(casesStack,n){
			let dom;
			if(n.tagName.toLowerCase()=='template'){
				let div = document.createElement('div');
				div.appendChild( document.importNode(n.content, true) );
				$(n).detach();
				let domContents = $(div).contents();
				dom = domContents.get();
				domContents.each(function(){
					dataBinder.compileDom( this, scope );
				});
			}
			else{
				dom = n;
			}
			casesStack.push({
				val:n.hasAttribute('j-case')?n.getAttribute('j-case'):null,
				dom:dom
			});
		};
		
		let cases = [];
		let casesDefault = [];
		$this.find('[j-case]').each(function(){
			registerCase(cases,this);
		});
		$this.find('[j-case-default]').each(function(){
			registerCase(casesDefault,this);
		});
		
		$this.contents().each(function(){
			dataBinder.compileDom( this, scope );
		});
		
		let currentData;
		let render = function(){
			let data = jstack.dataBinder.getValueEval(el,myvar,scope);
			if(currentData===data) return;
			currentData = data;

			let found = false;
			cases.forEach(function(o){
				let jcase = $(o.dom);
				if(o.val==data){
					jcase.insertAfter(jswitch);
					found = true;
				}
				else{
					jcase.detach();
				}
			});
			casesDefault.forEach(function(o){
				let jcase = $(o.dom);
				if(found){
					jcase.detach();
				}
				else{
					jcase.insertAfter(jswitch);
				}
			});

		};
		
		dataBinder.addWatcher(jswitch[0],render);
		render();
		
		
		return false;
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){
		let tagName = n.tagName.toLowerCase();
		return (tagName=='script'||tagName=='template')&&n.getAttribute('type')=='text/j-template'&&n.id;
	},
	callback(n,dataBinder,scope){
		
		if(n.tagName.toLowerCase()=='template'){
			let elements = document.importNode(n.content, true);
			let div = document.createElement('div');
			for(let i = 0, l = elements.length; i<l; i++){
				div.appendChild(elements[i]);
			}
			jstack.copyAttributes(n,div);
			n = div;
		}
		
		jstack.registerTemplate(n.id,n.innerHTML);
		$(n).remove();
		return false;
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){
		let tagName = n.tagName.toLowerCase();
		return (tagName=='script'||tagName=='template')&&n.getAttribute('type')=='text/j-javascript';
	},
	callback(n,dataBinder,scope){
		let script;
		
		if(n.tagName.toLowerCase()=='template'){
			let childNodes = document.importNode(n.content, true).childNodes;
			script = '';
			for(let i = 0, l = childNodes.length; i<l; i++){
				script += childNodes[i].nodeValue;
			}
		}
		else{
			script = n.innerHTML;
		}
		
		let func = new Function('element',script);
		func.call(scope,n);
		
		$(n).remove();
		
		return false;
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){	
		return n.hasAttribute('j-include');
	},
	callback(n,dataBinder,scope){
		let include = n.getAttribute('j-include');
		n.removeAttribute('j-include');
		
		let tokens = jstack.dataBinder.textTokenizer(include);
		if(tokens!==false){
			include = dataBinder.compilerAttrRender(n,tokens,scope);
		}
		
		let compile = function(){
			$(n).empty();
			let c = $('<html><rootnode>'+jstack.templates[include]+'</rootnode></html>').clone().contents();
			c.appendTo(n);
			dataBinder.compileDom(n,scope);			
		};
		
		if(jstack.templates[include]){
			compile();
		}
		else{
			jstack.getTemplate(include).then(function(html){
				compile();
			});
		}
		
		return false;
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){	
		for(let i = 0, atts = n.attributes, l = atts.length; i < l; i++) {
			if(atts[i].name.substr(0,1) === ':') {
				return true;
			}
		}
	},
	callback(el,dataBinder,scope){
		
		let attrs = {};
		for(let i = 0, atts = el.attributes, l = atts.length; i < l; i++) {
			let att = atts[i];
			if(att.name.substr(0,1) === ':') {
				attrs[att.name] = att.value;
			}
		}
		
		let $this = $(el);
		let attrsVars = {};
		let attrsVarsCurrent = {};
		let propAttrs = ['selected','checked','multiple'];
		attrs.each(function(v,k){
			let tokens = jstack.dataBinder.textTokenizer(v);
			let key = k.substr(1);
			if(tokens===false){
				el.setAttribute(key,v);
			}
			else{
				attrsVars[key] = tokens;
			}
			el.removeAttribute(k);
		});
		let render = function(){
			attrsVars.each(function(v,k){
				let value = dataBinder.compilerAttrRender(el,v,scope);
				if(attrsVarsCurrent[k]===value) return;
				attrsVarsCurrent[k] = value;

				if(propAttrs.indexOf(k)!==-1){
					$this.prop(k,value);
				}
				else if(typeof(value) === "boolean"){
					if(value){
						el.setAttribute(k,k);
					}
					else{
						el.removeAttribute(k);
					}
				}
				else{
					el.setAttribute(k,value);
				}

			});
		};
		
		dataBinder.addWatcher(el,render);
		render();
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-show');
	},
	callback(el,dataBinder,scope){
		let $this = $(el);

		let myvar = el.getAttribute('j-show');
		el.removeAttribute('j-show');
		let currentData;
		let getData = function(){
			return Boolean(jstack.dataBinder.getValueEval(el,myvar,scope));
		};

		let render = function(){
			let data = getData();
			if(currentData===data) return;
			currentData = data;

			if(data){
				$this.show();
			}
			else{
				$this.hide();
			}
		};
		
		dataBinder.addWatcher(el,render);
		render();
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-href');
	},
	callback(n,dataBinder,scope){
		let original = n.getAttribute('j-href');
		n.removeAttribute('j-href');

		let tokens = jstack.dataBinder.textTokenizer(original);
		if(tokens===false){
			n.setAttribute('href',jstack.route.baseLocation + "#" + original);
			return;
		}

		let currentData;
		let getData = function(){
			return dataBinder.compilerAttrRender(n,tokens,scope);
		};
		let render = function(){
			let data = getData();
			if(currentData===data) return;
			currentData = data;
			n.setAttribute('href',jstack.route.baseLocation + "#" + data);
		};
		
		dataBinder.addWatcher(n,render);
		
		render();
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){	
		for(let i = 0, atts = n.attributes, l = atts.length; i < l; i++) {
			if(atts[i].name.substr(0,5) === 'j-on-') {
				return true;
			}
		}
	},
	callback(el,dataBinder,scope){
		let $el = $(el);
		let controller = dataBinder.controller;
		let jOnList = [];
		for(let i = 0, atts = el.attributes, l = atts.length; i < l; i++) {
			let att = atts[i];
			let k = att.name;
			if(k.substr(0,5) === 'j-on-') {
				let v = att.value;
				jOnList.push(k);
				let eventName = k.substr(5);
				$el.on(eventName,function(e){
					let method = controller[v];
					if(!method){
						throw new Error('Call to undefined method "'+v+'" by '+k);
					}
					return method.call(controller,e,this);
				});
			}
		}
		jOnList.forEach(function(k){
			el.removeAttribute(k);
		});
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('name')&&inputPseudoNodeNamesExtended[n.tagName.toLowerCase()]&&n.type!='file';
	},
	callback(el,dataBinder,scope){
		
		let $el = $(el);

		let tagName = el.tagName.toLowerCase();
		if(tagName=='select'||tagName=='j-select'){
			$el.contents().each(function(){
				dataBinder.compileDom(this, scope);
			});
		}
		
		let currentData;

		//default to model					
		let key = jstack.dataBinder.getScopedInput(el);
		let val = jstack.dataBinder.getInputVal(el);
		
		let modelValue = jstack.dotSet(dataBinder.model,key,val,true);
		
		if(!modelValue){
			modelValue = '';
		}
		
		
		//model to default dom value
		if(modelValue!==val){
			let nodeName = el.tagName.toLowerCase();
			if(nodeName=='select'){
				let found;
				$el.find('option').each(function(){
					if(this.hasAttribute('value')){
						if(this.value==modelValue){
							found = true;
							return false;
						}
					}
					else{
						if($(this).text()==modelValue){
							found = true;
							return false;
						}
					}
				});
				if(found){
					$el.populateInput(modelValue,{preventValEvent:true});
				}
				else{
					jstack.dotSet(dataBinder.model,key,val);
				}
			}
			else{
				$el.populateInput(modelValue,{preventValEvent:true});
			}
		}
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('name')&&n.tagName.toLowerCase()=='input'&&n.type=='file';
	},
	callback(el,dataBinder){
		$(el).on('input change', function(e){
			dataBinder.inputToModel(this,e.type);
		});
	}
});

jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('name')&&inputPseudoNodeNamesExtended[n.tagName.toLowerCase()]&&n.type!='file';
	},
	callback(el,dataBinder,scope){
		let $el = $(el);

		let key = jstack.dataBinder.getKey( el.getAttribute('name') );

		let render = function(){
			let data = dataBinder.getValue(el,key);
			if(jstack.dataBinder.getInputVal(el)===data) return;

			if($el.data('j:populate:prevent')) return;
			
			$el.populateInput(data,{preventValEvent:true});
			$el.trigger('j:val',[data]);
		};
		
		dataBinder.addWatcher(el,render);
		render();
	},
});

jstack.dataBindingTextCompiler.push({
	match: function(n){
		return n.textContent;
	},
	callback: function(el,dataBinder,scope){
		let textString = el.textContent.toString();
		let tokens = jstack.dataBinder.textTokenizer(textString);
		if(tokens===false) return;

		let $el = $(el);

		let last = $el;

		for(let i = 0, l = tokens.length; i < l; i++){
			let token = tokens[i];
			
			
			if(token.substr(0,2)!='{{'){
				token = document.createTextNode(token);
				last.after(token);
				last = token;
				continue;
			}
			
			let text = $('<!--j:text-->');
			let textClose = $('<!--/j:text-->');
			text.insertAfter(last);
			textClose.insertAfter(text);
			last = textClose;

			token = token.substr(2,token.length-4);
			
			let freeze = false;
			if(token.substr(0,2)==='::'){
				token = token.substr(2);
				freeze = true;
			}
			
			
			let currentData;
			let render = function(){
				let data = jstack.dataBinder.getValueEval(text[0],token,scope);
				if(currentData===data) return;
				currentData = data;
				text.commentChildren().remove();
				text.after(data);
			};
			
			render();
			if(!freeze){
				dataBinder.addWatcher(text[0],render);
			}
		};
		$el.remove();
	},
});

jstack.dataBindingElementCompiler.push({
	match(n){
		let tagName = n.hasAttribute('is')?n.getAttribute('is'):n.tagName;
		tagName = jstack.snakeCase(tagName);
		return typeof(jstack.__directives[tagName])!=='undefined';
	},
	callback(n,dataBinder,scope){
		
		const tagName = n.hasAttribute('is')?n.getAttribute('is'):n.tagName.toLowerCase();
		
		const attrs = {};
		for(let i = 0, atts = n.attributes, l = atts.length; i < l; i++) {
			let att = atts[i];
			if(att.name.substr(0,7) === 'j-data-') {
				attrs[att.name] = att.value;
			}
		}
		
		const attrsVars = {};
		const attrsVarsCurrent = {};
		attrs.each(function(v,k){
			let tokens = jstack.dataBinder.textTokenizer(v);
			if(tokens===false){
				n.setAttribute(k,v);
			}
			else{
				attrsVars[k] = tokens;
			}
		});
		
		let obj;
		
		const render = function(){
			attrsVars.each(function(v,k){
				let value = dataBinder.compilerAttrRender(n,v,scope);
				if(attrsVarsCurrent[k]===value) return;
				
				attrsVarsCurrent[k] = value;
				n.setAttribute(k,value);
				
				if(obj){
					obj.reload();
				}
			});
		};
		dataBinder.addWatcher(n,render);
		render();
		
		let options = {};
		attrs.each(function(v,k){
			v = (k in attrsVarsCurrent)?attrsVarsCurrent[k]:v;
			$.attrsToObject( k.substr(7), v, options );
		});
		
		let config = {
			data: scope,
		};
		
		obj = jstack.runDirective(n, tagName, options, config);
		
		dataBinder.waitFor(obj.ready);
		
		return false;
		
	},
});

var jstackDirectives = {};

jstack.directive = function(name, className){
	name = jstack.snakeCase(name);
	if(typeof(className)!=='undefined'){
		jstackDirectives[name] = className;
	}
	return jstackDirectives[name];
};

jstack.runDirective = function(el,name,options,config){
	name = jstack.snakeCase(name);
	let componentClass = jstackDirectives[name];
	config.noscope = true;
	return jstack.Component.factory(componentClass, el, options, config);
};
jstack.__directives = jstackDirectives;

(function(){

let onLoadStack = {};

jstack.onLoad = function(selector, callback){
	if(!onLoadStack[selector]){
		onLoadStack[selector] = [];
	}
	onLoadStack[selector].push(callback);
};

jstack.triggerLoaded = function(el){
	onLoadStack.each(function(callbacks,selector){
		$(selector,el).each(function(){
			let self = this;
			callbacks.forEach(function(callback){
				callback.call(self);
			});
		});
	});
};

})();

( function() {
	let hasOwnProperty2 = function(o,k){
		let v = o[k];
		return v!==Object[k]&&v!==Object.__proto__[k]&&v!==Array[k]&&v!==Array.__proto__[k];
	};
	let toParamsPair = function( data ) {
		let pair = [];
		let params = $.param( data ).split( "&" );
		for ( let i = 0; i < params.length; i++ ) {
			let x = params[ i ].split( "=" );
			
			let val;
			if(x[ 1 ] === null){
				val = "";
			}
			else{
				val =  x[ 1 ];
				val =  val.replace(/\+/g, '%20');
				val =  decodeURIComponent( val );
			}
			let key = x[ 0 ];
			key =  key.replace(/\+/g, '%20');
			key =  decodeURIComponent( key );
			
			pair.push( [ key, val ] );
		}
		return pair;
	};


	let recurseFormat = function( o, files, prefix, deepness ) {
		if(!prefix){
			prefix = "";
		}
		if(o instanceof Array){ //cast array of value as object
			let obj = {};
			for( let i = 0; i < o.length; i++ ) {
				obj[i] = o[i];
			}
			return recurseFormat(obj, files, prefix, deepness);
		}
		else if(typeof(o)=='undefined'||o===null){ //cast null and undefined as string
			o = '';
		}
		else if(typeof(o)=='object'){
			let obj = {};
			Object.keys(o).forEach(function(k){
				let key = prefix + k;
				let value = o[k];
				if(value instanceof FileList){ //extract file
					if(value.length==1){
						files[key] = value[0];
					}
					else{
						files[key] = [];
						for(let i = 0; i < value.length; i++){
							files[ key ].push( value[ i ] );
						}
					}
				}
				else{
					obj[k] = recurseFormat(value, files, key + "_", deepness + 1);
				}
			});
			o = obj;
		}
		return o;
	};
	
	jstack.ajaxNamespace = undefined;
	
	jstack.ajax = function() {
		let settings, files = {};
		if ( arguments.length == 2 ) {
			settings = arguments[ 1 ] || {};
			settings.url = arguments[ 0 ];
		} else {
			settings = arguments[ 0 ];
		}
		
		if ( settings.data ) {
			settings.data = recurseFormat( settings.data, files );
		}
		if ( !$.isEmptyObject( files ) ) {
			let haveFiles;
			let fd = new FormData();
			let params = toParamsPair( settings.data );
			for ( let i = 0; i < params.length; i++ ) {
				fd.append( params[ i ][ 0 ], params[ i ][ 1 ] );
			}
			for ( let k in files ) {
				if ( files.hasOwnProperty( k ) ) {
					let file = files[ k ];
					if ( file instanceof Array ) {
						for ( let i = 0; i < file.length; i++ ) {
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
		return $.ajax( settings );
	};

	jstack.post = function( url, data, callback, dataType ) {
		let xhr = jstack.ajax( {
			type: "POST",
			url: url,
			data: data,
			dataType: dataType
		} );
		if(typeof(callback)=='function'){
			xhr.then(callback);
		}
		return xhr;
	};

} )();

(function(){

let getViewReady = function(el){
	el = $(el);
	let ready = el.data('jViewReady');
	if(!ready){
		ready = $.Deferred();
		el.data('jViewReady',ready);
	}
	return ready;
};

jstack.componentRegistry = {};
jstack.registerComponent = function(name,component){
	if(typeof component == 'object' && component.__esModule){
		component = component.default;
	}
	jstack.componentRegistry[name] = component;
};

jstack.load = function(target,config,options){
	
	if(typeof(config)=='string'){
		config = {
			component: config,
		};
	}
	
	const jsReady = $.Deferred();

	if(typeof config.component=='object' && config.component.__esModule	){
		config.component = config.component.default;
	}
	
	if(typeof(config.component)=='string'){
		let componentPath = config.component;
		let componentUrl = jstack.config.controllersPath+componentPath;
		if(jstack.componentRegistry[componentPath]){
			jsReady.resolve( jstack.componentRegistry[componentPath] );
		}
		else if(typeof requirejs == 'function'){
			requirejs( [ componentUrl ], function( module ){
				jsReady.resolve( module );
			});
		}
		else{
			$.getScript( componentUrl+'.js', function(){
				if(jstack.componentRegistry[componentPath]){
					jsReady.resolve( jstack.componentRegistry[componentPath] );
				}
				else{
					throw new Error('missing component '+componentPath);
				}
			});
		}
	}
	else{
		jsReady.resolve( config.component );
	}
	
	
	const ready = getViewReady(target);
	
	jsReady.then(function(componentClass){

		if(config.clear){
			$(config.clear).contents().not(target).remove();
		}
		
		let component = jstack.Component.factory(componentClass, target, (options || {}), {
			route : config.route,
		});
		component.ready.then(function(){
			ready.resolve(target,component);
		});

	});

	return ready.promise();
};
jstack.viewReady = function(el){
	return getViewReady(el).promise();
};

})();

(function(){

	jstack.app = function(el,app){
		if(!app){
			app = el[0].getAttribute('j-app');
		}
		jstack.config.templatesPath += app+'/';
		jstack.config.controllersPath += app+'/';
		
		$(document).on('j:route:unload',function(){
			$.xhrPool.abortAll();
		});
		
		jstack.route('*', function(path, params, hash){
			path = jstack.url.getPath(path);
			var promise = jstack.load($('<div/>').appendTo(el),{
				component:path,
				hash:hash,
				clear:el[0],
			});
			return promise;
		});
	};

	var el = $('[j-app]');
	if(el.length){
		jstack.app(el);
	}
	
}());


	window.jstack = jstack;
	return jstack;
});
