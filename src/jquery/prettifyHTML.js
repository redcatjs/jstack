//from https://github.com/jayedul/html-minifier-prettifier
$.prettifyHTML = function(el){
	el = $(el);
	if(el.parent().length>0 && el.parent().data('assign')){
		el.data('assign', el.parent().data('assign')+1);
	}
	else{
		el.data('assign', 1);
	}
	if(el.children().length>0){
		el.children().each(function(){
			tbc='';
			for(i=0; i<$(this).parent().data('assign'); i++)
			{
				tbc+='\t';
			}
			$(this).before('\n'+tbc);
			$(this).prepend('\t');
			$(this).append('\n'+tbc);
			$.prettifyHTML($(this));				
		});
	}
	else{
		tbc='';
		for(i=0; i<el.parent().data('assign'); i++){
			tbc+='\t';
		}
		el.prepend('\n'+tbc);
	}
};