jstack.dataBinder = (function(){
	var dataBinder = function(){
		
	};
	dataBinder.prototype = {
		dotGet: function(key,data,defaultValue){
			return key.split('.').reduce(function(obj,i){
				if(typeof(obj)=='object'&&obj!==null){
					return typeof(obj[i])!='undefined'?obj[i]:defaultValue;
				}
				else{
					return defaultValue;
				}
			}, data);
		},
		dotSet: function(key,data,value,isDefault){
			if(typeof(data)!='object'){
				return;
			}
			key.split('.').reduce(function(obj,k,index,array){
				if(array.length==index+1){
					if(isDefault&&obj[k]){
						value = obj[k];
					}
					if(!isDefault||!obj[k]){
						obj[k] = value;
					}
				}
				else{
					if(typeof(obj[k])!='object'||obj[k]===null){
						obj[k] = {};
					}					
					return obj[k];
				}
			}, data);
			return value;
		},
		dotDel: function(key,data,value){
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
		},
		getKey: function(key){
			return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" ).replace(/\[\]/g, '.');
		},
		getValue: function(el,varKey,defaultValue){
			var self = this;
			var data = self.getControllerData(el);
			var key = self.getScoped(el,varKey);
			return self.dotGet(key,data,defaultValue);
		},
		getValueEval: function(el,varKey,defaultValue){
			var self = this;
			var scopeValue = self.getScopeValue(el);
			scopeValue = JSON.parse(JSON.stringify(scopeValue)); //clone Proxy
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
			
			var parent;
			parent = function(depth){
				if(!depth) depth = 1;
				depth += 1;
				var parentEl = el;
				for(var i=0;i<depth;i++){
					parentEl = self.getParentScope(parentEl);
				}
				var scopeV = self.getScopeValue(parentEl);
				return scopeV;
			};
			var controllerData = self.getControllerData(el);
			var controller = self.getControllerObject(el);
			
			var params = [ "$model, $scope, $controller, $this, $default, $parent" ];
			var args = [ controllerData, scopeValue, controller, el, defaultValue, parent ];
			
			var forParams = [];
			var forArgs = [];
			
			var forCollection = [];
			if($(el).is('[j-for-id]')){
				forCollection.push( el );
			}
			$(el).parents('[j-for-id]').each(function(){
				forCollection.push( this );
			});
			var addToScope = function(param,arg){
				//var index = forParams.indexOf(param);
				//if(index!==-1){
					//forParams.splice(index,1);
					//forArgs.splice(index,1);
				//}
				//forParams.push(param);
				//forArgs.push(arg);
				scopeValue[param] = arg;
			};
			$(forCollection).each(function(){
				var parentFor = $(this);
				var parentForList = parentFor.closest('[j-for-list]');
				
				if(!parentForList.length) return;
				
				var myvar = parentForList.attr('j-for-var');
				var value = parentForList.attr('j-for-value');
				var id = parentFor.attr('j-for-id');
				
				forParams.push(value);
				
				var valueToEval = myvar;
				valueToEval += jstack.isIntKey(id)?'['+id+']':'.'+id;
				
				forArgs.push(self.getValueEval(parentForList,valueToEval));
				
				var key = parentForList.attr('j-for-key');
				var index = parentForList.attr('j-for-index');
				if(index){
					addToScope(index,parentFor.index()+1);
				}
				if(key){
					addToScope(key,id);
				}
			});
			
			for(var i=0,l=forParams.length;i<l;i++){
				params.push(forParams[i]);
			}
			for(var i=0,l=forArgs.length;i<l;i++){
				args.push(forArgs[i]);
			}
			
			
			params.push("with($scope){var $return = "+varKey+"; return typeof($return)=='undefined'?$default:$return;}");
			
			var value;
			try{
				var func = Function.apply(null,params);
				value = func.apply(null,args);
			}
			catch(jstackException){
				if(jstack.config.debug){
					console.warn(jstackException.message, ", expression: "+varKey, "element", el);
				}
			}
			
			return value;
		},
		getAttrValueEval: function(el,attr,defaultValue){
			var self = this;
			var attrKey = $(el).attr(attr);
			return self.getValueEval(el,attrKey,defaultValue);
		},
		getAttrValue: function(el,attr,defaultValue){
			var self = this;
			var attrKey = $(el).attr(attr);
			return self.getValue(el,attrKey,defaultValue);
		},
		getScopeValue: function(el){
			var self = this;
			var scope = $(el).closest('[j-scope]');
			if(!scope.length){
				return self.getControllerData(el);
			}
			return self.getAttrValue(scope,'j-scope',{});
		},
		getScope: function(input){
			return $(input).parents('[j-scope]')
				.map(function() {
					return $(this).attr('j-scope');
				})
				.get()
				.reverse()
				.join('.')
			;
		},
		getScopedInput: function(input){
			var self = this;
			var $input = $(input);
			var name = $input.attr('name');
			var key = self.getKey(name);
			if(key.substr(-1)=='.'&&$input.is(':checkbox')){
				var index;
				var scope = self.getParentScope(input);
				scope.find(':checkbox[name="'+name+'"]').each(function(i){
					if(this===input){
						index = i;
						return false;
					}
				});
				key += index;
			}
			return self.getScoped(input,key);
		},
		getScoped: function(input,suffix){
			if(suffix.substr(0,1)==='.'){
				return suffix.substr(1);
			}
			var scope = this.getScope(input);
			if(scope){
				scope += '.';
			}
			scope += suffix;
			return scope;
		},
		getters: {
			select: function(el){
				el = $(el);
				if(el.children('option[value]').length){
					return el.val();
				}
			},
			input: function(element) {
				var type = $( element ).prop('type');
				if ( type=="checkbox" || type=="radio" ) {
					return $( element ).prop( "checked" ) ? $( element ).val() : null;
				}
				else if ( type == "file" ) {
					return element.files;
				}
				else if ( type != "submit" ) {
					return $( element ).val();
				}
			},
			textarea: function(element){
				return $( element ).val();
			},
			jselect: function(el){
				el = $(el);
				var multiple = el.hasAttr('multiple');
				var data = el.data('preselect');
				if(!data){
					if(multiple){
						data = [];
					}
					el.children().each(function(){
						if($(this).hasAttr('selected')){
							var val = $(this).attr('value');
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
			},
		},
		defaultGetter: function(element){
			return $( element ).html();
		},
		getInputVal: function(element){
			var elementType = element.tagName.toLowerCase();
			if(elementType!='select'&&$(element).hasAttr('j-select')){
				elementType = 'jselect';
			}
			var getter = this.getters[elementType] || this.defaultGetter;
			return getter(element);
		},
		inputToModel: function(el,eventName,isDefault){
			var input = $(el);
			if(input.closest('[j-unscope]').length) return;
			
			
			var self = this;
			
			var data = self.getControllerData(el);
			var name = input.attr('name');
			
			
			var performInputToModel = function(){
				var key = self.getScopedInput(el);
				if(filteredValue!=value){
					value = filteredValue;
					input.populateInput(value,{preventValEvent:true});
				}
				value = self.dotSet(key,data,value,isDefault);
				input.trigger(eventName,[value]);
				
			};
			
			var value = self.getInputVal(el);
			var filteredValue = self.filter(el,value);
			
			
			if(typeof(filteredValue)=='object'&&filteredValue!==null&&typeof(filteredValue.promise)=='function'){
				filteredValue.then(function(val){
					filteredValue = val;
					performInputToModel();
				});
			}
			else{
				performInputToModel();
			}
			
		},
		validNodeEvent: function(n,excludeRepeat){
			if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
				return false;
			}
			if(excludeRepeat){
				var jn = $(n);
				if(jn.closest('[j-for]').length){
					return false;
				}
			}
			return true;
		},
		loadMutations: function(mutations){
			var self = this;
			
			$.each(mutations,function(i,mutation){
				
				$.each(mutation.addedNodes,function(ii,node){
					
					$.walkTheDOM(node,function(n){
						
						if(!$.contains(document.body,n)) return;
						
						var $n = $(n);
						
						if($n.parent().closest('[j-for]').length){
							return;
						}
						
						if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
							jstack.dataBinder.loaders.textMustache.call(n);
							return;
						}
						
						if(n.nodeType!=Node.ELEMENT_NODE) return;
						
						$.each(jstack.preloader,function(iii,pair){
							if($n.is(pair.selector)){
								return pair.callback.call(n);
							}
						});
						
						if(!$.contains(document.body,n)) return;
						
						
						if($n.data('j:load:state')){
							return;
						}
						$n.data('j:load:state',1);
						setTimeout(function(){
							if($n.data('j:load:state')==2){
								return;
							}
							$n.data('j:load:state',3);
							$n.trigger('j:load');
							$n.data('j:load:state',3);
						},0);
						
						
					});

				});
				
				$.each(mutation.removedNodes,function(ii,node){
					$.walkTheDOM(node,function(n){
						if(!self.validNodeEvent(n,true)) return;
						setTimeout(function(){
							$(n).trigger('j:unload');
						},0);
					});
				});
			});
			
			
					
		},
		eventListener: function(){
			var self = this;
			
			var observer = new MutationObserver(function(mutations){
				//console.log('mutations');
				//console.log(mutations);
				self.loadMutations(mutations);
			});
			observer.observe(document, { subtree: true, childList: true, attribute: false, characterData: true });
			
			$(document.body).on('input change', ':input[name]', function(e){
				if(e.type=='input'&&$(this).is('select[name], input[name][type=checkbox], input[name][type=radio], input[name][type=file]'))
					return;
				
				var value = self.getInputVal(this);
				
				if(e.type=='change'){
					var handled = $(this).data('jHandledValue');
					if(typeof(handled)!='undefined'&&value==handled){
						return;
					}
				}
				
				//console.log('input user',e);
				
				$(this).data('jHandledValue',value);
				
				self.inputToModel(this,'j:input');
			});
			
			$(document.body).on('val', ':input[name][j-val-event]', function(e){
				self.inputToModel(this,'j:input');
			});
			$(document.body).on('j:update', ':input[name]', function(e){
				$(this).data('j:populate:prevent',true);
				self.inputToModel(this,'j:input');
				$(this).one('j:input',function(){
					$(this).data('j:populate:prevent',false);
				});
			});
		},
		filter:function(el,value){
			var self = this;
			var filter = self.getFilter(el);
			if(typeof(filter)=='function'){
				value = filter(value);
			}
			return value;
		},
		getFilter:function(el){
			var self = this;
			el = $(el);
			var filter = el.data('j-filter');
			if(!filter){
				var attrFilter = el.attr('j-filter');
				if(attrFilter){
					var method = self.getValue(el,attrFilter);
					el.data('j-filter',method);
				}
			}
			return filter;
		},
		getControllerData:function(input){
			return this.getController(input).data('jModel');
		},
		getParentScope:function(el){
			var parent = $(el).parent().closest('[j-scope]');
			if(!parent.length){
				parent = this.getController(el);
			}
			return parent;
		},
		getController:function(input){
			var controller = $(input).closest('[j-controller]');
			
			if(!controller.length){
				var controller = $(document.body);
				if(!controller.data('jModel')){
					controller.data('jModel',{});
				}
				var o = jstack.controller('',controller);
			}
			
			if(!controller.data('jController')){
				if(!controller.data('jModel')){
					controller.data('jModel',{});
				}
				jstack.controller('',controller);
			}
			
			
			return controller;
		},
		getControllerObject:function(input){
			return this.getController(input).data('jController');
		},		
		update: function(element){
			var self = this;
			//console.log('update',element);
			
			$.each(jstack.preloader,function(i,pair){
				$(pair.selector,element).each(function(){
					if(!$.contains(document.body,this)) return;
					pair.callback.call(this);
				});
			});
			
			self.applyMustach(element);
		},
		applyMustach:function(element){
			$(element).walkTheDOM().filter(function(){
				return (this.nodeType == Node.TEXT_NODE) && (this instanceof Text);
			}).each(this.loaders.textMustache);
		},
		loaders:{
			jIf: function(){
				var $this = $(this);
				
				
				var value = !!jstack.dataBinder.getAttrValueEval(this,'j-if');
				
				
				var contents = $this.data('jIf');
				
				if(!$this.is(':empty')||typeof(contents)=='undefined'){
					contents = $this.contents();
					$this.data('jIf',contents);
				}
				
				
				if($this.data('jIfState')===value){
					return;
				}
				
				$this.data('jIfState',value);
								
				if(value){
					if($this.is(':empty')){
						contents.appendTo($this);
						$this.trigger('j-if:true');
					}
				}
				else{
					if(!$this.is(':empty')){
						contents.detach();
						$this.trigger('j-if:false');
					}
				}
			},
			jSwitch: function(){
				var $this = $(this);
				var value = jstack.dataBinder.getAttrValueEval(this,'j-switch');
				var cases = $this.data('jSwitch');
				if(typeof(cases)=='undefined'){
					cases = $this.find('[j-case],[j-case-default]');
					$this.data('jSwitch',cases);
				}
				
				var state = $this.data('jSwitchState');
				if(state===value){
					return;
				}
				$this.data('jSwitchState',value);
				
				var found = false;
				cases.filter('[j-case]').each(function(){
					var jcase = $(this);
					var caseVal = jcase.attr('j-case');
					if(caseVal==value){
						jcase.appendTo($this);
						jcase.trigger('j-switch:true');
						found = true;
					}
					else{
						jcase.detach();
						jcase.trigger('j-switch:false');
					}
				});
				cases.filter('[j-case-default]').each(function(){
					var jcase = $(this);
					if(found){
						jcase.detach();
						jcase.trigger('j-switch:false');
					}
					else{
						jcase.appendTo($this);
						jcase.trigger('j-switch:true');
					}
				});
			},
			
			jFor: function(){
				var $this = $(this);
				var parent = $this.parent();
				
				var attrFor = $this.attr('j-for');
				attrFor = attrFor.trim();
				var index, key, value, myvar;
				
				var p = new RegExp('(\\()(.*)(,)(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
				var m = p.exec(attrFor);
				if (m != null){
					index = m[2].trim();
					key = m[4].trim();
					value = m[6];
					myvar = m[11].trim();
				}
				else{
					var p = new RegExp('(\\()(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
					var m = p.exec(attrFor);
					if (m != null){
						key = m[2].trim();
						value = m[4];
						myvar = m[9].trim();
					}
					else{
						var p = new RegExp('(.*)(\\s+)(in)(\\s+)(.*)',["i"]);
						var m = p.exec(attrFor);
						if (m != null){
							value = m[1];
							myvar = m[5].trim();
						}
						else{
							throw new Error('Malformed for clause: '+attrFor);
						}
					}
				}
				parent.attr('j-for-var',myvar);
				parent.attr('j-for-value',value);
				if(key){
					parent.attr('j-for-key',key);
				}
				if(typeof(index)!='undefined'){
					parent.attr('j-for-index',index);
				}
				
				parent.attr('j-for-list','true');
				parent.data('jForTemplate',this);
				$this.removeAttr('j-for');
				$this.data('parent',parent);
				$this.detach();
				
			},
			jForList: function(){
				var $this = $(this);
				
				if($this.attr('j-if')&&!jstack.dataBinder.getAttrValueEval(this,'j-if')){
					return;
				}
				
				//add
				var template = $this.data('jForTemplate');
				var myvar = $this.attr('j-for-var');
				var value = jstack.dataBinder.getValueEval(this,myvar);
				var forIdList = [];
				$.each(value,function(k){
					var row = $this.children('[j-for-id="'+k+'"]');
					if(!row.length){
						row = $(template).clone();
						row.attr('j-for-id',k);
						row.appendTo($this);
					}
					forIdList.push(k.toString());
				});
				
				//remove
				$this.children('[j-for-id]').each(function(){
					var forId = $(this).attr('j-for-id');
					if(forIdList.indexOf(forId)===-1){
						$(this).remove();
					}
				});
				
			},
			
			
			
			inputWithName: function(){
				var input = $(this);
				if(input.closest('[j-unscope]').length) return;
				var defaultValue = jstack.dataBinder.getInputVal(this);
				
				var key = jstack.dataBinder.getKey( input.attr('name') );
				var value = jstack.dataBinder.getValue(this,key,defaultValue);
				
				if(input.data('j:populate:prevent')) return;
				input.populateInput(value,{preventValEvent:true});
				input.trigger('j:val',[value]);
			},
			jVar:function(){
				var el = $(this);
				var value = jstack.dataBinder.getValueEval(this,el.data('j-var'));
				if(el.html()!=value){
					el.html(value);
				}
			},
			jHref: function(){
				var $this = $(this);

				var original = $this.data('j-href');
				if(!original){
					original = $this.attr('j-href');
					$this.data('j-href',original);
				}
				
				var parsed = jstack.dataBinder.textParser(original);
				var value = (typeof(parsed)=='string') ? jstack.dataBinder.getValueEval(this,parsed) : original;
				
				$this.attr('href',jstack.route.baseLocation + "#" + value);
			},
			jVarAttr: function(){
				var $this = $(this);
				var attrs = $this.attrStartsWith('j-var-');
				$.each(attrs,function(k,varAttr){
					var value = jstack.dataBinder.getValueEval($this,varAttr);
					$this.attr(k.substr(6),value);
				});
			},
			jModelAttr: function(){
				var $this = $(this);
				var attrs = $this.attrStartsWith('j-model-');
				$.each(attrs,function(k,varAttr){
					var parsed = jstack.dataBinder.textParser(varAttr);
					var value = (typeof(parsed)=='string') ? jstack.dataBinder.getValueEval($this,parsed) : varAttr;
					$this.attr(k.substr(8),value);
				});
			},
			jDataAttr: function(){
				var $this = $(this);
				var attrs = $this.attrStartsWith('j-data-');
				$.each(attrs,function(k,varAttr){
					var original = $this.data(k);
					if(!original){
						original = varAttr;
						$this.data(k,original);
					}
					
					var parsed = jstack.dataBinder.textParser(original);
					if(typeof(parsed)=='string'){
						var value = jstack.dataBinder.getValueEval($this,parsed);
						$this.attr(k,value);
					}
				});
			},
			jShrotcutModelAttr: function(){
				var $this = $(this);
				var attrs = $this.attrStartsWith('j-shortcut-model-');
				var propAttrs = ['selected','checked'];
				$.each(attrs,function(k,varAttr){
					var value = jstack.dataBinder.getValueEval($this,varAttr);
					var attr = k.substr(17);
					if(propAttrs.indexOf(attr)!==-1){
						$this.prop(attr,value);
					}
					else{						
						if(value){
							$this.attr(attr,attr);
						}
						else{
							$this.removeAttr(attr);
						}
					}
				});
			},
			textMustache: function(){
				if(this.textContent){
					var parsed = jstack.dataBinder.textParser(this.textContent.toString());
					if(typeof(parsed)=='string'){
						var $this = $(this);
						var el;
						var parent = $this.parent();
						if(parent.is('option')){
							parent.data('j-var',parsed);
							$this.remove();
							jstack.dataBinder.loaders.jVar.call(parent);
						}
						else{
							el = $('<span/>');
							el.data('j-var',parsed);
							$this.replaceWith(el);
						}
					}
				}
			},
			
		},
		textParser:function(text){
			var tagRE = /\{\{((?:.|\n)+?)\}\}/g; //regex from vue.js :)
			if (!tagRE.test(text)) {
				return;
			}
			var tokens = [];
			var lastIndex = tagRE.lastIndex = 0;
			var match, index;
			while ((match = tagRE.exec(text))) {
				index = match.index;
				// push text token
				if (index > lastIndex) {
					tokens.push(JSON.stringify(text.slice(lastIndex, index)));
				}
				// tag token
				var exp = match[1].trim();
				tokens.push("(" + exp + ")");
				lastIndex = index + match[0].length;
			}
			if (lastIndex < text.length) {
				tokens.push(JSON.stringify(text.slice(lastIndex)));
			}
			return tokens.join('+');
		}
	};
	var o = new dataBinder();
	o.eventListener();
	return o;
})();
$.on('reset','form[j-scope]',function(){
	$(this).populateReset();
});