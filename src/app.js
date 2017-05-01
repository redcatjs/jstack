(function(){

	jstack.app = function(el,app){
		if(!app){
			app = el[0].getAttribute('j-app');
		}
		jstack.config.templatesPath += app+'/';
		jstack.config.controllersPath += app+'/';
		
		$(document).on('j:route:unload',function(){
			$.xhrPool.abortAll();
		});
		
		jstack.route('*', function(path, params, hash){
			path = jstack.url.getPath(path);
			var promise = jstack.load($('<div/>').appendTo(el),{
				component:path,
				hash:hash,
				clear:el[0],
			});
			return promise;
		});
	};

	var el = $('[j-app]');
	if(el.length){
		jstack.app(el);
	}
	
}());
