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
			if(el.hasAttribute && el.hasAttribute('j-for-id')){
				forCollection.push( el );
			}
			$(el).parents('[j-for-id]').each(function(){
				forCollection.push( this );
			});
			
			
			var addToScope = function(param,arg){
				scopeValue[param] = arg;
			};
			$(forCollection).each(function(){
				var parentFor = $(this);
				var parentForList = parentFor.parentComment('j:for');
				
				if(!parentForList.length) return;
				
				var jforCommentData = parentForList.dataCommentJSON();
				var value = jforCommentData.value;
				forParams.push(value);
				
				var forData = parentFor.data('j:for:data');
				forArgs.push(forData);
				
				var key = jforCommentData.key;
				var index = jforCommentData.index;
				if(index){
					addToScope(index,parentFor.index()+1);
				}
				if(key){
					var id = this.getAttribute('j-for-id');
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
					var warn = [jstackException.message, ", expression: "+varKey, "element", el];
					if(el.nodeType==Node.COMMENT_NODE){
						warn.push($(el).parent().get());
					}
					console.warn.apply(console,warn);
				}
			}
			
			return value;
		},
		getAttrValueEval: function(el,attr,defaultValue){
			var self = this;
			if(el instanceof jQuery) el = el[0];
			var attrKey = el.getAttribute(attr);
			return self.getValueEval(el,attrKey,defaultValue);
		},
		getAttrValue: function(el,attr,defaultValue){
			var self = this;
			if(el instanceof jQuery) el = el[0];
			var attrKey = el.getAttribute(attr);
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
					return this.getAttribute('j-scope');
				})
				.get()
				.reverse()
				.join('.')
			;
		},
		getScopedInput: function(input){
			var self = this;
			var $input = $(input);
			var name = input.getAttribute('name');
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
				var multiple = el[0].hasAttribute('multiple');
				var data = el.data('preselect');
				if(!data){
					if(multiple){
						data = [];
					}
					el.children().each(function(){
						if(this.hasAttribute('selected')){
							var val = this.value;
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
			if(elementType!='select'&&element.hasAttribute('j-select')){
				elementType = 'jselect';
			}
			var getter = this.getters[elementType] || this.defaultGetter;
			return getter(element);
		},
		inputToModel: function(el,eventType){
			var input = $(el);

			var self = this;
			
			var data = self.getControllerData(el);
			var name = el.getAttribute('name');

			var performInputToModel = function(){
				var key = self.getScopedInput(el);
				if(filteredValue!=value){
					value = filteredValue;
					input.populateInput(value,{preventValEvent:true});
				}
				
				var oldValue = self.dotGet(key,data);
				
				value = self.dotSet(key,data,value);
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
		watchersPrimary: 0,
		watchers: {},
		addWatcher: function(node, render, level){
			if(!level) level = 0;
			if(!this.watchers[level]) this.watchers[level] = {};
			this.watchers[level][++this.watchersPrimary] = render;
		},
		checkRemoved: function(ancestor){
			while(ancestor.parentNode){
				ancestor = ancestor.parentNode;
			}
			return $(ancestor).data('j:if:state')!==false;
		},
		runWatchers: function(){
			var self = this;
			//console.log('update');
			$.each(this.watchers,function(level,couch){
				$.each(couch,function(primary,render){
					var el = render();
					if(el&&self.checkRemoved(el)){
						delete couch[primary];
					}
				});
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
			
			var compilerTexts = [];
			var compilerJloads = [];
			$.each(mutations,function(i,mutation){
				$.each(mutation.addedNodes,function(ii,node){
					jstack.walkTheDOM(node,function(n){
						
						if(!document.body.contains(n)) return;
						
						var $n = $(n);
						
						//if($n.closest('[j-escape]').length) return;
						
						if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
							var render = jstack.dataBinder.compilerText.call(n);
							if(render){
								compilerTexts.push(function(){
									self.addWatcher(n, render, 99);
									render();
								});
							}
							return;
						}
						
						if(n.nodeType!=Node.ELEMENT_NODE) return;
						
						$.each(self.compilers,function(iii,compiler){
							if($n.is(compiler.selector)){								
								
								var render = compiler.callback.call(n);
								
								if(render){
									self.addWatcher(n, render, iii);
									render();
								}
							}
						});
						
						if($n.data('j:load:state')){
							return;
						}
						$n.data('j:load:state',1);
						compilerJloads.push(function(){
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
				});
				
				$.each(mutation.removedNodes,function(ii,node){
					jstack.walkTheDOM(node,function(n){
						if(n.nodeType===Node.COMMENT_NODE&&self.checkRemoved(n)){
							$(n).removeDataComment();
						}
						if(!self.validNodeEvent(n,true)) return;
						setTimeout(function(){
							$(n).trigger('j:unload');
						},0);
					});
				});
			});
			
			for(var i = 0, l=compilerTexts.length;i<l;i++){
				compilerTexts[i]();
			}
			for(var i = 0, l=compilerJloads.length;i<l;i++){
				compilerJloads[i]();
			}
		},
		eventListener: function(){
			var self = this;
			
			var observer = new MutationObserver(function(mutations){
				//console.log('mutations',mutations);
				self.loadMutations(mutations);
			});
			observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true, attributeFilter: ['name','value'], });
			
			$(document.body).on('input change j:update', ':input[name]', function(e){
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
				
				self.inputToModel(this,e.type);
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
			$el = $(el);
			var filter = $el.data('j-filter');
			if(!filter){
				var attrFilter = el.getAttribute('j-filter');
				if(attrFilter){
					var method = self.getValue(el,attrFilter);
					$el.data('j-filter',method);
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
					
					var attrFor = el.getAttribute('j-for');
					el.removeAttribute('j-for');
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
						return jstack.dataBinder.getValueEval(jfor[0],myvar);
					};
					
					//parentForList
					jfor.dataCommentJSON({
						value:value,
						key:key,
						index:index,
					});
					
					var render = function(){
						if(!document.body.contains(jfor[0])) return jfor[0];
						
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						var forIdList = [];
						var collection = jfor.commentChildren();
						
						//add
						$.each(data,function(k,v){
							var row = collection.filter('[j-for-id="'+k+'"]');
							var create = !row.length;
							if(create){
								row = $this.clone();
								row[0].setAttribute('j-for-id',k);
							}
							row.data('j:for:data',v);
							if(create){
								row.insertBefore(jforClose);
							}
							forIdList.push(k.toString());
						});
						
						//remove
						collection.each(function(){
							var forId = this.getAttribute('j-for-id');
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
					$this.before(jif);
					
					var jelseifEl = $this.nextAll('[j-else-if]');
					var jelseEl = $this.nextAll('[j-else]');
					
					var lastBlock;
					if(jelseEl.length){
						lastBlock = jelseEl;
					}
					else if(jelseifEl.length){
						lastBlock = jelseifEl.last();
					}
					else{
						lastBlock = jif;
					}
					$('<!--/j:if-->').insertAfter(lastBlock);
					
					var myvar = el.getAttribute('j-if');
					el.removeAttribute('j-if');
					var currentData;
					var getData = function(){
						return Boolean(jstack.dataBinder.getValueEval(jif[0],myvar));
					};
					
					var getData2;
					var currentData2 = null;
					if(jelseifEl.length){
						var myvar2 = [];
						jelseifEl.each(function(){
							myvar2.push( this.getAttribute('j-else-if') );
							this.removeAttribute('j-else-if');
						});
						getData2 = function(){
							var data = false;
							for(var i=0, l=myvar2.length;i<l;i++){
								if( Boolean(jstack.dataBinder.getValueEval(jif[0],myvar2[i])) ){
									data = i;
									break;
								}
							}
							return data;
						};
					}
					
					if(jelseEl.length){
						jelseEl.each(function(){
							this.removeAttribute('j-else');
						});
					}
					
					var render = function(){
						if(!document.body.contains(jif[0])) return jif[0];
						
						var data = getData();
						var data2 = null;
						if(getData2){
							data2 = data?false:getData2();
						}
						if( currentData===data && data2===currentData2 ) return;
						currentData = data;
						currentData2 = data2;
						
						$this.data('j:if:state',data);
						if(data){
							$this.insertAfter(jif);
							
							if(jelseifEl.length){
								jelseifEl.data('j:if:state',false);
								jelseifEl.detach();
							}
							if(jelseEl.length){
								jelseEl.data('j:if:state',false);
								jelseEl.detach();
							}
						}
						else{
							$this.detach();
							
							if(jelseifEl.length){
								jelseifEl.data('j:if:state',false);
								if(data2===false){
									jelseifEl.detach();
								}
								else{
									var jelseifElMatch = $(jelseifEl[data2]);
									jelseifElMatch.data('j:if:state',true);
									jelseifElMatch.insertAfter(jif);
								}
							}
							if(jelseEl.length){
								if(data2===false||data2===null){
									jelseEl.data('j:if:state',true);
									jelseEl.insertAfter(jif);
								}
								else{
									jelseEl.data('j:if:state',false);
									jelseEl.detach();
								}
							}
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
					var myvar = this.getAttribute('j-switch');
					this.removeAttribute('j-switch');
					
					var cases = $this.find('[j-case],[j-case-default]');
					
					var currentData;
					var getData = function(){
						return Boolean(jstack.dataBinder.getValueEval(el,myvar));
					};
					var render = function(){
						if(!document.body.contains(el)) return el;
						
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
			},
			{
				selector:'[j-show]',
				callback:function(){
					var el = this;
					var $this = $(this);
					
					var myvar = this.getAttribute('j-show');
					this.removeAttribute('j-show');
					var currentData;
					var getData = function(){
						return Boolean(jstack.dataBinder.getValueEval(el,myvar));
					};
					
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						
						if(data){
							$this.show();
						}
						else{
							$this.hide();
						}
					};
					
					return render;
				},
			},
			{
				selector:'[j-href]',
				callback:function(){
					
					var el = this;
					var $this = $(this);
					
					var original = this.getAttribute('j-href');
					this.removeAttribute('j-href');
					
					var parsed = jstack.dataBinder.textParser(original);
					
					if(typeof(parsed)!='string'){
						el.setAttribute('href',jstack.route.baseLocation + "#" + original);
						return;
					}
					
					var currentData;
					var getData = function(){
						return jstack.dataBinder.getValueEval(el,parsed);
					};
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						var data = getData();
						if(currentData===data) return;
						currentData = data;
						el.setAttribute('href',jstack.route.baseLocation + "#" + data);
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
						var parsed = jstack.dataBinder.textParser(v);
						var key = k.substr(8);
						if(typeof(parsed)=='string'){
							attrsVars[k] = parsed;
						}
						else{
							el.setAttribute(key,v);
						}
						el.removeAttribute(k);
					});
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						$.each(attrsVars,function(k,v){
							var value =  jstack.dataBinder.getValueEval(el,v);
							if(attrsVarsCurrent[k]===value) return;
							attrsVarsCurrent[k] = value;
							el.setAttribute(k,value);
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
						el.removeAttribute(k);
					});
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						$.each(attrsVars,function(k,v){
							var value = Boolean(jstack.dataBinder.getValueEval(el,v));
							
							if(attrsVarsCurrent[k]===value) return;
							attrsVarsCurrent[k] = value;
							
							if(propAttrs.indexOf(k)!==-1){
								$this.prop(k,value);
							}
							else{						
								if(value){
									el.setAttribute(k,k);
								}
								else{
									el.removeAttribute(k);
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
					if(this.type=='file') return;
					
					var currentData;
					var getData = function(){
						var defaultValue = jstack.dataBinder.getInputVal(el);
						var key = jstack.dataBinder.getKey( el.getAttribute('name') );
						return jstack.dataBinder.getValue(el,key,defaultValue);
					};
					
					var render = function(){
						if(!document.body.contains(el)) return el;
						
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
			var textString = this.textContent.toString();
			var parsed = jstack.dataBinder.textParser(textString);
			if(typeof(parsed)!='string') return;
			
			
			var el = this;
			var $this = $(this);
			
			
			var text = $('<!--j:text-->');
			var textClose = $('<!--/j:text-->');
			$this.replaceWith(text);
			textClose.insertAfter(text);
			
			var currentData;
			var getData = function(){
				return jstack.dataBinder.getValueEval(text[0],parsed);
			};
			var render = function(){
				if(!document.body.contains(text[0])) return text[0];
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