(function(){

let prefix = '__JSTACK__OBSERVABLE__';
jstack.observe = function(obj, callback, rootObject){
	if(obj[prefix]){
		return obj;
	}
	$.each(obj,function(k,v){
		if(typeof(v)=='object'&&v!==null){
			obj[k] = jstack.observe(v,callback,obj);
		}
	});
	let proxy = new Proxy(obj,{
		get: function (target, key) {
			//console.log('get',key);
			if(key===prefix){
				return true;
			}
			return target[key];
		},
		set: function(target, key, value){
			//console.log('set',key);
			if(typeof(value)=='object'&&value!==null){
				value = jstack.observe(value,callback,obj);
			}
			target[key] = value;
			callback('set', {key:key, value:value}, target, rootObject);
			return true;
		},
		deleteProperty: function (target, key) {
			if(key in target){
				delete target[key];
				callback('unset', key, target, rootObject);
			}
			return true;
		},
	});
	return proxy;
};

})();
