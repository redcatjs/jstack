jstack.dataBindingCompilers.href = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('j-href');
	},
	callback(dataBinder){

		var el = this;
		var $this = $(this);

		var original = this.getAttribute('j-href');
		this.removeAttribute('j-href');

		var tokens = jstack.dataBinder.textTokenizer(original);
		if(tokens===false){
			el.setAttribute('href',jstack.route.baseLocation + "#" + original);
			return;
		}

		var currentData;
		var getData = dataBinder.createCompilerAttrRender(el,tokens);
		var render = function(){
			var data = getData();
			if(currentData===data) return;
			currentData = data;
			el.setAttribute('href',jstack.route.baseLocation + "#" + data);
		};
		
		dataBinder.watchers.set(el,render);
		
		render();
	},
};
