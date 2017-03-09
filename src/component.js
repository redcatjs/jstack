jstack.component = {};

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
				if(typeof(o.unload)=='function'){
					jstack.on('unload',el,o.unload);
				}
			});
		}
		else{
			$el.data('j.component.loaded',true);
			$el.trigger('j:component:loaded');
			if(typeof(o.unload)=='function'){
				jstack.on('unload',el,o.unload);
			}
		}
	};
	if(jstack.component[component]){
		load();
	}
	else{
		$js('jstack.'+component,load);
	}
});
