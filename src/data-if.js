(function(j,$){
	var getVal = function(input){
		var val = input.val();
		if(input.is('input[type=checkbox]')){
			return input.prop('checked')?val:false;
		}
		else{
			return val;
		}
	};
	$.fn.dataIf = function(options){
		options = $.extend({
			closestSelector: 'form'
		},options||{});
		var uid = uniqid('data-if');
		return this.each(function(){
			var self = $(this);
			self.find('[data-if]').each(function(){
				var $this = $(this);
				var dataIf = $this.attr('data-if');
				var match = dataIf.match(/\${\s*[\w\.]+\s*}\$/g);
				dataIf = dataIf.replace(/\$\{/g,"getVal($this.closest('"+options.closestSelector+"').find('[name=\"");
				dataIf = dataIf.replace(/\}\$/g,"\"]:eq(0)'))");
				var showOrHide = function(){
					var ok = eval(dataIf);
					if(ok){
						$this.show();
						$this.attr('data-if-ok','true');
						$this.trigger('data-if:show');
					}
					else{
						$this.hide();
						$this.attr('data-if-ok','false');
						$this.trigger('data-if:hide');
					}
				};
				if(match){
					$.each(match,function(i,x){
						var v = x.match(/[\w\.]+/)[0];
						var input = $this.closest(options.closestSelector).find('[name="'+v+'"]:eq(0)');
						if(!input.data(uid)){
							input.data(uid,true);
							input.on('input change val',function(e){
								if(options.onChange){
									options.onChange();
								}
								$this.trigger('data-if:change');
							});
						}
						input.on('input change val',function(){
							showOrHide();
						});
					});
				}
				showOrHide();				
			});
			
			if(options.onShow){
				self.on('data-if:show','[data-if]',options.onShow);
			}
			if(options.onHide){
				self.on('data-if:hide','[data-if]',options.onHide);
			}
			
		});
	};
})(jstack,jQuery);