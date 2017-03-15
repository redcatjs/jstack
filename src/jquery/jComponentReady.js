$.fn.jComponentReady = function(callback){
	var self = this;
	var defer = $.Deferred();
	if(callback){
		defer.then(function(){
			self.each(function(){
				callback.call(this);
			});
		});
	}
	var check = function(){
		var ok = true;
		self.each(function(){
			if(!$(this).data('j.component.loaded')){
				ok = false;
				return false;
			}
		});
		if(ok){
			defer.resolve();
		}
	};
	this.on('j:component:loaded',function(){
		check();
	});
	check();	
	return defer.promise();
};
