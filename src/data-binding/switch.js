jstack.dataBindingCompilers.switch = {
	level: 3,
	match(){
		return this.hasAttribute('j-switch');
	},
	callback(dataBinder){
		var el = this;
		var $this = $(this);
		var myvar = this.getAttribute('j-switch');
		this.removeAttribute('j-switch');

		var cases = $this.find('[j-case],[j-case-default]');

		var currentData;
		var getData = function(){
			return Boolean(dataBinder.getValueEval(el,myvar));
		};
		var render = function(){
			
			var data = getData();
			if(currentData===data) return;
			currentData = data;

			var found = false;
			cases.filter('[j-case]').each(function(){
				var jcase = $(this);
				var caseVal = this.getAttribute('j-case');
				if(caseVal==data){
					jcase.appendTo($this);
					found = true;
				}
				else{
					jcase.detach();
				}
			});
			cases.filter('[j-case-default]').each(function(){
				var jcase = $(this);
				if(found){
					jcase.detach();
				}
				else{
					jcase.appendTo($this);
				}
			});

		};

		return render;
	},
};
