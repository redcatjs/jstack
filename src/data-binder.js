jstack.dataBinder = (function(){
	var dataBinder = function(){
		
	};
	dataBinder.prototype = {
		dotGet: function(key,data){
			return key.split('.').reduce(function(obj,i){
				if(typeof(obj)=='object'){
					return obj[i];
				}
			}, data);
		},
		dotSet: function(key,data,value){
			key.split('.').reduce(function(obj,k,index,array){
				if(array.length==index+1){
					obj[k] = value;
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
		getValue: function(el,varKey){
			var self = this;
			var data = $(el).closest('[j-controller]').data('j-model');
			var key = self.getScoped(el,varKey);
			return self.dotGet(key,data);
		},
		getAttrValue: function(el,attr){
			var attrKey = $(el).attr(attr);
			return this.getValue(el,attrKey);
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
				var value = self.getAttrValue(this,'name');
				$(this).populateInput(value,{preventValEvent:true});
				$(this).trigger('val:model');
			});
			controller.find('[j-var]').each(function(){
				var value = self.getAttrValue(this,'j-var');
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
		stateObserver: null,
		startObserver: function(){
			this.observer.observe(document.body, { subtree: true, childList: true, attribute: false, characterData: true });
		},
		stopObserver: function(){
			this.observer.disconnect();
		},
		eventListener: function(){
			var self = this;
			self.observer = new MutationObserver(function(mutations){
				self.triggerEvent('eventDOMChange');
			});
			self.startObserver();
			this.stateObserver = true;
			
			$(document.body).on('input val', ':input[name]', function(){
				var input = $(this);
				var controller = input.closest('[j-controller]');
				var data = controller.data('j-model');
				var name = input.attr('name');
				var value = self.getInputVal(this);
				var key = self.getScopedInput(this);
				self.dotSet(key,data,value);
				
				var defer = self.triggerEvent('eventInputChange');
				defer.then(function(){
					input.trigger('input:model');
				});
			});
		},
		defers: {},
		timeouts: {},
		resolveEvent: function(methodName){
			var self = this;
			var defers = self.defers[methodName];
			do{
				defers.pop().resolve();
			}
			while(defers.length);
		},
		triggerEvent: function(methodName){
			var self = this;
			var method = self[methodName];
			if(self.timeouts[methodName]){
				clearTimeout(self.timeouts[methodName]);
			}
			var defer = $.Deferred();
			if(typeof(self.defers[methodName])=='undefined'){
				self.defers[methodName] = [];
			}
			self.defers[methodName].push(defer);
			self.timeouts[methodName] = setTimeout(function(){
				var defer2 = method.call(self);
				if(defer2){
					defer2.then(function(){
						self.resolveEvent(methodName);
					});
				}
				else{
					self.resolveEvent(methodName);
				}
			}, 100);
			return defer;
		},
		eventDOMChange: function(){
			//console.log('eventDOMChange');
			this.update();
		},
		eventInputChange: function(){
			//console.log('eventInputChange');
			this.update();
		},
		update: function(){
			//console.log('update',(new Date()).toString());
			
			var tmpStateObserver = this.stateObserver;
			this.stateObserver = false;
			this.stopObserver();
			
			this.updateRepeat();
			this.updateIf();
			this.updateController();
			this.updateOn();
			
			this.stateObserver = tmpStateObserver;
			if(this.stateObserver){
				this.startObserver();
			}
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
								self.update();
							});
						}
					});
				});
			});
		},
		updateController: function(){
			var self = this;
			$('[j-controller]').each(function(){
				self.populate(this);
			});
		},
		updateIf: function(){
			var self = this;
			$('[j-if]').each(function(){
				var $this = $(this);
				var value = self.getAttrValue(this,'j-if');
				
				var contents = $this.data('j-if');
				if(!contents){
					contents = $this.contents();
					$this.data('j-if',contents);
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
				var list = parent.data('j-repeat-list') || [];
				list.push(this);
				parent.data('j-repeat-list',list);
				
				$this.detach();
			});
			
			$('[j-repeat-list]').each(function(){
				var $this = $(this);
				var data = $this.closest('[j-controller]').data('j-model');
				var list = $this.data('j-repeat-list') || [];
				var scopes = [];
				
				//add
				$.each(list,function(i,original){
					var $original = $(original);
										
					var attrRepeat = $original.attr('j-repeat');
					var key = self.getScoped($this.get(0),attrRepeat);
					var value = self.dotGet(key,data);
					
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