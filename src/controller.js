jstack.controller = function(controller,element){
	
	if(typeof(controller)=='object'){
		jstack.controllers[controller.name] = function(element){
			
			var self = this;
			
			$.extend(true,this,controller);
			
			
			this.ready = $.Deferred();
			this.element = element;
			element.data('jController',this);
			
			
			this.setDataArguments = [];
			this.setDataCall = function(){
				return this.setData.apply( this, this.setDataArguments );
			};
			
			
			this.dataBinder = (function(){
				var dataBinder = this;
				this.updateWait = 100;
				this.updateDeferStateObserver = null;
				this.updateTimeout = null;
				this.runUpdate = function(){						
					if(dataBinder.updateDeferStateObserver){
						dataBinder.updateDeferStateObserver.then(function(){
							dataBinder.triggerUpdate();
						});
						return;
					}
					else{
						dataBinder.updateDeferStateObserver = $.Deferred();
					}
					
					jstack.dataBinder.update(self.element);
					
					self.element.trigger('j:mutation');
					
					dataBinder.updateDeferStateObserver.resolve();
					dataBinder.updateDeferStateObserver = false;
					
					this.updateTimeout = false;
					
				};
				this.triggerUpdate = function(){
					if(this.updateTimeout){
						if(this.updateTimeout!==true){
							clearTimeout(this.updateTimeout);
						}
						this.updateTimeout = setTimeout(this.runUpdate, this.updateWait);
					}
					else{
						this.updateTimeout = true;
						this.runUpdate();
					}
				};
				return this;
			})();
			
			
		};
		return jstack.controllers[controller.name];
	}

	
	controller = jstack.controllers[controller] || jstack.controller($.extend(true,{name:controller},jstack.config.defaultController));
	
	controller = new controller(element);
	
	var name = controller.name;
	
	var dependencies = [];
	
	if(controller.dependencies&&controller.dependencies.length){		
		var dependenciesJsReady = $.Deferred();
		$js(controller.dependencies,function(){
			dependenciesJsReady.resolve();
		});
		dependencies.push(dependenciesJsReady);
	}
	
	
	var dependenciesData = controller.dependenciesData;
	if(dependenciesData){
		if(typeof(dependenciesData)=='function'){
			controller.dependenciesData = dependenciesData = controller.dependenciesData();
		}
		if(dependenciesData&&dependenciesData.length){
			var dependenciesDataRun = [];
			for(var i = 0, l = dependenciesData.length; i < l; i++){
				var dependencyData = dependenciesData[i];
				if(typeof(dependencyData)=='function'){
					dependencyData = dependencyData.call(controller);
				}
				
					
				if($.type(dependencyData)=='object'){
					if('abort' in dependencyData){
						var ddata = dependencyData;
						dependencyData = $.Deferred();
						(function(dependencyData){
							ddata.then(function(ajaxReturn){
								dependencyData.resolve(ajaxReturn);
							});
						})(dependencyData);
					}
				}
				if(!($.type(dependencyData)=='object'&&('then' in dependencyData))){
					var ddata = dependencyData;
					dependencyData = $.Deferred();
					dependencyData.resolve(ddata);
				}
					

				dependenciesDataRun.push(dependencyData);
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
	
	controller.data = ObjectObservable.create(controller.data);
	ObjectObservable.observe(controller.data,function(change){
		//console.log(change);
		controller.dataBinder.triggerUpdate();
	});
	
	
	$.when.apply($, dependencies).then(function(){
		controller.ready.resolve();
	});
	
	return controller;
};