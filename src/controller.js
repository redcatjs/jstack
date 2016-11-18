jstack.controller = function(id,deps,fn){
	
	if(arguments.length==1){
		return jstack.controllers[ id ];
	}
	
	var args = [];
	if ( deps instanceof Array ) {
		
		var deferredObjects = [];
		for(var i = 0, l = deps.length; i < l; i++){
			var df = deps[i];
			if(typeof(df)=='object'&&typeof(df.then)=='function'){
				deferredObjects.push(df);
			}
		}
		
		if(deferredObjects.length){
			var resolveDeferred = $.when.apply($, deferredObjects).then(function(){
				for(var i = 0, l = arguments.length-2; i < l; i++){
					args.push(arguments[i]);
				}
			});
			deps.push(resolveDeferred);
		}
				
		$js.require(deps);
	}

	var ctrl = function() {
		return fn.apply( ctrl, args );
	};
	jstack.controllers[ id ] = ctrl;
	
};