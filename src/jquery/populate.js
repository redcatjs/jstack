(function(){

var populateSelect = function( input, value, config ) {
	var isSelect2 = input.hasClass('select2-hidden-accessible');
	if(input[0].hasAttribute('data-preselect')&&!isSelect2){
		if(config.push){
			var v = input.data('preselect') || [];
			if(typeof(v)!='object'){
				v = [v];
			}
			if(v.indexOf(value)===-1){
				v.push(value);
			}
			input.data('preselect',v);
		}
		else{
			input.data('preselect',value);
		}
		return;
	}
	
	//if(input.hasClass('select2-hidden-accessible')){
		//if(config.push){
			//var v = input.val();
			//if(v===null){
				//v = [];
			//}
			//if(typeof(v)!='object'){
				//v = [v];
			//}
			//if(v.indexOf(value)===-1){
				//v.push(value);
			//}
			//console.log(input,value);
			//setValue(input,value);
		//}
		//else{
			//setValue(input,value);
		//}
		//if(!config.preventValEvent){
			//input.trigger('change');
		//}
		//return;
	//}
	
	var found = false;
	var optFirstTagName = 'option';
	input.children().each(function(i){
		var opt = $(this);
		if(this.tagName.toLowerCase()=='option'){
			if (opt.val() == value){
				opt.prop('selected', true);
				found = true;
			}
			else{
				if(!config.push){
					opt.prop('selected', false);
				}
			}
		}
		else{
			if(i==0){
				optFirstTagName = opt[0].tagName.toLowerCase();
			}
			if(opt[0].getAttribute('value') == value) {
				opt[0].setAttribute('selected', 'selected');
				found = true;
			}
			else{
				if(!config.push){
					opt[0].removeAttribute('selected');
				}
			}
		}
	} );
	
	if ( !found && config.addMissing && typeof(value)!='undefined' && value!==null ) {
		var optionValue;
		var optionText;
		if($.type(value)=='object'){
			optionValue = value.value;
			optionText = value.text;
		}
		else{
			optionValue = value;
		}
		if(typeof(optionText)=='undefined'){
			optionText = optionValue;
		}
		if(!optionValue){
			optionValue = optionText;
		}
		input.append( '<'+optFirstTagName+' value="' + optionValue + '" selected="selected">' + optionText + '</'+optFirstTagName+'>' );
	}
	
	if(isSelect2&&!config.preventValEvent){
		input.trigger('change');
	}
	
};

$.fn.populateInput = function( value, config ) {
	config = $.extend({
		addMissing: this[0].hasAttribute('j-add-missing'),
		preventValEvent: false,
		push: false,
	},config);
	var setValue;
	if(config.preventValEvent){
		setValue = function(input,val){
			input.setVal(val);
		};
	}
	else{
		setValue = function(input,val){
			input.val(val);
		};
	}
	return this.each(function(){
		var input = $(this);
		if(input.data('j:populate:prevent')) return;
		if ( this.tagName.toLowerCase()=='select' || this.hasAttribute('j-select') ) {
			if ( value instanceof Array ) {
				if(this.getAttribute('name').substr(-2)=='[]'||this.hasAttribute('multiple')){
					populateSelect( input, value, config );
				}
				else{
					for ( var i = 0, l = value.length; i < l; i++ ) {
						populateSelect( input, value[ i ], config );
					}
				}
			}
			else {
				populateSelect( input, value, config );
			}
		}
		else if ( input[0].tagName.toLowerCase()=="textarea" ) {
			setValue(input, value);
		}
		else {
			switch ( input[0].getAttribute( "type" ) ){
				case "file":
				
				return;
				default:
				case "number":
				case "range":
				case "email":
				case "data":
				case "text":
				case "hidden":
					setValue(input, value);
				break;
				case "radio":
					if ( input.length >= 1 ) {
						$.each( input, function( index ) {
							var elemValue = this.value;
							var elemValueInData = singleVal = value;
							if ( elemValue === value ) {
								$(this).prop( "checked", true );
							}
							else {
								if(!config.push){
									$(this).prop( "checked", false );
								}
							}
						} );
					}
				break;
				case "checkbox":
					if ( input.length > 1 ) {
						$.each( input, function( index ) {
							var elemValue = this.value;
							var elemValueInData = undefined;
							var singleVal;
							for ( var i = 0; i < value.length; i++ ) {
								singleVal = value[ i ];
								if ( singleVal === elemValue ){
									elemValueInData = singleVal;
								};
							}

							if ( elemValueInData ) {
								$( this ).prop( "checked", true );
							}
							else {
								if(!config.push){
									$( this ).prop( "checked", false );
								}
							}
						} );
					}
					else if ( input.length == 1 ) {
						if ( value ) {
							input.prop( "checked", true );
						}
						else {
							input.prop( "checked", false );
						}

					}
				break;
			}
		}
	});
};
$.fn.populateForm = function( data, config ) {
	config = $.extend({
		not: false,
		notContainer: false
	},config);
	var $this = this;
	
	var assignValue = function(key, value){
		if(value===null){
			value = '';
		}
		var inputs = $this.find(':input[name="'+key+'"]');
		if(config.addMissing&&!inputs.length){
			$this.append('<input type="hidden" name="'+key+'" value="'+value+'">');
		}
		inputs.each(function(){
			var input = $(this);
			if(config.not&&input.is(config.not)) return;
			if(config.notContainer&&input.closest(config.notContainer).length) return;
			input.populateInput(value, config);
		});
	};
	var assignValueMulti = function(key, value){
		var inputs = $this.find(':input[name="'+key+'"],:input[name="'+key+'[]"]');
		inputs.each(function(){
			var input = $(this);
			if(config.not&&input.is(config.not)) return;
			if(config.notContainer&&input.closest(config.notContainer).length) return;
			input.populateInput(value, config);
		});	
	};
	
	var assignValueRecursive = function(key, value){
		assignValueMulti(key,value);
		$.each(value,function(k,v){
			var keyAssign = key+'['+k+']';
			if(typeof(v)=='object'&&v!=null){
				assignValueRecursive(keyAssign, v);
			}
			else{
				assignValue(keyAssign, v);
			}
		});
	};
	
	$.each(data, function(key, value){
		if(typeof(value)=='object'&&value!=null){
			assignValueRecursive(key, value);
		}
		else{
			assignValue(key, value);
		}
	});
	
	return this;
};
$.fn.populate = function( value, config ){
	return this.each(function(){
		if(this.tagName.toLowerCase()=='form'){
			$(this).populateForm(value, config);
		}
		else{
			$(this).populateInput(value, config);
		}
	});
};
$.fn.populateReset = function(){
	return this.each(function(){
		if(this.tagName.toLowerCase()=='form'){
			$(this).find(':input[name]').populateReset();
		}
		else{
			var el = $(this);
			var type = el.prop('type');
			if(type=="checkbox"||type=="radio"){
				el.prop('checked',this.defaultChecked);
			}
			else{
				el.populateInput(this.defaultValue,{preventValEvent:true});
			}
			el.trigger('input');
		}
	});
};

})();