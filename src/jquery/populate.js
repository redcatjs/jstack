(function(){

let populateSelect = function( input, value, config ) {
	let isSelect2 = input.hasClass('select2-hidden-accessible');
	if(input[0].hasAttribute('data-preselect')&&!isSelect2){
		if(config.push){
			let v = input.data('preselect') || [];
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
	
	//console.log('select',input);
	
	if(isSelect2){
		let setValue;
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
		if(config.push){
			let v = input.val();
			if(v===null){
				v = [];
			}
			if(typeof(v)!='object'){
				v = [v];
			}
			if(v.indexOf(value)===-1){
				v.push(value);
			}
			setValue(input,value);
		}
		else{
			setValue(input,value);
		}
		if(!config.preventValEvent){
			//console.log(input,value);
			input.trigger('change');
		}
		return;
	}
	
	let found = false;
	let optFirstTagName = 'option';
	
	let valueMatch;
	if(typeof(value)=='object'&&value!==null){
		if(!(value instanceof Array)){
			value = Object.values(value);
		}
		valueMatch = function(check){
			return value.indexOf(check)!==-1;
		};
	}
	else{
		valueMatch = function(check){
			return value == check;
		};
	}
	
	input.children().each(function(i){
		let opt = $(this);
		if(this.tagName.toLowerCase()=='option'){
			if (valueMatch(opt.val())){
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
			if(valueMatch( opt[0].getAttribute('value') )) {
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
		let optionValue;
		let optionText;
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
	
};

$.fn.populateInput = function( value, config ) {
	if(typeof(value)=='undefined'||value===null){
		value = '';
	}
	config = $.extend({
		addMissing: this[0].hasAttribute('j-add-missing'),
		preventValEvent: false,
		push: false,
	},config);
	let setValue;
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
		let input = $(this);
		if(input.data('j:populate:prevent')) return;
		let nodeName = this.tagName.toLowerCase();
		if (nodeName =='select' || nodeName == 'j-select' ) {
			if ( value instanceof Array ) {
				if(this.getAttribute('name').substr(-2)=='[]'||this.hasAttribute('multiple')){
					populateSelect( input, value, config );
				}
				else{
					for ( let i = 0, l = value.length; i < l; i++ ) {
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
					if ( input.length ) {
						input.each(function(){
							$(this).prop("checked",this.value==value);
						});
					}
				break;
				case "checkbox":
					if ( input.length > 1 ) {
						$.each( input, function( index ) {
							let elemValue = this.value;
							let elemValueInData = undefined;
							let singleVal;
							for ( let i = 0; i < value.length; i++ ) {
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
	let $this = this;
	
	let assignValue = function(key, value){
		if(value===null){
			value = '';
		}
		let inputs = $this.find(':input[name="'+key+'"]');
		if(config.addMissing&&!inputs.length){
			$this.append('<input type="hidden" name="'+key+'" value="'+value+'">');
		}
		inputs.each(function(){
			let input = $(this);
			if(config.not&&input.is(config.not)) return;
			if(config.notContainer&&input.closest(config.notContainer).length) return;
			input.populateInput(value, config);
		});
	};
	let assignValueMulti = function(key, value){
		let inputs = $this.find(':input[name="'+key+'"],:input[name="'+key+'[]"]');
		inputs.each(function(){
			let input = $(this);
			if(config.not&&input.is(config.not)) return;
			if(config.notContainer&&input.closest(config.notContainer).length) return;
			input.populateInput(value, config);
		});	
	};
	
	let assignValueRecursive = function(key, value){
		assignValueMulti(key,value);
		$.each(value,function(k,v){
			let keyAssign = key+'['+k+']';
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
			let el = $(this);
			let type = el.prop('type');
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
