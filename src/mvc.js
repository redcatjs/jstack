jstack.mvc = function(view,controller,mergeData){
	if(typeof(controller)=='object'&&controller!==null){
		mergeData = controller;
		controller = false;
	}
	if(!controller){
		controller = view;
	}
	var templatesPath = jstack.config.templatesPath;
	var templatePath = templatesPath+view+'.jml';
	var controllerPath = jstack.config.controllersPath+controller;
	
	var controllerReady = $.Deferred();
	var viewReady = $.Deferred();
	var processor;
	var element;
	
	if(jstack.controllers[controller]){
		controllerReady.resolve();
	}
	else{
		$js.onExists(controllerPath,controllerReady.resolve,controllerReady.resolve);
	}
	
	jstack.getTemplate(templatePath).then(function(html){
		var html = $('<tmpl>' + html + '</tmpl>');
		if(!html.find('> *').length){
			html.wrapInner('<div />');
		}
		element = html.children(0);
		element.attr('j-controller',controller);
		var cacheId = view + "#" + controller;
		jstack.processTemplate(element,cacheId,templatesPath).then(function(templateProcessor){
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
		var ctrl = jstack.controller(controller);
		if(!ctrl){
			ctrl = jstack.controller(controller,jstack.config.defaultController);
		}
		ctrl.jstack.render = function(data){
			if (!data) data = {};
			if(typeof(mergeData)=='object'&&mergeData!==null){
				data = $.extend({},mergeData,data);
			}
			ctrl.jstack.data = data;
			var processedTemplate = processor(ctrl.jstack.data);
			return data;
		};
		ctrl.jstack.element = element;
		element.data('jController',ctrl);
		ready.resolve(element);
	} );

	return ready;
};
$.on('j:load','[j-controller]',function(){
	$(this).data('jController')();
});