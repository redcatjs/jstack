jstack.routeComponent = function(path,component){
	return jstack.route(path,function(path,params,hash){
		let container = $('[j-app]');
		container.empty();
		return jstack.load($('<div/>').appendTo(container),{
			component:component,
			hash:hash,
		});
	});
};
