(function(){

jstack.mvc = function(config, hash){
	
	if(typeof(arguments[0])=='string'){
		config = {
			view: arguments[0],
			controller: typeof(arguments[1])=='string'?arguments[1]:arguments[0]
		};
	}
	
	if(!config.controller){
		config.controller = config.view;
	}
	if(!config.target){
		config.target = jstack.config.defaultTarget;
	}
	
	var target = $(config.target);
	var controller = config.controller;
	
	var controllerPath = jstack.config.controllersPath+config.controller;
	
	var controllerReady = $.Deferred();
	var processor;
	
	if(jstack.controllers[config.controller]){
		controllerReady.resolve();
	}
	else{
		$js.onExists(controllerPath,controllerReady.resolve,controllerReady.resolve);
	}
	var viewReady = jstack.getTemplate(config.view+'.jml');
	
	var ready = $.Deferred();
	
	controllerReady.then(function(){
		
		var ctrlReady = jstack.controller(config.controller, target, hash);
		$.when(viewReady, ctrlReady).then(function(view,ctrl){
			var html = view[0];
			var domReady = ctrl.render(html);
			domReady.then(function(){
				ready.resolve(target,ctrl);
			});
		});		
		
	});

	return ready.promise();
};
var getViewReady = function(el){
	if(typeof(arguments[0])=='string'){
		var selector = '[j-view="'+arguments[0]+'"]';
		if(typeof(arguments[1])=='object'){
			el = $(arguments[1]).find(selector);
		}
		else{
			el = $(selector);
		}
	}
	
	el = $(el);
	var ready = el.data('jViewReady');
	if(!ready){
		ready = $.Deferred();
		el.data('jViewReady',ready);
	}
	return ready;
};
jstack.viewReady = function(el){
	return getViewReady(el).promise();
};
$.on('j:load','[j-view]:not([j-view-loaded])',function(){
	
	this.setAttribute('j-view-loaded','true');
	
	var view = this.getAttribute('j-view');
	
	var controller;
	if(this.hasAttribute('j-controller')){
		controller = this.getAttribute('j-controller');
	}
	else{
		controller = view;
	}

	var ready = getViewReady(this);
	var mvc = jstack.mvc({
		view:view,
		controller:controller,
		target:this,
	});
	mvc.then(function(){
		//setTimeout(function(){
			ready.resolve();
		//});
	});
});

})();