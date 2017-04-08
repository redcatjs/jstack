(function(){
let constructor = function(controllerSet,element,hash){			
	let self = this;
	
	
	let data = element.data('jModel') || {};
	if(element[0].hasAttribute('j-view-inherit')){
		let parent = element.parent().closest('[j-controller]');
		if(parent.length){
			let inheritProp = element[0].getAttribute('j-view-inherit');
			let parentData = parent.data('jModel') || {};
			if(inheritProp){
				data[inheritProp] = parentData;
			}
			else{
				data = $.extend({},parentData,data);
			}
		}
	}
	
	let defaults = {
		domReady: function(){},
		setData: function(){},
	};
	$.extend(true,this,defaults,controllerSet);
	
	this.element = element;
	this.hash = hash;
	this.data = data;
	element.data('jController',this);
	
	
	this.startDataObserver = function(){
		
		self.data = self.data.observable();
		
		self.dataBinder = new jstack.dataBinder(self.data,self.element[0],self);
		self.data = self.dataBinder.model;
		self.dataBinder.eventListener();
		
		self.data.observe(function(change){
			//console.log('j:model:update',change);
			self.dataBinder.update();
		},'jstack.model',true);
		
	};
	
	this.setDataArguments = [];
	this.setDataCall = function(){
		let r = this.setData.apply( this, this.setDataArguments );
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
		
		let el = this.element;
		el.data('jModel',this.data);
		el[0].setAttribute('j-controller',this.name);
		
		html = self.dataBinder.compileHTML(html);
		
		if(Boolean(el[0].getAttribute('j-view-append'))){
			el.append( html );
		}
		else{
			el.html( html );
		}
		
		let domReady = $.Deferred();
		
		this.dataBinder.ready(function(){
			self.domReady();
			domReady.resolve();
		});
		
		return domReady;
	};
	
};

jstack.controller = function(controller, element, hash){
	
	if(typeof(controller)=='object'){
		
		if(controller.extend){
			if(!controller.dependencies){
				controller.dependencies = [];
			}
			let extend = $.Deferred();
			controller.dependencies.push(extend);
			let controllerPath = jstack.config.controllersPath+controller.extend;
			$js.require(controllerPath);
			$js(controllerPath,function(){
				jstack.controllers[controller.extend].each(function(v,k){
					switch(k){
						case 'dependencies':
							if(v instanceof Array){
								v.forEach(function(dep){
									controller.dependencies.push(dep);
								});
							}
						break;
						default:
							if(typeof(controller[k])=='undefined'){						
								controller[k] = v;
							}
						break;
					}
				});
				//console.log('extended',controller.name);
				extend.resolve();
			});
		}		
		if(controller.mixins){
			for(let i = 0, l = mixins.length;i<l;i++){
				mixins[i].each(function(v,k){
					if(typeof(controller[k])=='undefined'){
						controller[k] = v;
					}
				});
			}
		}
		
		jstack.controllers[controller.name] = controller;
		return jstack.controllers[controller.name];
	}
	
	if(typeof(hash)=='undefined'){
		let parent = element.parent().closest('[j-controller]');
		if(parent.length){
			let controllerData = parent.data('jController');
			if(controllerData){
				hash = controllerData.hash;
			}
		}
		if(typeof(hash)=='undefined'){
			hash = window.location.hash.ltrim('#');
		}
	}
	
	
	let controllerSet = jstack.controllers[controller] || jstack.controller($.extend(true,{name:controller},jstack.config.defaultController));
	
	let name = controllerSet.name;
	let ready = $.Deferred();
	
	let dependencies = [];
	
	if(controllerSet.dependencies&&controllerSet.dependencies.length){		
		let dependenciesJsReady = $.Deferred();
		$js(controllerSet.dependencies,function(){
			dependenciesJsReady.resolve();
		});
		dependencies.push(dependenciesJsReady);
	}
	
	$.when.apply($, dependencies).then(function(){
		
		let controller = new constructor(controllerSet,element,hash);
		
		let dependenciesDataReady = [];
		let dependenciesData = controller.dependenciesData;
		if(dependenciesData){
			if(typeof(dependenciesData)=='function'){
				controller.dependenciesData = dependenciesData = controller.dependenciesData();
			}
			if(dependenciesData&&dependenciesData.length){
				let dependenciesDataRun = [];
				for(let i = 0, l = dependenciesData.length; i < l; i++){
					let dependencyData = dependenciesData[i];
					if(typeof(dependencyData)=='function'){
						dependencyData = dependencyData.call(controller);
					}
					
						
					if($.type(dependencyData)=='object'){
						if('abort' in dependencyData){
							let ddata = dependencyData;
							dependencyData = $.Deferred();
							(function(dependencyData){
								ddata.then(function(ajaxReturn){
									dependencyData.resolve(ajaxReturn);
								});
							})(dependencyData);
						}
					}
					if(!($.type(dependencyData)=='object'&&('then' in dependencyData))){
						let ddata = dependencyData;
						dependencyData = $.Deferred();
						dependencyData.resolve(ddata);
					}
						

					dependenciesDataRun.push(dependencyData);
				}
				let resolveDeferred = $.when.apply($, dependenciesDataRun).then(function(){
					for(let i = 0, l = arguments.length; i < l; i++){
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
