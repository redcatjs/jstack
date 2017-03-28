jstack.dataBindingCompilers.inputFile = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('name')&&this.tagName.toLowerCase()=='input'&&this.type=='file';
	},
	callback(dataBinder){
		$(this).on('input change', function(e){
			dataBinder.inputToModel(this,e.type);
		});
	}
};
