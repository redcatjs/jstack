jstack.dataBindingElementCompiler.switch = {
	match(n){
		return n.hasAttribute('j-switch');
	},
	callback(el,dataBinder){
		let $this = $(el);
		let myvar = el.getAttribute('j-switch');
		el.removeAttribute('j-switch');

		let cases = $this.find('[j-case],[j-case-default]');

		let currentData;
		let getData = function(){
			return Boolean(dataBinder.getValueEval(el,myvar));
		};
		let render = function(){
			
			let data = getData();
			if(currentData===data) return;
			currentData = data;

			let found = false;
			cases.filter('[j-case]').each(function(){
				let jcase = $(this);
				let caseVal = this.getAttribute('j-case');
				if(caseVal==data){
					jcase.appendTo($this);
					found = true;
				}
				else{
					jcase.detach();
				}
			});
			cases.filter('[j-case-default]').each(function(){
				let jcase = $(this);
				if(found){
					jcase.detach();
				}
				else{
					jcase.appendTo($this);
				}
			});

		};
		
		dataBinder.addWatcher(el,render);
		render();
	},
};
