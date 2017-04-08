(function(){

const inputPseudoNodeNamesExtended = {input:1 ,select:1, textarea:1, button:1, 'j-input':1, 'j-select':1};
const inputPseudoNodeNames = {input:1 ,select:1, textarea:1};

jstack.dataBindingCompilers.input = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('name')&&inputPseudoNodeNamesExtended[this.tagName.toLowerCase()]&&this.type!='file';
	},
	callback(dataBinder){
		let el = this;
		let $el = $(this);

		let currentData;

		//default to model					
		let key = jstack.dataBinder.getScopedInput(el);
		let val = jstack.dataBinder.getInputVal(el);
		
		let setterCallback = function(target,k,v){
			let origin = jstack.getObserverTarget(target);
			origin[k] = v;
		};
		
		let modelValue = jstack.dataBinder.dotSet(key,dataBinder.model,val,true,setterCallback);
		
		if(!modelValue){
			modelValue = '';
		}
		
		//model to default dom value
		if(modelValue!==val){
			let nodeName = el.tagName.toLowerCase();
			if(nodeName=='select'){
				let found;
				$el.find('option').each(function(){
					if(this.hasAttribute('value')){
						if(this.value==modelValue){
							found = true;
							return false;
						}
					}
					else{
						if($(this).text()==modelValue){
							found = true;
							return false;
						}
					}
				});
				if(found){
					$el.populateInput(modelValue,{preventValEvent:true});
				}
				else{
					//jstack.dataBinder.dotSet(key,dataBinder.model,val);
					jstack.dataBinder.dotSet(key,dataBinder.model,val,false,setterCallback);
				}
			}
			else{
				$el.populateInput(modelValue,{preventValEvent:true});
			}
		}
		
		let getData = function(){
			let defaultValue = jstack.dataBinder.getInputVal(el);
			let key = jstack.dataBinder.getKey( el.getAttribute('name') );
			return dataBinder.getValue(el,key,defaultValue);
		};

		let render = function(){
			let data = getData();
			if(currentData===data) return;
			currentData = data;

			if($el.data('j:populate:prevent')) return;
			
			$el.populateInput(data,{preventValEvent:true});
			$el.trigger('j:val',[data]);
		};
		
		dataBinder.addWatcher(el,render);
		render();
	},
};


})();
