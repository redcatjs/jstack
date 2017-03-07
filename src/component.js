jstack.component = {};

//use j:load event to make loader definition helper
jstack.loader = function(selector,handler,unloader){
	$.on('j:load',selector,function(e){
		//e.stopPropagation();
		//if($(this).is(selector)){
			handler.call(this);
		//}
	});
	if(typeof(unloader)=='function'){
		$.on('j:unload',selector,function(e){
			//e.stopPropagation();
			//if($(this).is(selector)){
				unloader.call(this);
			//}
		});
	}
	$(selector).each(function(){
		handler.call(this);
	});
};

//define loaders
jstack.loader(':attrStartsWith("j-on-")',function(){
	var $this = $(this);
	var attrs = $this.attrStartsWith('j-on-');
	var controller = jstack.dataBinder.getControllerObject(this);
	$.each(attrs,function(k,v){
		var event = k.substr(5);
		$this[0].removeAttribute(k);
		$this.on(event,function(e){
			if(typeof(controller.methods)!='object'||typeof(controller.methods[v])!='function'){
				throw new Error('Call to undefined method "'+v+'" by '+k+' and expected in controller '+controller.name);
			}
			var method = controller.methods[v];
			if(typeof(method)!='function'){
				return;
			}
			var r = method.call(controller,e,this);
			if(r===false){
				return false;
			}
		});
	});
});

//j-component
jstack.loader('[j-component]',function(){
	var el = this;
	var $el = $(el);
	var component = el.getAttribute('j-component');
	if(!component){
		return;
	}
	if(el.getAttribute('j-component-handled')){
		return;
	}
	el.setAttribute('j-component-handled','true');
	var config = $el.jData();
	var paramsData = el.getAttribute('j-params-data');
	var load = function(){
		var o;
		var c = jstack.component[component];
		if(paramsData){
			var params = [];
			params.push(el);
			o = new (Function.prototype.bind.apply(c, params));
		}
		else{
			o = new c(el,config);
		}
		$el.data('j:component',o);
		if(o.deferred){
			o.deferred.then(function(){
				$el.data('j.component.loaded',true);
				$el.trigger('j:component:loaded');
			});
		}
		else{
			$el.data('j.component.loaded',true);
			$el.trigger('j:component:loaded');
		}
	};
	if(jstack.component[component]){
		load();
	}
	else{
		$js('jstack.'+component,load);
	}
},function(){
	var o = $(this).data('j:component');
	if(o&&typeof(o.unload)=='function'){
		o.unload();
	}
});
