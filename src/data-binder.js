jstack.dataBinder = (function(){
	var dataBinder = function(){
		
	};
	dataBinder.prototype = {
		dotGet: function(key,data){
			return key.split('.').reduce(function(obj,i){return obj[i];}, data);
		},
		dotSet: function(key,data,value){
			key.split('.').reduce(function(obj,k,index,array){ if(array.length==index+1) obj[k] = value; return obj[k];}, data);
		},
		getKey: function(key){
			return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" );
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
		getValue: function(element){
			var elementType = element.tagName;
			var getter = this.getters[elementType] || this.defaultGetter;
			return getter(element);
		},
		register: function(controller,data){
			var self = this;
			controller.data('j-model',data);
			controller.on('input',':input[name]',function(){
				var name = $(this).attr('name');
				var value = self.getValue(this);
				var key = self.getScopedInput(this);
				self.dotSet(key,data,value);
			});
			this.populate(controller, data);
		},
		populate: function(controller, data){
			var self = this;
			var data = data || controller.data('j-model');
			controller.find(':input[name]').each(function(){
				var key = self.getScopedInput(this);
				var value = self.dotGet(key,data);
				$(this).populateInput(value);
			});
			controller.find('[j-var]').each(function(){
				var $this = $(this);
				var varAttr = $this.attr('j-var');
				var key = self.getScoped(this,varAttr);
				var value = self.dotGet(key,data);
				$this.html(value);
			});
		},
		eventListener: function(){
			var self = this;
			var observer = new MutationObserver(function(mutations){
				self.triggerEvent('eventDOMChange',[mutations]);
			});
			observer.observe(document.body, { subtree: true, childList: true, attribute: false, characterData: true });
			
			$(document.body).on('input', ':input[name]',function(){
				self.triggerEvent('eventInputChange',[this]);
			});
		},
		timeouts: {},
		triggerEvent: function(methodName,args){
			var self = this;
			args = args || [];
			var method = self[methodName];
			if(self.timeouts[methodName]){
				clearTimeout(self.timeouts[methodName]);
			}
			self.timeouts[methodName] = setTimeout( function() {
				method.apply(self,args);
			}, 100);
		},
		eventDOMChange: function(mutations){
			this.update();
		},
		eventInputChange: function(mutations){
			this.update();
		},
		update: function(){
			this.updateIf();
			this.updateController();
		},
		updateController: function(){
			var self = this;
			$('[j-controller]').each(function(){
				var controller = $(this);
				self.populate(controller);
			});
		},
		updateIf: function(){
			var self = this;
			$('[j-if]').each(function(){
				var $this = $(this);
				var attrIf = $this.attr('j-if');
				
				var data = $this.closest.data('j-controller');
				var key = self.getScoped(this,attrIf);
				var value = self.dotGet(key,data);
				
				var children = $this.data('j-if');
				if(children){
					children = $this.children();
					$this.data('j-if',children);
				}
				
				if(value){
					children.appendTo($this);
					$this.trigger('j-if:true');
				}
				else{
					children.detach();
					$this.trigger('j-if:false');
				}
			});
		},
	};
	var o = new dataBinder();
	o.eventListener();
	return o;
})();