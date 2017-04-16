jstack.flatObservable = function(){
	var args = [];
	for(var i=0,l=arguments.length;i<l;i++){
		var arg = arguments[i];
		//arg = JSON.parse(JSON.stringify(arg));
		arg = $.extend(true,{},arg);
		args.push(arg);
	}
	return args;
};
jstack.log = function(){
	
	console.log((new Error()).stack.split('\n')[1]);
	
	var args = jstack.flatObservable.apply(jstack,arguments);
	console.log.apply(console,args);
};
