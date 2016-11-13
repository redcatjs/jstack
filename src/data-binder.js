jstack.dataBinder = (function(){
	var dataBinder = function(){
		this.updateWait = 100;
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
					if(!isDefault||!obj[k]){
						obj[k] = value;
					}
				}
				else{
					if(typeof(obj[k])!='object'){
						obj[k] = {};
					}					
					return obj[k];
				}
			}, data);
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
			var func = new Function( "$scope, $controller, $this, $default, $parent", "with($scope){var $return = "+varKey+"; return typeof($return)=='undefined'?$default:$return;}" );
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
		populate: function(controller){
			var self = this;
			controller = $(controller);
			controller.find(':input[name]').each(function(){
				var defaultValue = self.getInputVal(this);
				var input = $(this);
				var value = self.getAttrValue(this,'name',defaultValue);
				input.populateInput(value,{preventValEvent:true});
				input.trigger('j:val');
			});
			controller.find(':input[j-val]').each(function(){
				var el = $(this);
				var type = el.prop('type');
				//var value = self.getAttrValueEval(this,'j-val',self.getInputVal(this));
				var value = self.getAttrValueEval(this,'j-val');
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
					self.dotSet(self.getKey(name),self.getScopeValue(this),value);
				}
				el.populateInput(value,{preventValEvent:true});
				el.trigger('j:val');
			});
			controller.find('[j-var]').each(function(){
				var value = self.getAttrValueEval(this,'j-var');
				$(this).html(value);
			});
			controller.find(':attrStartsWith("j-var-")').each(function(){
				var $this = $(this);
				var attrs = $this.attrStartsWith('j-var-');
				$.each(attrs,function(k,varAttr){					
					var match = varAttr.match(/\${\s*[\w\.]+\s*}/g);
					if(match){
						$.each(match,function(i,x){
							var v = x.match(/[\w\.]+/)[0];
							var value = self.getValue($this.get(0),v);
							if(typeof(value)=='undefined'||value===null||!value){
								value = '';
							}
							varAttr = varAttr.replace(new RegExp("\\$\\{"+v+"\\}",'g'),value);
						});
					}
					$this.attr(k.substr(6),varAttr);
				});
			});
		},
		observer: null,
		stateObserver: true,
		eventListener: function(){
			var self = this;
			var validNodeEvent = function(n){
				if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
					return false;
				}
				var jn = $(n);
				if(jn.attr('j-repeat')||jn.closest('[j-repeat]').length){
					return false;
				}
				return true;
			};
			self.observer = new MutationObserver(function(mutations){
				//console.log(mutations);
				//console.log('mutations');
			
				var events = $._data(document,'events');
				var eventsLoad = events['j:load'] || [];
				var eventsUnload = events['j:unload'] || [];
				
				var eventLoad = $.Event('j:load');
				var eventUnload = $.Event('j:unload');
				var update = false;
				$.each(mutations,function(i,mutation){
					$.each(mutation.addedNodes,function(ii,node){
						var nodes = $(node).add($(node).find('*'));
						
						nodes.each(function(iii,n){
							if(!validNodeEvent(n)) return;
							update = true;
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
							if(!validNodeEvent(n)) return;
							update = true;
							$.each(eventsUnload,function(type,e){
								if(e.selector&&$(n).is(e.selector)){
									e.handler.call(n,eventUnload);
								}
							});
							
						});
							
					});
				});
				
				if(!self.stateObserver||!update) return;
				
				self.triggerUpdate();
			});
			self.observer.observe(document, { subtree: true, childList: true, attribute: false, characterData: true });
			
			$.on('j:load',':input[name]',function(){
				//console.log('input default');
				self.inputToModel(this,'j:default',true);
			});
			$(document.body).on('val', ':input[name][j-val-event]', function(e){
				self.inputToModel(this,'j:input');
			});
			$(document.body).on('input', ':input[name]', function(e){
				//console.log('input user');
				self.inputToModel(this,'j:input');
			});
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
		inputToModel: function(el,eventName,isDefault){
			var self = this;
			var input = $(el);
			var data = self.getControllerData(el);
			var name = input.attr('name');
			var value = self.getInputVal(el);
			var key = self.getScopedInput(el);
			self.dotSet(key,data,value,isDefault);			
			var defer = $.Deferred();
			self.triggerUpdate(defer);
			defer.then(function(){
				input.trigger(eventName);
			});
		},
		updateDefers: [],
		updateDeferStateObserver: null,
		updateTimeout: null,
		triggerUpdate: function(defer){
			var self = this;
			if(self.updateTimeout){
				clearTimeout(self.updateTimeout);
			}
			if(defer){
				self.updateDefers.push(defer);
			}
			self.updateTimeout = setTimeout(function(){
				
				if(self.updateDeferStateObserver){
					self.updateDeferStateObserver.then(function(){
						self.triggerUpdate();
					});
					return;
				}
				else{
					self.updateDeferStateObserver = $.Deferred();
				}
				
				self.stateObserver = false;
				
				self.update();
				
				while(self.updateDefers.length){
					self.updateDefers.pop().resolve();
				}
				
				
				self.updateDeferStateObserver.resolve();
				self.updateDeferStateObserver = false;
				
				self.stateObserver = true;
				
			}, self.updateWait);
		},
		update: function(){
			var self = this;
			//console.log('update');
			self.updateRepeat();
			self.updateIf();
			self.updateController();
			self.updateOn();
			
		},
		updateOn: function(){
			var self = this;
			$(':attrStartsWith("j-on-")').each(function(){
				var $this = $(this);
				var attrs = $this.attrStartsWith('j-on-');
				$.each(attrs,function(k,v){
					var event = k.substr(5);
					$this.removeAttr(k);
					$this.on(event,function(){
						var method = self.getValue($this,v);
						if(typeof(method)!='function'){
							return;
						}
						var r = method.apply(this,arguments);
						if(r===false){
							return false;
						}
						if(r){
							$.when(r).then(function(){
								self.triggerUpdate();
							});
						}
					});
				});
			});
		},
		updateController: function(){
			var self = this;
			$('[j-controller]').each(function(){
				//console.log('input populate');
				self.populate(this);
			});
		},
		updateIf: function(){
			var self = this;
			$('[j-if]').each(function(){
				var $this = $(this);
				var value = self.getAttrValueEval(this,'j-if');
				
				var contents = $this.data('jIf');
				if(typeof(contents)=='undefined'){
					contents = $this.contents();
					$this.data('jIf',contents);
				}
				
				var state = $this.data('jIfState');
				if(typeof(state)=='undefined'){
					state = value;
					$this.data('jIfState',state);
				}
				else if(Boolean(state)===Boolean(value)){
					return;
				}
				
				if(value){
					contents.appendTo($this);
					$this.trigger('j-if:true');
				}
				else{
					contents.detach();
					$this.trigger('j-if:false');
				}
			});
		},
		updateRepeat: function(){
			var self = this;
			$('[j-repeat]').each(function(){
				var $this = $(this);
				
				var parent = $this.parent();
				parent.attr('j-repeat-list','true');
				var list = parent.data('jRepeatList') || [];
				list.push(this);
				parent.data('jRepeatList',list);
				
				$this.detach();
			});
			
			$('[j-repeat-list]').each(function(){
				var $this = $(this);
				//var data = self.getControllerData(this);
				var list = $this.data('jRepeatList') || [];
				var scopes = [];
				
				//add
				$.each(list,function(i,original){
					var $original = $(original);
										
					var attrRepeat = $original.attr('j-repeat');
					//var key = self.getScoped($this.get(0),attrRepeat);
					//var value = self.dotGet(key,data);
					var value = self.getValueEval($this.get(0),attrRepeat);
					
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
			});
		},
	};
	var o = new dataBinder();
	o.eventListener();
	return o;
})();
$.on('reset','form[j-scope]',function(){
	$(this).populateReset();
});