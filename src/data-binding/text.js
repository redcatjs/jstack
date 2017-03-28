jstack.dataBindingCompilers.text = {
	match(){
		return this.nodeType == Node.TEXT_NODE && this instanceof Text && this.textContent;
	},
	callback(dataBinder){
		var textString = this.textContent.toString();
		var tokens = jstack.dataBinder.textTokenizer(textString);
		if(tokens===false) return;

		var $el = $(this);
		var renders = [];

		var last = $el;

		for(var i = 0, l = tokens.length; i < l; i++){
			var token = tokens[i];

			if(token.substr(0,2)!='{{'){
				token = document.createTextNode(token);
				last.after(token);
				last = token;
				continue;
			}

			var text = $('<!--j:text-->');
			var textClose = $('<!--/j:text-->');
			text.insertAfter(last);
			textClose.insertAfter(text);
			last = textClose;

			token = token.substr(2,token.length-4);
			let render = dataBinder.createCompilerTextRender(text,token);
			
			dataBinder.addWatcher(text,render);
			render();
		};
		$el.remove();
	},
};
