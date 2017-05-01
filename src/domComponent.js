jstack.component = {};

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
});
