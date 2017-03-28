jstack.dataBindingCompilers.inputFile = {
	level: 8,
	match(){
		return this.hasAttribute('name')&&this.tagName.toLowerCase()=='input'&&this.type=='file';
	},
	callback(dataBinder){
		$(this).on('input change', function(e){
			dataBinder.inputToModel(this,e.type);
		});
	}
};
