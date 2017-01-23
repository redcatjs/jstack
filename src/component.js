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
		selector:':input[name],[j-input],[j-select]',
		callback: function(){
			if(!$(this).data('j:firstload')){
				$(this).data('j:firstload',true);
				jstack.dataBinder.inputToModel(this,'j:default',true);
			}
		},
	},
	{
		selector:'[j-for]',
		callback:function(){
			jstack.dataBinder.loaders.jFor.call(this);
			//jstack.dataBinder.loaders.jForList.call($(this).data('parent')[0]);
		},
	},
	//{
		//selector:'[j-for-list]',
		//callback:function(){
			//console.log(this);
			//jstack.dataBinder.loaders.jForList.call(this);
		//},
	//},
	{
		selector:'[j-if]',
		callback:function(){
			jstack.dataBinder.loaders.jIf.call(this);
		},
	},
	{
		selector:'[j-switch]',
		callback:function(){
			jstack.dataBinder.loaders.jSwitch.call(this);
		},
	},
	{
		selector:'[j-href]',
		callback:function(){
			jstack.dataBinder.loaders.jHref.call(this);
		},
	},
	{
		selector:':data(j-var),[data-j-var]',
		callback:function(){
			jstack.dataBinder.loaders.jVar.call(this);
		},
	},
	{
		selector:':attrStartsWith("j-var-")',
		callback:function(){
			jstack.dataBinder.loaders.jVarAttr.call(this);
		},
	},
	{
		selector:':attrStartsWith("j-model-")',
		callback:function(){
			jstack.dataBinder.loaders.jModelAttr.call(this);
		},
	},
	{
		selector:':attrStartsWith("j-data-")',
		callback:function(){
			jstack.dataBinder.loaders.jDataAttr.call(this);
		},
	},
	{
		selector:':attrStartsWith("j-shortcut-model-")',
		callback:function(){
			jstack.dataBinder.loaders.jShrotcutModelAttr.call(this);
		},
	},
	{
		selector:':input[name],[j-input],[j-select]',
		callback:function(){
			if(!$(this).data('j:firstload')){
				$(this).data('j:firstload',true);
				jstack.dataBinder.inputToModel(this,'j:default',true);
			}
			jstack.dataBinder.loaders.inputWithName.call(this);
		},
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