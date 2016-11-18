jstack.controller = function(controller){
	
	if(typeof(controller)=='string'){
		return jstack.controllers[controller] || jstack.controller($.extend(true,{},jstack.config.defaultController));
	}
	
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
			for(var i = 0, l = dependenciesData.length; i < l; i++){
				var dependencyData = dependenciesData[i];
				if(typeof(dependencyData)=='function'){
					dependencyData = dependencyData.call(controller);
				}
				dependencies.push(dependencyData);
			}
			var resolveDeferred = $.when.apply($, dependenciesData).then(function(){
				if(dependenciesData.length==1){
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
	
	$js.require(dependencies);
	
	if(setData){
		var originalSetData = setData;
		controller.setData = function(){
			return originalSetData.apply( this, args );
		};
	}
	
	controller.data = controller.data || {};
	
	jstack.controllers[name] = controller;
	
	return controller;
};