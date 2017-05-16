(function(){
const loadRoute = function($el,route){
	//route.children.each(function(){
		
	//});
	
	let component = route.component;
	
	if(typeof component == 'object' && component.__esModule){
		component = component.default;
	}
	
	jstack.registerComponent(route.path, component);
	
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
	
	if(routes instanceof Array){
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
