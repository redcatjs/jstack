jstack.mvc = function(view,controller){
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

	
	var rendered = $.Deferred();
	$.when( controllerReady, viewReady ).then( function() {
		var ctrl = jstack.controllers[controller];
		ctrl.jstack.render = function(data){
			if (!data) data = {};
			ctrl.jstack.data = data;
			var processedTemplate = processor(ctrl.jstack.data);
			rendered.resolve(element);
			return data;
		};
		ctrl.jstack.element = element;		
		ctrl();
	} );

	return rendered;
};