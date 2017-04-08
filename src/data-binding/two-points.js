jstack.dataBindingElementCompiler.twoPoints = {
	match(n){	
		for(let i = 0, atts = n.attributes, l = atts.length; i < l; i++) {
			if(atts[i].name.substr(0,1) === ':') {
				return true;
			}
		}
	},
	callback(el,dataBinder,scope){
		
		let attrs = {};
		for(let i = 0, atts = el.attributes, l = atts.length; i < l; i++) {
			let att = atts[i];
			if(att.name.substr(0,1) === ':') {
				attrs[att.name] = att.value;
			}
		}
		
		let $this = $(el);
		let attrsVars = {};
		let attrsVarsCurrent = {};
		let propAttrs = ['selected','checked'];
		let nodeName = el.nodeName.toLowerCase();
		attrs.each(function(v,k){
			let tokens = jstack.dataBinder.textTokenizer(v);
			let key = k.substr(1);
			if(tokens===false){
				el.setAttribute(key,v);
			}
			else{
				attrsVars[key] = tokens;
			}
			el.removeAttribute(k);
		});
		let render = function(){
			attrsVars.each(function(v,k){
				let value = dataBinder.compilerAttrRender(el,v,scope);
				if(attrsVarsCurrent[k]===value) return;
				attrsVarsCurrent[k] = value;

				if(propAttrs.indexOf(k)!==-1){
					$this.prop(k,value);
				}
				else if(typeof(value) === "boolean"){
					if(value){
						el.setAttribute(k,k);
					}
					else{
						el.removeAttribute(k);
					}
				}
				else{
					el.setAttribute(k,value);
				}

			});
		};
		
		dataBinder.addWatcher(el,render);
		render();
	},
};
