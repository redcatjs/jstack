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
			
			var key = '';
			var form = $(el).closest('form[j-name]');
			if(form.length){
				key += form.attr('j-name')+'.';
			}
			key += varKey;

			return self.dotGet(key,data,defaultValue);
		},
		getParentsForId: function(el){
			var a = [];
			if(el.hasAttribute&&el.hasAttribute('j-for-id')){
				a.push(el);
			}
			var n = el;
			while(n){
				if(n.nodeType===Node.COMMENT_NODE&&n.nodeValue.split(' ')[0]==='j:for:id'){
					a.push(n);
					n = n.parentNode;
					if(n.hasAttribute&&n.hasAttribute('j-for-id')){
						a.push(n);
					}
				}
				if(n){
					if(n.previousSibling){
						n = n.previousSibling;
					}
					else{
						n = n.parentNode;
						if(n&&n.hasAttribute&&n.hasAttribute('j-for-id')){
							a.push(n);
						}
					}
				}
			}
			return a;
		},
		getValueEval: function(el,varKey){
			var self = this;
			var scopeValue = self.getControllerData(el);
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
			
			var controllerData = self.getControllerData(el);
			var controller = self.getControllerObject(el);
			
			var params = [ "$controller, $this, $scope" ];
			var args = [ controller, el, scopeValue ];
			
			var forCollection = self.getParentsForId(el);
			
			for(var i = 0, l = forCollection.length; i<l; i++){
				var forid = forCollection[i];
				
				var parentFor = $(forid);
				var parentForList = parentFor.parentComment('j:for');
				
				if(!parentForList.length) return;
				
				var jforCommentData = parentForList.dataCommentJSON();
				var value = jforCommentData.value;
				params.push(value);
				
				var isComment = forid.nodeType===Node.COMMENT_NODE;
				
				var forData = isComment?parentFor.dataComment('j:for:data'):parentFor.data('j:for:data');
				args.push(forData);
				
				
				var key = jforCommentData.key;
				var index = jforCommentData.index;
				if(index){
					scopeValue[index] = parentFor.index()+1;
				}
				if(key){
					var id = isComment?forid.nodeValue.split(' ')[1]:forid.getAttribute('j-for-id');
					scopeValue[key] = id;
				}
			}
			
			params.push("with($scope){var $return = "+varKey+"; return typeof($return)=='undefined'?'':$return;}");
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
		getScopedInput: function(input){
			var self = this;
			var $input = $(input);
			var name = input.getAttribute('name');
			var key = self.getKey(name);
			if(key.substr(-1)=='.'&&$input.is(':checkbox')){
				var index;
				var scope = self.getController(input);
				scope.find(':checkbox[name="'+name+'"]').each(function(i){
					if(this===input){
						index = i;
						return false;
					}
				});
				key += index;
			}
			var scopeKey = '';
			var form = $input.closest('form[j-name]');
			if(form.length){
				scopeKey += form.attr('j-name')+'.';
			}
			scopeKey += key;
			return scopeKey;
		},
		getters: {
			select: function(el){
				el = $(el);
				var options = el.children('option[value]');
				if(options.length){
					var selected = options.filter('[selected]');
					if(!selected.length){
						selected = options.eq(0);
					}
					return selected.attr('value');
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
		watchersPrimary: 0,
		watchers: {},
		addWatcher: function(render, level){
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
			//console.log('mutations',mutations);
			
			var self = this;
			
			var compilerTexts = [];
			var compilerJloads = [];
			var unobserveStack = [];
			$.each(mutations,function(i,mutation){
				$.each(mutation.addedNodes,function(ii,node){
					jstack.walkTheDOM(node,function(n){
						
						if(!document.body.contains(n)) return false;
						
						if(self.observe(n)===false){
							return false;
						}
						
						var $n = $(n);
						
						if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
							var renders = jstack.dataBinder.compilerText.call(n);
							if(renders){
								for(var i = 0, l=renders.length;i<l;i++){
									compilerTexts.push(renders[i]);
								}
							}
							return;
						}
						
						if(n.nodeType!=Node.ELEMENT_NODE) return;
						
						//j-once
						if(n.hasAttribute('j-once')){
							unobserveStack.push(function(){
								jstack.walkTheDOM(n,function(el){
									if(el.nodeType==Node.ELEMENT_NODE){
										var observer = $(el).data('j:observer');
										if(observer){
											observer.disconnect();
										}
									}
								});
								n.removeAttribute('j-once');
							});
						}
						else if(n.hasAttribute('j-once-element')){
							unobserveStack.push(function(){
								var observer = $n.data('j:observer');
								if(observer){
									observer.disconnect();
								}
								n.removeAttribute('j-once-element');
							});
						}
						
						$.each(self.compilers,function(k,compiler){
							var matchResult = compiler.match.call(n);
							if(matchResult){
								var render = compiler.callback.call(n,matchResult);
								if(render){
									self.addWatcher(render, compiler.level);
									render();
								}
							}
						});
						
						if(!document.body.contains(n)) return false;
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
							return false;
						}
						
						if(n.nodeType==Node.TEXT_NODE){
							return false;
						}
						
						if(!$(n).data('j:load:state')){
							return false;
						}
						
						setTimeout(function(){
							$(n).trigger('j:unload');
						},0);
					});
				});
			});
			
			for(var i = 0, l=compilerTexts.length;i<l;i++){
				var render = compilerTexts[i];
				self.addWatcher(render, 99);
				render();
			}
			for(var i = 0, l=unobserveStack.length;i<l;i++){
				unobserveStack[i]();
			}
			for(var i = 0, l=compilerJloads.length;i<l;i++){
				compilerJloads[i]();
			}
		},
		//mutationObserver: null, //j-once
		noChildListNodeNames: {area:1, base:1, br:1, col:1, embed:1, hr:1, img:1, input:1, keygen:1, link:1, menuitem:1, meta:1, param:1, source:1, track:1, wbr:1, script:1, style:1, textarea:1, title:1, math:1, svg:1},
		inputPseudoNodeNames: {input:1 ,select:1, textarea:1, button:1},
		observe: function(n){
			if(n.nodeType!=Node.ELEMENT_NODE) return;
			if(n.hasAttribute('j-escape')) return false;
			var nodeName = n.tagName.toLowerCase();
			var observations = {
				subtree: false,
				attributeOldValue: false,
				characterDataOldValue: false,
			};
			if(this.noChildListNodeNames[nodeName]){
				if(!this.inputPseudoNodeNames[nodeName]) return;
				observations.childList = false;
				observations.characterData = false;
			}
			else{
				observations.childList = true;
				observations.characterData = true;
			}
			if(this.inputPseudoNodeNames[nodeName]){
				observations.attributes = true;
				observations.attributeFilter = ['name','value'];
			}
			else{
				observations.attributes = false;
			}
			
			//this.mutationObserver.observe(n, observations);
			//j-once
			var self = this;
			var mutationObserver = new MutationObserver(function(m){
				self.loadMutations(m);
			});
			mutationObserver.observe(n, observations);
			$(n).data('j:observer',mutationObserver);
		},
		eventListener: function(){
			var self = this;
			
			//this.mutationObserver = new MutationObserver(function(m){
				//self.loadMutations(m);
			//});
			//j-once
			jstack.walkTheDOM(document.body,function(el){
				return self.observe(el);
			});
			
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
		
		inputPseudoNodeNamesExtended: {input:1 ,select:1, textarea:1, button:1, 'j-input':1, 'j-select':1},
		compilers:{
			jFor:{
				level: 1,
				match:function(){
					return this.hasAttribute('j-for');
				},
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
					
					var render;
					
					if(el.tagName.toLowerCase()=='template'){
						var content = this.content;
						
						render = function(){
							if(!document.body.contains(jfor[0])) return jfor[0];
							
							var data = getData();
							if(currentData===data) return;
							currentData = data;
							
							var forIdList = [];
							var collection = $( jfor.commentChildren().map(function(){
								if(this.nodeType===Node.COMMENT_NODE&&this.nodeValue.split(' ')[0] == 'j:for:id'){
									return this;
								}
							}) );
							
							//add
							$.each(data,function(k,v){
								var row = $( collection.map(function(){
									if(this.nodeValue == 'j:for:id '+k){
										return this;
									}
								}) );
								var create = !row.length;
								if(create){
									row = $('<!--j:for:id '+k+'-->');
								}
								row.dataComment('j:for:data',v);
								if(create){
									row.insertBefore(jforClose);
									$(document.importNode(content, true)).insertBefore(jforClose);
									$('<!--/j:for:id-->').insertBefore(jforClose);
								}
								forIdList.push(k.toString());
							});
							
							//remove
							collection.each(function(){
								var forId = this.nodeValue.split(' ')[1];
								if(forIdList.indexOf(forId)===-1){
									$(this).commentChildren().remove();
									$(this).remove();
								}
							});
							
						};
					}
					else{
						render = function(){
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
					}
					
					return render;
					
					
				},
			},
			jIf:{
				level: 2,
				match:function(){
					return this.hasAttribute('j-if');
				},
				callback:function(){
					var el = this;
					var $this = $(this);
					var jif = $('<!--j:if-->');
					$this.before(jif);
					
					var jelseifEl = $this.nextAll('[j-else-if]');
					var jelseEl = $this.nextAll('[j-else]');
					
					if(this.tagName.toLowerCase()=='template'){
						$this.detach();
						$this = $(document.importNode(this.content, true));
					}
					
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
						jelseifEl = $( jelseifEl.map(function(){
							myvar2.push( this.getAttribute('j-else-if') );
							this.removeAttribute('j-else-if');
							
							var node = this;
							if(this.tagName.toLowerCase()=='template'){
								$(this).detach();
								node = document.importNode(this.content, true);
							}
							return node;
						}) );
						
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
						jelseEl = $( jelseEl.map(function(){
							this.removeAttribute('j-else');
							
							var node = this;
							if(this.tagName.toLowerCase()=='template'){
								$(this).detach();
								node = document.importNode(this.content, true);
							}
							return node;
						}) );
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
			jSwitch:{
				level: 3,
				match:function(){
					return this.hasAttribute('j-switch');
				},
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
			jShow:{
				level: 4,
				match:function(){
					return this.hasAttribute('j-show');
				},
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
			jHref:{
				level: 5,
				match:function(){
					return this.hasAttribute('j-href');
				},
				callback:function(){
					
					var el = this;
					var $this = $(this);
					
					var original = this.getAttribute('j-href');
					this.removeAttribute('j-href');
					
					var tokens = jstack.dataBinder.textTokenizer(original);
					if(tokens===false){
						el.setAttribute('href',jstack.route.baseLocation + "#" + original);
						return;
					}
					
					var currentData;
					var getData = jstack.dataBinder.createCompilerAttrRender(el,tokens);
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
			jTwoPoints:{
				level: 6,
				match:function(){
					var r;
					for (var i = 0, atts = this.attributes, n = atts.length; i < n; i++) {
						var att = atts[i];
						if(att.name.substr(0,1) === ':') {
							if(!r){
								r = {};
							}
							r[att.name] = att.value;
						}
					}
					return r;
				},
				callback:function(attrs){
					var el = this;
					var $this = $(this);
					var attrsVars = {};
					var attrsVarsCurrent = {};
					var propAttrs = ['selected','checked'];
					$.each(attrs,function(k,v){
						var tokens = jstack.dataBinder.textTokenizer(v);
						var key = k.substr(1);
						if(tokens===false){
							el.setAttribute(key,v);
						}
						else{
							attrsVars[k] = tokens;
						}
						el.removeAttribute(k);
					});
					var render = function(){
						if(!document.body.contains(el)) return el;
						
						$.each(attrsVars,function(k,v){
							var value = jstack.dataBinder.compilerAttrRender(el,v);
							if(attrsVarsCurrent[k]===value) return;
							attrsVarsCurrent[k] = value;
							
							if(propAttrs.indexOf(k)!==-1){
								$this.prop(k,value);
							}
							else if(typeof(value) === "boolean"){
								if(value){
									el.setAttribute(k,k);
								}
								else{
									el.removeAttribute(k);
								}
							}
							else{
								el.setAttribute(k,value);
							}
						});
					};
					return render;
				},
			},
			jInput:{
				level: 8,
				match: function(){
					return this.hasAttribute('name')&&jstack.dataBinder.inputPseudoNodeNamesExtended[this.tagName.toLowerCase()];
				},
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
		},
		compilerAttrRender: function(el,tokens){
			var r = '';
			for(var i = 0, l = tokens.length; i<l; i++){
				var token = tokens[i];
				if(token.substr(0,2)=='{{'){
					token = jstack.dataBinder.getValueEval(el,token.substr(2,token.length-4));
				}
				r += token?token:'';
			}
			return r;
		},
		createCompilerAttrRender: function(el,tokens){
			return function(){
				return jstack.dataBinder.compilerAttrRender(el,tokens);
			};
		},
		createCompilerTextRender: function(text,token){
			var currentData;
			return function(){
				var data = jstack.dataBinder.getValueEval(text[0],token);
				if(!document.body.contains(text[0])) return text[0];
				if(currentData===data) return;
				currentData = data;
				text.commentChildren().remove();
				text.after(data);
			};
		},
		compilerText:function(){
			if(!this.textContent) return;
			var textString = this.textContent.toString();
			var tokens = jstack.dataBinder.textTokenizer(textString);
			if(tokens===false) return;
			
			var el = this;
			var $this = $(this);
			var renders = [];
			
			var last = $this;
			
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
				renders.push(jstack.dataBinder.createCompilerTextRender(text,token));
			};
			$this.remove();
			
			return renders;
		},
		textTokenizer:function(text){
			var tagRE = /\{\{((?:.|\n)+?)\}\}/g;
			if (!tagRE.test(text)) {
				return false;
			}
			var tokens = [];
			var lastIndex = tagRE.lastIndex = 0;
			var match, index;
			while ((match = tagRE.exec(text))) {
				index = match.index;
				// push text token
				if (index > lastIndex) {
					tokens.push(text.slice(lastIndex, index));
				}
				// tag token
				var exp = match[1].trim();
				tokens.push("{{" + exp + "}}");
				lastIndex = index + match[0].length;
			}
			if (lastIndex < text.length) {
				tokens.push(text.slice(lastIndex));
			}
			return tokens;
		},
		/*
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
		},
		*/
	};
	var o = new dataBinder();
	o.eventListener();
	return o;
})();
$.on('reset','form',function(){
	$(this).populateReset();
});