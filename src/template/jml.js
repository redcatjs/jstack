jstack.jml = function( url, data ) {
	var cacheId = url;
	var defer = $.Deferred();
	var templatesPath = url.split('/');
	templatesPath.pop();
	templatesPath = templatesPath.join('/')+'/';
	
	templatesPath = jstack.config.templatesPath+templatesPath;
	url = jstack.config.templatesPath+url;
	
	if ( !data ) data = {};
	jstack.template.get( url ).then( function( html ) {
		var el = $('<tmpl>'+html+'</tmpl>');
		jstack.template.compile( el, cacheId, templatesPath ).then( function( templateProcessor ) {
			defer.resolve( templateProcessor( data ) );
		} );
	} );
	
	return defer;
};