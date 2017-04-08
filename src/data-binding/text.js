jstack.dataBindingTextCompiler = {};
jstack.dataBindingTextCompiler.text = {
	match: function(n){
		return n.textContent;
	},
	callback: function(el,dataBinder,scope){
		let textString = el.textContent.toString();
		let tokens = jstack.dataBinder.textTokenizer(textString);
		if(tokens===false) return;

		let $el = $(el);

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
				let data = jstack.dataBinder.getValueEval(text[0],token,scope);
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
