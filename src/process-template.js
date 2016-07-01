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
