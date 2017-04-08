jstack.dataBindingElementCompiler.show = {
	match(n){
		return n.hasAttribute('j-show');
	},
	callback(el,dataBinder){
		let $this = $(el);

		let myvar = el.getAttribute('j-show');
		el.removeAttribute('j-show');
		let currentData;
		let getData = function(){
			return Boolean(dataBinder.getValueEval(el,myvar));
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
};
