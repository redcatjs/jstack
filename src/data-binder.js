jstack.dataBinder = (function(){
	return {
		dotGet: function(key,data){
			return key.split('.').reduce(function(obj,i){return obj[i];}, data);
		},
		dotSet: function(key,data,value){
			key.split('.').reduce(function(obj,i,index,array){ if(array.length==index+2) obj[i] = value; return obj[i];}, data);
		},
		getKey: function(key){
			return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" );
		},
		getScope: function(input){
			return $(input).parents('[data-j-model]')
				.map(function() {
					return $(this).attr('data-j-model');
				})
				.get()
				.reverse()
				.join('.')
			;
		},
		getScoped: function(input){
			var scope = this.getScope(input);
			if(scope){
				scope += '.';
			}
			var name = $(input).attr('name');
			var key = this.getKey(name);
			scope += key;
			return scope;
		}
	};
})();