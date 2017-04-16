$.fn.serializeForm = function(){
	let data = {};
	this.find(':input[name]').each(function(){
		let key = jstack.dataBinder.getScopedInput(this);
		let val = jstack.dataBinder.getInputVal(this);
		jstack.dotSet(data,key,val);
	});
	return data;
};
