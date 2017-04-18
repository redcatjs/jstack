jstack.dataBindingElementCompiler.push({
	match(n){
		let tagName = n.tagName.toLowerCase();
		return (tagName=='script'||tagName=='template')&&n.getAttribute('type')=='text/j-template'&&n.id;
	},
	callback(n,dataBinder,scope){
		dataBinder.templates[n.id] = $('<html><rootnode>'+n.innerHTML+'</rootnode></html>');
		$(n).remove();
		return false;
	},
});
