jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-show');
	},
	callback(el,dataBinder,scope){
		let $this = $(el);

		let myvar = el.getAttribute('j-show');
		el.removeAttribute('j-show');
		let currentData;
		let getData = function(){
			return Boolean(jstack.dataBinder.getValueEval(el,myvar,scope));
		};

		let render = function(){
			let data = getData();
			if(currentData===data) return;
			currentData = data;

			if(data){
				$this.show();
			}
			else{
				$this.hide();
			}
		};
		
		dataBinder.addWatcher(el,render);
		render();
	},
});
