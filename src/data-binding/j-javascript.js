jstack.dataBindingElementCompiler.push({
	match(n){
		let tagName = n.tagName.toLowerCase();
		return (tagName=='script'||tagName=='template')&&n.getAttribute('type')=='text/j-javascript';
	},
	callback(n,dataBinder,scope){
		let script;
		
		if(n.tagName.toLowerCase()=='template'){
			let childNodes = document.importNode(n.content, true).childNodes;
			script = '';
			for(let i = 0, l = childNodes.length; i<l; i++){
				script += childNodes[i].nodeValue;
			}
		}
		else{
			script = n.innerHTML;
		}
		
		let func = new Function('element',script);
		func.call(scope,n);
		
		$(n).remove();
		
		return false;
	},
});
