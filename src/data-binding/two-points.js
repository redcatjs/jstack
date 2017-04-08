jstack.dataBindingElementCompiler.twoPoints = {
	match(n){	
		for(let i = 0, atts = n.attributes, l = atts.length; i < l; i++) {
			if(atts[i].name.substr(0,1) === ':') {
				return true;
			}
		}
	},
	callback(dataBinder){
		
		let attrs = {};
		for(let i = 0, atts = this.attributes, l = atts.length; i < l; i++) {
			let att = atts[i];
			if(att.name.substr(0,1) === ':') {
				attrs[att.name] = att.value;
			}
		}
		
		var el = this;
		var $this = $(this);
		var attrsVars = {};
		var attrsVarsCurrent = {};
		var propAttrs = ['selected','checked'];
		var nodeName = this.nodeName.toLowerCase();
		$.each(attrs,function(k,v){
			var tokens = jstack.dataBinder.textTokenizer(v);
			var key = k.substr(1);
			if(tokens===false){
				el.setAttribute(key,v);
			}
			else{
				attrsVars[key] = tokens;
			}
			el.removeAttribute(k);
		});
		var render = function(){
			$.each(attrsVars,function(k,v){
				var value = dataBinder.compilerAttrRender(el,v);
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
