jstack.mvc = function(config){
	
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
	
	
	//var templatesPath = jstack.config.templatesPath;
	//var templatePath = templatesPath+config.view+'.jml';
	
	var templatesPath = config.view.split('/');
	templatesPath.pop();
	templatesPath = templatesPath.join('/')+'/';
	templatesPath = jstack.config.templatesPath+templatesPath;
	var templatePath = jstack.config.templatesPath+config.view+'.jml';
	
	var controllerPath = jstack.config.controllersPath+config.controller;
	
	var controllerReady = $.Deferred();
	var processor;
	
	if(jstack.controllers[config.controller]){
		controllerReady.resolve();
	}
	else{
		$js.onExists(controllerPath,controllerReady.resolve,controllerReady.resolve);
	}
	
	var ready = $.Deferred();
	$.when( jstack.getTemplate(templatePath), controllerReady ).then( function(view){
		
		var html = view[0];
		
		var ctrl = jstack.controller(config.controller,target);
		
		ctrl.ready.then(function(){
		
			if($.type(config.data)=='object'){
				$.extend(ctrl.data,config.data);
			}

			var setDataReturn = ctrl.setDataCall();
			if(setDataReturn===false){
				return;
			}
			
			setTimeout(function(){
				ctrl.render(html);
				ready.resolve(target,ctrl);
			});
			
		
		});
		
	} );

	return ready;
};
jstack.viewReady = function(el){
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
$.on('j:load','[j-view]:not([j-view-loaded])',function(){
	
	var el = $(this);
	el.attr('j-view-loaded',true);
	
	var view = el.attr('j-view');
	
	var controller;
	if(el[0].hasAttribute('j-controller')){
		controller = el.attr('j-controller');
	}
	else{
		controller = view;
	}
	
	var data = el.data('jModel') || {};
	if(el.hasAttr('j-view-inherit')){
		var parent = el.parent().closest('[j-controller]');
		if(parent.length){
			var inheritProp = el.attr('j-view-inherit');
			var parentData = parent.data('jModel') || {};
			if(inheritProp){
				data[inheritProp] = parentData;
			}
			else{
				data = $.extend({},parentData,data);
			}
		}
	}
	
	
	var ready = jstack.viewReady(this);
	var mvc = jstack.mvc({
		view:view,
		controller:controller,
		target:this,
		data:data,
	});
	mvc.then(function(){
		setTimeout(function(){
			ready.resolve();
		},0);
	});
});