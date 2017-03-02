//inspired from https://gist.github.com/infostreams/6540654
$.fn.onFirst = function(which, handler) {
      // ensures a handler is run before any other registered handlers, 
      // independent of the order in which they were bound
      var $el = $(this);
      $el.off(which, handler);
      $el.on(which, handler);

      var events = $._data($el[0]).events;
      var registered = events[which];
      registered.unshift(registered.pop());

      events[which] = registered;
};

//inspired from from https://github.com/nickyleach/jQuery.bindLast
$.fn.onLast = function(event, cbFunc){
	return this.each(function(){
		var highIndex = 1000000;
		var eventData = event.split('.');
		var eventName = eventData[0];
		
		$(this).on(event, cbFunc);
		
		var events = $._data(this,'events'),
			ourIndex = false,
			usedIndicies = {};
		
		$.each(events[eventName], function(index, func){
			if(func === cbFunc){
				ourIndex = index;
			}
			
			usedIndicies[index] = 1;
		});
		
		if(ourIndex !== false){
			while(usedIndicies[highIndex] == 1){
				highIndex++;
			}
			
			events[eventName][highIndex] = events[eventName][ourIndex];
			delete events[eventName][ourIndex];
		}
	});
};