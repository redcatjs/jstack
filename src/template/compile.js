jstack.template.compile = function( el, cacheId, templatesPath, debug ) {
	if ( typeof( debug ) == "undefined" ) debug = $js.dev;
	var defer = $.Deferred();
	$.when.apply( $, jstack.template.directiveCompile( el, templatesPath ) ).then( function() {
		var templateProcessor = function( data ) {
			return jstack.template.directiveCompileLoaded( $( "<tmpl>" + jstack.template.parse( el, data, cacheId, debug ) + "</tmpl>" ) ).contents();
		};
		defer.resolve( templateProcessor );
	} );
	return defer;
};