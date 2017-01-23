jstack.jml = function( url ) {
	var defer = $.Deferred();
	url = jstack.config.templatesPath+url;
	jstack.getTemplate( url ).then( function( html ) {
		defer.resolve( html );
	} );
	return defer;
};