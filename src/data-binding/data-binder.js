(function(){

class dataBinder {
	
	constructor(model,view,controller){
		
		let self = this;
		
		model = model.observable({
			factory: function(obj){
				jstack.modelObservable(obj,self);
				return obj;
			},
		});
		
		model.observe(function(change){
			//console.log('j:model:update',change);
			self.update();
		},'jstack.model',true);
		
		
		
		this.model = model;
		this.view = view;
		this.controller = controller;
		
		this.updateDeferQueued = false;
		this.updateDeferInProgress = false;
		this.updateDeferStateObserver = $.Deferred();
		
		this.noChildListNodeNames = {area:1, base:1, br:1, col:1, embed:1, hr:1, img:1, input:1, keygen:1, link:1, menuitem:1, meta:1, param:1, source:1, track:1, wbr:1, script:1, style:1, textarea:1, title:1, math:1, svg:1, canvas:1};
		
		this.watchers = new WeakMap();
		
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

		return dataBinder.dotGet(key,this.model,defaultValue);
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
		
		let oldValue = dataBinder.dotGet(key,data);
		
		//value = dataBinder.dotSet(key,data,value);
		let setterCallback = function(target,k,v){
			let oldValue = target[k];
			target[k] = v;
			target.modelTrigger({
				type:'set',
				target:target,
				key:k,
				oldValue:oldValue,
				value:value,
			});
		};
		value = dataBinder.dotSet(key,data,value,false,setterCallback);
		
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
		});
		
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
		let self = this;		
		$(this.view).on('input change j:update', ':input[name]', function(e,value){
			
			e.stopPropagation();
			
			if(this.type=='file') return;
			if(e.type=='input'&&(this.nodeName.toLowerCase()=='select'||this.type=='checkbox'||this.type=='radio'))
				return;
			let el = this;
			
			setTimeout(function(){
				self.inputToModel(el,e.type,value);
			});
			
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
		
		jstack.dataBindingElementCompiler.each(function(compiler){
			jstack.walkTheDOM(dom,function(n){
				if(n.nodeType === Node.ELEMENT_NODE && compiler.match(n)){
					return compiler.callback(n,self,scope);
				}
			});
		});
		jstack.dataBindingTextCompiler.each(function(compiler){
			jstack.walkTheDOM(dom,function(n){
				if(n.nodeType === Node.TEXT_NODE && n instanceof Text && compiler.match(n)){
					return compiler.callback(n,self,scope);
				}
			});
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
		let r = '';
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
			r += typeof(token)!=='undefined'&&token!==null?token:'';
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
	static dotGet(key,data,defaultValue){
		if(typeof(data)!='object'||data===null){
			return;
		}
		return key.split('.').reduce(function(obj,i){
			if(typeof(obj)=='object'&&obj!==null){
				return typeof(obj[i])!='undefined'?obj[i]:defaultValue;
			}
			else{
				return defaultValue;
			}
		}, data);
	}
	static dotSet(key,data,value,isDefault,setterCallback){
		if(typeof(data)!='object'||data===null){
			return;
		}
		key.split('.').reduce(function(obj,k,index,array){
			if(array.length==index+1){
				if(isDefault){
					if(typeof(obj[k])==='undefined'){
						if(setterCallback){
							setterCallback(obj,k,value);
						}
						else{
							obj[k] = value;
						}
					}
					else{
						value = obj[k];
					}
				}
				else{
					if(setterCallback){
						setterCallback(obj,k,value);
					}
					else{
						obj[k] = value;
					}
				}
			}
			else{
				if(typeof(obj[k])!='object'||obj[k]===null){
					if(setterCallback){
						setterCallback(obj,k,{});
					}
					else{
						obj[k] = {};
					}
				}
				return obj[k];
			}
		}, data);
		return value;
	}
	static dotDel(key,data,value){
		if(typeof(data)!='object'||data===null){
			return;
		}
		key.split('.').reduce(function(obj,k,index,array){
			if(typeof(obj)!='object'){
				return;
			}
			if(array.length==index+1){
				if(typeof(obj[k])!='undefined'){
					delete obj[k];
				}
			}
			else{
				return obj[k];
			}
		}, data);
	}
	static getKey(key){
		return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" ).replace(/\[\]/g, '.');
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
			$(input).closest('form').find(':checkbox[name="'+name+'"]').each(function(i){
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
						return $el.prop('checked')?$el.val():'';
					break;
					case 'radio':
						let form;
						let p = el.parentNode;
						while(p){
							if(p.tagName&&p.tagName.toLowerCase()=='form'){
								form = p;
								break;
							}
							p = p.parentNode;
						}
						if(form){
							let checked = $(form).find('[name="'+el.getAttribute('name')+'"]:checked');
							return checked.length?checked.val():'';
						}
						return '';
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


jstack.dataBindingElementCompiler = {};

$(document.body).on('reset','form',function(){
	$(this).populateReset();
});


})();
