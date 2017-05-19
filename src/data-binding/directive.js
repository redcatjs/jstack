jstack.dataBindingElementCompiler.push({
	match(n){
		let tagName = n.hasAttribute('is')?n.getAttribute('is'):n.tagName.toLowerCase();
		tagName = jstack.snakeCase(tagName);
		return typeof(jstack.__directives[tagName])!=='undefined';
	},
	callback(n,dataBinder,scope){
		
		const tagName = n.hasAttribute('is')?n.getAttribute('is'):n.tagName.toLowerCase();
		
		const attrs = {};
		for(let i = 0, atts = n.attributes, l = atts.length; i < l; i++) {
			let att = atts[i];
			if(att.name.substr(0,7) === 'j-data-') {
				attrs[att.name] = att.value;
			}
		}
		
		const attrsVars = {};
		const attrsVarsCurrent = {};
		attrs.each(function(v,k){
			let tokens = jstack.dataBinder.textTokenizer(v);
			if(tokens===false){
				n.setAttribute(k,v);
			}
			else{
				attrsVars[k] = tokens;
			}
		});
		
		let obj;
		
		const render = function(){
			attrsVars.each(function(v,k){
				let value = dataBinder.compilerAttrRender(n,v,scope);
				if(attrsVarsCurrent[k]===value) return;
				
				attrsVarsCurrent[k] = value;
				n.setAttribute(k,value);
				
				if(obj){
					obj.reload();
				}
			});
		};
		dataBinder.addWatcher(n,render);
		render();
		
		let options = {};
		attrs.each(function(v,k){
			v = (k in attrsVarsCurrent)?attrsVarsCurrent[k]:v;
			$.attrsToObject( k.substr(7), v, options );
		});
		
		let config = {
			data: scope,
		};
		
		obj = jstack.runDirective(n, tagName, options, config);
		
		dataBinder.waitFor(obj.ready);
		
		return false;
		
	},
});
