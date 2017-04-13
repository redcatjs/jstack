jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-switch');
	},
	callback(el,dataBinder,scope){
		let jswitch = $('<!--j:switch-->');
		let $this = $(el);
		
		let myvar = el.getAttribute('j-switch');
		el.removeAttribute('j-switch');

		if(el.tagName.toLowerCase()=='template'){
			$this.before(jswitch);
			$this.after('<!--/j:switch-->');
			let div = document.createElement('div');
			div.appendChild( document.importNode(el.content, true) );
			$(el).detach();
			el = div;
			$this = $(el);
		}
		else{
			$this.append(jswitch);
			$this.append('<!--/j:switch-->');
		}
		
		let registerCase = function(casesStack,n){
			let dom;
			if(n.tagName.toLowerCase()=='template'){
				let div = document.createElement('div');
				div.appendChild( document.importNode(n.content, true) );
				$(n).detach();
				let domContents = $(div).contents();
				dom = domContents.get();
				domContents.each(function(){
					dataBinder.compileDom( this, scope );
				});
			}
			else{
				dom = n;
			}
			casesStack.push({
				val:n.hasAttribute('j-case')?n.getAttribute('j-case'):null,
				dom:dom
			});
		};
		
		let cases = [];
		let casesDefault = [];
		$this.find('[j-case]').each(function(){
			registerCase(cases,this);
		});
		$this.find('[j-case-default]').each(function(){
			registerCase(casesDefault,this);
		});
		
		$this.contents().each(function(){
			dataBinder.compileDom( this, scope );
		});
		
		let currentData;
		let render = function(){
			let data = jstack.dataBinder.getValueEval(el,myvar,scope);
			if(currentData===data) return;
			currentData = data;

			let found = false;
			cases.forEach(function(o){
				let jcase = $(o.dom);
				if(o.val==data){
					jcase.insertAfter(jswitch);
					found = true;
				}
				else{
					jcase.detach();
				}
			});
			casesDefault.forEach(function(o){
				let jcase = $(o.dom);
				if(found){
					jcase.detach();
				}
				else{
					jcase.insertAfter(jswitch);
				}
			});

		};
		
		dataBinder.addWatcher(jswitch[0],render);
		render();
		
		
		return false;
	},
});
