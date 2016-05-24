(function(w,j){
	var registry = {};
	j.controller = function(id){
		var fn,sync,deps = true;
		for(var i = 0; i < arguments.length; i++){
			switch(typeof(arguments[i])){
				case 'boolean':
					sync = arguments[i];
				break;
				case 'function':
					fn = arguments[i];
				break;
				case 'object':
					deps = arguments[i];
				break;
			}
		}
		if(deps instanceof Array){
			$js.require(deps,sync);
		}
		
		if(fn){
			var ctrl = function(){
				return fn.apply(ctrl,arguments);
			};
			ctrl.jstack = {};
			registry[id] = ctrl;
		}
		return registry[id];
	};

})(window,jstack);