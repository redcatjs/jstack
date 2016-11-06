jstack.component = {};
$()
$.on('j:load','[j-component]',function(){
	var el = this;
	var component = $(el).attr('j-component');
	var config = $(el).dataAttrConfig('j-data-');
	var load = function(){
		var o = new jstack.component[component](el,config);
		$(el).data('j:component',o);			
	};
	if(jstack.component[component]){
		load();
	}
	else{					
		$js('jstack.'+component,load);
	}
});
$.on('j:load','[jquery-component]',function(){
	var el = this;
	var component = $(el).attr('jquery-component');
	var config = $(el).dataAttrConfig('j-data-');
	var load = function(){
		$(el)[component](config);
	};
	if($.fn[component]){
		load();
	}
	else{					
		$js('jstack.jquery.'+component,load);
	}
});
$.on('j:unload','[j-component]',function(){
	var o = $(this).data('j:component');
	if(o&&typeof(o.unload)=='function'){
		o.unload();
	}
});