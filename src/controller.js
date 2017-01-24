jstack.controller = function(controller,element){
	
	if(typeof(controller)=='object'){
		jstack.controllers[controller.name] = function(element){
			
			var self = this;
			
			var data = element.data('jModel') || {};
			if(element.hasAttr('j-view-inherit')){
				var parent = element.parent().closest('[j-controller]');
				if(parent.length){
					var inheritProp = element.attr('j-view-inherit');
					var parentData = parent.data('jModel') || {};
					if(inheritProp){
						data[inheritProp] = parentData;
					}
					else{
						data = $.extend({},parentData,data);
					}
				}
			}

			var defaults = {
				domReady: function(){},
				setData: function(){},
				data: data,
			};
			
			
			$.extend(true,this,defaults,controller);
			
			
			this.ready = $.Deferred();
			this.element = element;
			element.data('jController',this);
			
			this.startDataObserver = function(){
				self.data = ObjectObservable.create(self.data);
				ObjectObservable.observe(self.data,function(change){
					console.log('j:model:update',change);
					jstack.dataBinder.update();
				});
			};
			
			this.setDataArguments = [];
			this.setDataCall = function(){
				var r = this.setData.apply( this, this.setDataArguments );
				if($.type(r)=='object'&&r!==ctrl.data){
					$.extend(this.data,r);
				}
				this.startDataObserver();
				return r;
			};			
			
			this.render = function(html){
				var el = this.element;
				el.data('jModel',this.data);
				el.attr('j-controller',this);
				if(Boolean(el.attr('j-view-append'))){
					el.append( html );
				}
				else{
					el.html( html );
				}
				this.domReady();
			};
			
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

	element.find(':input[name],[j-input],[j-select]').each(function(){
		var key = jstack.dataBinder.getScopedInput(this);
		var val = jstack.dataBinder.getInputVal(this);
		jstack.dataBinder.dotSet(key,controller.data,val,true);
		
	});
	
	$.when.apply($, dependencies).then(function(){
		controller.ready.resolve();
	});
	
	return controller;
};