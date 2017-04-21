(function(){

const inputPseudoNodeNamesExtended = {input:1 ,select:1, textarea:1, button:1, 'j-input':1, 'j-select':1};
const inputPseudoNodeNames = {input:1 ,select:1, textarea:1};

jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('name')&&inputPseudoNodeNamesExtended[n.tagName.toLowerCase()]&&n.type!='file';
	},
	callback(el,dataBinder,scope){
		let $el = $(el);

		let key = jstack.dataBinder.getKey( el.getAttribute('name') );

		let render = function(){
			let data = dataBinder.getValue(el,key);
			if(jstack.dataBinder.getInputVal(el)===data) return;

			if($el.data('j:populate:prevent')) return;
			
			$el.populateInput(data,{preventValEvent:true});
			$el.trigger('j:val',[data]);
		};
		
		dataBinder.addWatcher(el,render);
		render();
	},
});


})();
