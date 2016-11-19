jstack.controller = function(controller){
	
	if(typeof(controller)=='object'){
		jstack.controllers[controller.name] = controller;
		return controller;
	}

	
	controller = jstack.controllers[controller] || jstack.config.defaultController;
	controller = $.extend(true,{},controller); //clone, so we leave original unaffected
	controller.ready = $.Deferred();		
	
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
				dependenciesDataRun.push(dependencyData);
				dependencies.push(dependencyData);
			}
			var resolveDeferred = $.when.apply($, dependenciesDataRun).then(function(){
				if(dependenciesDataRun.length==1){
					args.push(arguments[0]);
				}
				else{
					for(var i = 0, l = arguments.length; i < l; i++){
						args.push(arguments[i][0]);
					}
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