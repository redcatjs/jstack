jstack.dataBindingElementCompiler.push({
	match(n){
		return n.tagName.toLowerCase()=='script'&&n.type=='text/j-template'&&n.id;
	},
	callback(n,dataBinder,scope){
		dataBinder.templates[n.id] = $('<html><rootnode>'+n.innerHTML+'</rootnode></html>');
		$(n).remove();
		return false;
	},
});
