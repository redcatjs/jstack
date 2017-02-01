$.fn.jComponentReady = function(callback){
	var self = this;
	var defer = $.Deferred();
	defer.then(callback);
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