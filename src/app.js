(function(){

	jstack.app = function(el,app){
		if(!app){
			app = el.attr('j-app');
		}
		jstack.config.templatesPath = 'view-js/'+app+'/';
		jstack.config.controllersPath = 'controller-js/'+app+'/';
		
		jstack.route('*', function(path){
			path = jstack.url.getPath(path);
			jstack.mvc(path).then(function(){
				$(document).trigger('j:route:loaded');
			});
		});
	};

	var el = $('[j-app]');
	if(el.length){
		jstack.app(el);
	}
	
}());