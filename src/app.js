(function(){

	jstack.app = function(el,app){
		if(!app){
			app = el[0].getAttribute('j-app');
		}
		jstack.config.templatesPath += app+'/';
		jstack.config.controllersPath += app+'/';
		
		jstack.route('*', function(path){
			path = jstack.url.getPath(path);
			return jstack.mvc(path);
		});
	};

	var el = $('[j-app]');
	if(el.length){
		jstack.app(el);
	}
	
}());