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

	$.fn.populateForm = function( data, force ) {
		var $this = this;
		var populateSelect = function( $ctrls, value ) {
			var found = false;
			$( "option", $ctrls ).each( function() {
				if ( $( this ).val() == value ) {
					$( this ).prop( "selected", true );
					found = true;
				}
			} );
			if ( !found && force ) {
				$ctrls.append( '<option value="' + value + '" selected="selected">' + value + "</option>" );
			}
		};
		$.each( data, function( key, value ) {
			var $ctrls = $this.find( '[name="' + key + '"]' );
			if ( $ctrls.is( "select" ) ) {
				if ( value instanceof Array ) {
					for ( var i = 0, l = value.length; i < l; i++ ) {
						populateSelect( $ctrls, value[ i ] );
					}
				} else {
					populateSelect( $ctrls, value );
				}
			} else if ( $ctrls.is( "textarea" ) ) {
				$ctrls.val( value );
			} else {
				switch ( $ctrls.attr( "type" ) ){
					case "text":
					case "hidden":
						$ctrls.val( value );
						break;
					case "radio":
						if ( $ctrls.length >= 1 ) {
							$.each( $ctrls, function( index ) {
								var elemValue = $( this ).attr( "value" );
								var elemValueInData = singleVal = value;
								if ( elemValue === value ) {
									$( this ).prop( "checked", true );
								} else {
									$( this ).prop( "checked", false );
								}
							} );
						}
						break;
					case "checkbox":
						if ( $ctrls.length > 1 ) {
							$.each( $ctrls, function( index ) {
								var elemValue = $( this ).attr( "value" );
								var elemValueInData = undefined;
								var singleVal;
								for ( var i = 0; i < value.length; i++ ) {
									singleVal = value[ i ];
									if ( singleVal === elemValue ) {elemValueInData = singleVal;};
								}

								if ( elemValueInData ) {
									$( this ).prop( "checked", true );
								} else {
									$( this ).prop( "checked", false );
								}
							} );
						} else if ( $ctrls.length == 1 ) {
							$ctrl = $ctrls;
							if ( value ) {$ctrl.prop( "checked", true );} else {$ctrl.prop( "checked", false );}

						}
						break;
				}
			}
		} );
		return this;
	};

	$.fn.childrenHeight = function( outer ) {
		var topOffset = bottomOffset = 0;
		if ( typeof( outer ) == "undefined" ) outer = true;
		this.children().each( function( i, e ) {
			var $e = $( e );
			var eTopOffset = $e.offset().top;
			var eBottomOffset = eTopOffset + ( outer ? $e.outerHeight() : $e.height() );

			if ( eTopOffset < topOffset )
				topOffset = eTopOffset;
			if ( eBottomOffset > bottomOffset )
				bottomOffset = eBottomOffset;
		} );
		return bottomOffset - topOffset - this.offset().top;
	};
	
	$.fn.findExclude = function (Selector, Mask) {
		var result = $([]);
		$(this).each(function (Idx, Elem) {
			$(Elem).find(Selector).each(function (Idx2, Elem2) {
				if ($(Elem2).closest(Mask)[0] == Elem) {
					result =  result.add(Elem2);
				}
			});
		});
		return result;
	};

} )( jQuery );
