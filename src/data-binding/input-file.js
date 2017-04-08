jstack.dataBindingElementCompiler.inputFile = {
	match(n){
		return n.hasAttribute('name')&&n.tagName.toLowerCase()=='input'&&n.type=='file';
	},
	callback(el,dataBinder){
		$(el).on('input change', function(e){
			dataBinder.inputToModel(this,e.type);
		});
	}
};
