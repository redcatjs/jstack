jstackClass = function(){
	this.config = {
		templatesPath: 'view-js/',
		controllersPath: 'controller-js/',
		defaultController: {},
		debug: $js.dev,
	};
	this.controllers = {};
};
jstackClass.prototype.extend = function(c,parent){
	c.prototype = Object.create(parent.prototype);
};
jstack = new jstackClass();
(function(){

let prefix = '__JSTACK__OBSERVABLE__';

var observable = function(obj,parentProxy,parentKey){
	
	let observer = obj[prefix];
	if(observer){
		observer.parentKey = parentKey;
		observer.parentProxy = parentProxy;
		return obj;
	}
	
	let notify = function(change,preventPropagation){
		$.each(observer.namespaces,function(namespace,callbackStack){
			
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
	
	observer = {
		namespaces:{},
		parentProxy:parentProxy,
		parentKey:parentKey,
		notify: notify,
		proxyTarget: obj,
	};
	
	let proxy;
	
	proxy = new Proxy(obj,{
		get: function (target, key) {
			if(key===prefix){
				return observer;
			}
			return target[key];
		},
		set: function(target, key, value){
			
			let oldValue = target[key];
			
			if(typeof(value)=='object'&&value!==null){
				value = observable(value, proxy, key);
			}
			
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
			
			
			if (Array.isArray(target))
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
	
	$.each(obj,function(k,v){
		if(typeof(v)=='object'&&v!==null){
			obj[k] = observable( v, proxy, k );
		}
	});
	
	return proxy;
};

var observe = function(obj,key,callback,namespace,recursive){
	
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

jstack.observable = observable;
jstack.observe = observe;
jstack.unobserve = unobserve;
jstack.getObserverTarget = getObserverTarget;

})();

(function(){
let constructor = function(controllerSet,element,hash){			
	let self = this;
	
	
	let data = element.data('jModel') || {};
	if(element[0].hasAttribute('j-view-inherit')){
		let parent = element.parent().closest('[j-controller]');
		if(parent.length){
			let inheritProp = element[0].getAttribute('j-view-inherit');
			let parentData = parent.data('jModel') || {};
			if(inheritProp){
				data[inheritProp] = parentData;
			}
			else{
				data = $.extend({},parentData,data);
			}
		}
	}
	
	let defaults = {
		domReady: function(){},
		setData: function(){},
	};
	$.extend(true,this,defaults,controllerSet);
	
	this.element = element;
	this.hash = hash;
	this.data = data;
	element.data('jController',this);
	
	
	this.startDataObserver = function(){
		let object = self.data;
		
		self.data = self.data.observable();
		
		self.dataBinder = new jstack.dataBinder(self.data,self.element[0],self);
		self.dataBinder.eventListener();
		
		self.data.observe(function(change){
			//console.log('j:model:update',change);
			self.dataBinder.update();
		},'jstack.model',true);
		
	};
	
	this.setDataArguments = [];
	this.setDataCall = function(){
		let r = this.setData.apply( this, this.setDataArguments );
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
		
		let el = this.element;
		el.data('jModel',this.data);
		el[0].setAttribute('j-controller',this.name);
		
		html = self.dataBinder.compileHTML(html);
		
		if(Boolean(el[0].getAttribute('j-view-append'))){
			el.append( html );
		}
		else{
			el.html( html );
		}
		
		let domReady = $.Deferred();
		
		this.dataBinder.ready(function(){
			self.domReady();
			domReady.resolve();
		});
		
		return domReady;
	};
	
};

jstack.controller = function(controller, element, hash){
	
	if(typeof(controller)=='object'){
		
		if(controller.extend){
			if(!controller.dependencies){
				controller.dependencies = [];
			}
			let extend = $.Deferred();
			controller.dependencies.push(extend);
			let controllerPath = jstack.config.controllersPath+controller.extend;
			$js.require(controllerPath);
			$js(controllerPath,function(){
				$.each(jstack.controllers[controller.extend],function(k,v){
					switch(k){
						case 'dependencies':
							if(v instanceof Array){
								v.forEach(function(dep){
									controller.dependencies.push(dep);
								});
							}
						break;
						default:
							if(typeof(controller[k])=='undefined'){						
								controller[k] = v;
							}
						break;
					}
				});
				//console.log('extended',controller.name);
				extend.resolve();
			});
		}		
		if(controller.mixins){
			for(let i = 0, l = mixins.length;i<l;i++){
				$.each(mixins[i],function(k,v){
					if(typeof(controller[k])=='undefined'){
						controller[k] = v;
					}
				});
			}
		}
		
		jstack.controllers[controller.name] = controller;
		return jstack.controllers[controller.name];
	}
	
	if(typeof(hash)=='undefined'){
		let parent = element.parent().closest('[j-controller]');
		if(parent.length){
			let controllerData = parent.data('jController');
			if(controllerData){
				hash = controllerData.hash;
			}
		}
		if(typeof(hash)=='undefined'){
			hash = window.location.hash.ltrim('#');
		}
	}
	
	
	let controllerSet = jstack.controllers[controller] || jstack.controller($.extend(true,{name:controller},jstack.config.defaultController));
	
	let name = controllerSet.name;
	let ready = $.Deferred();
	
	let dependencies = [];
	
	if(controllerSet.dependencies&&controllerSet.dependencies.length){		
		let dependenciesJsReady = $.Deferred();
		$js(controllerSet.dependencies,function(){
			dependenciesJsReady.resolve();
		});
		dependencies.push(dependenciesJsReady);
	}
	
	$.when.apply($, dependencies).then(function(){
		
		let controller = new constructor(controllerSet,element,hash);
		
		let dependenciesDataReady = [];
		let dependenciesData = controller.dependenciesData;
		if(dependenciesData){
			if(typeof(dependenciesData)=='function'){
				controller.dependenciesData = dependenciesData = controller.dependenciesData();
			}
			if(dependenciesData&&dependenciesData.length){
				let dependenciesDataRun = [];
				for(let i = 0, l = dependenciesData.length; i < l; i++){
					let dependencyData = dependenciesData[i];
					if(typeof(dependencyData)=='function'){
						dependencyData = dependencyData.call(controller);
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
						

					dependenciesDataRun.push(dependencyData);
				}
				let resolveDeferred = $.when.apply($, dependenciesDataRun).then(function(){
					for(let i = 0, l = arguments.length; i < l; i++){
						controller.setDataArguments.push(arguments[i]);
					}
				});
				dependenciesDataReady.push(resolveDeferred);
			}
		}
		
		$.when.apply($, dependenciesDataReady).then(function(){
			controller.setDataCall();
			ready.resolve(controller);
		});
		
	});
	
	return ready.promise();
};

})();

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
jstack.randomColor = function(){
    //var letters = '0123456789ABCDEF';
    //var color = '#';
    //for (var i = 0; i < 6; i++ ) {
        //color += letters[Math.floor(Math.random() * 16)];
    //}
    //return color;
    return '#'+Math.random().toString(16).substr(2,6);
};
jstack.fragmentToHTML = function(fragment){
	var div = document.createElement('div');
	div.appendChild( document.importNode(fragment.content, true) );
	return div.innerHTML;
};
(function(){

var re = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
jstack.isMobile = function(userAgent){
	if(!userAgent) userAgent = navigator.userAgent;
	return re.test()
};

})();
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
		enumerable: false
	});
}

if(!String.prototype.escapeRegExp){
	Object.defineProperty(String.prototype, 'escapeRegExp', {
		value: function() {
			//return this.replace( /([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1" );
			return this.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		},
		enumerable: false
	});
}
if(!String.prototype.replaceAllRegExp){
	Object.defineProperty(String.prototype, 'replaceAllRegExp', {
		value: function(find, replace){
			return this.replace( new RegExp( find, "g" ), replace );
		},
		enumerable: false
	});
}
if(!String.prototype.replaceAll){
	Object.defineProperty(String.prototype, 'replaceAll', {
		value: function(find, replace){
		find = find.escapeRegExp();
			return this.replaceAllRegExp(find, replace);
		},
		enumerable: false
	});
}
if(!String.prototype.camelCase){
	Object.defineProperty(String.prototype, 'camelCase', {
		value: function() {
			return this.replace( /(\_[a-z])/g, function( $1 ) {return $1.toUpperCase().replace( "_", "" );} );
		},
		enumerable: false
	});
}
if(!String.prototype.camelCaseDash){
	Object.defineProperty(String.prototype, 'camelCaseDash', {
		value: function() {
			return this.replace( /(\-[a-z])/g, function( $1 ) {return $1.toUpperCase().replace( "-", "" );} );
		},
		enumerable: false
	});
}


if(!String.prototype.snakeCase){
	Object.defineProperty(String.prototype, 'snakeCase', {
		value: function() {
			return this.replace( /([A-Z])/g, function( $1 ) {return "_" + $1.toLowerCase();} );
		},
		enumerable: false
	});
}

if(!String.prototype.snakeCaseDash){
	Object.defineProperty(String.prototype, 'snakeCaseDash', {
		value: function() {
			return this.replace( /([A-Z])/g, function( $1 ) {return "-" + $1.toLowerCase();} );
		},
		enumerable: false
	});
}
if(!String.prototype.ucfirst){
	Object.defineProperty(String.prototype, 'ucfirst',{
	   value: function(){
		   return this.charAt( 0 ).toUpperCase() + this.substr( 1 );
	   },
	   enumerable: false
	});
}

if(!String.prototype.lcfirst){
	Object.defineProperty(String.prototype, 'lcfirst', {
		value: function() {
			return this.charAt( 0 ).toLowerCase() + this.substr( 1 );
		},
		enumerable: false
	});
}


})();

if(!Object.prototype.observable){
	Object.defineProperty(Object.prototype, 'observable', {
		value: function(options){
			return jstack.observable(this,options);
		},
		enumerable: false
	});
}
if(!Object.prototype.observe){
	Object.defineProperty(Object.prototype, 'observe', {
		value: function(key,callback,namespace,recursive){
			return jstack.observe(this,key,callback,namespace,recursive);
		},
		enumerable: false
	});
}
if(!Object.prototype.unobserve){
	Object.defineProperty(Object.prototype, 'unobserve', {
		value: function(key,callback,namespace,recursive){
			return jstack.unobserve(this,key,callback,namespace,recursive);
		},
		enumerable: false
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
jstack.traverseDom = function(node, func, asc){
	var result;
	if(!asc){
		result = func(node);
	}
	if(asc || ! (result&jstack.traverseDomBreak.DESC) ){
		var children = node.childNodes;
		for(var i = 0; i < children.length; i++){
			if(!children[i]) continue;
			var adjResult = this.traverseDom(children[i], func);
			if(adjResult&jstack.traverseDomBreak.ASC){
				result = result|adjResult;
			}
			if(adjResult&jstack.traverseDomBreak.ADJ){
				break;
			}
		}
	}
	if(asc && !(result&jstack.traverseDomBreak.ASC) ){
		result = func(node);
	}
	return result;
};
(function(){



let walkTheDOM = function(node, func){
	if(func(node)===false){
		return;
	}
	let children = node.childNodes;
	for(let i = 0; i < children.length; i++){
		if(!children[i]) continue;
		walkTheDOM(children[i], func);
	}
};

/*
let staticWalkTheDOM = function(node, func){
	if(func(node)===false){
		return;
	}
	let children = node.childNodes;
	for(let i = 0, l = children.length; i < l; i++){
		if(!children[i]) continue;
		staticWalkTheDOM(children[i], func);
	}
};
*/

jstack.walkTheDOM = walkTheDOM;

})();

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
$.fn.jComponentReady = function(callback){
	var self = this;
	var defer = $.Deferred();
	if(callback){
		defer.then(function(){
			self.each(function(){
				callback.call(this);
			});
		});
	}
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
	return defer.promise();
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
      //switch ($('[name="' + pair.name + '"]', $form).attr("type")) { //surikat
      switch ($('[name="' + pair.name + '"]', $form)[0].type) {
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
		var r = jstack.dataBinder.getControllerData(this[0]);
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
		var a = [];
		this.each(function(){
			a.push( $.fn.jData.call( $(this), key ) );
		});
		return a;
	}
	else{
			
		var a = {};
		var el = this[0];
		
		let controller = $(jstack.dataBinder.getController(el)).data('jController');
		let dataBinder;
		if(controller){
			dataBinder = controller.dataBinder;
		}
		
		$.each(this.attrStartsWith('j-data-'),function(k,v){
			var tokens = jstack.dataBinder.textTokenizer(v);
			var value = v;
			if(tokens!==false && dataBinder){
				value = dataBinder.compilerAttrRender(el,tokens);
			}
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

$.fn.onJstackReady = function(types,selector,data){
	if ( typeof types === "object" ) {
		if ( typeof selector !== "string" ) {
			data = data || selector;
			selector = undefined;
		}
		for(var type in types){
			this.onJstackReady(type, selector, data, types[type]);
		}
		return this;
	}
	var params = [types];
	var fn;
	if(typeof selector === "string"){
		params.push(selector);
		fn = data;
	}
	else{
		fn = selector;
	}
	params.push(function(){
		var args = arguments;
		var el = this;
		return jstack.ready(function(){
			fn.apply(el,args);
		});
	});
	return this.on.apply(this,params);
};
$.onJstackReady = function(event,selector,callback){
	return $(document).onReady(event,selector,callback);
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
		jstack.dataBinder.dotSet(key,data,val);
	});
	return data;
};

(function(){
	var templates = {};
	var requests = {};
	jstack.getTemplate = function( templatePath, absolute ) {
		if(!absolute){
			templatePath = jstack.config.templatesPath+templatePath;
		}
		if ( !requests[ templatePath ] ) {
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
				templates[ templatePath ] = html;
				requests[ templatePath ].resolve( html, templatePath );				
			});
		}
		return requests[ templatePath ].promise();
	};

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

jstack.routeMVC = function(path,obj){
	return jstack.route(path,function(path,params,hash){
		let container = $('[j-app]');
		if(typeof(obj)=='string')
			obj = {view:obj};
		container.empty();
		return jstack.mvc({
			view:obj.view,
			controller:obj.controller || obj.view,
			hash:hash,
			target:$('<div/>').appendTo(container),
		});
	});
};

(function(){
	
class dataBinder {
	
	constructor(model,view,controller){
		this.model = model;
		this.view = view;
		this.controller = controller;
		
		this.updateDeferQueued = false;
		this.updateDeferInProgress = false;
		this.updateDeferStateObserver = [];
		
		this.noChildListNodeNames = {area:1, base:1, br:1, col:1, embed:1, hr:1, img:1, input:1, keygen:1, link:1, menuitem:1, meta:1, param:1, source:1, track:1, wbr:1, script:1, style:1, textarea:1, title:1, math:1, svg:1, canvas:1};
		
		this.watchers = new WeakMap();
	}
	ready(callback){
		if(this.updateDeferInProgress){
			this.updateDeferStateObserver.push(callback);
		}
		else{
			callback();
		}
	}
	getValue(el,varKey,defaultValue){
		let key = '';

		let ns = dataBinder.getClosestFormNamespace(el.parentNode);
		if(ns){
			key += ns+'.';
		}

		key += varKey;

		return dataBinder.dotGet(key,this.model,defaultValue);
	}
	getParentsForId(el){
		let a = [];
		let n = el;
		while(n){
			if(n.nodeType===Node.COMMENT_NODE&&n.nodeValue.split(' ')[0]==='j:for:id'){
				a.push(n);
				n = n.parentNode;
			}
			if(n){
				if(n.previousSibling){
					n = n.previousSibling;
				}
				else{
					n = n.parentNode;
				}
			}
			//if(n===document.body) break;
			if(n===this.view || n===document.body) break;
		}
		return a;
	}
	getValueEval(el,varKey){

		let controller = this.controller;
		let scopeValue = this.model;

		scopeValue = scopeValue ? JSON.parse(JSON.stringify(scopeValue)) : {}; //clone Proxy
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


		let forCollection = this.getParentsForId(el).reverse();

		for(let i = 0, l = forCollection.length; i<l; i++){
			let forid = forCollection[i];

			let parentFor = $(forid);
			let parentForList = parentFor.parentComment('j:for');

			if(!parentForList.length) continue;

			let jforCommentData = parentForList.dataComment();
			let value = jforCommentData.value;
			
			let forRow = parentFor.dataComment('j:for:row');
			
			if(!forRow){
				console.log(varKey, el, parentFor, parentFor.dataComment());
			}
			
			let index = jforCommentData.index;
			let key = jforCommentData.key;
			if(index){
				scopeValue[index] = forRow.index;
			}
			if(key){
				scopeValue[key] = forRow.key;
			}
			scopeValue[value] = forRow.value;
		}

		let params = [ '$controller', '$this', '$scope' ];
		let args = [ controller, el, scopeValue ];
		$.each(scopeValue,function(param,arg){
			params.push(param);
			args.push(arg);
		});

		params.push("return "+varKey+";");

		let value;
		try{
			let func = Function.apply(null,params);
			value = func.apply(null,args);
		}

		catch(jstackException){
			if(jstack.config.debug){
				let warn = [jstackException.message, ", expression: "+varKey, "element", el];
				if(el.nodeType==Node.COMMENT_NODE){
					warn.push($(el).parent().get());
				}
				console.warn.apply(console,warn);
			}
		}
		
		return typeof(value)=='undefined'?'':value;
	}
	inputToModel(el,eventType,triggeredValue){
		let input = $(el);

		let self = this;

		let data = this.model;
		let name = el.getAttribute('name');

		let performInputToModel = function(){
			let key = dataBinder.getScopedInput(el);
			if(filteredValue!=value){
				value = filteredValue;
				input.populateInput(value,{preventValEvent:true});
			}

			let oldValue = dataBinder.dotGet(key,data);

			value = dataBinder.dotSet(key,data,value);

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
				performInputToModel();
			});
		}
		else{
			performInputToModel();
		}

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
		//console.log('update');
		
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
		});
		
		//console.log('runWatchers END',c,(((new Date().getTime())-now)/1000)+'s');
	}

	update(){
		//console.log('update');
		let self = this;
		if(this.updateDeferQueued){
			return;
		}
		if(this.updateDeferInProgress){
			this.updateDeferQueued = true;
		}
		else{
			this.updateDeferInProgress = true;
			setTimeout(function(){
				self.runWatchers();
				if(self.updateDeferQueued){
					self.updateDeferInProgress = false;
					self.updateDeferQueued = false;
					self.update();
				}
				else{
					while(self.updateDeferStateObserver.length){
						self.updateDeferStateObserver.pop()();
					}
					self.updateDeferInProgress = false;
				}
			},10);
			
		}
	}

	eventListener(){
		let self = this;		
		$(this.view).on('input change j:update', ':input[name]', function(e,value){
			
			if(e.__jstackStopPropagation){
				return;
			}
			e.__jstackStopPropagation = true;
			
			if(this.type=='file') return;
			if(e.type=='input'&&(this.nodeName.toLowerCase()=='select'||this.type=='checkbox'||this.type=='radio'))
				return;
			let el = this;
			
			setTimeout(function(){
				self.inputToModel(el,e.type,value);
			});
			
		});
		
	}
	
	compileHTML(html){
		
		let dom = $('<html><rootnode>'+html+'</rootnode></html>').get(0);
		
		this.compileDom(dom);

		return dom.childNodes;
	}
	
	compileDom(dom){
		
		let self = this;
		
		$.each(jstack.dataBindingCompilers,function(k,compiler){
			
			jstack.walkTheDOM(dom,function(n){
				
				let matchResult = compiler.match.call(n);
				if(matchResult){
					return compiler.callback.call(n,self,matchResult);
				}
				
			});
			
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
	compilerAttrRender(el,tokens){
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
				
				token = this.getValueEval(el,token);
			}
			r += typeof(token)!=='undefined'&&token!==null?token:'';
		}
		return r;
	}
	createCompilerAttrRender(el,tokens){
		let self = this;
		return function(){
			return self.compilerAttrRender(el,tokens);
		};
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
	static dotGet(key,data,defaultValue){
		if(typeof(data)!='object'||data===null){
			return;
		}
		return key.split('.').reduce(function(obj,i){
			if(typeof(obj)=='object'&&obj!==null){
				return typeof(obj[i])!='undefined'?obj[i]:defaultValue;
			}
			else{
				return defaultValue;
			}
		}, data);
	}
	static dotSet(key,data,value,isDefault){
		if(typeof(data)!='object'||data===null){
			return;
		}
		key.split('.').reduce(function(obj,k,index,array){
			if(array.length==index+1){
				if(isDefault){
					if(typeof(obj[k])==='undefined'){
						obj[k] = value;
					}
					else{
						value = obj[k];
					}
				}
				else{
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
	}
	static dotDel(key,data,value){
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
						while(p){
							if(p.tagName&&p.tagName.toLowerCase()=='form'){
								form = p;
								break;
							}
							p = p.parentNode;
						}
						if(form){
							let checked = $(form).find('[name="'+el.getAttribute('name')+'"]:checked');
							return checked.length?checked.val():'';
						}
						return '';
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
	static getControllerData(el){
		return $(dataBinder.getController(el)).data('jModel');
	}
	static getController(p){

		let controller;
		
		while(p){
			if(p.hasAttribute&&p.hasAttribute('j-controller')){
				controller = p;
				break;
			}
			p = p.parentNode;
		}
		

		if(!controller){
			controller = document.body;
			controller.setAttribute('j-controller','')
			$(controller).data('jModel',{});
		}

		return controller;
	}
	static getControllerObject(el){
		return $(dataBinder.getController(el)).data('jController');
	}
}


jstack.dataBinder = dataBinder;


jstack.dataBindingCompilers = {};

$(document.body).on('reset','form',function(){
	$(this).populateReset();
});


})();

(function(){

const reg1 = new RegExp('(\\()(.*)(,)(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
const reg2 = new RegExp('(\\()(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
const reg3 = new RegExp('(.*)(\\s+)(in)(\\s+)(.*)',["i"]);
	
jstack.dataBindingCompilers.for = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('j-for');
	},
	callback(dataBinder){
		let el = this;
		let $this = $(this);
		let jfor = $('<!--j:for-->');
		let jforClose = $('<!--/j:for-->');
		$this.replaceWith(jfor);
		jforClose.insertAfter(jfor);

		let attrFor = el.getAttribute('j-for');
		el.removeAttribute('j-for');
		attrFor = attrFor.trim();
		let index, key, value, myvar;

		let m = reg1.exec(attrFor);
		if (m != null){
			index = m[2].trim();
			key = m[4].trim();
			value = m[6];
			myvar = m[11].trim();
		}
		else{
			let m = reg2.exec(attrFor);
			if (m != null){
				key = m[2].trim();
				value = m[4];
				myvar = m[9].trim();
			}
			else{
				let m = reg3.exec(attrFor);
				if (m != null){
					value = m[1];
					myvar = m[5].trim();
				}
				else{
					throw new Error('Malformed for clause: '+attrFor);
				}
			}
		}

		let currentData;
		let getData = function(){
			return dataBinder.getValueEval(jfor[0],myvar);
		};

		//parentForList
		jfor.dataComment({
			value:value,
			key:key,
			index:index,
		});

		
		let isTemplate = el.tagName.toLowerCase()=='template';
		
		
		let buildNewRow;
		
		if(isTemplate){
			let content = this.content;
			buildNewRow = function(k, jforClose){
				let elements = document.importNode(content, true);
				let addRow = document.createElement('div');
				for(let i = 0, l = elements.length; i<l; i++){
					addRow.appendChild(elements[i]);
				}
				
				jforClose.before(addRow.childNodes);
				
				dataBinder.compileDom( addRow );
			};
			
		}
		else{
			buildNewRow = function(k, jforClose){
				//let addRow = $(document.createElement('div'));
				let addRow = $this.clone();
				addRow.attr('j-for-id',k);
				
				jforClose.before(addRow);
				
				dataBinder.compileDom( addRow[0] );
				
				return addRow;
			};
			
		}
		
		let render = function(){
			let data = getData();
			if(currentData===data) return;
			currentData = data;
			
			if(!data){
				data = [];
			}
			
			let domRows = {};
			
			$.each(jfor.commentChildren(),function(k,v){
				if(v.nodeType===Node.COMMENT_NODE&&this.nodeValue.split(' ')[0] == 'j:for:id'){
					let row = $(v);
					let data = row.dataComment('j:for:row');
					if(data&&typeof(data.key)!=='undefined'){
						let key = data.key;
						domRows[key] = row;
					}
				}
			});
			
			//add
			let index = 1;
			$.each(data,function(k,v){
				let row = domRows[k];
				delete domRows[k];
				let create;
				if(!row){
					row = $('<!--j:for:id-->');
					create = true;
				}
				row.dataComment('j:for:row',{
					'value':v,
					'index':index,
					'key':k,
				});
				if(create){
					row.insertBefore(jforClose);
					
					//let addRow = buildNewRow(k);
					//addRow.insertBefore(jforClose);
					
					buildNewRow(k,jforClose);
					
					$('<!--/j:for:id-->').insertBefore(jforClose);
				}
				index++;
			});

			//remove
			$.each(domRows,function(k,row){
				row.commentChildren().remove();
				$(row[0].nextSibling).remove();
				row.remove();
			});
			
		};
		
		dataBinder.addWatcher(jfor[0],render);
		render();
		
		return false;
		
	},
};

})();

jstack.dataBindingCompilers.if = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('j-if');
	},
	callback(dataBinder){
		var el = this;
		var $this = $(this);
		var jif = $('<!--j:if-->');
		$this.before(jif);

		var jelseifEl = $this.nextUntil('[j-if]','[j-else-if]');
		var jelseEl = $this.nextUntil('[j-if]','[j-else]');

		if(this.tagName.toLowerCase()=='template'){
			$this = $(jstack.fragmentToHTML(this));
			$(el).detach();
		}

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

		var myvar = el.getAttribute('j-if');
		el.removeAttribute('j-if');
		var currentData;
		var getData = function(){
			return Boolean(dataBinder.getValueEval(jif[0],myvar));
		};

		var getData2;
		var currentData2 = null;
		if(jelseifEl.length){
			var myvar2 = [];
			var newJelseifEl = [];
			jelseifEl.each(function(){
				myvar2.push( this.getAttribute('j-else-if') );
				this.removeAttribute('j-else-if');
				if(this.tagName.toLowerCase()=='template'){
					$( '<div>'+jstack.fragmentToHTML(this)+'</div>' ).contents().each(function(){
						newJelseifEl.push(this);
					});
				}
				else{
					newJelseifEl.push(node);
				}
			});
			jelseifEl = $(newJelseifEl);

			getData2 = function(){
				var data = false;
				for(var i=0, l=myvar2.length;i<l;i++){
					if( Boolean(dataBinder.getValueEval(jif[0],myvar2[i])) ){
						data = i;
						break;
					}
				}
				return data;
			};
		}

		if(jelseEl.length){
			var newJelseEl = [];
			jelseEl.each(function(){
				this.removeAttribute('j-else');
				if(this.tagName.toLowerCase()=='template'){
					$( '<div>'+jstack.fragmentToHTML(this)+'</div>' ).contents().each(function(){
						newJelseEl.push(this);
					});
				}
				else{
					newJelseEl.push(this);
				}
			});
			jelseEl = $(newJelseEl);
		}

		var render = function(){

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
		
		dataBinder.addWatcher(jif[0],render);
		render();
	},
};

jstack.dataBindingCompilers.switch = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('j-switch');
	},
	callback(dataBinder){
		var el = this;
		var $this = $(this);
		var myvar = this.getAttribute('j-switch');
		this.removeAttribute('j-switch');

		var cases = $this.find('[j-case],[j-case-default]');

		var currentData;
		var getData = function(){
			return Boolean(dataBinder.getValueEval(el,myvar));
		};
		var render = function(){
			
			var data = getData();
			if(currentData===data) return;
			currentData = data;

			var found = false;
			cases.filter('[j-case]').each(function(){
				var jcase = $(this);
				var caseVal = this.getAttribute('j-case');
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
		
		dataBinder.addWatcher(el,render);
		render();
	},
};

jstack.dataBindingCompilers.show = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('j-show');
	},
	callback(dataBinder){
		var el = this;
		var $this = $(this);

		var myvar = this.getAttribute('j-show');
		this.removeAttribute('j-show');
		var currentData;
		var getData = function(){
			return Boolean(dataBinder.getValueEval(el,myvar));
		};

		var render = function(){
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
		
		dataBinder.addWatcher(el,render);
		render();
	},
};

jstack.dataBindingCompilers.href = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('j-href');
	},
	callback(dataBinder){

		var el = this;
		var $this = $(this);

		var original = this.getAttribute('j-href');
		this.removeAttribute('j-href');

		var tokens = jstack.dataBinder.textTokenizer(original);
		if(tokens===false){
			el.setAttribute('href',jstack.route.baseLocation + "#" + original);
			return;
		}

		var currentData;
		var getData = dataBinder.createCompilerAttrRender(el,tokens);
		var render = function(){
			var data = getData();
			if(currentData===data) return;
			currentData = data;
			el.setAttribute('href',jstack.route.baseLocation + "#" + data);
		};
		
		dataBinder.addWatcher(el,render);
		
		render();
	},
};

jstack.dataBindingCompilers.twoPoints = {
	match(){
		if(this.nodeType !== Node.ELEMENT_NODE){
			return;
		}
		var r;
		for (var i = 0, atts = this.attributes, n = atts.length; i < n; i++) {
			var att = atts[i];
			if(att.name.substr(0,1) === ':') {
				if(!r){
					r = {};
				}
				r[att.name] = att.value;
			}
		}
		return r;
	},
	callback(dataBinder,attrs){
		var el = this;
		var $this = $(this);
		var attrsVars = {};
		var attrsVarsCurrent = {};
		var propAttrs = ['selected','checked'];
		var nodeName = this.nodeName.toLowerCase();
		$.each(attrs,function(k,v){
			var tokens = jstack.dataBinder.textTokenizer(v);
			var key = k.substr(1);
			if(tokens===false){
				el.setAttribute(key,v);
			}
			else{
				attrsVars[key] = tokens;
			}
			el.removeAttribute(k);
		});
		var render = function(){
			$.each(attrsVars,function(k,v){
				var value = dataBinder.compilerAttrRender(el,v);
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
};

jstack.dataBindingCompilers.inputFile = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('name')&&this.tagName.toLowerCase()=='input'&&this.type=='file';
	},
	callback(dataBinder){
		$(this).on('input change', function(e){
			dataBinder.inputToModel(this,e.type);
		});
	}
};

(function(){

const inputPseudoNodeNamesExtended = {input:1 ,select:1, textarea:1, button:1, 'j-input':1, 'j-select':1};
const inputPseudoNodeNames = {input:1 ,select:1, textarea:1};

jstack.dataBindingCompilers.input = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('name')&&inputPseudoNodeNamesExtended[this.tagName.toLowerCase()]&&this.type!='file';
	},
	callback(dataBinder,matched){
		let el = this;
		let $el = $(this);

		let currentData;

		//default to model					
		let key = jstack.dataBinder.getScopedInput(el);
		let val = jstack.dataBinder.getInputVal(el);
		
		let origin = jstack.getObserverTarget( dataBinder.model );
		
		let modelValue = jstack.dataBinder.dotSet(key,origin,val,true);
		
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
					jstack.dataBinder.dotSet(key,dataBinder.model,val);
				}
			}
			else{
				$el.populateInput(modelValue,{preventValEvent:true});
			}
		}
		
		let getData = function(){
			let defaultValue = jstack.dataBinder.getInputVal(el);
			let key = jstack.dataBinder.getKey( el.getAttribute('name') );
			return dataBinder.getValue(el,key,defaultValue);
		};

		let render = function(){
			let data = getData();
			if(currentData===data) return;
			currentData = data;

			if($el.data('j:populate:prevent')) return;
			
			$el.populateInput(data,{preventValEvent:true});
			$el.trigger('j:val',[data]);
		};
		
		dataBinder.addWatcher(el,render);
		render();
	},
};


})();

jstack.dataBindingCompilers.text = {
	match: function(){
		return this.nodeType == Node.TEXT_NODE && this instanceof Text && this.textContent;
	},
	callback: function(dataBinder){
		let textString = this.textContent.toString();
		let tokens = jstack.dataBinder.textTokenizer(textString);
		if(tokens===false) return;

		let $el = $(this);

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
				let data = dataBinder.getValueEval(text[0],token);
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
};

(function(){
	
let mutationObserver = new MutationObserver(function(mutations){
	$.each(mutations,function(i,mutation){
		$.each(mutation.addedNodes,function(ii,node){
			
			jstack.walkTheDOM(node,function(n){
				if(!document.body.contains(n) || n.nodeType!=Node.ELEMENT_NODE) return false;
				let $n = $(n);
				if($n.data('j:load:state')){
					return;
				}
				$n.data('j:load:state',true);
				jstack.trigger(n,'load');
			});
			
		});

		$.each(mutation.removedNodes,function(ii,node){
			jstack.walkTheDOM(node,function(n){
				if(n.nodeType!==Node.ELEMENT_NODE || !$(n).data('j:load:state')){
					return false;
				}
				jstack.trigger(n,'unload');
			});
		});
	});
});

mutationObserver.observe(document.body, {
	subtree: true,
	childList: true,
	characterData: true,
	attributes: false,
	attributeOldValue: false,
	characterDataOldValue: false,
});

jstack._eventStack = {};

jstack.trigger = function(n,eventName){
	let $n = $(n);
	let callbacks = $n.data('j:event:'+eventName);
	if(callbacks){
		callbacks.forEach(function(callback){
			callback.call(n);
		});
	}
	if(jstack._eventStack[eventName]){
		$.each(jstack._eventStack,function(selector,callbacks){
			if($n.is(selector)){
				callbacks.forEach(function(callback){
					callback.call(n);
				});
			}
		});
	}
};
jstack.on = function(eventName,selector,callback){
	if(!jstack._eventStack[eventName]){
		jstack._eventStack[eventName] = {};
	}
	if(typeof(selector)=='string'){
		if(typeof(jstack._eventStack[selector])=='undefined'){
			jstack._eventStack[selector] = [];
		}
		jstack._eventStack[selector].push(callback);
	}
	else{
		let el = $(selector);
		let callbacks = el.data('j:event:'+eventName);
		if(!callbacks){
			callbacks = [];
			el.data('j:event:'+eventName,callbacks);
		}
		callbacks.push(callback);
	}
};


jstack.loader = function(selector,handler,unloader){
	jstack.on('load',selector,function(){
		handler.call(this);
	});
	if(typeof(unloader)=='function'){
		jstack.on('unload',selector,function(){
			unloader.call(this);
		});
	}
	$(selector).each(function(){
		handler.call(this);
	});
};


$.fn.onLoad = function(callback){
	return this.each(function(){
		jstack.on('load',this,callback);
	});
};
$.fn.onUnload = function(callback){
	return this.each(function(){
		jstack.on('unload',this,callback);
	});
};


})();

jstack.component = {};

//define loaders
jstack.loader(':attrStartsWith("j-on-")',function(){
	var $this = $(this);
	var attrs = $this.attrStartsWith('j-on-');
	var controller = jstack.dataBinder.getControllerObject(this);
	$.each(attrs,function(k,v){
		var event = k.substr(5);
		$this[0].removeAttribute(k);
		$this.on(event,function(e){
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
	var component = el.getAttribute('j-component');
	if(!component){
		return;
	}
	if(el.getAttribute('j-component-handled')){
		return;
	}
	el.setAttribute('j-component-handled','true');
	var config = $el.jData();
	var paramsData = el.getAttribute('j-params-data');
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
				if(typeof(o.unload)=='function'){
					jstack.on('unload',el,o.unload);
				}
			});
		}
		else{
			$el.data('j.component.loaded',true);
			$el.trigger('j:component:loaded');
			if(typeof(o.unload)=='function'){
				jstack.on('unload',el,o.unload);
			}
		}
	};
	if(jstack.component[component]){
		load();
	}
	else{
		$js('jstack.'+component,load);
	}
});

( function() {
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


	var recurseFormat = function( o, files, prefix, deepness ) {
		if(!prefix){
			prefix = "";
		}
		if(o instanceof Array){ //cast array of value as object
			var obj = {};
			for( var i = 0; i < o.length; i++ ) {
				obj[i] = o[i];
			}
			return recurseFormat(obj, files, prefix, deepness);
		}
		else if(typeof(o)=='undefined'||o===null){ //cast null and undefined as string
			o = '';
		}
		else if(typeof(o)=='object'){
			var obj = {};
			Object.keys(o).forEach(function(k){
				var key = prefix + k;
				var value = o[k];
				if(value instanceof FileList){ //extract file
					if(value.length==1){
						files[key] = value[0];
					}
					else{
						files[key] = [];
						for(var i = 0; i < value.length; i++){
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
		var settings, files = {};
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

jstack.mvc = function(config){

	var target = $(config.target);
	var controller = config.controller;

	var controllerPath = jstack.config.controllersPath+config.controller;

	var controllerReady = $.Deferred();
	var controllerReady = $.Deferred();
	var processor;

	if(jstack.controllers[config.controller]){
		controllerReady.resolve();
	}
	else{
		//$js.onExists(controllerPath,controllerReady.resolve,controllerReady.resolve);
		$js(controllerPath,controllerReady.resolve);
	}
	var viewReady = jstack.getTemplate(config.view+'.jml');

	var ready = $.Deferred();

	controllerReady.then(function(){
		var ctrlReady = jstack.controller(config.controller, target, config.hash);
		$.when(viewReady, ctrlReady).then(function(view,ctrl){
			if(config.clear){
				$(config.clear).contents().not(target).remove();
			}
			var html = view[0];
			var domReady = ctrl.render(html);
			if(domReady){
				domReady.then(function(){
					ready.resolve(target,ctrl);
				});
			}
			else{
				ready.resolve(target,ctrl);
			}
		});

	});

	return ready.promise();
};
var getViewReady = function(el){
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
jstack.viewReady = function(el){
	return getViewReady(el).promise();
};
jstack.loader('[j-view]:not([j-view-loaded])',function(){
	
	//console.log('j-view',this);
	
	this.setAttribute('j-view-loaded','true');

	var view = this.getAttribute('j-view');

	var controller;
	if(this.hasAttribute('j-controller')){
		controller = this.getAttribute('j-controller');
	}
	else{
		controller = view;
	}

	var ready = getViewReady(this);

	var mvc = jstack.mvc({
		view:view,
		controller:controller,
		target:this,
	});
	
	mvc.then(function(){
		//setTimeout(function(){
			ready.resolve();
		//});
	});
});

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
			var promise = jstack.mvc({
				view:path,
				controller:path,
				hash:hash,
				target:$('<div/>').appendTo(el),
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
