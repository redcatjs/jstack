jstack.dataBindingCompilers.if = {
	level: 2,
	match(){
		return this.hasAttribute('j-if');
	},
	callback(dataBinder){
		var el = this;
		var $this = $(this);
		var jif = $('<!--j:if-->');
		$this.before(jif);

		var jelseifEl = $this.nextUntil('[j-if]','[j-else-if]');
		var jelseEl = $this.nextUntil('[j-if]','[j-else]');

		if(this.tagName.toLowerCase()=='template'){
			$this = $(jstack.fragmentToHTML(this));
			$(el).detach();
		}

		var lastBlock;
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

		var myvar = el.getAttribute('j-if');
		el.removeAttribute('j-if');
		var currentData;
		var getData = function(){
			return Boolean(dataBinder.getValueEval(jif[0],myvar));
		};

		var getData2;
		var currentData2 = null;
		if(jelseifEl.length){
			var myvar2 = [];
			var newJelseifEl = [];
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
				var data = false;
				for(var i=0, l=myvar2.length;i<l;i++){
					if( Boolean(dataBinder.getValueEval(jif[0],myvar2[i])) ){
						data = i;
						break;
					}
				}
				return data;
			};
		}

		if(jelseEl.length){
			var newJelseEl = [];
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

		var render = function(){

			var data = getData();
			var data2 = null;
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
						var jelseifElMatch = $(jelseifEl[data2]);
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
		
		dataBinder.watchers.set(jif,render);
		render();
	},
};
