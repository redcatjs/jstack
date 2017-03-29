jstack.dataBindingCompilers.text = {
	match: function(){
		return this.nodeType == Node.TEXT_NODE && this instanceof Text && this.textContent;
	},
	callback: function(dataBinder){
		let textString = this.textContent.toString();
		let tokens = jstack.dataBinder.textTokenizer(textString);
		if(tokens===false) return;

		let $el = $(this);

		let last = $el;

		for(let i = 0, l = tokens.length; i < l; i++){
			let token = tokens[i];
			
			
			if(token.substr(0,2)!='{{'){
				token = document.createTextNode(token);
				last.after(token);
				last = token;
				continue;
			}
			
			let text = $('<!--j:text-->');
			let textClose = $('<!--/j:text-->');
			text.insertAfter(last);
			textClose.insertAfter(text);
			last = textClose;

			token = token.substr(2,token.length-4);
			
			let freeze = false;
			if(token.substr(0,2)==='::'){
				token = token.substr(2);
				freeze = true;
			}
			
			
			let currentData;
			let render = function(){
				let data = dataBinder.getValueEval(text[0],token);
				if(currentData===data) return;
				currentData = data;
				text.commentChildren().remove();
				text.after(data);
			};
			
			render();
			if(!freeze){
				dataBinder.addWatcher(text[0],render);
			}
		};
		$el.remove();
	},
};
