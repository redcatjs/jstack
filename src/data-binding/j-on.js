jstack.dataBindingElementCompiler.push({
	match(n){	
		for(let i = 0, atts = n.attributes, l = atts.length; i < l; i++) {
			if(atts[i].name.substr(0,5) === 'j-on-') {
				return true;
			}
		}
	},
	callback(el,dataBinder,scope){
		let $el = $(el);
		let controller = dataBinder.controller;
		let jOnList = [];
		for(let i = 0, atts = el.attributes, l = atts.length; i < l; i++) {
			let att = atts[i];
			let k = att.name;
			if(k.substr(0,5) === 'j-on-') {
				let v = att.value;
				jOnList.push(k);
				let eventName = k.substr(5);
				$el.on(eventName,function(e){
					let method = controller[v];
					if(!method){
						throw new Error('Call to undefined method "'+v+'" by '+k);
					}
					return method.call(controller,e,this);
				});
			}
		}
		jOnList.forEach(function(k){
			el.removeAttribute(k);
		});
	},
});
