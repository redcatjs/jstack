$.fn.requiredId = function(){
	var id = this.attr('id');
	if(this.length>1){
		return this.each(function(){
			$(this).requiredId();
		});
	}
	if(!id){
		id = jstack.uniqid('uid-');
		this.attr('id', id);
	}
	return id;
};