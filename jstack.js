jstackClass = function(){};
jstackClass.prototype.extend = function(c,parent){
	c.prototype = Object.create(parent.prototype);
};
jstack = new jstackClass();
( function( $ ) {

	$.fn.changeVal = function( v ) {
		return $( this ).val( v ).trigger( "change" );
	};

	$.uniqid = function() {
		var id;
		do {
			id = uniqid( "uid-" );
		}
		while ( $( "#" + id ).length );
		return id;
	};
	$.fn.getId = function( force ) {
		var id = this.attr( "id" );
		if ( !id || force ) {
			id = $.uniqid();
			this.attr( "id", id );
		}
		return id;
	};

	$.fn.serializeAssoc = function() {
		var data = {};
		this.each( function() {
			$.each( $( this ).serializeArray(), function( i, o ) {
				data[ o.name ] = o.value;
			} );
		} );
		return data;
	};

	$.fn.hasVerticalScrollBar = function() {
		return this.get( 0 ) ? this.get( 0 ).scrollHeight > this.innerHeight() : false;
	};

	$.fn.hasHorizontalScrollBar = function() {
		return this.get( 0 ) ? this.get( 0 ).scrollWidth > this.innerWidth() : false;
	};

	$.fn.attrParams = function( attr ) {
		if ( !attr ) attr = "data";
		var data = {},
			l = attr.length;
		this.each( function() {
			$.each( this.attributes, function() {
				var key = this.name, value = this.value;
				if ( key.substr( 0, l ) == attr ) {
					key = key.substr( l + 1 );
					key = key.camelCaseDash();
					key = key.lcfirst();

					if ( value == "true" )
						value = true;
					else if ( value == "false" )
						value = false;
					else if ( $.isNumeric( value ) )
						value = parseInt( value, 10 );

					data[ key ] = value;
				}
			} );
		} );
		return data;
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
		}
	} );
	
	$.extend($.expr[':'], {
		attrStartsWith: function (el, _, b) {
			for (var i = 0, atts = el.attributes, n = atts.length; i < n; i++) {
				if(atts[i].nodeName.toLowerCase().indexOf(b[3].toLowerCase()) === 0) {
					return true; 
				}
			}
			return false;
		}
	});
	$.extend($.expr[':'], {
		attrEndsWith: function (el, _, b) {
			for (var i = 0, atts = el.attributes, n = atts.length; i < n; i++) {
			  var att = atts[i].nodeName.toLowerCase(),
				  str = b[3].toLowerCase();
				if(att.length >= str.length && att.substr(att.length - str.length) === str) {
					return true; 
				}
			}
			
			return false;
		}
	});

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
	
	$.fn.removeCss = function(style){
        var search = new RegExp(style + '[^;]+;?', 'g');
        return this.each(function(){
			var style = $(this).attr('style');
			if(style){
				$(this).attr('style', style.replace(search, ''));
			}
        });
    };
    
    $.fn.removeClassPrefix = function(prefix) {
		this.each(function(i, el) {
			var classes = el.className.split(" ").filter(function(c) {
				return c.lastIndexOf(prefix, 0) !== 0;
			});
			el.className = $.trim(classes.join(" "));
		});
		return this;
	};
	
	$.fn.setVal = $.fn.val;
	$.fn.val = function() {
		var returnValue = $.fn.setVal.apply( this, arguments );
		if ( arguments.length ) {
			this.trigger( "val" );
		}
		return returnValue;
	};
	
	$.arrayCompare = function (a, b) {
		return $(a).not(b).get().length === 0 && $(b).not(a).get().length === 0;
	};
	
	$.fn.reverse = function(){
		return $(this.get().reverse());
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
	
	$.escapeRegExp = function(str){
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	};
	
	$.on = function(event,selector,callback){
		return $(document).on(event,selector,callback);
	};
	
	$.off = function(event,selector,callback){
		return $(document).off(event,selector,callback);
	};
	
	
	$.attrsToObject = function( k, v, r ) {
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
	
} )( jQuery );
(function(){

jstack.component = {};

var loadComponent = function(){
	var el = this;
	var component = $(el).attr('j-component');
	var config = $(el).dataAttrConfig('j-data-');
	var paramsData = $(el).attr('j-params-data');
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
		$(el).data('j:component',o);			
	};
	if(jstack.component[component]){
		load();
	}
	else{					
		$js('jstack.'+component,load);
	}
};

var loadJqueryComponent = function(){
	var el = this;
	var component = $(el).attr('jquery-component');
	var config = $(el).dataAttrConfig('j-data-');
	var paramsData = $(el).attr('j-params-data');
	var params = [];
	if(paramsData){
		var keys = [];
		for (var k in config) {
			if (config.hasOwnProperty(k)) {
				keys.push(k);
			}
		}
		keys.sort();
		for(var i=0,l=keys.length;i<l;i++){
			params.push(config[keys[i]]);
		}
	}
	else if(!$.isEmptyObject(config)){
		params.push(config);
	}
	var load = function(){
		$(el).data('j:component',$.fn[component].apply($(el), params));
	};
	if($.fn[component]){
		load();
	}
	else{					
		$js('jstack.jquery.'+component,load);
	}
};

$.on('j:load','[j-component]',loadComponent);
$.on('j:load','[jquery-component]',loadJqueryComponent);
$.on('j:unload','[j-component]',function(){
	var o = $(this).data('j:component');
	if(o&&typeof(o.unload)=='function'){
		o.unload();
	}
});

$('[j-component]').each(function(){
	if( !$(this).data('j:component') ){
		loadComponent.call(this);
	}
});
$('[jquery-component]').each(function(){
	if( !$(this).data('j:component') ){
		loadJqueryComponent.call(this);
	}
});

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

})();
jstack.hasOwnProperty2 = function(o,k){
	var v = o[k];
	return v!==Object[k]&&v!==Object.__proto__[k]&&v!==Array[k]&&v!==Array.__proto__[k];
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
			this.fns[ i ].apply( this, params );
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
		map[ path ].addHandler( fn );
	};

	var routie = function( path, fn, extendParams ) {
		if ( typeof fn == "function" ) {
			addHandler( path, fn );
			routie.reload();
		} else if ( typeof path == "object" ) {
			for ( var p in path ) {
				addHandler( p, path[ p ] );
			}
			routie.reload();
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
			$( window ).trigger( "mainHashchange" );
			return hashLoad( currentHash );
		} else {
			$( window ).trigger( "subHashchange" );
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

( function( w, j ) {

	j.templateVarSubstitutions = {};

	//Var separatorStart = '<%';
	//var separatorEnd = '%>';
	//var escapeRegExp = function(str) {
		//return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|\%]/g, "\\$&");
	//}
	//var separatorEndE = escapeRegExp(separatorEnd);
	//var separatorStartE = escapeRegExp(separatorStart);

	var separatorStart = "<%";
	var separatorEnd = "%>";
	var separatorStartE = "<\%";
	var separatorEndE = "\%>";

	var cache = {};
	var reg1 = eval( "/'(?=[^" + separatorEndE + "]*" + separatorEndE + ")/g" );
	var reg2 = eval( "/" + separatorStartE + "=(.+?)" + separatorEndE + "/g" );
	
	j.template = function( html, data, id, debug ) {
		var fn;
		if ( id && cache[ id ] ) {
			fn = cache[ id ];
		} else {
			var substitutions = j.templateVarSubstitutions;
			html = html.html();
			for ( var k in substitutions ) {
				if ( substitutions.hasOwnProperty( k ) ) {
					html = html.replace( new RegExp(k, 'g'), separatorStart + substitutions[ k ] + separatorEnd );
				}
			}
			var logUndefined = debug?'console.log(tmplException.message);':'';
			var compile = "var tmplString=''; with(tmplObj){ tmplString += '" + html
				.replace( /[\r\t\n]/g, " " )
				.replace( reg1, "\t" )
				.split( "'" ).join( "\\'" )
				.split( "\t" ).join( "'" )
				.replace( reg2, "'; try{ tmplString += $1 }catch(tmplException){ "+logUndefined+" }; tmplString += '" )
				.split( separatorStart ).join( "';" )
				.split( separatorEnd ).join( "tmplString += '" ) +
				"';} return tmplString;";
			try {
				fn = new Function( "tmplObj", compile );
				if ( id ) cache[ id ] = fn;
			}
			catch ( e ) {
				if ( debug ) {
					console.log( e );
					console.log( compile );
					console.log( html );
				}
			}
		}
		return data ? fn( data ) : fn;
	};

} )( window, jstack );
( function( w, j ) {
	var registry = {};
	j.controller = function( id ) {
		var fn, sync, deps = true;
		for ( var i = 0; i < arguments.length; i++ ) {
			switch ( typeof( arguments[ i ] ) ){
				case "boolean":
					sync = arguments[ i ];
				break;
				case "function":
					fn = arguments[ i ];
				break;
				case "object":
					deps = arguments[ i ];
				break;
			}
		}
		if ( deps instanceof Array ) {
			$js.require( deps, sync );
		}

		if ( fn ) {
			var ctrl = function() {
				return fn.apply( ctrl, arguments );
			};
			ctrl.jstack = {};
			registry[ id ] = ctrl;
		}
		return registry[ id ];
	};

} )( window, jstack );

( function( w, j, $ ) {
	var directives = {};
	j.directive = function( id, fn ) {
		if ( fn ) {
			directives[ id ] = fn;
		}
		return directives[ id ];
	};
	j.directiveCompileLoaded = function( el ) {
		el.find( "*" ).each( function() {
			var self = $( this );
			$.each( this.attributes, function() {
				var key = this.name;
				if ( key.substr( 0, 9 ) == "j-loaded-" ) {
					self.attr( key.substr( 9 ), this.value );
					self.removeAttr( key );
				}
			} );
		} );
		return el;
	};
	j.directiveCompile = function( el, templatesPath ) {
		var deferreds = [];
		$.each( directives, function( k, d ) {
			el.find( "[j-" + k + "]," + k + "[j]" ).each( function() {
				var ctag = this.tagName == k.toUpperCase();
				var self = $( this );
				var val = ctag ? self.attr( "j" ) : self.attr( "j-" + k );
				var deferred = d( val, self, templatesPath );
				if ( deferred ) {
					deferreds.push( deferred );
				}
				if ( ctag ) {
					self.removeAttr( "j" );
					if ( deferred ) {
						deferred.then( function() {
							self.replaceWith( self.html() );
						} );
					} else {
						self.replaceWith( self.html() );
					}
				} else {
					self.removeAttr( "j-" + k );
				}
			} );
		} );
		return deferreds;
	};

	$.fn.jmlInject = function( jq, snippet ) {
		return this.each( function() {
			var $this = $( this );
			var uid = uniqid( "tmpl" );
			j.templateVarSubstitutions[ uid ] = snippet;
			$this[ jq ]( uid );
		} );
	};

} )( window, jstack, jQuery );

( function( w, j ) {

	j.directive( "foreach", function( val, el ) {
		var sp;
		if ( val.indexOf( " as " ) !== -1 ) {
			sp = val.split( " as " );
			el.jmlInject( "before", "$.each(" + sp[ 0 ] + ", function(i," + sp[ 1 ] + "){" );
		} else {
			sp = val.split( " in " );
			el.jmlInject( "before", "$.each(" + sp[ 1 ] + ", function(" + sp[ 0 ] + "){" );
		}
		el.jmlInject( "after", "});" );
	} );

	j.directive( "href", function( val, el ) {
		href = j.route.baseLocation + "#" + val;
		el.attr( "href", href );
	} );

	j.directive( "src", function( val, el ) {
		el.attr( "j-loaded-src", val );
	} );

	j.directive( "include", function( val, el, templatesPath ) {
		var ext = val.split( "." ).pop();
		var include = templatesPath + val;
		if ( ext != "jml" ) {
			include += ".jml";
		}
		var deferred = $.Deferred();
		jstack.getTemplate( include ).then( function( html ) {
			var inc = $( "<tmpl>" + html + "</tmpl>" );
			$.when.apply( $, jstack.directiveCompile( inc, templatesPath ) ).then( function() {
				el.html( inc.contents() );
				deferred.resolve();
			} );
		} );
		return deferred;
	} );

	j.directive( "extend", function( val, el, templatesPath ) {
		var extend = templatesPath + val;
		var ext = val.split( "." ).pop();
		if ( ext != "jml" && ext != "xjml" ) {
			extend += ".xjml";
		}
		var deferred = $.Deferred();
		jstack.getTemplate( extend ).then( function( html ) {
			var inc = $( "<tmpl>" + html + "</tmpl>" );
			$.when.apply( $, jstack.directiveCompile( inc, templatesPath ) ).then( function() {
				el.find( ">*" ).each( function() {
					var $this = $( this );
					var selector = $this.attr( "selector" );
					if ( !selector ) selector = $this.attr( "j" );
					var method = this.tagName.toLowerCase();
					var contents = $this.contents();
					var target = inc.find( selector );
					if ( contents.length ) {
						target[ method ]( $this.contents() );
					} else {
						target[ method ]();
					}
				} );
				el.replaceWith( inc.contents() );
				deferred.resolve();
			} );
		} );
		return deferred;
	} );

} )( window, jstack );
function uniqid( prefix, more_entropy ) {
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
}

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

( function( w, j ) {
	var templates = {};
	var requests = {};
	j.getTemplate = function( templatePath ) {
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
				success:function( tpl ) {
					var substitutions = {};
					var html = "";
					var sp = tpl.split( "<%" );
					for ( var i = 0, l = sp.length; i < l; i++ ) {
						if ( i ) {
							var sp2 = sp[ i ].split( "%>" );
							for ( var i2 = 0, l2 = sp2.length; i2 < l2; i2++ ) {
								if ( i2 % 2 ) {
									html += sp2[ i2 ];
								} else {
									var uid = uniqid( "tmpl" );
									html += uid;
									substitutions[ uid ] = sp2[ i2 ];
								}
							}
						} else {
							html += sp[ i ];
						}
					}
					$.extend( j.templateVarSubstitutions, substitutions );
					templates[ templatePath ] = html;
					requests[ templatePath ].resolve( templates[ templatePath ], templatePath );
				}
			} );
		}
		return requests[ templatePath ];
	};

} )( window, jstack );
jstack.processTemplate = function( el, cacheId, templatesPath, debug ) {
	if ( typeof( debug ) == "undefined" ) debug = $js.dev;
	var defer = $.Deferred();
	$.when.apply( $, jstack.directiveCompile( el, templatesPath ) ).then( function() {
		var templateProcessor = function( data ) {
			return jstack.directiveCompileLoaded( $( "<tmpl>" + jstack.template( el, data, cacheId, debug ) + "</tmpl>" ) ).contents();
		};
		defer.resolve( templateProcessor );
	} );
	return defer;
};
jstack.dataBinder = (function(){
	var dataBinder = function(){
		
	};
	dataBinder.prototype = {
		dotGet: function(key,data){
			return key.split('.').reduce(function(obj,i){
				if(typeof(obj)=='object'){
					return obj[i];
				}
			}, data);
		},
		dotSet: function(key,data,value,isDefault){
			if(typeof(data)!='object'){
				return;
			}
			key.split('.').reduce(function(obj,k,index,array){
				if(array.length==index+1){
					if(!isDefault||!obj[k]){
						obj[k] = value;
					}
				}
				else{
					if(typeof(obj[k])!='object'){
						obj[k] = {};
					}					
					return obj[k];
				}
			}, data);
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
			return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" );
		},
		getValue: function(el,varKey){
			var self = this;
			var data = $(el).closest('[j-controller]').data('jModel');
			var key = self.getScoped(el,varKey);
			return self.dotGet(key,data);
		},
		getAttrValue: function(el,attr){
			var attrKey = $(el).attr(attr);
			return this.getValue(el,attrKey);
		},
		getScopeValue: function(el){
			var scope = $(el).closest('[j-scope]');
			if(!scope.length){
				return $(el).closest('[j-controller]').data('jModel');
			}
			return this.getAttrValue(scope,'j-scope');
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
			var name = $(input).attr('name');
			var key = this.getKey(name);
			return this.getScoped(input,key);
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
			SELECT: function(element){
				return $( element ).val();
			},
			INPUT: function(element) {
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
			TEXTAREA: function(element){
				return $( element ).val();
			}
		},
		defaultGetter: function(element){
			return $( element ).html();
		},
		getInputVal: function(element){
			var elementType = element.tagName;
			var getter = this.getters[elementType] || this.defaultGetter;
			return getter(element);
		},
		populate: function(controller){
			var self = this;
			controller = $(controller);
			controller.find(':input[name]').each(function(){
				var value = self.getAttrValue(this,'name');
				$(this).populateInput(value,{preventValEvent:true});
				$(this).trigger('val:model');
			});
			controller.find('[j-var]').each(function(){
				var value = self.getAttrValue(this,'j-var');
				$(this).html(value);
			});
			controller.find(':attrStartsWith("j-var-")').each(function(){
				var $this = $(this);
				var attrs = $this.attrStartsWith('j-var-');
				$.each(attrs,function(k,varAttr){					
					var match = varAttr.match(/\${\s*[\w\.]+\s*}/g);
					if(match){
						$.each(match,function(i,x){
							var v = x.match(/[\w\.]+/)[0];
							var value = self.getValue($this.get(0),v);
							if(typeof(value)=='undefined'||value===null||!value){
								value = '';
							}
							varAttr = varAttr.replace(new RegExp("\\$\\{"+v+"\\}",'g'),value);
						});
					}
					$this.attr(k.substr(6),varAttr);
				});
			});
		},
		observer: null,
		stateObserver: true,
		eventListener: function(){
			var self = this;
			self.observer = new MutationObserver(function(mutations){
				//console.log(mutations);
				//console.log('mutations');
			
				var events = $._data(document,'events');
				var eventsLoad = events['j:load'] || [];
				var eventsUnload = events['j:unload'] || [];
				
				var eventLoad = $.Event('j:load');
				var eventUnload = $.Event('j:unload');
				var update = false;
				$.each(mutations,function(i,mutation){
					$.each(mutation.addedNodes,function(ii,node){
						var nodes = $(node).add($(node).find('*'));
						
						nodes.each(function(iii,n){
							if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
								return;
							}
							update = true;
							$.each(eventsLoad,function(type,e){
								if(e.selector&&$(n).is(e.selector)){
									e.handler.call(n,eventLoad);
								}
							});
							
						});
						
					});
					$.each(mutation.removedNodes,function(ii,node){
						var nodes = $(node).add($(node).find('*'));
							
						nodes.each(function(iii,n){
							if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
								return;
							}
							update = true;
							$.each(eventsUnload,function(type,e){
								if(e.selector&&$(n).is(e.selector)){
									e.handler.call(n,eventUnload);
								}
							});
							
						});
							
					});
				});
				
				if(!self.stateObserver||!update) return;
				
				self.triggerUpdate();
			});
			self.observer.observe(document, { subtree: true, childList: true, attribute: false, characterData: true });
			
			$.on('j:load',':input[name]',function(){
				self.inputToModel(this,'load:model',true);
			});
			$(document.body).on('input val', ':input[name]', function(e){
				if(e.type=='val'&&$(this).data('jPreventVal'))	
					return;
				self.inputToModel(this,'input:model');
			});
		},
		inputToModel: function(el,eventName,isDefault){
			var self = this;
			var input = $(el);
			var controller = input.closest('[j-controller]');
			var data = controller.data('jModel');
			var name = input.attr('name');
			var value = self.getInputVal(el);
			var key = self.getScopedInput(el);
			self.dotSet(key,data,value,isDefault);
			
			var defer = $.Deferred();
			self.triggerUpdate(defer);
			defer.then(function(){
				input.trigger(eventName);
			});
		},
		updateDefers: [],
		updateDeferStateObserver: null,
		updateTimeout: null,
		triggerUpdate: function(defer){
			var self = this;
			if(self.updateTimeout){
				clearTimeout(self.updateTimeout);
			}
			if(defer){
				self.updateDefers.push(defer);
			}
			self.updateTimeout = setTimeout(function(){
				
				if(self.updateDeferStateObserver){
					self.updateDeferStateObserver.then(function(){
						self.triggerUpdate();
					});
					return;
				}
				else{
					self.updateDeferStateObserver = $.Deferred();
				}
				
				self.stateObserver = false;
				
				self.update();
				
				while(self.updateDefers.length){
					self.updateDefers.pop().resolve();
				}
				
				
				self.updateDeferStateObserver.resolve();
				self.updateDeferStateObserver = false;
				
				self.stateObserver = true;
				
			}, 100);
		},
		update: function(){
			var self = this;
			self.updateRepeat();
			self.updateIf();
			self.updateController();
			self.updateOn();
			
		},
		updateOn: function(){
			var self = this;
			$(':attrStartsWith("j-on-")').each(function(){
				var $this = $(this);
				var attrs = $this.attrStartsWith('j-on-');
				$.each(attrs,function(k,v){
					var event = k.substr(5);
					$this.removeAttr(k);
					$this.on(event,function(){
						var method = self.getValue($this,v);
						if(typeof(method)!='function'){
							return;
						}
						var r = method.apply(this,arguments);
						if(r===false){
							return false;
						}
						if(r){
							$.when(r).then(function(){
								self.triggerUpdate();
							});
						}
					});
				});
			});
		},
		updateController: function(){
			var self = this;
			$('[j-controller]').each(function(){
				self.populate(this);
			});
		},
		updateIf: function(){
			var self = this;
			$('[j-if]').each(function(){
				var $this = $(this);
				var value = self.getAttrValue(this,'j-if');
				
				var contents = $this.data('jIf');
				if(!contents){
					contents = $this.contents();
					$this.data('jIf',contents);
				}
				
				if(value){
					contents.appendTo($this);
					$this.trigger('j-if:true');
				}
				else{
					contents.detach();
					$this.trigger('j-if:false');
				}
			});
		},
		updateRepeat: function(){
			var self = this;
			$('[j-repeat]').each(function(){
				var $this = $(this);
				
				var parent = $this.parent();
				parent.attr('j-repeat-list','true');
				var list = parent.data('jRepeatList') || [];
				list.push(this);
				parent.data('jRepeatList',list);
				
				$this.detach();
			});
			
			$('[j-repeat-list]').each(function(){
				var $this = $(this);
				var data = $this.closest('[j-controller]').data('jModel');
				var list = $this.data('jRepeatList') || [];
				var scopes = [];
				
				//add
				$.each(list,function(i,original){
					var $original = $(original);
										
					var attrRepeat = $original.attr('j-repeat');
					var key = self.getScoped($this.get(0),attrRepeat);
					var value = self.dotGet(key,data);
					
					var i = 1;
					$.each(value,function(k,v){
						var scope = attrRepeat+'.'+k;
						var row = $this.children('[j-scope="'+scope+'"]');
						if(!row.length){
							row = $original.clone();
							row.removeAttr('j-repeat');
							row.attr('j-scope',scope);
							row.attr('j-scope-id',k);
							row.appendTo($this);
						}
						row.find('[j-index]').text(i);
						scopes.push(scope);
						i++;
					});
					
				});
				
				//remove
				$this.children('[j-scope]').each(function(){
					var scope = $(this).attr('j-scope');
					if(scopes.indexOf(scope)===-1){
						$(this).remove();
					}
				});
			});
		},
	};
	var o = new dataBinder();
	o.eventListener();
	return o;
})();
jstack.loadView = function( o ) {
	var html = $( "<tmpl>" + o.templateHtml + "</tmpl>" );
	if ( !html.find( "> *" ).length ) {
		html.wrapInner( "<div />" );
	}
	var controllers = html.find( "[j-controller]" );
	var processors = {};
	if ( !controllers.length ) {
		html.children( 0 ).attr( "j-controller", o.path || "" );
		controllers = html.find( "[j-controller]" );
	}
	var readyControllers = 0;
	var totalControllers = controllers.length;

	if ( !o.defaultController ) {
		o.defaultController = function( controllerPath ) {
			jstack.controller( controllerPath, function() {
				this.jstack.render();
			} );
		};
	}

	controllers.each( function() {
		var self = $( this );
		var controllerPath = self.attr( "j-controller" );
		var controllerName = controllerPath.replace( "/", "." );

		var cacheId = o.templatePath + "#" + controllerPath;

		var templatesPath = o.templatePath.split( "/" );
		templatesPath.pop();
		templatesPath = templatesPath.join( "/" );
		if ( templatesPath ) templatesPath += "/";

		var compileView = jstack.processTemplate( self, cacheId, templatesPath ).then( function( templateProcessor ) {
			processors[ controllerPath ] = function( data ) {
				var processedTemplate = templateProcessor( data );
				
				self.data('j-model',data);
				self.html( processedTemplate );
			};
		} );
		var controllerRendered = $.Deferred();
		var loadController = function() {
			var ctrl = jstack.controller( controllerPath );
			if ( !ctrl ){
				console.log( 'jstack controller "' + controllerPath + '" not found as expected (or parse error) in "' + o.controllersPath + controllerPath + '"' );
			}
			
			ctrl.jstack.render = function( data ) {
				if ( !data ) data = {};
				ctrl.jstack.data = data;
				var processedTemplate = processors[ controllerPath ]( ctrl.jstack.data );
				controllerRendered.resolve();
				return data;
			};
			ctrl.jstack.element = self;
			return ctrl;
		};
		var controllerReady = $.Deferred();
		var viewReady = $.Deferred();
		$.when( controllerReady, viewReady ).then( function() {
			var ctrl = loadController();
			readyControllers++;
			if ( readyControllers == totalControllers ) {
				$.when( controllerRendered ).then( function() {
					$( "[j-view]" ).html( html.contents() );
					$(document).trigger('j:view:load');
				} );
			}
			ctrl();
		} );
		compileView.then( function() {
			viewReady.resolve();
		} );
		$js.onExists( o.controllersPath + controllerPath,
			function() {
				controllerReady.resolve();
			},
			function() {
				o.defaultController( controllerPath );
				controllerReady.resolve();
			}
		);

	} );
};
( function( $, j ) {
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
			if(jstack.hasOwnProperty2(o,k)){
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
jstack.paramsReflection = function( f ) {
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

jstack.replaceAllRegExp = function( str, find, replace ) {
  return str.replace( new RegExp( find, "g" ), replace );
};
jstack.escapeRegExp = function( find ) {
	return find.replace( /([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1" );
};
jstack.replaceAll = function( str, find, replace ) {
	find = jstack.escapeRegExp( find );
	return jstack.replaceAllRegExp( str, find, replace );
};
jstack.camelCaseDataToObject = function( k, v, r ) {
	var s = k.replace( /([A-Z])/g, " $1" ).toLowerCase().split( " " );
	if ( typeof( r ) == "undefined" ) r = {};
	var ref = r;
	var l = s.length - 1;
	$.each( s, function( i, key ) {
		if ( i == l ) {
			ref[ key ] = v;
		} else {
			if ( !ref[ key ] ) ref[ key ] = {};
			ref = ref[ key ];
		}
	} );
	return r;
};

jstack.jml = function( url, data ) {
	if ( !data ) data = {};
	var templatesPath = url.split( "/" );
	templatesPath.pop();
	templatesPath = templatesPath.join( "/" ) + "/";
	var cacheId = url;
	var defer = $.Deferred();
	jstack.getTemplate( url ).then( function( html ) {
		var el = $( "<tmpl>" + html + "</tmpl>" );
		jstack.processTemplate( el, cacheId, templatesPath ).then( function( templateProcessor ) {
			defer.resolve( templateProcessor( data ) );
		} );
	} );
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
( function( $ ) {
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
    if ( typeof ownerDoc == "undefined" ) {
      ownerDoc = document;
    }

    if ( typeof jsonML == "string" ) {
      return $( ownerDoc.createTextNode( jsonML ) );
    }

    if ( $.isArray( jsonML ) ) {
      var length = jsonML.length;

      if ( length >= 1 && typeof jsonML[ 0 ] == "string" ) {
        var $item = $( ownerDoc.createElement( jsonML[ 0 ] ) );

        if ( length == 1 ) {
          return $item;
        }

        var start = 1;

        /* Add attributes */
        if ( $.isPlainObject( jsonML[ 1 ] ) ) {
          $item.attr( jsonML[ 1 ] );

          if ( length == 2 ) {
            return $item;
          }

          start++;
        }

        var
          item = $item.get( 0 ),
          scriptEval = $item.is( "script" ) && !$.support.scriptEval(),
          ieObject = $.browser.msie && $item.is( "object" );

        for ( var i = start; i < length; i++ ) {
          try {
            if ( scriptEval && typeof jsonML[ i ] == "string" ) {
              item.text = jsonML[ i ];
              continue;
            }

            var $node = $.jsonml( jsonML[ i ], ownerDoc );

            if ( ieObject ) {
              var object = $item.get( 0 );
              object.innerHTML = object.innerHTML + $node.get( 0 ).outerHTML;
            } else {
              $node.appendTo( $item );
            }
          } catch ( e ) {
            throw "Could not insert " + $node.get( 0 ).nodeName + " to " + $item.get( 0 ).nodeName + ": " + e;
          }
        }

        return $item;
      }
    }

    throw "Invalid JsonML format: " + jsonML;
  };

	//Addon by surikat
	$.fn.jsonml = function() {
		var a = [];
		if ( this.length > 1 ) {
			this.each( function() {
				a.push( $( this ).jsonml() );
			} );
		} else {
			var el = this[ 0 ];
			if ( !el ) return;
			a.push( el.tagName.toLowerCase() );
			var props = {}, propNotEmpty;
			$.each( el.attributes, function( i, v ) {
				props[ v.name ] = v.value;
				propNotEmpty = true;
			} );
			if ( propNotEmpty ) {
				a.push( props );
			}
			var c = this.children().each( function() {
				a.push( $( this ).jsonml() );
			} );
		}
		return a;
	};

} )( jQuery );

// Vim: set ai ts=2 sw=2 et:

String.prototype.trim = function( charlist ) {
	return trim( this, charlist );
};
String.prototype.ltrim = function( charlist ) {
	return ltrim( this, charlist );
};
String.prototype.rtrim = function( charlist ) {
	return rtrim( this, charlist );
};

String.prototype.camelCase = function() {
	return this.replace( /(\_[a-z])/g, function( $1 ) {return $1.toUpperCase().replace( "_", "" );} );
};

String.prototype.snakeCase = function() {
	return this.replace( /([A-Z])/g, function( $1 ) {return "_" + $1.toLowerCase();} );
};

String.prototype.camelCaseDash = function() {
	return this.replace( /(\-[a-z])/g, function( $1 ) {return $1.toUpperCase().replace( "-", "" );} );
};

String.prototype.snakeCaseDash = function() {
	return this.replace( /([A-Z])/g, function( $1 ) {return "-" + $1.toLowerCase();} );
};

String.prototype.lcfirst = function() {
	return this.charAt( 0 ).toLowerCase() + this.substr( 1 );
};
String.prototype.ucfirst = function() {
	return this.charAt( 0 ).toUpperCase() + this.substr( 1 );
};

/**
 * jQuery serializeObject
 * @copyright 2014, macek <paulmacek@gmail.com>
 * @link https://github.com/macek/jquery-serialize-object
 * @license BSD
 * @version 2.5.0
 */
( function( root, factory ) {

  // AMD
  if ( typeof define === "function" && define.amd ) {
    define( [ "exports", "jquery" ], function( exports, $ ) {
      return factory( exports, $ );
    } );
  }

  // CommonJS
  else if ( typeof exports !== "undefined" ) {
    var $ = require( "jquery" );
    factory( exports, $ );
  }

  // Browser
  else {
    factory( root, ( root.jQuery || root.Zepto || root.ender || root.$ ) );
  }

}( this, function( exports, $ ) {

  var patterns = {
    validate: /^[a-z_][a-z0-9_]*(?:\[(?:\d*|[a-z0-9_]+)\])*$/i,
    key:      /[a-z0-9_]+|(?=\[\])/gi,
    push:     /^$/,
    fixed:    /^\d+$/,
    named:    /^[a-z0-9_]+$/i
  };

  function FormSerializer( helper, $form ) {

    // Private variables
    var data     = {},
        pushes   = {};

    // Private API
    function build( base, key, value ) {
      base[ key ] = value;
      return base;
    }

    function makeObject( root, value ) {

      var keys = root.match( patterns.key ), k;

      // Nest, nest, ..., nest
      while ( ( k = keys.pop() ) !== undefined ) {
        // Foo[]
        if ( patterns.push.test( k ) ) {
          var idx = incrementPush( root.replace( /\[\]$/, "" ) );
          value = build( [], idx, value );
        }

        // Foo[n]
        else if ( patterns.fixed.test( k ) ) {
          value = build( [], k, value );
        }

        // Foo; foo[bar]
        else if ( patterns.named.test( k ) ) {
          value = build( {}, k, value );
        }
      }

      return value;
    }

    function incrementPush( key ) {
      if ( pushes[ key ] === undefined ) {
        pushes[ key ] = 0;
      }
      return pushes[ key ]++;
    }

    function encode( pair ) {
      switch ( $( '[name="' + pair.name + '"]', $form ).attr( "type" ) ) {
        case "checkbox":
          return pair.value === "on" ? true : pair.value;
        default:
          return pair.value;
      }
    }

    function addPair( pair ) {
      if ( !patterns.validate.test( pair.name ) ) return this;
      var obj = makeObject( pair.name, encode( pair ) );
      data = helper.extend( true, data, obj );
      return this;
    }

    function addPairs( pairs ) {
      if ( !helper.isArray( pairs ) ) {
        throw new Error( "formSerializer.addPairs expects an Array" );
      }
      for ( var i = 0, len = pairs.length; i < len; i++ ) {
        this.addPair( pairs[ i ] );
      }
      return this;
    }

    function serialize() {
      return data;
    }

    function serializeJSON() {
      return JSON.stringify( serialize() );
    }

    // Public API
    this.addPair = addPair;
    this.addPairs = addPairs;
    this.serialize = serialize;
    this.serializeJSON = serializeJSON;
  }

  FormSerializer.patterns = patterns;

  FormSerializer.serializeObject = function serializeObject() {
    return new FormSerializer( $, this ).
      addPairs( this.serializeArray() ).
      serialize();
  };

  FormSerializer.serializeJSON = function serializeJSON() {
    return new FormSerializer( $, this ).
      addPairs( this.serializeArray() ).
      serializeJSON();
  };

  if ( typeof $.fn !== "undefined" ) {
    $.fn.serializeObject = FormSerializer.serializeObject;
    $.fn.serializeJSON   = FormSerializer.serializeJSON;
  }

  exports.FormSerializer = FormSerializer;

  return FormSerializer;
} ) );
$.fn.populateInput = function( value, config ) {
	config = $.extend({
		addMissing: false,
		preventValEvent: false,
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
	var populateSelect = function( input, value ) {
		var found = false;
		if(input.hasClass('select2-hidden-accessible')){
			setValue(input,value);
			if(!config.preventValEvent){
				input.trigger('change');
			}
			return;
		}
		if(input[0].hasAttribute('data-preselect')){
			input.attr('data-preselect',value);
			return;
		}
		$( "option", input ).each( function() {
			if ( $( this ).val() == value ) {
				$( this ).prop( "selected", true );
				found = true;
			}
		} );
		if ( !found && config.addMissing ) {
			input.append( '<option value="' + value + '" selected="selected">' + value + "</option>" );
			$( this ).prop( "selected", true );
		}
	};
	return this.each(function(){
		var input = $(this);
		if ( input.is( "select" ) ) {
			if ( value instanceof Array ) {
				for ( var i = 0, l = value.length; i < l; i++ ) {
					populateSelect( input, value[ i ] );
				}
			}
			else {
				populateSelect( input, value );
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
								$( this ).prop( "checked", false );
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
								$( this ).prop( "checked", false );
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
		addMissing: false,
		not: false,
		notContainer: false
	},config);
	var $this = this;
	var assignValue = function( key, value ){
		if(value===null){
			value = '';
		}
		var inputs = $this.find('[name="'+key+'"]');
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
	var assignValueRecursive = function(key, value){
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
		if($(this).is('form')){
			$(this).populateForm(value, config);
		}
		else{
			$(this).populateInput(value, config);
		}
	});
};
(function(j,$){
	var getVal = function(input){
		var val = input.val();
		if(input.is('input[type=checkbox]')){
			return input.prop('checked')?val:false;
		}
		else{
			return val;
		}
	};
	$.fn.dataIf = function(options){
		options = $.extend({
			closestSelector: 'form'
		},options||{});
		var uid = uniqid('data-if');
		return this.each(function(){
			var self = $(this);
			self.find('[data-if]').each(function(){
				var $this = $(this);
				var dataIf = $this.attr('data-if');
				var match = dataIf.match(/\${\s*[\w\.]+\s*}\$/g);
				dataIf = dataIf.replace(/\$\{/g,"getVal($this.closest('"+options.closestSelector+"').find('[name=\"");
				dataIf = dataIf.replace(/\}\$/g,"\"]:eq(0)'))");
				var showOrHide = function(){
					var ok = eval(dataIf);
					if(ok){
						$this.show();
						$this.attr('data-if-ok','true');
						$this.trigger('data-if:show');
					}
					else{
						$this.hide();
						$this.attr('data-if-ok','false');
						$this.trigger('data-if:hide');
					}
				};
				if(match){
					$.each(match,function(i,x){
						var v = x.match(/[\w\.]+/)[0];
						var input = $this.closest(options.closestSelector).find('[name="'+v+'"]:eq(0)');
						if(!input.data(uid)){
							input.data(uid,true);
							input.on('input change val',function(e){
								if(options.onChange){
									options.onChange.call(self);
								}
								$this.trigger('data-if:change');
							});
						}
						input.on('input change val',function(){
							showOrHide();
						});
					});
				}
				showOrHide();				
			});
			
			if(options.onShow){
				self.on('data-if:show','[data-if]',options.onShow);
			}
			if(options.onHide){
				self.on('data-if:hide','[data-if]',options.onHide);
			}
			
		});
	};
})(jstack,jQuery);
/*
from https://github.com/serbanghita/formToObject.js with some modifications:
- allow checkbox not array
- register as jstack method
- register as jquery native plugin: $('form').toObject()
*/

(function (window, document, undefined) {
  'use strict';

  var formToObject = function () {

    if (!(this instanceof formToObject)) {
      var test = new formToObject(); // jscs:ignore requireCapitalizedConstructors
      return test.init.call(test, Array.prototype.slice.call(arguments));
    }

    /**
     * Defaults
     */

    var formRef = null;

    // Experimental. Don't rely on them yet.
    var settings = {
      includeEmptyValuedElements: false,
      w3cSuccessfulControlsOnly: false
    };

    // Currently matching only '[]'.
    var keyRegex = /[^\[\]]+|\[\]/g;
    var $form = null;
    var $formElements = [];

    /**
     * Private methods
     */

    /**
     * Check to see if the object is a HTML node.
     *
     * @param {object} node
     * @returns {boolean}
     */
    function isDomElementNode(node) {
      return !!(node &&
        typeof node === 'object' &&
        'nodeType' in node &&
        node.nodeType === 1);
    }

    /**
     * Check for last numeric key.
     *
     * @param o object
     * @return mixed (string|undefined)
     */
    function checkForLastNumericKey(o) {
      if (!o || typeof o !== 'object') {
        return undefined;
      }

      return Object.keys(o).filter(function (elem) {
        return !isNaN(parseInt(elem, 10));
      }).splice(-1)[0];
    }

    /**
     * Get last numeric key from an object.
     * @param o object
     * @return int
     */
    function getLastIntegerKey(o) {
      var lastKeyIndex = checkForLastNumericKey(o);
      if (typeof lastKeyIndex === 'string') {
        return parseInt(lastKeyIndex, 10);
      } else {
        return 0;
      }
    }

    /**
     * Get the next numeric key (like the index from a PHP array)
     * @param o object
     * @return int
     */
    function getNextIntegerKey(o) {
      var lastKeyIndex = checkForLastNumericKey(o);
      if (typeof lastKeyIndex === 'string') {
        return parseInt(lastKeyIndex, 10) + 1;
      } else {
        return 0;
      }
    }

    /**
     * Get the real number of properties from an object.
     *
     * @param {object} o
     * @returns {number}
     */
    function getObjLength(o) {
      if (typeof o !== 'object' || o === null) {
        return 0;
      }

      var l = 0;
      var k;

      if (typeof Object.keys === 'function') {
        l = Object.keys(o).length;
      } else {
        for (k in o) {
          if (o.hasOwnProperty(k)) {
            l++;
          }
        }
      }

      return l;
    }

    /**
     * Simple extend of own properties.
     * Needed for our settings.
     *
     * @param  {object} destination The object we want to extend.
     * @param  {object} sources The object with new properties that we want to add the the destination.
     * @return {object}
     */
    function extend(destination, sources) {
      var i;
      for (i in sources) {
        if (sources.hasOwnProperty(i)) {
          destination[i] = sources[i];
        }
      }

      return destination;
    }

    // Iteration through arrays and objects. Compatible with IE.
    function forEach(arr, callback) {
      if ([].forEach) {
        return [].forEach.call(arr, callback);
      }

      var i;
      for (i in arr) {
        // Using Object.prototype.hasOwnProperty instead of
        // arr.hasOwnProperty for IE8 compatibility.
        if (Object.prototype.hasOwnProperty.call(arr, i)) {
          callback.call(arr, arr[i]);
        }
      }

      return;
    }

    // Constructor
    function init(options) {
      // Assign the current form reference.
      if (!options || typeof options !== 'object' || !options[0]) {
        return false;
      }

      // The form reference is always the first parameter of the method.
      // Eg: formToObject('myForm')
      formRef = options[0];

      // Override current settings.
      // Eg. formToObject('myForm', {mySetting: true})
      if (typeof options[1] !== 'undefined' && getObjLength(options[1]) > 0) {
        extend(settings, options[1]);
      }

      if (!setForm()) {
        return false;
      }

      if (!setFormElements()) {
        return false;
      }

      return convertToObj();
    }

    // Set the main form object we are working on.
    function setForm() {
      switch (typeof formRef) {
      case 'string':
        $form = document.getElementById(formRef);
        break;

      case 'object':
        if (isDomElementNode(formRef)) {
          $form = formRef;
        }

        break;
      }

      return $form;
    }

    function isUploadForm() {
      return ($form.enctype && $form.enctype === 'multipart/form-data' ? true : false);
    }

    // Set the elements we need to parse.
    function setFormElements() {
      $formElements = $form.querySelectorAll('input, textarea, select');
      return $formElements.length;
    }

    function isRadio($domNode) {
      return $domNode.nodeName === 'INPUT' && $domNode.type === 'radio';
    }

    function isCheckbox($domNode) {
      return $domNode.nodeName === 'INPUT' && $domNode.type === 'checkbox';
    }

    function isFileField($domNode) {
      return $domNode.nodeName === 'INPUT' && $domNode.type === 'file';
    }

    function isTextarea($domNode) {
      return $domNode.nodeName === 'TEXTAREA';
    }

    function isSelectSimple($domNode) {
      return $domNode.nodeName === 'SELECT' && $domNode.type === 'select-one';
    }

    function isSelectMultiple($domNode) {
      return $domNode.nodeName === 'SELECT' && $domNode.type === 'select-multiple';
    }

    function isSubmitButton($domNode) {
      return $domNode.nodeName === 'BUTTON' && $domNode.type === 'submit';
    }

    function isChecked($domNode) {
      return $domNode.checked;
    }

    //function isMultiple($domNode){
    //  return ($domNode.multiple ? true : false);
    //}

    function isFileList($domNode) {
      return (window.FileList && $domNode.files instanceof window.FileList);
    }

    function getNodeValues($domNode) {
      // We're only interested in the radio that is checked.
      if (isRadio($domNode)) {
        return isChecked($domNode) ? $domNode.value : false;
      }

      // We're only interested in the checkbox that is checked.
      if (isCheckbox($domNode)) {
        return isChecked($domNode) ? $domNode.value : false;
      }

      // File inputs are a special case.
      // We have to grab the .files property of the input, which is a FileList.
      if (isFileField($domNode)) {
        // Ignore input file fields if the form is not encoded properly.
        if (isUploadForm()) {
          // HTML5 compatible browser.
          if (isFileList($domNode) && $domNode.files.length > 0) {
            return $domNode.files;
          } else {
            return ($domNode.value && $domNode.value !== '' ? $domNode.value : false);
          }
        } else {
          return false;
        }
      }

      // We're only interested in textarea fields that have values.
      if (isTextarea($domNode)) {
        return ($domNode.value && $domNode.value !== '' ? $domNode.value : false);
      }

      if (isSelectSimple($domNode)) {
        if ($domNode.value && $domNode.value !== '') {
          return $domNode.value;
        } else if ($domNode.options && $domNode.options.length && $domNode.options[0].value !== '') {
          return $domNode.options[0].value;
        } else {
          return false;
        }
      }

      // We're only interested in multiple selects that have at least one option selected.
      if (isSelectMultiple($domNode)) {
        if ($domNode.options && $domNode.options.length > 0) {
          var values = [];
          forEach($domNode.options, function ($option) {
            if ($option.selected) {
              values.push($option.value);
            }
          });

          if (settings.includeEmptyValuedElements) {
            return values;
          } else {
            return (values.length ? values : false);
          }

        } else {
          return false;
        }
      }

      // We're only interested if the button is type="submit"
      if (isSubmitButton($domNode)) {
        if ($domNode.value && $domNode.value !== '') {
          return $domNode.value;
        }

        if ($domNode.innerText && $domNode.innerText !== '') {
          return $domNode.innerText;
        }

        return false;
      }

      // Fallback or other non special fields.
      if (typeof $domNode.value !== 'undefined') {
        if (settings.includeEmptyValuedElements) {
          return $domNode.value;
        } else {
          return ($domNode.value !== '' ? $domNode.value : false);
        }
      } else {
        return false;
      }
    }

    function processSingleLevelNode($domNode, arr, domNodeValue, result) {
      // Get the last remaining key.
      var key = arr[0];

      // We're only interested in the radio that is checked.
      if (isRadio($domNode)) {
        if (domNodeValue !== false) {
          result[key] = domNodeValue;
          return domNodeValue;
        } else {
          return;
        }
      }

      // Checkboxes are a special case.
      // We have to grab each checked values
      // and put them into an array.
      //if (isCheckbox($domNode)) {
        //if (domNodeValue !== false) {
          //if (!result[key]) {
            //result[key] = [];
          //}
          //return result[key].push(domNodeValue);
        //} else {
          //return;
        //}
      //}

      // Multiple select is a special case.
      // We have to grab each selected option and put them into an array.
      if (isSelectMultiple($domNode)) {
        if (domNodeValue !== false) {
          result[key] = domNodeValue;
        } else {
          return;
        }
      }

      // Fallback or other cases that don't
      // need special treatment of the value.
      result[key] = domNodeValue;

      return domNodeValue;
    }

    function processMultiLevelNode($domNode, arr, value, result) {
      var keyName = arr[0];

      if (arr.length > 1) {
        if (keyName === '[]') {
          //result.push({});
          result[getNextIntegerKey(result)] = {};
          return processMultiLevelNode(
            $domNode,
            arr.splice(1, arr.length),
            value,
            result[getLastIntegerKey(result)]
          );
        } else {
          if (result[keyName] && getObjLength(result[keyName]) > 0) {
            //result[keyName].push(null);
            return processMultiLevelNode(
              $domNode,
              arr.splice(1, arr.length),
              value,
              result[keyName]
            );
          } else {
            result[keyName] = {};
          }

          return processMultiLevelNode($domNode, arr.splice(1, arr.length), value, result[keyName]);
        }
      }

      // Last key, attach the original value.
      if (arr.length === 1) {
        if (keyName === '[]') {
          //result.push(value);
          result[getNextIntegerKey(result)] = value;
          return result;
        } else {
          processSingleLevelNode($domNode, arr, value, result);

          //  result[keyName] = value;
          return result;
        }
      }
    }

    function convertToObj() {
      var i = 0;
      var objKeyNames;
      var $domNode;
      var domNodeValue;
      var result = {};
      var resultLength;

      for (i = 0; i < $formElements.length; i++) {

        $domNode = $formElements[i];

        // Skip the element if the 'name' attribute is empty.
        // Skip the 'disabled' elements.
        // Skip the non selected radio elements.
        if (!$domNode.name ||
          $domNode.name === '' ||
          $domNode.disabled ||
          (isRadio($domNode) && !isChecked($domNode))
        ) {
          continue;
        }

        // Get the final processed domNode value.
        domNodeValue = getNodeValues($domNode);

        // Exclude empty valued nodes if the settings allow it.
        if (domNodeValue === false && !settings.includeEmptyValuedElements) {
          continue;
        }

        // Extract all possible keys
        // Eg. name="firstName", name="settings[a][b]", name="settings[0][a]"
        objKeyNames = $domNode.name.match(keyRegex);

        if (objKeyNames.length === 1) {
          processSingleLevelNode(
            $domNode,
            objKeyNames,
            (domNodeValue ? domNodeValue : ''),
            result
          );
        }

        if (objKeyNames.length > 1) {
          processMultiLevelNode(
            $domNode,
            objKeyNames,
            (domNodeValue ? domNodeValue : ''),
            result
          );
        }

      }

      // Check the length of the result.
      resultLength = getObjLength(result);

      return resultLength > 0 ? result : false;
    }

    /**
     * Expose public methods.
     */
    return {
      init: init
    };

  };

  /**
   * Expose the final class.
   * @type Function
   */
/*
  if (typeof define === 'function' && define.amd) {
    // AMD/requirejs: Define the module
    define(function () {
      return formToObject;
    });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = formToObject;
  } else {
    // Browser: Expose to window
    window.formToObject = formToObject;
  }
*/  
  
  jstack.formToObject = formToObject;
  $.fn.toObject = function(){
	  return formToObject(this.get(0));
  };

})(window, document);