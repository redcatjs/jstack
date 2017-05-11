(function(){
const loadRoute = function($el,route){
	//route.children.each(function(){
		
	//});
	
	let component = route.component;
	jstack.componentRegistry[route.path] = component;
	
	jstack.route(route.path, function(path, params, hash){
		return jstack.load( $('<div/>').appendTo($el), {
			component:component,
			route:{
				path: jstack.url.getPath(path),
				hash: hash,
				params: params,
			},
			clear: $el[0],
		} );
		
	});
};

const Router = function(config){
	
	let $el = $(config.el);
	let routes  = config.routes;
	
	if(route instanceof Array){
		routes.forEach(function(route){
			loadRoute($el,route);
		});
	}
	else{
		routes.each(function(component,path){
			loadRoute($el,{
				path:path,
				component:component,
			});
		});
	}
	
	this.run = function(){
		jstack.route.start();
	};
};

jstack.Router = Router;

})();
