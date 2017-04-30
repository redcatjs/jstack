(function(){

let getViewReady = function(el){
	el = $(el);
	let ready = el.data('jViewReady');
	if(!ready){
		ready = $.Deferred();
		el.data('jViewReady',ready);
	}
	return ready;
};

jstack.mvc = function(config){

	let target = $(config.target);
	let controller = config.controller || config.view;
	
	let controllerPath = jstack.config.controllersPath+controller;

	let controllerReady = $.Deferred();
	let processor;

	if(jstack.controllers[controller]){
		controllerReady.resolve();
	}
	else{
		$js(controllerPath,controllerReady.resolve);
	}
	let viewReady = jstack.getTemplate(config.view+'.jml');

	let ready = getViewReady(target);
	
	controllerReady.then(function(){
		let ctrlReady = jstack.controller(controller, target, config.hash);
		$.when(viewReady, ctrlReady).then(function(view,ctrl){
			if(config.clear){
				$(config.clear).contents().not(target).remove();
			}
			let html = view[0];
			let domReady = ctrl.render(html);
			if(domReady){
				domReady.then(function(){
					ready.resolve(target,ctrl);
				});
			}
			else{
				ready.resolve(target,ctrl);
			}
		});

	});

	return ready.promise();
};
jstack.viewReady = function(el){
	return getViewReady(el).promise();
};

})();
