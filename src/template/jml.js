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
		defer.resolve( jstack.template.parse( el, data, cacheId ) );
	} );
	
	return defer;
};