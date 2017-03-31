(function(){

class modelObserver{
	constructor(o,dataBinder){
		this.o = o;
		this.dataBinder = dataBinder;
		this.keysObservers = {};
		this.observers = [];
	}
	
	modelTrigger(change){
		for(let i=0, l=this.observers.length;i<l;i++){
			this.observers[i](change);
		}
		let observers = this.keysObservers[change.key];
		if(observers){
			for(let i=0, l=observers.length;i<l;i++){
				observers[i](change);
			}
		}
	}
	addObserver(callback,key){
		let observers
		if(typeof(key)=='undefined'||key===false){
			observers = this.observers;
		}
		else{
			if(!this.keysObservers[key]){
				this.keysObservers[key] = [];
			}	
			observers = this.keysObservers[key];
		}
		observers.push(callback);
	}
	removeObserver(callback,key){
		let observers
		if(typeof(key)=='undefined'||key===false){
			observers = this.observers;
		}
		else{
			observers = this.keysObservers[key];
		}
		if(observers){
			for(let i=0, l=observers.length;i<l;i++){
				if(callback===observers[i]){
					observers.splice(i,1);
				}
			}
		}
	}
	
	modelObserve(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		if(args.length){
			for(let i = 0, l = args.length;i<l;i++){
				let arg = args[i];
				if(arg instanceof Array){
					for(let i2 = 0, l2 = arg.length;i2<l2;i2++){
						this.addObserver(callback,arg[i2]);
					}
				}
				else{
					this.addObserver(callback,arg);
				}
			}
		}
		else{
			this.addObserver(callback);
		}
	}
	modelUnobserve(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		if(args.length){
			for(let i = 0, l = args.length;i<l;i++){
				let arg = args[i];
				if(arg instanceof Array){
					for(let i2 = 0, l2 = arg.length;i2<l2;i2++){
						this.removeObserver(callback,arg[i2]);
					}
				}
				else{
					this.removeObserver(callback,arg);
				}
			}
		}
		else{
			this.removeObserver(callback);
		}
	}
	
	modelSet(key,value,callback){
		this.o[key] = value;
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelDelete(key,callback){
		delete this.o[key];
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	
	modelPush(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		Array.prototype.push.apply(this.o,args);
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelUnshift(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		Array.prototype.unshift.apply(this.o,args);
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelSplice(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		Array.prototype.splice.apply(this.o,args);
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelShift(callback){
		this.o.shift();
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelPop(callback){
		this.o.pop();
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
}

let modelObservable = function(obj,dataBinder){

	//modelObserve
	//modelSet
	//modelPush
	//modelUnshift
	//modelShift
	//modelPop
	//modelSplice
	//modelDelete
	
	let modelObserverObject = new modelObserver(obj,dataBinder);
	
	if(!obj.modelObserve){
		Object.defineProperty(obj, 'modelObserve', {
			value: function(){
				return modelObserverObject.modelObserve.apply(modelObserverObject,arguments);
			},
			enumerable: false
		});
	}
	if(!obj.modelTrigger){
		Object.defineProperty(obj, 'modelTrigger', {
			value: function(){
				return modelObserverObject.modelTrigger.apply(modelObserverObject,arguments);
			},
			enumerable: false
		});
	}
	if(!obj.modelSet){
		Object.defineProperty(obj, 'modelSet', {
			value: function(){
				return modelObserverObject.modelSet.apply(modelObserverObject,arguments);
			},
			enumerable: false
		});
	}
	if(!obj.modelDelete){
		Object.defineProperty(obj, 'modelDelete', {
			value: function(){
				return modelObserverObject.modelSet.apply(modelObserverObject,arguments);
			},
			enumerable: false
		});
	}
	
	if(Array.isArray(obj)){
		if(!obj.modelPush){
			Object.defineProperty(obj, 'modelPush', {
				value: function(){
					return modelObserverObject.modelPush.apply(modelObserverObject,arguments);
				},
				enumerable: false
			});
		}
		if(!obj.modelUnshift){
			Object.defineProperty(obj, 'modelUnshift', {
				value: function(){
					return modelObserverObject.modelUnshift.apply(modelObserverObject,arguments);
				},
				enumerable: false
			});
		}
		if(!obj.modelPop){
			Object.defineProperty(obj, 'modelPop', {
				value: function(){
					return modelObserverObject.modelPop.apply(modelObserverObject,arguments);
				},
				enumerable: false
			});
		}
		if(!obj.modelShift){
			Object.defineProperty(obj, 'modelShift', {
				value: function(){
					return modelObserverObject.modelShift.apply(modelObserverObject,arguments);
				},
				enumerable: false
			});
		}
		if(!obj.modelSplice){
			Object.defineProperty(obj, 'modelSplice', {
				value: function(){
					return modelObserverObject.modelSplice.apply(modelObserverObject,arguments);
				},
				enumerable: false
			});
		}
	}
	
	$.each(obj,function(k,v){
		if(typeof(v)=='object'&&v!==null){
			modelObservable( v, dataBinder );
		}
	});
};

class dataBinder {
	
	constructor(model,view,controller){
		
		modelObservable(model,this);
		
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
	getValue(el,varKey,defaultValue){
		let key = '';

		let ns = dataBinder.getClosestFormNamespace(el.parentNode);
		if(ns){
			key += ns+'.';
		}

		key += varKey;

		return dataBinder.dotGet(key,this.model,defaultValue);
	}
	getParentsForId(el){
		let a = [];
		let n = el;
		while(n){
			if(n.nodeType===Node.COMMENT_NODE&&n.nodeValue.split(' ')[0]==='j:for:id'){
				a.push(n);
				n = n.parentNode;
			}
			if(n){
				if(n.previousSibling){
					n = n.previousSibling;
				}
				else{
					n = n.parentNode;
				}
			}
			//if(n===document.body) break;
			if(n===this.view || n===document.body) break;
		}
		return a;
	}
	getValueEval(el,varKey){

		let controller = this.controller;
		let scopeValue = this.model;

		scopeValue = scopeValue ? JSON.parse(JSON.stringify(scopeValue)) : {}; //clone Proxy
		if(typeof(varKey)=='undefined'){
			varKey = 'undefined';
		}
		else if(varKey===null){
			varKey = 'null';
		}
		else if(varKey.trim()==''){
			varKey = 'undefined';
		}
		else{
			varKey = varKey.replace(/[\r\t\n]/g,'');
			varKey = varKey.replace(/(?:^|\b)(this)(?=\b|$)/g,'$this');
		}


		let forCollection = this.getParentsForId(el).reverse();

		for(let i = 0, l = forCollection.length; i<l; i++){
			let forid = forCollection[i];

			let parentFor = $(forid);
			let parentForList = parentFor.parentComment('j:for');

			if(!parentForList.length) continue;

			let jforCommentData = parentForList.dataComment();
			let value = jforCommentData.value;
			
			let forRow = parentFor.dataComment('j:for:row');
			
			if(!forRow){
				console.log(varKey, el, parentFor, parentFor.dataComment());
			}
			
			let index = jforCommentData.index;
			let key = jforCommentData.key;
			if(index){
				scopeValue[index] = forRow.index;
			}
			if(key){
				scopeValue[key] = forRow.key;
			}
			scopeValue[value] = forRow.value;
		}

		let params = [ '$controller', '$this', '$scope' ];
		let args = [ controller, el, scopeValue ];
		$.each(scopeValue,function(param,arg){
			params.push(param);
			args.push(arg);
		});

		params.push("return "+varKey+";");

		let value;
		try{
			let func = Function.apply(null,params);
			value = func.apply(null,args);
		}

		catch(jstackException){
			if(jstack.config.debug){
				let warn = [jstackException.message, ", expression: "+varKey, "element", el];
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
			console.log(k,v);
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
		//console.log('update');
		
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
			return;
		}
		if(this.updateDeferInProgress){
			this.updateDeferQueued = true;
			self.updateDeferStateObserver.then(function(){
				self.update();
			});
		}
		else{
			this.updateDeferInProgress = true;
			setTimeout(function(){
				self.updateDeferQueued = false;
				//console.log('update');
				self.runWatchers();
				self.updateDeferInProgress = false;
				let defer = self.updateDeferStateObserver;
				self.updateDeferStateObserver = $.Deferred();
				defer.resolve();
			},10);
			
		}
	}

	eventListener(){
		let self = this;		
		$(this.view).on('input change j:update', ':input[name]', function(e,value){
			
			if(e.__jstackStopPropagation){
				return;
			}
			e.__jstackStopPropagation = true;
			
			if(this.type=='file') return;
			if(e.type=='input'&&(this.nodeName.toLowerCase()=='select'||this.type=='checkbox'||this.type=='radio'))
				return;
			let el = this;
			
			setTimeout(function(){
				self.inputToModel(el,e.type,value);
			});
			
		});
		
	}
	
	compileHTML(html){
		
		let dom = $('<html><rootnode>'+html+'</rootnode></html>').get(0);
		
		this.compileDom(dom);

		return dom.childNodes;
	}
	
	compileDom(dom){
		
		let self = this;
		
		$.each(jstack.dataBindingCompilers,function(k,compiler){
			
			jstack.walkTheDOM(dom,function(n){
				
				let matchResult = compiler.match.call(n);
				if(matchResult){
					return compiler.callback.call(n,self,matchResult);
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
	compilerAttrRender(el,tokens){
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
				
				token = this.getValueEval(el,token);
			}
			r += typeof(token)!=='undefined'&&token!==null?token:'';
		}
		return r;
	}
	createCompilerAttrRender(el,tokens){
		let self = this;
		return function(){
			return self.compilerAttrRender(el,tokens);
		};
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
	static getControllerData(el){
		return $(dataBinder.getController(el)).data('jModel');
	}
	static getController(p){

		let controller;
		
		while(p){
			if(p.hasAttribute&&p.hasAttribute('j-controller')){
				controller = p;
				break;
			}
			p = p.parentNode;
		}
		

		if(!controller){
			controller = document.body;
			controller.setAttribute('j-controller','')
			$(controller).data('jModel',{});
		}

		return controller;
	}
	static getControllerObject(el){
		return $(dataBinder.getController(el)).data('jController');
	}
}


jstack.dataBinder = dataBinder;


jstack.dataBindingCompilers = {};

$(document.body).on('reset','form',function(){
	$(this).populateReset();
});


})();
