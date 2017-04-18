jstack.dataBindingElementCompiler.push({
	match(n){
		let tagName = n.tagName.toLowerCase();
		return (tagName=='script'||tagName=='template')&&n.getAttribute('type')=='text/j-javascript';
	},
	callback(n,dataBinder,scope){
		let script = n.innerHTML;
		$(n).remove();
		let func = new Function(script);
		func.call(scope);
		return false;
	},
});
