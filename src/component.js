jstack.component = {};
$.on('j:load','[j-component]',function(e){
	var el = this;
	var component = $(el).attr('j-component');
	var componentJq = $(el).attr('j-component-jquery');
	var config = $(el).dataAttrConfig('j-data-');
	var load;
	if(componentJq){
		load = function(){
			$(el)[componentJq](config);
		};
	}
	else{
		load = function(){
			var o = new jstack.component[component](el,config,e);
			$(el).data('j:component',o);			
		};
	}
	if(jstack.component[component]){
		load();
	}
	else{					
		$js('jstack.'+component,load);
	}
});
$.on('j:unload','[j-component]',function(e){
	var o = $(el).data('j:component');
	if(o&&typeof(o.unload)=='function'){
		o.unload();
	}
});