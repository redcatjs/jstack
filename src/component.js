jstack.component = {};
$.on('j:load','[j-component]',function(e){
	var el = this;
	var component = $(el).attr('j-component');
	var config = $(el).dataAttrConfig('j-data-');
	var load = function(){
		var o = new jstack.component[component](el,config,e);
		$(el).data('j:component',o);
		
	};
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