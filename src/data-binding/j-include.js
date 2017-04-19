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
			let c = jstack.templates[include].clone().contents();
			c.appendTo(n);
			dataBinder.compileDom(n,scope);			
		};
		
		if(jstack.templates[include]){
			compile();
		}
		else{
			$.ajax(include).then(function(html){
				jstack.templates[include] = $('<html><rootnode>'+html+'</rootnode></html>');
				compile();
			});
		}
		
		return false;
	},
});
