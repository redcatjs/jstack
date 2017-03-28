jstack.dataBindingCompilers.show = {
	match(){
		return this.nodeType === Node.ELEMENT_NODE && this.hasAttribute('j-show');
	},
	callback(dataBinder){
		var el = this;
		var $this = $(this);

		var myvar = this.getAttribute('j-show');
		this.removeAttribute('j-show');
		var currentData;
		var getData = function(){
			return Boolean(dataBinder.getValueEval(el,myvar));
		};

		var render = function(){
			var data = getData();
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
