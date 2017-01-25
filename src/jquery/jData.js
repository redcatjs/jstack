$.fn.jData = function(key){
	if(this.length>1){
		var a = [];
		this.each(function(){
			a.push( $.fn.jData.call( $(this), key ) );
		});
		return a;
	}
	else{
		if(key){
			var v = $(this).attr('j-data-'.args[0]);
			var parsed = jstack.dataBinder.textParser(v);
			var value = (typeof(parsed)=='string') ? jstack.dataBinder.getValueEval(this,parsed) : parsed;
			return value;
		}
		else{
			var a = [];
			$.each(this.attrStartsWith('j-data-'),function(k,v){
				var parsed = jstack.dataBinder.textParser(v);
				var value = (typeof(parsed)=='string') ? jstack.dataBinder.getValueEval(this,parsed) : parsed;
				a.push(value);
			});
			return a;
		}
	}
};