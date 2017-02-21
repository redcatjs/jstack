$.fn.onJstackReady = function(types,selector,data){
	if ( typeof types === "object" ) {
		if ( typeof selector !== "string" ) {
			data = data || selector;
			selector = undefined;
		}
		for(var type in types){
			this.onJstackReady(type, selector, data, types[type]);
		}
		return this;
	}
	var params = [types];
	var fn;
	if(typeof selector === "string"){
		params.push(selector);
		fn = data;
	}
	else{
		fn = selector;
	}
	params.push(function(){
		var args = arguments;
		var el = this;
		return jstack.ready(function(){
			fn.apply(el,args);
		});
	});
	return this.on.apply(this,params);
};
$.onJstackReady = function(event,selector,callback){
	return $(document).onReady(event,selector,callback);
};