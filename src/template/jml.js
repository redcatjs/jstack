jstack.jml = function( url ) {
	var defer = $.Deferred();
	url = jstack.config.templatesPath+url;
	jstack.template.get( url ).then( function( html ) {
		defer.resolve( jstack.template.parse( html ) );
	} );
	return defer;
};