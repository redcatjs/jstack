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
			return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" );
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
			var logUndefined = jstack.config.debug?'console.log(jstackException.message);':'';
			var func = new Function( "$scope, $controller, $this, $default, $parent", "try{ with($scope){var $return = "+varKey+"; return typeof($return)=='undefined'?$default:$return;} }catch(jstackException){"+logUndefined+"}" );
			var controllerData = self.getControllerData(el);
			
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
			
			return func(scopeValue, controllerData, el, defaultValue, parent);
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
			var name = $(input).attr('name');
			var key = this.getKey(name);
			return this.getScoped(input,key);
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
			SELECT: function(element){
				return $( element ).val();
			},
			INPUT: function(element) {
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
			TEXTAREA: function(element){
				return $( element ).val();
			}
		},
		defaultGetter: function(element){
			return $( element ).html();
		},
		getInputVal: function(element){
			var elementType = element.tagName;
			var getter = this.getters[elementType] || this.defaultGetter;
			return getter(element);
		},
		inputToModel: function(el,eventName,isDefault){
			var input = $(el);
			if(input.closest('[j-unscope]').length) return;
			
			var self = this;
			
			var data = self.getControllerData(el);
			var name = input.attr('name');
			
			var performInputToModel = function(value){
				var key = self.getScopedInput(el);
				value = self.dotSet(key,data,value,isDefault);
				if(filteredValue!=value){
					value = filteredValue;
					input.populateInput(value,{preventValEvent:true});
				}
				
				input.trigger(eventName,[value]);
				
			};
			
			var value = self.getInputVal(el);
			var filteredValue = self.filter(el,value);
			
			if(typeof(filteredValue)=='object'&&filteredValue!==null&&typeof(filteredValue.promise)=='function'){
				filteredValue.then(function(value){
					performInputToModel(value);
				});
				return;
			}
			else{
				performInputToModel(filteredValue);
			}
			
		},
		eventListener: function(){
			var self = this;
			var validNodeEvent = function(n,excludeRepeat){
				if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
					return false;
				}
				if(excludeRepeat){
					var jn = $(n);
					if(jn.attr('j-repeat')||jn.closest('[j-repeat]').length){
						return false;
					}
				}
				return true;
			};
			
			var observer = new MutationObserver(function(mutations){
				//console.log(mutations);
				//console.log('mutations');
								
				var events = $._data(document,'events');			
				var eventsLoad = events['j:load'] || [];
				var eventLoad = $.Event('j:load');
				var eventsUnload = events['j:unload'] || [];
				var eventUnload = $.Event('j:unload');
				$.each(mutations,function(i,mutation){
					$.each(mutation.addedNodes,function(ii,node){
						
						//self.update($(node).andSelf());
						
						var nodes = $(node).add($(node).find('*'));
						
						nodes.each(function(iii,n){
							
							if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
								jstack.dataBinder.loaders.textMustache(n);
								return;
							}
							
							$.each(jstack.preloader,function(selector,callback){
								if($(n).is(selector)){
									callback.call(n);
								}
							});
							
							if(!$.contains(document.body,n)) return;
							
							$.each(eventsLoad,function(type,e){
								if(e.selector&&$(n).is(e.selector)){
									e.handler.call(n,eventLoad);
								}
							});
							
						});
						
					});
					$.each(mutation.removedNodes,function(ii,node){
						var nodes = $(node).add($(node).find('*'));
						nodes.each(function(iii,n){
							if(!validNodeEvent(n,true)) return;
							
							$.each(eventsUnload,function(type,e){
								if(e.selector&&$(n).is(e.selector)){
									e.handler.call(n,eventUnload);
								}
							});
							
						});
					});
				});
				
			});
			observer.observe(document, { subtree: true, childList: true, attribute: false, characterData: true });
			
			$(document.body).on('input', ':input[name]', function(e){
				//console.log('input user');
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
				controller = $(document.body);
				controller.attr('j-controller','');
				if(!controller.data('jModel')){
					controller.data('jModel',{});
				}
			}
			return controller;
		},
		getControllerObject:function(input){
			return this.getController(input).data('jController');
		},		
		update: function(element){
			var self = this;
			//console.log('update');
			
			$('[j-if]',element).each(self.loaders.jIf);
			$('[j-switch]',element).each(self.loaders.jSwitch);
			$('[j-repeat]',element).each(self.loaders.jRepeat);
			$('[j-repeat-list]',element).each(self.loaders.jRepeatList);
			
			$(':input[name]',element).each(self.loaders.inputWithName);
			$(':input[j-val]',element).each(self.loaders.inputWithJval);
			$('[j-var]',element).each(self.loaders.jVar);
			$(':attrStartsWith("j-var-")',element).each(self.loaders.jVarAttr);
			
			var textNodes = element.find('*').contents().add(element.contents()).filter(function() {
				return (this.nodeType == Node.TEXT_NODE) && (this instanceof Text);
			}).each(self.loaders.textMustache);
			
			
		},
		loaders:{
			jIf: function(){
				var $this = $(this);
				var value = jstack.dataBinder.getAttrValueEval(this,'j-if');
				
				var contents = $this.data('jIf');
				if(typeof(contents)=='undefined'){
					contents = $this.contents();
					$this.data('jIf',contents);
				}
				
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
			jRepeat: function(){
				var $this = $(this);
				
				var parent = $this.parent();
				parent.attr('j-repeat-list','true');
				var list = parent.data('jRepeatList') || [];
				list.push(this);
				parent.data('jRepeatList',list);
				$this.data('parent',parent);
				$this.detach();
				
			},
			jRepeatList: function(){
				var $this = $(this);
				//var data = jstack.dataBinder.getControllerData(this);
				var list = $this.data('jRepeatList') || [];
				var scopes = [];
				
				//add
				$.each(list,function(i,original){
					var $original = $(original);
										
					var attrRepeat = $original.attr('j-repeat');
					
					var value = jstack.dataBinder.getValue($this[0],attrRepeat);
					//var value = jstack.dataBinder.getValueEval($this[0],attrRepeat); //add j-repeat-eval in future
					
					var i = 1;
					$.each(value,function(k,v){
						var scope = attrRepeat+'.'+k;
						var row = $this.children('[j-scope="'+scope+'"]');
						if(!row.length){
							row = $original.clone();
							row.removeAttr('j-repeat');
							row.attr('j-scope',scope);
							row.attr('j-scope-id',k);
							row.appendTo($this);
						}
						row.find('[j-index]').text(i);
						scopes.push(scope);
						i++;
					});
					
				});
				
				//remove
				$this.children('[j-scope]').each(function(){
					var scope = $(this).attr('j-scope');
					if(scopes.indexOf(scope)===-1){
						$(this).remove();
					}
				});
			},
			
			inputWithName: function(){
				var input = $(this);
				if(input.closest('[j-unscope]').length) return;
				var defaultValue = jstack.dataBinder.getInputVal(this);
				var value = jstack.dataBinder.getAttrValue(this,'name',defaultValue);
				if(input.data('j:populate:prevent')) return;
				input.populateInput(value,{preventValEvent:true});
				input.trigger('j:val',[value]);
			},
			inputWithJval: function(){
				var el = $(this);
				var type = el.prop('type');
				//var value = jstack.dataBinder.getAttrValueEval(this,'j-val',jstack.dataBinder.getInputVal(this));
				var value = jstack.dataBinder.getAttrValueEval(this,'j-val');
				var name = el.attr('name');
				if(typeof(value)=='undefined'){
					var defaultValue;
					if(type=="checkbox"||type=="radio"){
						defaultValue = this.defaultChecked;
					}
					else{
						defaultValue = this.defaultValue;
					}
					value = defaultValue;
				}
				if(name){
					jstack.dataBinder.dotSet(jstack.dataBinder.getKey(name),jstack.dataBinder.getScopeValue(this),value);
				}
				if(el.data('j:populate:prevent')) return;
				el.populateInput(value,{preventValEvent:true});
				el.trigger('j:val',[value]);
			},
			jVar:function(){
				var value = jstack.dataBinder.getAttrValueEval(this,'j-var');
				$(this).html(value);
			},
			jVarAttr: function(){
				var $this = $(this);
				var attrs = $this.attrStartsWith('j-var-');
				$.each(attrs,function(k,varAttr){
					var value = jstack.dataBinder.getValueEval($this,varAttr);
					$this.attr(k.substr(6),value);
				});
			},
			textMustache: function(){				
				if(this.textContent){
					var parsed = jstack.dataBinder.textParser(this.textContent.toString());
					if(typeof(parsed)=='string'){
						//var compiled = jstack.dataBinder.getValueEval(this,parsed);
						//this.textContent = compiled;
						$(this).replaceWith('<span j-var="'+parsed.replace(/"/g,"'")+'"></span>');
					}
				}
			},
			
		},
		textParser:function(text,delimiters){//algo token from vue.js :)
			var defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g;
			var regexEscapeRE = /[-.*+?^${}()|[\]/\\]/g;
			var buildRegex = function (delimiters) {
				var open = delimiters[0].replace(regexEscapeRE, '\\$&');
				var close = delimiters[1].replace(regexEscapeRE, '\\$&');
				return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
			};
			
			var tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE;
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