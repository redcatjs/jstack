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
				
				var myvar = parentForList.attr('j-for-list');
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
		inputToModel: function(el,eventName){
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
				value = self.dotSet(key,data,value);
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
		watchers: {},
		addWatcher: function(element,callback,level){
			if(!level) level = 0;
			var a = [ element, callback ];
			if(!this.watchers[level]){
				this.watchers[level] = [];
			}
			if(this.watchers[level].indexOf(a)!==-1) return;
			this.watchers[level].push( a );
		},
		runWatchers: function(){
			//console.log('update');
			//console.log(this.watchers);
			$.each(this.watchers,function(level,w){				
				for(var i = 0, l=w.length;i<l;i++){
					var a = w[i];
					var element = a[0];
					var callback = a[1];
					//if(!document.body.contains(element)){
						//w.splice(i,1);
						//jstack.arrayRemove(w,i);
						//return;
					//}
					callback();
				}
			});
			
		},
		
		updateTimeout: null,
		updateDeferStateObserver: null,
		updateWait: 100,
		update: function(){
			if(this.updateTimeout){
				if(this.updateTimeout!==true){
					clearTimeout(this.updateTimeout);
				}
				this.updateTimeout = setTimeout(this.runUpdate, this.updateWait);
			}
			else{
				this.updateTimeout = true;
				this.runUpdate();
			}
		},
		runUpdate: function(element){
			var self = this;
			if(this.updateDeferStateObserver){
				this.updateDeferStateObserver.then(function(){
					self.update();
				});
				return;
			}
			else{
				this.updateDeferStateObserver = $.Deferred();
			}
			
			this.runWatchers();
			
			this.updateDeferStateObserver.resolve();
			this.updateDeferStateObserver = false;
			this.updateTimeout = false;
		},
		
		loadMutations: function(mutations){
			var self = this;
			//console.log(mutations);
			
			//var stack = {100:[]};
			$.each(mutations,function(i,mutation){
				$.each(mutation.addedNodes,function(ii,node){
					$.walkTheDOM(node,function(n){
						
						if(!document.body.contains(n)) return;
						
						var $n = $(n);
						
						if($n.parent().closest('[j-for]').length){
							return;
						}
						
						if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
							var render = jstack.dataBinder.compilerText.call(n);
							if(render){
								self.addWatcher(n, render, 99);
								render();
							}
							return;
						}
						
						if(n.nodeType!=Node.ELEMENT_NODE) return;
						
						$.each(self.compilers,function(iii,compiler){
							if($n.is(compiler.selector)){
								//if(!stack[iii]) stack[iii] = [];
								//stack[iii].push([n,compiler]);
								
								var render = compiler.callback.call(n);
								//if(n.hasAttribute('j-static')) return;
								
								if(render){
									self.addWatcher(n, render, iii);
									render();
								}
							}
						});
						
						if($n.data('j:load:state')){
							return;
						}
						
						var jloadCallback = function(){
							var $n = $(this);
							$n.data('j:load:state',1);
							setTimeout(function(){
								if($n.data('j:load:state')==2){
									return;
								}
								$n.data('j:load:state',3);
								$n.trigger('j:load');
								$n.data('j:load:state',3);
							},0);
						};
						
						//stack[100].push([n,{callback:jloadCallback}]);
						jloadCallback.call(n);
						
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
			
			//$.each(stack,function(level,w){				
				//for(var i = 0, l=w.length;i<l;i++){
					//var a = w[i];
					//var n = a[0];
					//var pair = a[1];
					//if(pair.selector&&!$(n).is(pair.selector)){
						//return;
					//}
					//pair.callback.call(n);
				//}
			//});
		},
		eventListener: function(){
			var self = this;
			
			var observer = new MutationObserver(function(mutations){
				//console.log('mutations');
				//console.log(mutations);
				self.loadMutations(mutations);
			});
			observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true, attributeFilter: ['name','value'], });
			
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
		
		compilers:[
			{
				selector:'[j-for]',
				callback:function(){
					
					var el = this;
					var $this = $(this);
					var jfor = $('<!--j:for-->');
					var jforClose = $('<!--/j:for-->');
					$this.replaceWith(jfor);
					jforClose.insertAfter(jfor);
					
					var attrFor = $this.attr('j-for');
					$this.removeAttr('j-for');
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
					
					var currentData;
					
					var getData = function(){
						return jstack.dataBinder.getValueEval(jfor,myvar);
					};
					
					var render = function(){
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						var forIdList = [];
						var collection = jfor.commentChildren();
						
						//add
						$.each(data,function(k){
							var row = collection.filter('[j-for-id="'+k+'"]');
							if(!row.length){
								row = $this.clone();
								row.attr('j-for-id',k);
								row.insertBefore(jforClose);
							}
							forIdList.push(k.toString());
						});
						
						//remove
						collection.each(function(){
							var forId = $(this).attr('j-for-id');
							if(forIdList.indexOf(forId)===-1){
								$(this).remove();
							}
						});
					};
					
					return render;
					
					
				},
			},
			{
				selector:'[j-if]',
				callback:function(){
					var el = this;
					var $this = $(this);
					var jif = $('<!--j:if-->');
					$this.replaceWith(jif);
					$('<!--/j:if-->').insertAfter(jif);
					var myvar = $this.attr('j-if');
					this.removeAttribute('j-if');
					var currentData;
					var getData = function(){
						return Boolean(jstack.dataBinder.getValueEval(jif,myvar));
					};
					var render = function(){
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						if(data){
							$this.insertAfter(jIf);
						}
						else{
							$this.detach();
						}
						
					};
					
					return render;
				},
			},
			{
				selector:'[j-switch]',
				callback:function(){
					var el = this;
					var $this = $(this);
					var myvar = $this.attr('j-switch');
					this.removeAttribute('j-switch');
					
					var cases = $this.find('[j-case],[j-case-default]');
					
					var currentData;
					var getData = function(){
						return Boolean(jstack.dataBinder.getValueEval(el,myvar));
					};
					var render = function(){
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						var found = false;
						cases.filter('[j-case]').each(function(){
							var jcase = $(this);
							var caseVal = jcase.attr('j-case');
							if(caseVal==value){
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
			},
			{
				selector:'[j-href]',
				callback:function(){
					
					var el = this;
					var $this = $(this);
					
					var original = $this.attr('j-href');
					this.removeAttribute('j-href');
					
					var parsed = jstack.dataBinder.textParser(original);
					
					var currentData;
					var getData = typeof(parsed)=='string'?function(){
						return jstack.dataBinder.getValueEval(el,parsed);
					}:function(){
						return original;
					};
					var render = function(){
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						$this.attr('href',jstack.route.baseLocation + "#" + data);
					};
					
					return render;
				},
			},
			{
				selector:':data(j-var)',
				callback:function(){
					var el = this;
					var $this = $(this);
					var myvar = $this.data('j-var');
					$this.removeData('j-var');
					var currentData;
					var getData = function(){
						return jstack.dataBinder.getValueEval(el,myvar);
					};
					var render = function(){
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						$this.html(data);
					};
					return render;
				},
			},
			{
				selector:'[data-j-var]',
				callback:function(){
					
					var el = this;
					var $this = $(this);
					var myvar = $this.attr('data-j-var');
					this.removeAttribute('data-j-var');
					var currentData;
					var getData = function(){
						return jstack.dataBinder.getValueEval(el,myvar);
					};
					var render = function(){
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						$this.html(data);
					};
					return render;
					
				},
			},
			{
				selector:':attrStartsWith("j-model-")',
				callback:function(){
					var el = this;
					var $this = $(this);
					var attrs = $this.attrStartsWith('j-model-');
					var attrsVars = {};
					var attrsVarsCurrent = {};
					$.each(attrs,function(k,v){
						attrsVars[k.substr(8)] = jstack.dataBinder.textParser(v);
						$this.removeAttr(k);
					});
					var render = function(){
						$.each(attrsVars,function(k,parsed){
							var value = (typeof(parsed)=='string') ? jstack.dataBinder.getValueEval(el,parsed) : parsed;
							if(attrsVarsCurrent[k]===value) return;
							attrsVarsCurrent[k] = value;
							$this.attr(k,value);
						});
					};
					return render;
				},
			},
			{
				selector:':attrStartsWith("j-data-")',
				callback:function(){
					var el = this;
					var $this = $(this);
					var attrs = $this.attrStartsWith('j-data-');
					var attrsVars = {};
					var attrsVarsCurrent = {};
					$.each(attrs,function(k,v){
						attrsVars[k] = jstack.dataBinder.textParser(v);
						$this.removeAttr(k);
					});
					var render = function(){
						$.each(attrsVars,function(k,parsed){
							var value = (typeof(parsed)=='string') ? jstack.dataBinder.getValueEval(el,parsed) : parsed;
							if(attrsVarsCurrent[k]===value) return;
							attrsVarsCurrent[k] = value;
							$this.attr(k,value);
						});
					};
					return render;
				},
			},
			{
				selector:':attrStartsWith("j-shortcut-model-")',
				callback:function(){
					var propAttrs = ['selected','checked'];
					
					var el = this;
					var $this = $(this);
					var attrs = $this.attrStartsWith('j-shortcut-model-');
					var attrsVars = {};
					var attrsVarsCurrent = {};
					$.each(attrs,function(k,v){
						attrsVars[k.substr(17)] = v;
						$this.removeAttr(k);
					});
					var render = function(){
						$.each(attrsVars,function(k,v){
							var value = Boolean(jstack.dataBinder.getValueEval(el,v));
							
							if(attrsVarsCurrent[k]===value) return;
							attrsVarsCurrent[k] = value;
							
							if(propAttrs.indexOf(k)!==-1){
								$this.prop(k,value);
							}
							else{						
								if(value){
									$this.attr(k,k);
								}
								else{
									$this.removeAttr(k);
								}
							}
						});
					};
					return render;
				},
			},
			{
				selector:':input[name],[j-input],[j-select]',
				callback:function(){
					var el = this;
					var $el = $(this);
					if($el.closest('[j-unscope]').length) return;
					
					
					var currentData;
					var getData = function(){
						var defaultValue = jstack.dataBinder.getInputVal(el);
						var key = jstack.dataBinder.getKey( $el.attr('name') );
						return jstack.dataBinder.getValue(el,key,defaultValue);
					};
					
					var render = function(){
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						if($el.data('j:populate:prevent')) return;
						$el.populateInput(data,{preventValEvent:true});
						$el.trigger('j:val',[data]);
					};
					return render;
				},
			},
		],
		compilerText:function(){
			if(!this.textContent) return;
			var parsed = jstack.dataBinder.textParser(this.textContent.toString());
			if(typeof(parsed)!='string') return;
			
			var el = this;
			var $this = $(this);
			var text = $('<!--j:text-->');
			var textClose = $('<!--/j:text-->');
			$this.replaceWith(text);
			textClose.insertAfter(text);
			
			var currentData;
			var getData = function(){
				return jstack.dataBinder.getValueEval(text,parsed);
			};
			var render = function(){
				var data = getData();
				if(currentData===data) return;
				currentData = data;
				text.commentChildren().remove();
				text.after(data);
			};
			return render;
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