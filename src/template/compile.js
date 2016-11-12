jstack.template.compile = function( el, cacheId, templatesPath ) {
	var defer = $.Deferred();
	$.when.apply( $, jstack.template.directiveCompile( el, templatesPath ) ).then( function() {
		var templateProcessor = function( data ) {
			return jstack.template.directiveCompileLoaded( $( "<tmpl>" + jstack.template.parse( el, data, cacheId ) + "</tmpl>" ) ).contents();
		};
		defer.resolve( templateProcessor );
	} );
	return defer;
};