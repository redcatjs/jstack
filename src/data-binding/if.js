jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-if');
	},
	callback(el,dataBinder,scope){
		let $this = $(el);
		let jif = $('<!--j:if-->');
		$this.before(jif);

		let jelseifEl = $this.nextUntil('[j-if]','[j-else-if]');
		let jelseEl = $this.nextUntil('[j-if]','[j-else]');

		if(el.tagName.toLowerCase()=='template'){
			
			let div = document.createElement('div');
			div.appendChild( document.importNode(el.content, true) );
			
			jstack.copyAttributes(el,div);
			
			$this = $(div);
			
			$(el).detach();
			el = div;
		}

		let lastBlock;
		if(jelseEl.length){
			lastBlock = jelseEl;
		}
		else if(jelseifEl.length){
			lastBlock = jelseifEl.last();
		}
		else{
			lastBlock = jif;
		}
		$('<!--/j:if-->').insertAfter(lastBlock);

		let myvar = el.getAttribute('j-if');
		el.removeAttribute('j-if');
		let currentData;
		let getData = function(){
			return Boolean(jstack.dataBinder.getValueEval(jif[0],myvar,scope));
		};

		let getData2;
		let currentData2 = null;
		if(jelseifEl.length){
			let myvar2 = [];
			let newJelseifEl = [];
			jelseifEl.each(function(){
				myvar2.push( this.getAttribute('j-else-if') );
				this.removeAttribute('j-else-if');
				if(this.tagName.toLowerCase()=='template'){
					
					let div = document.createElement('div');
					div.appendChild( document.importNode(this.content, true) );
					
					jstack.copyAttributes(el,div);
					
					$( div ).contents().each(function(){
						newJelseifEl.push(this);
					});
					
					$(this).detach();
				}
				else{
					newJelseifEl.push(this);
				}
				
			});
			jelseifEl = $(newJelseifEl);

			getData2 = function(){
				let data = false;
				for(let i=0, l=myvar2.length;i<l;i++){
					if( Boolean(jstack.dataBinder.getValueEval(jif[0],myvar2[i],scope)) ){
						data = i;
						break;
					}
				}
				return data;
			};
		}

		if(jelseEl.length){
			let newJelseEl = [];
			jelseEl.each(function(){
				this.removeAttribute('j-else');
				if(this.tagName.toLowerCase()=='template'){
					
					let div = document.createElement('div');
					div.appendChild( document.importNode(this.content, true) );
					
					jstack.copyAttributes(el,div);
					
					$( div ).contents().each(function(){
						newJelseEl.push(this);
					});
					
					$(this).detach();
				}
				else{
					newJelseEl.push(this);
				}
			});
			jelseEl = $(newJelseEl);
		}
		
		let jIfCompiled;
		
		let render = function(){

			let data = getData();
			let data2 = null;
			if(getData2){
				data2 = data?false:getData2();
			}
			if( currentData===data && data2===currentData2 ) return;
			currentData = data;
			currentData2 = data2;

			if(data){
				
				if(!jIfCompiled){
					jIfCompiled = true;
					dataBinder.compileDom( el, scope );
				}
				
				$this.insertAfter(jif);
				if(jelseifEl.length){
					jelseifEl.detach();
				}
				if(jelseEl.length){
					jelseEl.detach();
				}
			}
			else{
				$this.detach();

				if(jelseifEl.length){
					if(data2===false){
						jelseifEl.detach();
					}
					else{
						let jelseifElMatch = $(jelseifEl[data2]);
						
						if(!jelseifElMatch.data('j:if:compiled')){
							jelseifElMatch.data('j:if:compiled',true);
							
							dataBinder.compileDom( jelseifElMatch.get(0), scope );
						}
						
						jelseifElMatch.insertAfter(jif);
					}
				}
				if(jelseEl.length){
					if(data2===false||data2===null){
						
						if(!jelseEl.data('j:if:compiled')){
							jelseEl.data('j:if:compiled',true);
							dataBinder.compileDom( jelseEl.get(0), scope );
						}
						
						jelseEl.insertAfter(jif);
					}
					else{
						jelseEl.detach();
					}
				}
			}
		};
		
		dataBinder.addWatcher(jif[0],render);
		render();
		
		return false;
	},
});
