(function(){

jstack.component = {};

var loadComponent = function(){
	var el = this;
	var $el = $(el);
	var component = $el.attr('j-component');
	if(!component){
		return;
	}
	if($el.attr('j-component-handled')){
		return;
	}
	$el.attr('j-component-handled','true');
	var config = $el.dataAttrConfig('j-data-');
	var paramsData = $el.attr('j-params-data');
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
};

var loadJqueryComponent = function(){
	var el = this;
	var component = $(el).attr('jquery-component');
	var config = $(el).dataAttrConfig('j-data-');
	var paramsData = $(el).attr('j-params-data');
	var params = [];
	if(paramsData){
		var keys = [];
		for (var k in config) {
			if (config.hasOwnProperty(k)) {
				keys.push(k);
			}
		}
		keys.sort();
		for(var i=0,l=keys.length;i<l;i++){
			params.push(config[keys[i]]);
		}
	}
	else if(!$.isEmptyObject(config)){
		params.push(config);
	}
	var load = function(){
		$(el).data('j:component',$.fn[component].apply($(el), params));
	};
	if($.fn[component]){
		load();
	}
	else{					
		$js('jstack.jquery.'+component,load);
	}
};

$.on('j:load','[j-component]',loadComponent);
$.on('j:load','[jquery-component]',loadJqueryComponent);
$.on('j:unload','[j-component]',function(){
	var o = $(this).data('j:component');
	if(o&&typeof(o.unload)=='function'){
		o.unload();
	}
});

$('[j-component]').each(function(){
	if( !$(this).data('j:component') ){
		loadComponent.call(this);
	}
});
$('[jquery-component]').each(function(){
	if( !$(this).data('j:component') ){
		loadJqueryComponent.call(this);
	}
});

//use j:load event to make loader definition helper
jstack.loader = function(selector,handler,unloader){
	$.on('j:load',selector,function(){
		handler.call(this);
	});
	if(typeof(unloader)=='function'){
		$.on('j:unload',selector,function(){
			unloader.call(this);
		});
	}
	$(selector).each(function(){
		handler.call(this);
	});
};
			
//define preloaders
jstack.preloader = [
	{
		selector:'[j-for]',
		callback:function(){
			jstack.dataBinder.loaders.jFor.call(this);
		},
	},
	{
		selector:'[j-if]',
		callback:function(){
			jstack.dataBinder.loaders.jIf.call(this);
			
			//this.removeAttribute('j-if');
		},
		watcher: 'jIf',
	},
	{
		selector:'[j-switch]',
		callback:function(){
			jstack.dataBinder.loaders.jSwitch.call(this);
			
			//this.removeAttribute('j-switch');
		},
		watcher: 'jSwitch',
	},
	{
		selector:'[j-href]',
		callback:function(){
			jstack.dataBinder.loaders.jHref.call(this);
			
			//this.removeAttribute('j-href');
		},
	},
	{
		selector:':data(j-var)',
		callback:function(){
			jstack.dataBinder.loaders.jVar.call(this);
			
			//$(this).removeData('j-var');
		},
		watcher: 'jVar',
	},
	{
		selector:'[data-j-var]',
		callback:function(){
			jstack.dataBinder.loaders.jVar.call(this);
			
			//this.removeAttribute('data-j-var');
		},
		watcher: 'jVar',
	},
	{
		selector:':attrStartsWith("j-var-")',
		callback:function(){
			jstack.dataBinder.loaders.jVarAttr.call(this);
			
			//var $this = $(this);
			//var attrs = $this.attrStartsWith('j-var-');
			//$.each(attrs,function(k){
				//$this.removeAttr(k);
			//});
		},
		watcher: 'jVarAttr',
	},
	{
		selector:':attrStartsWith("j-model-")',
		callback:function(){
			jstack.dataBinder.loaders.jModelAttr.call(this);
			
			//var $this = $(this);
			//var attrs = $this.attrStartsWith('j-model-');
			//$.each(attrs,function(k){
				//$this.removeAttr(k);
			//});
		},
		watcher: 'jModelAttr',
	},
	{
		selector:':attrStartsWith("j-data-")',
		callback:function(){
			jstack.dataBinder.loaders.jDataAttr.call(this);
			
			//var $this = $(this);
			//var attrs = $this.attrStartsWith('j-data-');
			//$.each(attrs,function(k){
				//$this.removeAttr(k);
			//});
		},
		watcher: 'jDataAttr',
	},
	{
		selector:':attrStartsWith("j-shortcut-model-")',
		callback:function(){
			jstack.dataBinder.loaders.jShrotcutModelAttr.call(this);
			
			//var $this = $(this);
			//var attrs = $this.attrStartsWith('j-shortcut-model-');
			//$.each(attrs,function(k){
				//$this.removeAttr(k);
			//});
		},
		watcher: 'jShrotcutModelAttr',
	},
	{
		selector:':input[name],[j-input],[j-select]',
		callback:function(){
			jstack.dataBinder.loaders.inputWithName.call(this);
		},
		watcher: 'inputWithName',
	},
];

//define loaders
jstack.loader(':attrStartsWith("j-on-")',function(){
	var $this = $(this);
	var attrs = $this.attrStartsWith('j-on-');
	$.each(attrs,function(k,v){
		var event = k.substr(5);
		$this.removeAttr(k);
		$this.on(event,function(e){
			var controller = jstack.dataBinder.getControllerObject(this);
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



})();