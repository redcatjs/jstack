jstack.controller = function(controller,element,target){
	
	if(typeof(controller)=='object'){
		jstack.controllers[controller.name] = controller;
		return controller;
	}

	
	controller = jstack.controllers[controller] || jstack.config.defaultController;
	
	controller = $.extend(true,{},controller); //clone, so we leave original unaffected
	
	controller.ready = $.Deferred();		
	
	controller.element = element;
	controller.target = target;
	
	element.data('jController',controller);
	
	var name = controller.name;
	var dependenciesJs = controller.dependencies;
	var dependenciesData = controller.dependenciesData;
	var setData = controller.setData;
	var domReady = controller.domReady;
	
	var args = [];
	var dependencies = [];
	if(dependenciesJs&&dependenciesJs.length){
		for(var i = 0, l = dependenciesJs.length; i < l; i++){
			dependencies.push(dependenciesJs[i]);
		}
	}
	if(dependenciesData){
		if(typeof(dependenciesData)=='function'){
			dependenciesData = dependenciesData.call(controller);
		}
		if(dependenciesData.length){
			var dependenciesDataRun = [];
			for(var i = 0, l = dependenciesData.length; i < l; i++){
				var dependencyData = dependenciesData[i];
				if(typeof(dependencyData)=='function'){
					dependencyData = dependencyData.call(controller);
				}
				
				if(typeof(dependencyData)=='object'&&dependencyData!==null){
					if('abort' in dependencyData){
						var ddata = dependencyData;
						dependencyData = $.Deferred();
						ddata.then(function(ajaxReturn){
							dependencyData.resolve(ajaxReturn);
						});
					}
				}
				if(!(typeof(dependencyData)=='object'&&dependencyData!==null&&('then' in dependencyData))){
					var ddata = dependencyData;
					dependencyData = $.Deferred();
					dependencyData.resolve(ddata);
				}

				dependenciesDataRun.push(dependencyData);
				dependencies.push(dependencyData);
			}
			var resolveDeferred = $.when.apply($, dependenciesDataRun).then(function(){
				for(var i = 0, l = arguments.length; i < l; i++){
					args.push(arguments[i]);
				}
			});
			dependencies.push(resolveDeferred);
		}
	}
	
	if(setData){
		var originalSetData = setData;
		controller.setData = function(){
			return originalSetData.apply( this, args );
		};
	}
	
	controller.data = controller.data || {};
	
	$js(dependencies,function(){
		controller.ready.resolve();
	});
	
	return controller;
};