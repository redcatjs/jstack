jstack.dataBindingCompilers = {};

jstack.ready = function(callback){
	var when = $.Deferred();
	
	setTimeout(function(){
		
		var defers = [ jstack.dataBinder.updateDeferStateObserver ];
	
		if(jstack.dataBinder.loadingMutation>0){
			var deferMutation = $.Deferred();
			jstack.dataBinder.deferMutation.push(function(){
				deferMutation.resolve();
			});
			defers.push(deferMutation);
		}
		$.when.apply($,defers).then(function(){
			when.resolve();
		});

		if(callback){
			when.then(function(){
				callback();
			});
		}
		
	});
	
	return when.promise();
};


$(document.body).on('reset','form',function(){
	$(this).populateReset();
});
