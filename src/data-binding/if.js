jstack.dataBindingElementCompiler.if = {
	match(n){
		return n.hasAttribute('j-if');
	},
	callback(el,dataBinder){
		let $this = $(el);
		let jif = $('<!--j:if-->');
		$this.before(jif);

		let jelseifEl = $this.nextUntil('[j-if]','[j-else-if]');
		let jelseEl = $this.nextUntil('[j-if]','[j-else]');

		if(el.tagName.toLowerCase()=='template'){
			$this = $(jstack.fragmentToHTML(el));
			$(el).detach();
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
			return Boolean(dataBinder.getValueEval(jif[0],myvar));
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
					$( '<div>'+jstack.fragmentToHTML(this)+'</div>' ).contents().each(function(){
						newJelseifEl.push(this);
					});
				}
				else{
					newJelseifEl.push(node);
				}
			});
			jelseifEl = $(newJelseifEl);

			getData2 = function(){
				let data = false;
				for(let i=0, l=myvar2.length;i<l;i++){
					if( Boolean(dataBinder.getValueEval(jif[0],myvar2[i])) ){
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
					$( '<div>'+jstack.fragmentToHTML(this)+'</div>' ).contents().each(function(){
						newJelseEl.push(this);
					});
				}
				else{
					newJelseEl.push(this);
				}
			});
			jelseEl = $(newJelseEl);
		}

		let render = function(){

			let data = getData();
			let data2 = null;
			if(getData2){
				data2 = data?false:getData2();
			}
			if( currentData===data && data2===currentData2 ) return;
			currentData = data;
			currentData2 = data2;

			$this.data('j:if:state',data);
			if(data){
				$this.insertAfter(jif);
				if(jelseifEl.length){
					jelseifEl.data('j:if:state',false);
					jelseifEl.detach();
				}
				if(jelseEl.length){
					jelseEl.data('j:if:state',false);
					jelseEl.detach();
				}
			}
			else{
				$this.detach();

				if(jelseifEl.length){
					jelseifEl.data('j:if:state',false);
					if(data2===false){
						jelseifEl.detach();
					}
					else{
						let jelseifElMatch = $(jelseifEl[data2]);
						jelseifElMatch.data('j:if:state',true);
						jelseifElMatch.insertAfter(jif);
					}
				}
				if(jelseEl.length){
					if(data2===false||data2===null){
						jelseEl.data('j:if:state',true);
						jelseEl.insertAfter(jif);
					}
					else{
						jelseEl.data('j:if:state',false);
						jelseEl.detach();
					}
				}
			}
		};
		
		dataBinder.addWatcher(jif[0],render);
		render();
	},
};
