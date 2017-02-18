$.fn.jModel = function(key,defaultValue){
	if(this.length<=1){
		var r = jstack.dataBinder.getControllerData(this[0]);
		if(typeof(key)!='undefined'){
			return typeof(r[key])=='undefined'?defaultValue:r[key];
		}
		return r;
	}
	else{
		var data = [];
		this.each(function(){
			data.push($(this).jModel(key,defaultValue));
		});
		return data;
	}
};