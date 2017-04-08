jstack.dataBindingElementCompiler.inputFile = {
	match(n){
		return n.hasAttribute('name')&&n.tagName.toLowerCase()=='input'&&n.type=='file';
	},
	callback(dataBinder){
		$(this).on('input change', function(e){
			dataBinder.inputToModel(this,e.type);
		});
	}
};
