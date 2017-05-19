jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('name')&&inputPseudoNodeNamesExtended[n.tagName.toLowerCase()]&&n.type!='file';
	},
	callback(el,dataBinder,scope){
		
		let $el = $(el);

		let tagName = el.tagName.toLowerCase();
		if(tagName=='select'||tagName=='j-select'){
			$el.contents().each(function(){
				dataBinder.compileDom(this, scope);
			});
		}
		
		let currentData;

		//default to model					
		let key = jstack.dataBinder.getScopedInput(el);
		let val = jstack.dataBinder.getInputVal(el);
		
		
		
		//let modelValue = jstack.dotSet(dataBinder.model,key,val,true);
		
		let modelValue = jstack.dotGet(dataBinder.model,key);
		
		if(typeof(modelValue)=='undefined'){
			modelValue = val;
			jstack.dotSet(dataBinder.model,key,modelValue);
		}
		
		
		
		if(!modelValue){
			modelValue = '';
		}
		
		
		//model to default dom value
		if(modelValue!==val){
			
			let nodeName = el.tagName.toLowerCase();
			if(nodeName=='select'){
				
				let valueMatch;
				let value = modelValue;
				let found;
				if(typeof(value)=='object'&&value!==null){
					if(!(value instanceof Array)){
						value = Object.values(value);
					}
					found = true;
					valueMatch = function(check){
						if(value.indexOf(check)===-1){
							found = false;
							return false;
						}
					};
				}
				else{
					valueMatch = function(check){
						if(value == check){
							found = true;
							return false;
						}
					};
				}
				
				$el.find('option').each(function(){
					return valueMatch( this.hasAttribute('value')?this.value:$(this).text() );
				});
				if(found){
					$el.populateInput(modelValue,{preventValEvent:true});
				}
				else{
					jstack.dotSet(dataBinder.model,key,val);
				}
			}
			else{
				$el.populateInput(modelValue,{preventValEvent:true});
			}
		}
	},
});
