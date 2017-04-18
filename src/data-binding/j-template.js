jstack.dataBindingElementCompiler.push({
	match(n){
		let tagName = n.tagName.toLowerCase();
		return (tagName=='script'||tagName=='template')&&n.getAttribute('type')=='text/j-template'&&n.id;
	},
	callback(n,dataBinder,scope){
		
		if(n.tagName.toLowerCase()=='template'){
			let elements = document.importNode(n.content, true);
			let div = document.createElement('div');
			for(let i = 0, l = elements.length; i<l; i++){
				div.appendChild(elements[i]);
			}
			jstack.copyAttributes(n,div);
			n = div;
		}
		
		dataBinder.templates[n.id] = $('<html><rootnode>'+n.innerHTML+'</rootnode></html>');
		$(n).remove();
		return false;
	},
});
