jstack.dataBindingElementCompiler.switch = {
	match(n){
		return n.hasAttribute('j-switch');
	},
	callback(el,dataBinder,scope){
		let jswitch = $('<!--j:switch-->');
		let $this;
		
		let myvar = el.getAttribute('j-switch');
		el.removeAttribute('j-switch');

		if(el.tagName.toLowerCase()=='template'){
			$this.before(jswitch);
			let div = document.createElement('div');
			div.appendChild( document.importNode(el.content, true) );
			$(el).detach();
			el = div;
			$this = $(el);
		}
		else{
			$this = $(el);
			$this.append(jswitch);
		}
		
		$this.contents().each(function(){
			dataBinder.compileDom( this, scope );
		});

		
		let cases = $this.find('[j-case],[j-case-default]');

		let currentData;
		let render = function(){
			let data = jstack.dataBinder.getValueEval(el,myvar,scope);
			if(currentData===data) return;
			currentData = data;
			jstack.log(myvar,scope);

			let found = false;
			cases.filter('[j-case]').each(function(){
				let jcase = $(this);
				let caseVal = this.getAttribute('j-case');
				if(caseVal==data){
					jcase.insertAfter(jswitch);
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
					jcase.insertAfter(jswitch);
				}
			});

		};
		
		dataBinder.addWatcher(el,render);
		render();
		
		return false;
	},
};
