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
		},
		register: function(controller,data){
			var self = this;
			controller.data('data-model',data);
			controller.on('input',':input[name]',function(){
				var name = $(this).attr('name');
				var value = $(this).val();
				var key = self.getScoped(this);
				self.dotSet(key,data,value);
			});
			this.populate(controller, data);
		},
		populate: function(controller, data){
			var self = this;
			var data = data || controller.data('data-model');
			controller.find(':input[name]').each(function(){
				var key = self.getScoped(this);
				var value = self.dotGet(key,data);
				//$(this).val(value);
				$(this).populateInput(value);
			});
		},
		eventListener: function(){
			var self = this;
			var observer = new MutationObserver(self.eventDOMChange);
			observer.observe(document.body, { subtree: true, childList: true, attribute: false, characterData: true });
		},
		eventDOMChange: function(){
			$('[j-controller]').each(function(){
				var controller = $(this);
				this.populate(controller);
			});
		},
	};
})();