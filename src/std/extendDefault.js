jstack.extendDefault = function(target, ext){
	ext.each(function(v,k){
		if(typeof(target[k])==='undefined'){
			target[k] = v;
		}
	});
	return target;
};
