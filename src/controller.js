jstack.controller = function(id){
	var fn, sync, deps = true;
	for ( var i = 0; i < arguments.length; i++ ) {
		switch ( typeof( arguments[ i ] ) ){
			case "boolean":
				sync = arguments[ i ];
			break;
			case "function":
				fn = arguments[ i ];
			break;
			case "object":
				deps = arguments[ i ];
			break;
		}
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
				
		$js.require( deps, sync );
	}

	if ( fn ) {
		var ctrl = function() {
			return fn.apply( ctrl, args );
		};
		jstack.controllers[ id ] = ctrl;
	}
	return jstack.controllers[ id ];
};