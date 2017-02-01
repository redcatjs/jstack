(function(){
var constructor = function(controllerSet,element){			
	var self = this;
	
	var data = element.data('jModel') || {};
	if(element[0].hasAttribute('j-view-inherit')){
		var parent = element.parent().closest('[j-controller]');
		if(parent.length&&element[0].hasAttribute('j-view-inherit')){
			var inheritProp = element[0].getAttribute('j-view-inherit');
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
	};
	$.extend(true,this,defaults,controllerSet);
	
	this.element = element;
	this.data = data;
	element.data('jController',this);
	
	this.startDataObserver = function(){
		var object = self.data;
		
		var buildCallback = function(object,proxy){
			//console.log('buildCallback',object,proxy);
			object.set = function(k,v){
				object[k] = v;
				return jstack.dataBinder.update();
			};
		};
		
		self.data = ObjectObservable.create(self.data,{},buildCallback);
		
		ObjectObservable.observe(self.data,function(change){
			//console.log('j:model:update',change);
			jstack.dataBinder.update();
		});
	};
	
	this.setDataArguments = [];
	this.setDataCall = function(){
		var r = this.setData.apply( this, this.setDataArguments );
		if(r==false){
			this.noRender = true;
		}
		else if($.type(r)=='object'&&r!==ctrl.data){
			$.extend(this.data,r);
		}
		this.startDataObserver();
	};			
	
	this.render = function(html){
		if(this.noRender) return;
		
		var el = this.element;
		el.data('jModel',this.data);
		el[0].setAttribute('j-controller',this.name);
		if(Boolean(el[0].getAttribute('j-view-append'))){
			el.append( html );
		}
		else{
			el.html( html );
		}
		this.domReady();
	};
	
};

jstack.controller = function(controller,element){
	
	if(typeof(controller)=='object'){
		
		if(controller.extend){
			if(!controller.dependencies){
				controller.dependencies = [];
			}
			var extend = $.Deferred();
			controller.dependencies.push(extend);
			var controllerPath = jstack.config.controllersPath+controller.extend;
			$js.require(controllerPath);
			$js(controllerPath,function(){
				$.each(jstack.controllers[controller.extend],function(k,v){
					if(typeof(controller[k])=='undefined'){						
						controller[k] = v;
					}
				});
				//console.log('extended',controller.name);
				extend.resolve();
			});
		}		
		if(controller.mixins){
			for(var i = 0, l = mixins.length;i<l;i++){
				$.each(mixins[i],function(k,v){
					if(typeof(controller[k])=='undefined'){
						controller[k] = v;
					}
				});
			}
		}
		
		jstack.controllers[controller.name] = controller;
		return jstack.controllers[controller.name];
	}
	
	var controllerSet = jstack.controllers[controller] || jstack.controller($.extend(true,{name:controller},jstack.config.defaultController));
	
	var name = controllerSet.name;
	var ready = $.Deferred();
	
	var dependencies = [];
	
	if(controllerSet.dependencies&&controllerSet.dependencies.length){		
		var dependenciesJsReady = $.Deferred();
		$js(controllerSet.dependencies,function(){
			dependenciesJsReady.resolve();
		});
		dependencies.push(dependenciesJsReady);
	}
	
	$.when.apply($, dependencies).then(function(){
		
		//console.log('construct',controllerSet.name);
		var controller = new constructor(controllerSet,element);
		
		var dependenciesDataReady = [];
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
				dependenciesDataReady.push(resolveDeferred);
			}
		}
		
		$.when.apply($, dependenciesDataReady).then(function(){
			controller.setDataCall();
			ready.resolve(controller);
		});
		
	});
	
	return ready.promise();
};

})();