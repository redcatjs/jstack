(function(){
jstack.Component = class {
	constructor(element,options,config){
		this.element = $(element);
		this.options = options || {};
		this.config = config || {};
	}
	build(){
		
		let self = this;
		
		let $el = this.element;
		
		let route = this.config.route || {};
		let hash = route.hash;
		
		if(typeof(hash)=='undefined'){
			let parent = $el.parent().closest('[j-controller]');
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
		
	
		let data = this.config.data || $el.data('jModel') || {};
		if($el[0].hasAttribute('j-view-inherit')){
			let parent = $el.parent().closest('[j-controller]');
			if(parent.length){
				let inheritProp = $el[0].getAttribute('j-view-inherit');
				let parentData = parent.data('jModel') || {};
				if(inheritProp){
					data[inheritProp] = parentData;
				}
				else{
					data = $.extend({},parentData,data);
				}
			}
		}
		
		this.hash = hash;
		this.route = route;
		this.data = data;
		$el.data('jController',this);
		
		this.setDataArguments = [];
		
		
		let dependenciesReady = $.Deferred();
		
		let dependenciesStack = [];
		
		let dependencies = typeof(this.dependencies)=='function'?this.dependencies():this.dependencies;
		let dependenciesData = typeof(this.dependenciesData)=='function'?this.dependenciesData():this.dependenciesData;
		
		if(dependencies&&dependencies.length){
			let dependenciesJsReady = $.Deferred();
			$js(dependencies,function(){
				dependenciesJsReady.resolve();
			});
			dependenciesStack.push(dependenciesJsReady);
		}
		if(this.templateUrl){
			let templateUrl = this.templateUrl;
			if(typeof(templateUrl)=='function'){
				templateUrl = templateUrl.call(this);
			}
			let templateReady = $.Deferred();
			dependenciesStack.push(templateReady);
			jstack.getTemplate( templateUrl+'.jml' ).then( function(html){
				self.templateUrlLoaded = html;
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
						dependencyData = dependencyData.call(this);
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
						self.setDataArguments.push(arguments[i]);
					}
				});
				dependenciesDataReady.push(resolveDeferred);
			}
			
			$.when.apply($, dependenciesDataReady).then(function(){
				self.setDataCall();
				dependenciesReady.resolve();
			});
			
		});
		
		let ready = $.Deferred();
		this.ready = ready.promise();
		
		dependenciesReady.then(function(){
			let domReady = self.render();
			domReady.then(function(){
				ready.resolve();
			});
		});
	}
	domReady(){}
	setData(){}
	dependencies(){
		return [];
	}
	dependenciesData(){}
	
	template(){
		return this.templateUrlLoaded || this.element.html();
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
		let $el = this.element;
		$el.data('jModel',this.data);
		$el[0].setAttribute('j-controller','');
		
		let template = typeof(this.template)=='function'?this.template():this.template;
		
		let html = this.dataBinder.compileHTML(template);
		if(Boolean($el[0].getAttribute('j-view-append'))){
			$el.append( html );
		}
		else{
			$el.html( html );
		}
		
		this.dataBinder.launchModelObserver();
		
		this.dataBinder.ready(function(){
			self.domReady();
			domReady.resolve();
		});
		
		return domReady;
	}
	
	reload(){
		
	}
	
	static factory(componentClass, element, options, config){		
		let newInstance = function(className){
			return new className(element,options,config);
		};
		
		let component;
		switch(typeof(componentClass)){
			case 'string':
				componentClass = jstack.components[componentClass];
			case 'function':
				if(!(componentClass.prototype instanceof jstack.Component)){ //light component syntax
					let lightComponent = componentClass;
					componentClass = class extends jstack.Component{
						domReady(){
							lightComponent(this.element,this.options);
						}
					};
				}
				component = newInstance(componentClass);
			break;
			case 'object':
				component = newInstance(jstack.Component);
				$.extend(component, componentClass);
			break;
		}
		component.build();
		
		return component;
	}
	
};
})();
