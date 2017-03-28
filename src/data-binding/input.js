(function(){

const inputPseudoNodeNamesExtended = {input:1 ,select:1, textarea:1, button:1, 'j-input':1, 'j-select':1};
const inputPseudoNodeNames = {input:1 ,select:1, textarea:1};

jstack.dataBindingCompilers.input = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('name')&&inputPseudoNodeNamesExtended[this.tagName.toLowerCase()]&&this.type!='file';
	},
	callback(dataBinder,matched){
		var el = this;
		var $el = $(this);

		var currentData;

		//default to model					
		var key = jstack.dataBinder.getScopedInput(el);
		var val = jstack.dataBinder.getInputVal(el);
		let controllerData = jstack.dataBinder.getControllerData(el);
		jstack.dataBinder.dotSet(key,controllerData,val,true);
		
		var getData = function(){
			var defaultValue = jstack.dataBinder.getInputVal(el);
			var key = jstack.dataBinder.getKey( el.getAttribute('name') );
			return dataBinder.getValue(el,key,defaultValue);
		};

		var render = function(){
			var data = getData();
			if(currentData===data) return;
			currentData = data;

			if($el.data('j:populate:prevent')) return;
			
			setTimeout(function(){
				$el.populateInput(data,{preventValEvent:true});
				$el.trigger('j:val',[data]);
			});
		};
		
		dataBinder.watchers.set(el,render);
		render();
	},
};


})();
