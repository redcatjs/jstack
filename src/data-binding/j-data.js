jstack.dataBindingElementCompiler.jData = {
	match(n){	
		for(let i = 0, atts = n.attributes, l = atts.length; i < l; i++) {
			if(atts[i].name.substr(0,7) === 'j-data-') {
				return true;
			}
		}
	},
	callback(el,dataBinder,scope){
		
		let attrs = {};
		for(let i = 0, atts = el.attributes, l = atts.length; i < l; i++) {
			let att = atts[i];
			if(att.name.substr(0,7) === 'j-data-') {
				attrs[att.name] = att.value;
			}
		}
		
		let $this = $(el);
		let attrsVars = {};
		let attrsVarsCurrent = {};
		attrs.each(function(v,k){
			let tokens = jstack.dataBinder.textTokenizer(v);
			if(tokens===false){
				el.setAttribute(k,v);
			}
			else{
				attrsVars[k] = tokens;
			}
		});
		let render = function(){
			attrsVars.each(function(v,k){
				let value = dataBinder.compilerAttrRender(el,v,scope);
				if(attrsVarsCurrent[k]===value) return;
				attrsVarsCurrent[k] = value;
				el.setAttribute(k,value);
			});
		};
		
		dataBinder.addWatcher(el,render);
		render();
	},
};
