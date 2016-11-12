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
	
	var templatesPath = jstack.config.templatesPath;
	var templatePath = templatesPath+config.view+'.jml';
	var controllerPath = jstack.config.controllersPath+config.controller;
	
	var controllerReady = $.Deferred();
	var viewReady = $.Deferred();
	var processor;
	var element;
	
	if(jstack.controllers[config.controller]){
		controllerReady.resolve();
	}
	else{
		$js.onExists(controllerPath,controllerReady.resolve,controllerReady.resolve);
	}
	
	jstack.template.get(templatePath).then(function(html){
		var html = $('<tmpl>' + html + '</tmpl>');
		if(!html.find('> *').length){
			html.wrapInner('<div />');
		}
		element = html.children(0);
		element.attr('j-controller',config.controller);
		var cacheId = config.view + "#" + config.controller;
		jstack.template.compile(element,cacheId,templatesPath).then(function(templateProcessor){
			processor = function(data){
				var processedTemplate = templateProcessor( data );
				element.data('jModel',data);
				element.html( processedTemplate );
			};
			viewReady.resolve();
		} );
	});

	
	var ready = $.Deferred();
	$.when( controllerReady, viewReady ).then( function() {
		var ctrl = jstack.controller(config.controller);
		if(!ctrl){
			ctrl = jstack.controller(config.controller,jstack.config.defaultController);
		}
		ctrl.jstack.render = function(data,target){
			if(!target){
				target = config.target;
			}
			if (!data){
				data = {};
			}
			if(typeof(config.data)=='object'&&config.data!==null){
				data = $.extend({},config.data,data);
			}
			ctrl.jstack.data = data;
			var processedTemplate = processor(ctrl.jstack.data);
			
			$(target).html(element);
			
			ready.resolve(element,ctrl);
			
			return data;
		};
		ctrl.jstack.element = element;
		ctrl();
	} );

	return ready;
};
jstack.viewReady = function(el){
	if(typeof(arguments[0])=='string'){
		var selector = '[j-view="'+arguments[0]+'"]';
		if(typeof(arguments[1]=='object')){
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
$.on('j:load','[j-view]',function(){
	var el = $(this);
	var view = el.attr('j-view');
	var controller = el.attr('j-controller') || view;
	var parent = el.parent().closest('[j-controller]');
	var data = parent.length ? parent.data('jModel') : false;
	var ready = jstack.viewReady(this);
	var mvc = jstack.mvc({
		view:view,
		controller:controller,
		target:this,
		data:data,
	});
	mvc.then(function(){
		ready.resolve();
	});
});