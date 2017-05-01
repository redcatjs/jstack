(function(){
jstack.Component = class {
	constructor(){
		
	}
	domReady(){}
	setData(){}
	dependencies(){
		return [];
	}
	dependenciesData(){}
	template(){
		return this.templateUrlLoaded;
	}
	build(element,hash){		
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
		
		this.element = element;
		this.hash = hash;
		this.data = data;
		element.data('jController',this);
		
		
		this.setDataArguments = [];			
		
		
	}
	
	setDataCall(){
		let r = this.setData.apply( this, this.setDataArguments );
		if(r==false){
			this.noRender = true;
		}
		else if($.type(r)=='object'&&r!==this.data){
			$.extend(this.data,r);
		}
		this.startDataObserver();
	}
	
	startDataObserver(){		
		this.dataBinder = new jstack.dataBinder(this.data,this.element[0],this);	
		this.data = this.dataBinder.model;
		this.dataBinder.eventListener();
	}
	
	render(){
		let domReady = $.Deferred();
		
		if(this.noRender){
			domReady.resolve();
			return domReady;
		}
		
		let self = this;
		let el = this.element;
		el.data('jModel',this.data);
		el[0].setAttribute('j-controller','');
		
		let template = typeof(this.template)=='function'?this.template():this.template;
		let html = this.dataBinder.compileHTML(template);
		
		if(Boolean(el[0].getAttribute('j-view-append'))){
			el.append( html );
		}
		else{
			el.html( html );
		}
		
		this.dataBinder.launchModelObserver();
		
		
		this.dataBinder.ready(function(){
			self.domReady();
			domReady.resolve();
		});
		
		return domReady;
	}
	
	static factory(controllerClass, element, hash){
		
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
		
		let controller;
		switch(typeof(controllerClass)){
			case 'string':
				controllerClass = jstack.controllers[controllerClass];
			case 'function':
				controller = new controllerClass();
			break;
			case 'object':
				controller = new jstack.Component();
				$.extend(controller, controllerClass);
			break;
		}
		
		controller.build(element,hash);
		

		let ready = $.Deferred();
		
		let dependenciesStack = [];
		
		let dependencies = typeof(controller.dependencies)=='function'?controller.dependencies():controller.dependencies;
		let dependenciesData = typeof(controller.dependenciesData)=='function'?controller.dependenciesData():controller.dependenciesData;
		
		if(dependencies.length){
			let dependenciesJsReady = $.Deferred();
			$js(dependencies,function(){
				dependenciesJsReady.resolve();
			});
			dependenciesStack.push(dependenciesJsReady);
		}
		if(controller.templateUrl){
			let templateUrl = controller.templateUrl;
			if(typeof(templateUrl)=='function'){
				templateUrl = templateUrl.call(controller);
			}
			let templateReady = $.Deferred();
			dependenciesStack.push(templateReady);
			jstack.getTemplate( templateUrl+'.jml' ).then( function(html){
				controller.templateUrlLoaded = html;
				templateReady.resolve();
			} );
		}
		
		$.when.apply($, dependenciesStack).then(function(){
			
			
			let dependenciesDataReady = [];
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
			
			$.when.apply($, dependenciesDataReady).then(function(){
				controller.setDataCall();
				ready.resolve();
			});
			
		});
		
		controller.dependenciesReady = ready.promise();
		
		return controller;
	}
	
};
})();
