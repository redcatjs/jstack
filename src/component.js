(function(){
jstack.Component = class {
	constructor(element,options,config){
		let $el = $(element);
		
		this.element = $el;
		this.options = options || {};
		this.config = config || {};
		
		let data = config.data || $el.data('jModel') || {};
		
		let route = this.config.route || {};
		let hash = route.hash;
		
		if(typeof(hash)=='undefined'){
			hash = window.location.hash.ltrim('#');
		}
		
		if($el[0].hasAttribute('j-view-inherit')){
			let parent = $el.parent().closest(':data(jModel)');
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
		this.data = data;
		this.hash = hash;
		this.route = route;
		
		$el.data('jModel',data);
		$el.data('jController',this);
		
		//build
		let self = this;
		
		this.setDataArguments = [];
		
		
		let dependenciesReady = $.Deferred();
		
		let dependenciesStack = [];
		
		let getData = typeof(this.getData)=='function'?this.getData():this.getData;
		
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
			
			
			let getDataReady = [];
			if(getData&&getData.length){
				let getDataRun = [];
				for(let i = 0, l = getData.length; i < l; i++){
					let dependencyData = getData[i];
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
						

					getDataRun.push(dependencyData);
				}
				let resolveDeferred = $.when.apply($, getDataRun).then(function(){
					for(let i = 0, l = arguments.length; i < l; i++){
						self.setDataArguments.push(arguments[i]);
					}
				});
				getDataReady.push(resolveDeferred);
			}
			
			$.when.apply($, getDataReady).then(function(){
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
	getData(){}
	
	template(){
		return this.templateUrlLoaded || this.element.contents();
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
		
		let template = typeof(this.template)=='function'?this.template():this.template;
		
		let html;
		if(typeof(template)=='string'){
			html = this.dataBinder.compileHTML(template);
			if(Boolean($el[0].getAttribute('j-view-append'))){
				$el.append( html );
			}
			else{
				$el.html( html );
			}
		}
		else{
			html = template;
			html.each(function(){
				self.dataBinder.compile(this);
			});
		}
		jstack.triggerLoaded($el);

		$.when.apply($,this.dataBinder.waiters).then(function(){
		
			self.dataBinder.launchModelObserver();
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
				let componentUrl = jstack.config.controllersPath+componentClass+'.js';
				componentClass = require(componentUrl);
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
		
		return component;
	}
	
};
})();
