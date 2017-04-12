jstack.dataBindingElementCompiler.jTemplate = {
	match(n){
		return n.tagName.toLowerCase()=='script'&&n.type=='text/j-template'&&n.id;
	},
	callback(n,dataBinder,scope){
		dataBinder.templates[n.id] = $(n.innerHTML);
		$(n).remove();
		return false;
	},
};
