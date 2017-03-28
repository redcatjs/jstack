jstack.dataBindingCompilers.href = {
	level: 5,
	match(){
		return this.hasAttribute('j-href');
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

		return render;
	},
};
