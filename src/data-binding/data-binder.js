const inputPseudoNodeNamesExtended = {input:1 ,select:1, textarea:1, button:1, 'j-input':1, 'j-select':1};
const inputPseudoNodeNames = {input:1 ,select:1, textarea:1};

class dataBinder {
	
	constructor(model,view,controller,noscope){
		this.build(model,view,controller,noscope);
	}
	
	build(model,view,controller,noscope){
		let self = this;
		
		this.noscope = noscope;
		if(!noscope){
			model = model.observable({
				factoryProxy: function(obj){
					jstack.modelObservable(obj,self);
					return obj;
				},
			});	
		}
		
		this.model = model;
		this.view = view;
		this.controller = controller;
		
		this.updateDeferQueued = false;
		this.updateDeferInProgress = false;
		this.updateDeferStateObserver = $.Deferred();
		
		this.watchers = new WeakMap();
		
		this.waiters = [];
	}
	
	waitFor(promise){
		this.waiters.push(promise);
	}
	
	launchModelObserver(){
		if(!this.noscope){
			let self = this;
			this.model.observe(function(change){
				//console.log('j:model:update',change);
				self.update();
			},'jstack.model',true);
		}
	}
	
	ready(callback){
		if(this.updateDeferInProgress){
			this.updateDeferStateObserver.then(callback);
		}
		else{
			callback();
		}
	}
	getValue(el,expression,defaultValue){
		let key = '';

		let ns = dataBinder.getClosestFormNamespace(el.parentNode);
		if(ns){
			key += ns+'.';
		}

		key += expression;

		let value = jstack.dotGet(this.model,key);
		return typeof(value)!='undefined'?value:defaultValue;
	}
	static getValueEval(el,expression,scope){

		if(typeof(expression)=='undefined'){
			expression = 'undefined';
		}
		else if(expression===null){
			expression = 'null';
		}
		else if(expression.trim()==''){
			expression = '';
		}
		
		let params = Object.keys(scope);
		let args = Object.values(scope);
		
		params.push("return "+expression+";");

		let value;
		try{
			let func = Function.apply(null,params);
			value = func.apply(el,args);
		}
		catch(jstackException){
			if(jstack.config.debug){
				let warn = [jstackException.message, ", expression: "+expression, "element", el];
				if(el.nodeType==Node.COMMENT_NODE){
					warn.push($(el).parent().get());
					warn.push(scope);
				}
				console.warn.apply(console,warn);
			}
		}
		
		return typeof(value)=='undefined'?'':value;
	}
	inputToModel(el,eventType,triggeredValue){
		let self = this;
		
		let name = el.getAttribute('name');

		let value;
		if(typeof(triggeredValue)!=='undefined'){
			value = triggeredValue;
		}
		else{
			value = dataBinder.getInputVal(el);
		}
		
		
		let filteredValue = this.filter(el,value);

		if(typeof(filteredValue)=='object'&&filteredValue!==null&&typeof(filteredValue.promise)=='function'){
			filteredValue.then(function(val){
				filteredValue = val;
				self.performInputToModel(el,value,filteredValue,eventType);
			});
		}
		else{
			self.performInputToModel(el,value,filteredValue,eventType);
		}

	}
	performInputToModel(el,value,filteredValue,eventType){
		let self = this;
		let data = this.model;
		let input = $(el);
		let key = dataBinder.getScopedInput(el);
		if(filteredValue!=value){
			value = filteredValue;
			input.populateInput(value,{preventValEvent:true});
		}
		
		let oldValue = jstack.dotGet(data,key);
		
		
		let setterCallback = function(target,k,v){
			target.modelTrigger({
				type:'set',
				target:target,
				key:k,
				oldValue:oldValue,
				value:value,
			});
		};
		
		value = jstack.dotSet(data,key,value,setterCallback);
		
		input.trigger('j:input:model',[value]);
		
		self.ready(function(){
		
			input.trigger('j:input',[value]);
			if(eventType=='j:update'){
				input.trigger('j:input:update',[value]);
			}
			else{
				input.trigger('j:input:user',[value]);
			}

			if(oldValue!==value){
				input.trigger('j:change',[value,oldValue]);
			}
		
		});

	}
	
	addWatcher(el,render){
		let w = this.watchers;
		let watchers = w.get(el);
		if(!watchers){
			watchers = [];
			w.set(el,watchers);
		}
		watchers.push(render);
	}
	runWatchers(){
		let self = this;
		let w = this.watchers;
		
		//let now = new Date().getTime();
		//console.log('runWatchers START');
		//let c = 0;
		
		jstack.walkTheDOM( this.view, function(n){
			let watchers = w.get(n);
			if(watchers){
				for(let i = 0, l = watchers.length; i < l; i++){
					watchers[i]();
					//c++;
				}
			}
		},true);
		
		//console.log('runWatchers END',c,(((new Date().getTime())-now)/1000)+'s');
	}

	update(){
		let self = this;
		if(this.updateDeferQueued){
			//console.log('update updateDeferQueued');
			return;
		}
		if(this.updateDeferInProgress){
			//console.log('update updateDeferInProgress');
			this.updateDeferQueued = true;
			self.updateDeferStateObserver.then(function(){
				self.update();
			});
		}
		else{
			//console.log('update setTimeout');
			this.updateDeferInProgress = true;
			setTimeout(function(){
				self.updateDeferQueued = false;
				//console.log('update perform');
				self.runWatchers();
				self.updateDeferInProgress = false;
				let defer = self.updateDeferStateObserver;
				self.updateDeferStateObserver = $.Deferred();
				defer.resolve();
				self.updateDeferQueued = false;
			},10);
			
		}
	}

	eventListener(){
		if(this.noscope) return;
		
		let self = this;		
		$(this.view).on('input change j:update', ':input[name]', function(e,value){
			
			e.stopPropagation();
			
			if(this.type=='file') return;
			let el = this;
			
			self.inputToModel(el,e.type,value);
			
		});
		
	}
	
	compile(el){
		this.compileDom(el, this.model);
	}
	
	compileHTML(html){
		
		let dom = $('<html><rootnode>'+html+'</rootnode></html>').get(0);
		
		
		this.compileDom(dom, this.model);

		return dom.childNodes;
	}
	
	compileDom(dom,scope){
		
		let self = this;
		
		jstack.walkTheDOM(dom,function(n){
			let breaker;
			if(n.nodeType === Node.ELEMENT_NODE){
				jstack.dataBindingElementCompiler.every(function(compiler){
					if(compiler.match(n)){
						breaker = compiler.callback(n,self,scope);
					}
					return breaker!==false;
				});
			}
			else if(n.nodeType === Node.TEXT_NODE && n instanceof Text){
				jstack.dataBindingTextCompiler.every(function(compiler){
					if(compiler.match(n)){
						breaker = compiler.callback(n,self,scope);
					}
					return breaker!==false;
				});
			}
			return breaker;
		});
			
	}
	
	filter(el,value){
		let filter = this.getFilter(el);
		if(typeof(filter)=='function'){
			value = filter(value);
		}
		return value;
	}
	getFilter(el){
		let $el = $(el);
		let filter = $el.data('j-filter');
		if(!filter){
			let attrFilter = el.getAttribute('j-filter');
			if(attrFilter){
				let method = this.getValue(el,attrFilter);
				$el.data('j-filter',method);
			}
		}
		return filter;
	}
	compilerAttrRender(el,tokens,scope){
		let r;
		for(let i = 0, l = tokens.length; i<l; i++){
			let token = tokens[i];
			if(token.substr(0,2)=='{{'){
				token = token.substr(2,token.length-4);
				
				let freeze = false;
				if(token.substr(0,2)=='::'){
					token = token.substr(2);
					freeze = true;
				}
				token = dataBinder.getValueEval(el,token,scope);
			}
			token = typeof(token)!=='undefined'&&token!==null?token:'';
			if(typeof(r)=='undefined'){
				r = token;
			}
			else{
				r += token;
			}
		}
		return r;
	}
	static textTokenizer(text){
		let tagRE = /\{\{((?:.|\n)+?)\}\}/g;
		if (!tagRE.test(text)) {
			return false;
		}
		let tokens = [];
		let lastIndex = tagRE.lastIndex = 0;
		let match, index;
		while ((match = tagRE.exec(text))) {
			index = match.index;
			// push text token
			if (index > lastIndex) {
				tokens.push(text.slice(lastIndex, index));
			}
			// tag token
			let exp = match[1].trim();
			tokens.push("{{" + exp + "}}");
			lastIndex = index + match[0].length;
		}
		if (lastIndex < text.length) {
			tokens.push(text.slice(lastIndex));
		}
		return tokens;
	}
	static getKey(key){
		return key.replace('[]','.').replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" ).replace(/\[\]/g, '.');
	}
	static getClosestFormNamespace(p){
		while(p){
			if(p.tagName&&p.tagName.toLowerCase()=='form'){
				if(p.hasAttribute('j-name')){
					return p.getAttribute('j-name');
				}
				break;
			}
			p = p.parentNode;
		}
	}
	static getScopedInput(input){
		let name = input.getAttribute('name');
		let key = dataBinder.getKey(name);
		if(key.substr(-1)=='.'&&input.type=='checkbox'){
			let index;
			$(input).closest('form,[is=form],body').find(':checkbox[name="'+name+'"]').each(function(i){
				if(this===input){
					index = i;
					return false;
				}
			});
			key += index;
		}
		let scopeKey = '';
		let ns = dataBinder.getClosestFormNamespace(input.parentNode);
		if(ns){
			scopeKey += ns+'.';
		}
		scopeKey += key;
		return scopeKey;
	}
	static getInputVal(el){
		let nodeName = el.tagName.toLowerCase();
		switch(nodeName){
			case 'input':
				switch(el.type){
					case 'checkbox':
						let $el = $(el);
						//return $el.prop('checked')?$el.val():'';
						return $el.prop('checked')?$el.val():undefined;
					break;
					case 'radio':
						let form;
						let p = el.parentNode;
						while(true){
							if(p.tagName&&p.tagName.toLowerCase()=='form' || !p.parentNode){
								form = p;
								break;
							}
							p = p.parentNode;
						}
						let checked = $(form).find('[name="'+el.getAttribute('name')+'"]:checked');
						return checked.val();
					break;
					case 'file':
						return el.files;
					break;
					case 'submit':
					break;
					default:
						return $(el).val();
					break;
				}
			break;
			case 'textarea':
			case 'select':
				return $(el).val();
			break;
			case 'j-select':
				el = $(el);
				let multiple = el[0].hasAttribute('multiple');
				//let multiple = false;
				let data = el.data('preselect');
				if(!data){
					if(multiple){
						data = [];
					}
					el.children().each(function(){
						if(this.hasAttribute('selected')){
							let val = this.value;
							if(multiple){
								data.push(val);
							}
							else{
								data = val;
								return false;
							}
						}
					});
				}
				return data;
			break;
			default:
				return $(el).html();
			break;
		}
	}
}


jstack.dataBinder = dataBinder;


jstack.dataBindingElementCompiler = [];
jstack.dataBindingTextCompiler = [];

$(document.body).on('reset','form',function(){
	$(this).populateReset();
});
