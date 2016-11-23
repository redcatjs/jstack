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
	var viewReady = $.Deferred();
	var processor;
	
	if(jstack.controllers[config.controller]){
		controllerReady.resolve();
	}
	else{
		$js.onExists(controllerPath,controllerReady.resolve,controllerReady.resolve);
	}
	
	jstack.template.get(templatePath).then(function(html){
		var cacheId = config.view + "#" + config.controller;
		jstack.template.compile($('<tmpl>'+html+'</tmpl>'),cacheId,templatesPath).then(function(templateProcessor){
			processor = function(data){
				var processedTemplate = templateProcessor( data );
				target.data('jModel',data);
				target.attr('j-controller',controller);
				target.html( processedTemplate );
			};
			viewReady.resolve();
		} );
	});

	
	var ready = $.Deferred();
	$.when( controllerReady, viewReady ).then( function() {
		
		var ctrl = jstack.controller(config.controller,target);
		
		ctrl.ready.then(function(){
		
			if(typeof(config.data)=='object'&&config.data!==null){
				$.extend(ctrl.data,config.data);
			}
			
			
			
			ctrl.render = function(data){
				
				if(data&&data!==ctrl.data){
					$.extend(ctrl.data,data);
				}
				
				processor(ctrl.data);
				
				ready.resolve(target,ctrl);
			};
			
			if(ctrl.setData){
				var setDataReturn = ctrl.setDataCall();
				if(setDataReturn===false){
					return;
				}
				if(typeof(setDataReturn)=='object'&&setDataReturn!==null&&setDataReturn!==ctrl.data){
					$.extend(ctrl.data,setDataReturn);
				}
			}
			if(ctrl.domReady){
				ready.then(function(){
					ctrl.domReady();
				});
			}
			ctrl.render();
		
		});
		
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
	if(el.data('j-view-handled')){
		return;
	}
	el.data('j-view-handled',true);
	
	var view = el.attr('j-view');
	
	var controller;
	if(el[0].hasAttribute('j-controller')){
		controller = el.attr('j-controller');
	}
	else{
		controller = view;
	}
	
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