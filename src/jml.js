jstack.jml = function(url,data){
	if(!data) data = {};
	var templatesPath = url.split('/');
	templatesPath.pop();
	templatesPath = templatesPath.join('/')+'/';
	var cacheId = url;
	var defer = $.Deferred();
	jstack.getTemplate(url).then(function(html){
		var el = $('<tmpl>'+html+'</tmpl>');
		jstack.processTemplate(el, cacheId, templatesPath).then(function(templateProcessor){
			defer.resolve( templateProcessor(data) );
		});
	});
	return defer;
};