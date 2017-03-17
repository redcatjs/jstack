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
jstack.observe = function(obj, callback, rootObject){
	if(obj[prefix]){
		return obj;
	}
	$.each(obj,function(k,v){
		if(typeof(v)=='object'&&v!==null){
			obj[k] = jstack.observe(v,callback,obj);
		}
	});
	let proxy = new Proxy(obj,{
		get: function (target, key, receiver) {
			if(key===prefix){
				return true;
			}
			return Reflect.get(target,key,receiver);
		},
		set: function(target, key, value, receiver){
			if(typeof(value)=='object'&&value!==null){
				value = jstack.observe(value,callback,obj);
			}
			let r = Reflect.set(target, key, value, receiver);
			callback('set', {key:key, value:value}, target, rootObject);
			return r;
		},
		deleteProperty: function (target, key) {
			//let r = Reflect.deleteProperty(target,key);
			if (Array.isArray (target))
				target.splice(key,1);
			else
				delete(target[key]);
			callback('unset', key, target, rootObject);
			return true;
		},
		ownKeys: function(target){
			return Reflect.ownKeys(target);
		},
		
	});
	return proxy;
};

})();

(function(){
var constructor = function(controllerSet,element,hash){			
	var self = this;
	
	
	var data = element.data('jModel') || {};
	if(element[0].hasAttribute('j-view-inherit')){
		var parent = element.parent().closest('[j-controller]');
		if(parent.length&&element[0].hasAttribute('j-view-inherit')){
			var inheritProp = element[0].getAttribute('j-view-inherit');
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
	};
	$.extend(true,this,defaults,controllerSet);
	
	this.element = element;
	this.hash = hash;
	this.data = data;
	element.data('jController',this);
	
	this.startDataObserver = function(){
		var object = self.data;
				
		self.data = jstack.observe(self.data,function(changeType,data,target,rootObject){
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
		
		var el = this.element;
		el.data('jModel',this.data);
		el[0].setAttribute('j-controller',this.name);
		
		if(Boolean(el[0].getAttribute('j-view-append'))){
			el.append( html );
		}
		else{
			el.html( html );
		}
		
		var domReady = $.Deferred();
		
		jstack.ready(function(){
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
			var extend = $.Deferred();
			controller.dependencies.push(extend);
			var controllerPath = jstack.config.controllersPath+controller.extend;
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
			for(var i = 0, l = mixins.length;i<l;i++){
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
	
	if(!hash){
		var parent = element.parent().closest('[j-controller]');
		if(parent.length){
			hash = parent.data('jController').hash;
		}
		if(!hash){
			hash = window.location.hash;
		}
	}
	
	
	var controllerSet = jstack.controllers[controller] || jstack.controller($.extend(true,{name:controller},jstack.config.defaultController));
	
	var name = controllerSet.name;
	var ready = $.Deferred();
	
	var dependencies = [];
	
	if(controllerSet.dependencies&&controllerSet.dependencies.length){		
		var dependenciesJsReady = $.Deferred();
		$js(controllerSet.dependencies,function(){
			dependenciesJsReady.resolve();
		});
		dependencies.push(dependenciesJsReady);
	}
	
	$.when.apply($, dependencies).then(function(){
		
		var controller = new constructor(controllerSet,element,hash);
		
		var dependenciesDataReady = [];
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
jstack.walkTheDOM = function(node, func){
	if(func(node)===false){
		return;
	}
	var children = node.childNodes;
	for(var i = 0; i < children.length; i++){
		if(!children[i]) continue;
		this.walkTheDOM(children[i], func);
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
			var tokens = jstack.dataBinder.textTokenizer(v);
			var value;
			if(tokens===false){
				value = v;
			}
			else{
				value = jstack.dataBinder.compilerAttrRender(el,tokens);
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

jstack.ready = function(callback){
	var when = $.Deferred();
	
	var defers = [ jstack.dataBinder.updateDeferStateObserver ];
	if(jstack.dataBinder.loadingMutation>0){
		var deferMutation = $.Deferred();
		jstack.dataBinder.deferMutation.push(function(){
			deferMutation.resolve();
		});
		defers.push(deferMutation);
	}
	$.when.apply($,defers).then(function(){
		when.resolve();
	});

	if(callback){
		when.then(function(){
			callback();
		});
	}
	return when.promise();
};

jstack.dataBinder = (function(){
	var dataBinder = function(){

	};
	dataBinder.prototype = {
		dotGet: function(key,data,defaultValue){
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
		},
		dotSet: function(key,data,value,isDefault){
			if(typeof(data)!='object'||data===null){
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
		},
		getKey: function(key){
			return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" ).replace(/\[\]/g, '.');
		},
		getClosestFormNamespace:function(p){
			while(p){
				if(p.tagName&&p.tagName.toLowerCase()=='form'){
					if(p.hasAttribute('j-name')){
						return p.getAttribute('j-name');
					}
					break;
				}
				p = p.parentNode;
			}
		},
		getValue: function(el,varKey,defaultValue){
			var data = this.getControllerData(el);

			var key = '';

			var ns = this.getClosestFormNamespace(el.parentNode);
			if(ns){
				key += ns+'.';
			}

			key += varKey;

			return this.dotGet(key,data,defaultValue);
		},
		getParentsForId: function(el){
			var a = [];
			//if(el.hasAttribute&&el.hasAttribute('j-for-id')){
				//a.push(el);
			//}
			var n = el;
			while(n){
				if(n.nodeType===Node.COMMENT_NODE&&n.nodeValue.split(' ')[0]==='j:for:id'){
					a.push(n);
					n = n.parentNode;
					//if(n.hasAttribute&&n.hasAttribute('j-for-id')){
						//a.push(n);
					//}
				}
				if(n){
					if(n.previousSibling){
						n = n.previousSibling;
					}
					else{
						n = n.parentNode;
						//if(n&&n.hasAttribute&&n.hasAttribute('j-for-id')){
							//a.push(n);
						//}
					}
				}
				if(n===document.body) break;
			}
			return a;
		},
		getValueEval: function(el,varKey){

			var controllerEl = $(this.getController(el));
			var controller = controllerEl.data('jController');
			var scopeValue = controllerEl.data('jModel');

			if(!document.contains(el)){
				return;
			}

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


			var forCollection = this.getParentsForId(el).reverse();

			for(var i = 0, l = forCollection.length; i<l; i++){
				var forid = forCollection[i];

				var parentFor = $(forid);
				var parentForList = parentFor.parentComment('j:for');

				if(!parentForList.length) return;

				var jforCommentData = parentForList.dataCommentJSON();
				var value = jforCommentData.value;

				//var isComment = forid.nodeType===Node.COMMENT_NODE;

				//var forData = isComment?parentFor.dataComment('j:for:data'):parentFor.data('j:for:data');
				var forData = parentFor.dataComment('j:for:data');

				scopeValue[value] = forData;

				var key = jforCommentData.key;
				var index = jforCommentData.index;
				if(index){
					scopeValue[index] = parentFor.index()+1;
				}
				if(key){
					//var id = isComment?forid.nodeValue.split(' ')[1]:forid.getAttribute('j-for-id');
					var id = forid.nodeValue.split(' ')[1];
					scopeValue[key] = id;
				}
			}

			var params = [ '$controller', '$this', '$scope' ];
			var args = [ controller, el, scopeValue ];
			$.each(scopeValue,function(param,arg){
				params.push(param);
				args.push(arg);
			});

			params.push("return "+varKey+";");

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

			return typeof(value)=='undefined'?'':value;
		},
		getScopedInput: function(input){
			var name = input.getAttribute('name');
			var key = this.getKey(name);
			if(key.substr(-1)=='.'&&input.type=='checkbox'){
				var index;
				$(this.getController(input.parentNode)).find(':checkbox[name="'+name+'"]').each(function(i){
					if(this===input){
						index = i;
						return false;
					}
				});
				key += index;
			}
			var scopeKey = '';
			var ns = this.getClosestFormNamespace(input.parentNode);
			if(ns){
				scopeKey += ns+'.';
			}
			scopeKey += key;
			return scopeKey;
		},
		getters: {
			select: function(el){
				return $(el).val();
			},
			/*
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
			*/
			input: function(el) {
				switch(el.type){
					case 'checkbox':
						var $el = $(el);
						return $el.prop('checked')?$el.val():'';
					break;
					case 'radio':
						var form;
						var p = el.parentNode;
						while(p){
							if(p.tagName&&p.tagName.toLowerCase()=='form'){
								form = p;
								break;
							}
							p = p.parentNode;
						}
						if(form){
							var checked = $(form).find('[name="'+el.getAttribute('name')+'"]:checked');
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
			},
			textarea: function(el){
				return $(el).val();
			},
			'j-select': function(el){
				el = $(el);
				var multiple = el[0].hasAttribute('multiple');
				var data = el.data('preselect');
				if(!data){
					if(multiple){
						data = [];
					}
					el.children().each(function(){
						if(this.hasAttribute('selected')){
							var val = this.value;
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
			var nodeName = element.tagName.toLowerCase();
			var getter = this.getters[nodeName] || this.defaultGetter;
			return getter(element);
		},
		inputToModel: function(el,eventType,triggeredValue){
			var input = $(el);

			var self = this;

			var data = this.getControllerData(el);
			var name = el.getAttribute('name');

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

			var value;
			if(typeof(triggeredValue)!=='undefined'){
				value = triggeredValue;
			}
			else{
				value = this.getInputVal(el);
			}
			
			var filteredValue = this.filter(el,value);


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
		watchersPrimary: 0,
		watchers: {},
		addWatcher: function(render, level){
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

		//updateDeferState: 0,
		updateDeferQueued: false,
		updateDeferInProgress: false,
		updateDeferStateObserver: null,
		update: function(){
			//console.log('update');
			var self = this;
			if(this.updateDeferQueued){
				return;
			}
			if(this.updateDeferInProgress){
				this.updateDeferQueued = true;
			}
			else{
				this.updateDeferInProgress = true;
				if(!this.updateDeferStateObserver){
					this.updateDeferStateObserver = $.Deferred();
				}
				setTimeout(function(){
					self.runWatchers();
					self.updateDeferInProgress = false;
					if(self.updateDeferQueued){
						self.updateDeferQueued = false;
						self.update();
					}
					else{
						self.updateDeferStateObserver.resolve();
						self.updateDeferStateObserver = null;
					}
				},10);
				
			}
			//this.updateDeferStateObserver.then(function(){
				//self.updateDeferStateObserver = $.Deferred();
				//self.runWatchers();
				//self.updateDeferState--;
				//if(self.updateDeferState==0){
					//self.updateDeferStateObserver.resolve();
				//}
			//})
			//var updater = function(){
				//self.updateDeferState++;
				//var callback = function(){
					//self.runWatchers();
					//self.updateDeferState--;
					//if(self.updateDeferState==0){
						//self.updateDeferStateObserver.resolve();
						//self.updateDeferStateObserver = null;
					//}
				//};
				//if(!self.updateDeferStateObserver){
					//self.updateDeferStateObserver = $.Deferred();
					//callback();
				//}
				//else{
					//self.updateDeferStateObserver.then(function(){
						//callback();
					//});
				//}
			//};
			//if(this.updateTimeout){
				//clearTimeout(this.updateTimeout);
			//}
			//if(self.updateDeferStateObserver){
				//this.updateTimeout = setTimeout(updater,100);
			//}
			//else{
				//updater();
			//}
		},

		compileNode: function(node,compilerJloads){
			var self = this;

			jstack.walkTheDOM(node,function(n){
				if(!document.body.contains(n)) return false;

				if(self.observe(n)===false){
					return false;
				}

				var $n = $(n);

				if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
					var renders = jstack.dataBinder.compilerText.call(n);
					if(renders){
						for(var i = 0, l=renders.length;i<l;i++){
							self.addWatcher(renders[i],99);
							renders[i]();
						}
					}
					return;
				}

				if(n.nodeType!=Node.ELEMENT_NODE) return;

				var once = n.hasAttribute('j-once');
				if(once){
					jstack.walkTheDOM(n,function(el){
						if(el.nodeType==Node.ELEMENT_NODE){
							el.setAttribute('j-once-element','true');
						}
					});
					n.removeAttribute('j-once');
				}
				else{
					once = n.hasAttribute('j-once-element');
					if(once){
						n.removeAttribute('j-once-element');
					}
				}

				$.each(self.compilers,function(k,compiler){
					var matchResult = compiler.match.call(n);
					if(matchResult){
						var render = compiler.callback.call(n,matchResult);
						if(render){
							if(!once){
								self.addWatcher(render, compiler.level);
							}
							render();
							
							//if(!document.contains(n)){
								//return false;
							//}
							
						}
					}
				});

				if(!document.body.contains(n)) return false;


				compilerJloads.push(function(){
					//setTimeout(function(){
						if(n.hasAttribute('j-cloak')){
							n.removeAttribute('j-cloak');
						}
						if($n.data('j:load:state')){
							return;
						}
						$n.data('j:load:state',true);
						//$n.trigger('j:load');
						jstack.trigger(n,'load');
					//});
				});

			});

		},
		loadingMutation: 0,
		deferMutation: [],
		loadMutations: function(mutations){
			//console.log('mutations',mutations);

			var self = this;

			var compilerJloads = [];
			$.each(mutations,function(i,mutation){
				$.each(mutation.addedNodes,function(ii,node){
					self.compileNode(node,compilerJloads);
				});

				$.each(mutation.removedNodes,function(ii,node){
					jstack.walkTheDOM(node,function(n){
						if(n.nodeType===Node.COMMENT_NODE&&self.checkRemoved(n)){
							$(n).removeDataComment();
							return false;
						}

						if(n.nodeType==Node.TEXT_NODE){
							return false;
						}

						if(!$(n).data('j:load:state')){
							return false;
						}

						//$(n).trigger('j:unload');
						jstack.trigger(n,'unload');
					});
				});
			});

			setTimeout(function(){
				self.loadingMutation--;

				if(self.loadingMutation==0){
					while(self.deferMutation.length){
						self.deferMutation.pop()();
					}
				}

				for(var i = 0, l=compilerJloads.length;i<l;i++){
					compilerJloads[i]();
				}
			});

		},
		noChildListNodeNames: {area:1, base:1, br:1, col:1, embed:1, hr:1, img:1, input:1, keygen:1, link:1, menuitem:1, meta:1, param:1, source:1, track:1, wbr:1, script:1, style:1, textarea:1, title:1, math:1, svg:1, canvas:1},
		inputPseudoNodeNames: {input:1 ,select:1, textarea:1},
		observe: function(n){
			if(n.nodeType!=Node.ELEMENT_NODE) return;
			if(n.hasAttribute('j-escape')){
				return false;
			}
			if(this.noChildListNodeNames[n.tagName.toLowerCase()]){
				return;
			}

			var self = this;
			var mutationObserver = new MutationObserver(function(m){
				//console.log(m);
				self.loadingMutation++;
				setTimeout(function(){
					self.loadMutations(m);
				});
			});
			mutationObserver.observe(n, {
				subtree: false,
				childList: true,
				characterData: true,
				attributes: false,
				attributeOldValue: false,
				characterDataOldValue: false,
			});
			$(n).data('j:observer',mutationObserver);
		},
		eventListener: function(){
			var self = this;

			jstack.walkTheDOM(document.body,function(el){
				return self.observe(el);
			});

			$(document.body).on('input change j:update', ':input[name]', function(e,value){
				if(this.type=='file') return;
				if(e.type=='input'&&(this.nodeName.toLowerCase()=='select'||this.type=='checkbox'||this.type=='radio'))
					return;
				self.inputToModel(this,e.type,value);
			});
		},
		filter:function(el,value){
			var filter = this.getFilter(el);
			if(typeof(filter)=='function'){
				value = filter(value);
			}
			return value;
		},
		getFilter:function(el){
			$el = $(el);
			var filter = $el.data('j-filter');
			if(!filter){
				var attrFilter = el.getAttribute('j-filter');
				if(attrFilter){
					var method = this.getValue(el,attrFilter);
					$el.data('j-filter',method);
				}
			}
			return filter;
		},
		getControllerData:function(el){
			return $(this.getController(el)).data('jModel');
		},
		getController:function(p){

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
		},
		getControllerObject:function(el){
			return $(this.getController(el)).data('jController');
		},

		inputPseudoNodeNamesExtended: {input:1 ,select:1, textarea:1, button:1, 'j-input':1, 'j-select':1},
		compilers:{
			jFixedController:{
				level: 0,
				match: function(){
					return this.hasAttribute('j-fixed-controller');
				},
				callback: function(){
					this.removeAttribute('j-fixed-controller');
					let controllerData = $(jstack.dataBinder.getController(this)).data();
					$(this).data({
						jController:controllerData.jController,
						jModel:controllerData.jModel,
					});
					this.setAttribute('j-controller','__fixed');
				}
			},
			jFor:{
				level: 1,
				match:function(){
					return this.hasAttribute('j-for');
				},
				callback:function(){
					var el = this;
					var $this = $(this);
					var jfor = $('<!--j:for-->');
					var jforClose = $('<!--/j:for-->');
					$this.replaceWith(jfor);
					jforClose.insertAfter(jfor);

					var attrFor = el.getAttribute('j-for');
					el.removeAttribute('j-for');
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
						return jstack.dataBinder.getValueEval(jfor[0],myvar);
					};

					//parentForList
					jfor.dataCommentJSON({
						value:value,
						key:key,
						index:index,
					});

					var render;
					
					let isTemplate = el.tagName.toLowerCase()=='template';
					//if(el.tagName.toLowerCase()=='template'){
						var content = this.content;

						render = function(){
							if(!document.body.contains(jfor[0])) return jfor[0];

							var data = getData();
							if(currentData===data) return;
							currentData = data;
							
							if(!data){
								data = [];
							}
							
							var forIdList = [];
							var collection = $( jfor.commentChildren().map(function(){
								if(this.nodeType===Node.COMMENT_NODE&&this.nodeValue.split(' ')[0] == 'j:for:id'){
									return this;
								}
							}) );

							//add
							$.each(data,function(k,v){
								var row = $( collection.map(function(){
									if(this.nodeValue == 'j:for:id '+k){
										return this;
									}
								}) );
								var create = !row.length;
								if(create){
									row = $('<!--j:for:id '+k+'-->');
								}
								row.dataComment('j:for:data',v);
								if(create){
									row.insertBefore(jforClose);
									let addRow;
									if(isTemplate){
										addRow = $(document.importNode(content, true));
									}
									else{
										addRow = $this.clone();
										addRow.attr('j-for-id',k);
									}
									addRow.insertBefore(jforClose);
									
									$('<!--/j:for:id-->').insertBefore(jforClose);
								}
								forIdList.push(k.toString());
							});

							//remove
							collection.each(function(){
								var forId = this.nodeValue.split(' ')[1];
								if(forIdList.indexOf(forId)===-1){
									$(this).commentChildren().remove();
									$(this).remove();
								}
							});

						};
					/*}
					else{
						render = function(){
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
									row[0].setAttribute('j-for-id',k);
								}
								row.data('j:for:data',v);
								if(create){
									row.insertBefore(jforClose);
								}
								forIdList.push(k.toString());
							});

							//remove
							collection.each(function(){
								if(!this.getAttribute) return;
								var forId = this.getAttribute('j-for-id');
								if(forIdList.indexOf(forId)===-1){
									$(this).remove();
								}
							});

						};
					}*/

					return render;


				},
			},
			jIf:{
				level: 2,
				match:function(){
					return this.hasAttribute('j-if')&&document.contains(this);
				},
				callback:function(){
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
						return Boolean(jstack.dataBinder.getValueEval(jif[0],myvar));
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
								if( Boolean(jstack.dataBinder.getValueEval(jif[0],myvar2[i])) ){
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
			jSwitch:{
				level: 3,
				match:function(){
					return this.hasAttribute('j-switch');
				},
				callback:function(){
					var el = this;
					var $this = $(this);
					var myvar = this.getAttribute('j-switch');
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

					return render;
				},
			},
			jShow:{
				level: 4,
				match:function(){
					return this.hasAttribute('j-show');
				},
				callback:function(){
					var el = this;
					var $this = $(this);

					var myvar = this.getAttribute('j-show');
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
			jHref:{
				level: 5,
				match:function(){
					return this.hasAttribute('j-href');
				},
				callback:function(){

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
					var getData = jstack.dataBinder.createCompilerAttrRender(el,tokens);
					var render = function(){
						if(!document.body.contains(el)) return el;

						var data = getData();
						if(currentData===data) return;
						currentData = data;
						el.setAttribute('href',jstack.route.baseLocation + "#" + data);
					};

					return render;
				},
			},
			jTwoPoints:{
				level: 6,
				match:function(){
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
				callback:function(attrs){
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
						if(!document.body.contains(el)||attrsVars.length==0) return el;
						$.each(attrsVars,function(k,v){
							var value = jstack.dataBinder.compilerAttrRender(el,v);
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
					return render;
				},
			},
			jInputFile:{
				level: 8,
				match: function(){
					return this.hasAttribute('name')&&this.tagName.toLowerCase()=='input'&&this.type=='file';
				},
				callback:function(){
					$(this).on('input change', function(e){
						jstack.dataBinder.inputToModel(this,e.type);
					});
				}
			},
			jInput:{
				level: 8,
				match: function(){
					return this.hasAttribute('name')&&jstack.dataBinder.inputPseudoNodeNamesExtended[this.tagName.toLowerCase()]&&this.type!='file';
				},
				callback:function(){
					var el = this;
					var $el = $(this);

					var currentData;

					//default to model
					var key = jstack.dataBinder.getScopedInput(this);
					var val = jstack.dataBinder.getInputVal(this);
					jstack.dataBinder.dotSet(key,jstack.dataBinder.getControllerData(el),val,true);

					var getData = function(){
						var defaultValue = jstack.dataBinder.getInputVal(el);
						var key = jstack.dataBinder.getKey( el.getAttribute('name') );
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
		},
		compilerAttrRender: function(el,tokens){
			var r = '';
			for(var i = 0, l = tokens.length; i<l; i++){
				var token = tokens[i];
				if(token.substr(0,2)=='{{'){
					token = jstack.dataBinder.getValueEval(el,token.substr(2,token.length-4));
				}
				r += token?token:'';
			}
			return r;
		},
		createCompilerAttrRender: function(el,tokens){
			return function(){
				return jstack.dataBinder.compilerAttrRender(el,tokens);
			};
		},
		createCompilerTextRender: function(text,token){
			var currentData;
			return function(){
				if(!document.body.contains(text[0])) return text[0];
				var data = jstack.dataBinder.getValueEval(text[0],token);
				if(currentData===data) return;
				currentData = data;
				text.commentChildren().remove();
				text.after(data);
			};
		},
		compilerText:function(){
			if(!this.textContent) return;
			var textString = this.textContent.toString();
			var tokens = jstack.dataBinder.textTokenizer(textString);
			if(tokens===false) return;

			var el = this;
			var $this = $(this);
			var renders = [];

			var last = $this;

			for(var i = 0, l = tokens.length; i < l; i++){
				var token = tokens[i];

				if(token.substr(0,2)!='{{'){
					token = document.createTextNode(token);
					last.after(token);
					last = token;
					continue;
				}

				var text = $('<!--j:text-->');
				var textClose = $('<!--/j:text-->');
				text.insertAfter(last);
				textClose.insertAfter(text);
				last = textClose;

				token = token.substr(2,token.length-4);
				renders.push(jstack.dataBinder.createCompilerTextRender(text,token));
			};
			$this.remove();

			return renders;
		},
		textTokenizer:function(text){
			var tagRE = /\{\{((?:.|\n)+?)\}\}/g;
			if (!tagRE.test(text)) {
				return false;
			}
			var tokens = [];
			var lastIndex = tagRE.lastIndex = 0;
			var match, index;
			while ((match = tagRE.exec(text))) {
				index = match.index;
				// push text token
				if (index > lastIndex) {
					tokens.push(text.slice(lastIndex, index));
				}
				// tag token
				var exp = match[1].trim();
				tokens.push("{{" + exp + "}}");
				lastIndex = index + match[0].length;
			}
			if (lastIndex < text.length) {
				tokens.push(text.slice(lastIndex));
			}
			return tokens;
		},
	};
	var o = new dataBinder();
	o.eventListener();
	return o;
})();
$.on('reset','form',function(){
	$(this).populateReset();
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
