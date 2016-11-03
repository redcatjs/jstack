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
	
	
	var getNamespaceSuspend = function(event,namespace){
		if(typeof(namespace)=='undefined'){
			namespace = 'suspend';
		}
		if(namespace){
			event = event.split(' ');
			$.each(event,function(i,v){
				event[i] = v+'.'+namespace;
			});
			event = event.join(' ');
		}
		return event;
	};
	$.fn.suspendEvent = function(event,namespace){
		event = getNamespaceSuspend(event,namespace);
		return this.on(event,function(e){
			e.stopPropagation();
		});
	};
	$.fn.resumeEvent = function(event,namespace){
		event = getNamespaceSuspend(event,namespace);
		return this.off(event);
	};
	
	$.arrayCompare = function (a, b) {
		return $(a).not(b).get().length === 0 && $(b).not(a).get().length === 0;
	};
	
	$.fn.reverse = function(){
		return $(this.get().reverse());
	};

} )( jQuery );