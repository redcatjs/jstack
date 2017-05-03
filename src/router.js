(function(){
const loadRoute = function($el,route){
	//route.children.each(function(){
		
	//});
	
	jstack.route(route.path, function(path, params, hash){
		
		return jstack.load( $('<div/>').appendTo($el), {
			component: route.component,
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
	
	routes.each(function(route){
		loadRoute($el,route);
	});
	
	this.run = function(){
		jstack.route.start();
	};
};

jstack.Router = Router;

})();
