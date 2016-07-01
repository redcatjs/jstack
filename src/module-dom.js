( function( jstack ) {

	var moduleDomElement = function( module, el, attrNs ) {
		var o = {};
		var attributes = el.attributes;
		var prefixNs = attrNs + "-";
		var prefixNsL = prefixNs.length;
		for ( var k in attributes ) {
			if ( attributes.hasOwnProperty( k ) ) {
				var attribute = attributes[ k ];
				if ( attribute.name && attribute.name.substr( 0, prefixNsL ) == prefixNs ) {
					o[ attribute.name.substr( prefixNsL ).toCamelCase() ] = attribute.value;
				}
			}
		}
		el.$js = o;
		var loadModuleDomElement = function() {
			var
				func = $js.module( module ),
				apply = [],
				params
			;
			if ( func instanceof Array ) {
				var tmpParams = func;
				func = tmpParams.pop();
				params = {};
				for ( var k in tmpParams ) {
					if ( tmpParams.hasOwnProperty( k ) ) {
						params[ tmpParams[ k ] ] = null;
					}
				}
			} else {
				params = jstack.paramsReflection( func );
			}
			for ( var k in params ) {
				if ( params.hasOwnProperty( k ) ) {
					if ( k == "$di" ) {
						apply.push( o );
					} else if ( typeof( o[ k ] ) != "undefined" ) {
						apply.push( o[ k ] );
					} else {
						apply.push( params[ k ] );
					}
				}
			}
			func.apply( el, apply );
		};
		if ( $js.module( module ) ) {
			loadModuleDomElement();
		} else if ( $js.waitingModule[ module ] ) {
			$js.waitingModule[ module ]( loadModuleDomElement );
		} else {
			$js( module, loadModuleDomElement );
		}
	};

	jstack.moduleDomNs = "js";
	jstack.moduleDomPath = "js/js-module-dom/";
	jstack.moduleDom = function( prefixPath, attrNs ) {
		if ( !prefixPath )
			prefixPath = jstack.moduleDomPath;
		if ( !attrNs )
			attrNs = jstack.moduleDomNs;
		var all = document.getElementsByTagName( "*" );
		for ( var i = 0; i < all.length; i++ ) {
			if ( !all[ i ].$js ) {
				var js = all[ i ].getAttribute( attrNs );
				if ( js ) {
					moduleDomElement( prefixPath + js, all[ i ], attrNs );
				}
			}
		}
	};

} )( jstack );
