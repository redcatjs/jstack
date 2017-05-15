jstack.dataBindingElementCompiler.push({
	match(n){	
		return n.hasAttribute('j-include');
	},
	callback(n,dataBinder,scope){
		let include = n.getAttribute('j-include');
		n.removeAttribute('j-include');
		
		let tokens = jstack.dataBinder.textTokenizer(include);
		if(tokens!==false){
			include = dataBinder.compilerAttrRender(n,tokens,scope);
		}
		
		let compile = function(){
			$(n).empty();
			let c = $('<html><rootnode>'+jstack.templates[include]+'</rootnode></html>').clone().contents();
			c.appendTo(n);
			dataBinder.compileDom(n,scope);			
		};
		
		if(jstack.templates[include]){
			compile();
		}
		else{
			jstack.getTemplate(include).then(function(html){
				compile();
			});
		}
		
		return false;
	},
});
