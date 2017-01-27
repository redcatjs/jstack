$.fn.requiredId = function(){
	if(this.length>1){
		return this.each(function(){
			$(this).requiredId();
		});
	}
	var id = this[0].id;
	if(!id){
		id = jstack.uniqid('uid-');
		this[0].setAttribute('id', id);
	}
	return id;
};