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
			return jstack.mvc(path, hash);
		});
	};

	var el = $('[j-app]');
	if(el.length){
		jstack.app(el);
	}
	
}());