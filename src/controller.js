jstack.controller = function(controller,element,target){
	
	if(typeof(controller)=='object'){
		jstack.controllers[controller.name] = function(){
			$.extend(true,this,controller);
			this.setDataCall = function(){
				return this.setData.apply( this, this.setDataArguments );
			};
		};
		return jstack.controllers[controller.name];
	}

	
	controller = jstack.controllers[controller] || jstack.config.defaultController;
	
	controller = new controller();
	
	controller.ready = $.Deferred();
	
	controller.element = element;
	controller.target = target;
	
	element.data('jController',controller);
	
	var name = controller.name;
	var dependenciesJs = controller.dependencies;
	
	controller.setDataArguments = [];
	var dependencies = [];
	if(dependenciesJs&&dependenciesJs.length){
		for(var i = 0, l = dependenciesJs.length; i < l; i++){
			dependencies.push(dependenciesJs[i]);
		}
	}
	
	var dependenciesData = controller.dependenciesData;
	if(dependenciesData){
		if(typeof(dependenciesData)=='function'){
			controller.dependenciesData = dependenciesData = controller.dependenciesData();
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
					controller.setDataArguments.push(arguments[i]);
				}
			});
			dependencies.push(resolveDeferred);
		}
	}
 	
	controller.data = controller.data || {};
	
	$js(dependencies,function(){
		controller.ready.resolve();
	});
	
	return controller;
};