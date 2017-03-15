jstack.routeMVC = function(path,obj){
	return jstack.route(path,function(path,params,hash){
		let container = $('[j-app]');
		container.empty();
		return jstack.mvc({
			view:obj.view,
			controller:obj.controller || obj.view,
			hash:hash,
			target:$('<div/>').appendTo(container),
		});
	};
};
