jstack.dataBindingElementCompiler.push({
	match(n){
		return n.tagName.toLowerCase()=='script'&&n.type=='text/j-javascript';
	},
	callback(n,dataBinder,scope){
		let script = n.innerHTML;
		$(n).remove();
		let func = new Function(script);
		func.call(scope);
		return false;
	},
});
