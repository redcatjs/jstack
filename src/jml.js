jstack.jml = function( url, data ) {
	var cacheId = url;
	var defer = $.Deferred();
	var templatesPath = url.split('/');
	templatesPath.pop();
	templatesPath = templatesPath.join('/')+'/';
	
	if ( !data ) data = {};
	jstack.getTemplate( url ).then( function( html ) {
		var el = $('<tmpl>'+html+'</tmpl>');
		jstack.processTemplate( el, cacheId, templatesPath ).then( function( templateProcessor ) {
			defer.resolve( templateProcessor( data ) );
		} );
	} );
	
	return defer;
};