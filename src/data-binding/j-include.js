jstack.dataBindingElementCompiler.jInclude = {
	match(n){	
		return n.hasAttribute('j-include');
	},
	callback(n,dataBinder,scope){
		let include = n.getAttribute('j-include');
		n.removeAttribute('j-include');
		$(n).empty();
		dataBinder.templates[include].clone().appendTo(n);
		dataBinder.compileDom(n,scope)
		return false;
	},
};
