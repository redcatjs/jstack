$.fn.jData = function(key){
	if(this.length>1){
		var a = [];
		this.each(function(){
			a.push( $.fn.jData.call( $(this), key ) );
		});
		return a;
	}
	else{
			
		var a = {};
		$.each(this.attrStartsWith('j-data-'),function(k,v){
			var parsed = jstack.dataBinder.textParser(v);
			var value = (typeof(parsed)=='string') ? jstack.dataBinder.getValueEval(this,parsed) : v;
			a[k] = value;
		});
		var data = {};
		$.each(a,function(k,v){
			$.attrsToObject( k.substr(7), v, data );
		});

		if(key){
			data = jstack.dataBinder.dotGet(key,data);
		}
		
		return data;
	
	}
};