$.fn.populateInput = function( value, config ) {
	config = $.extend({
		addMissing: false,
		preventValEvent: false,
	},config);
	var setValue;
	if(config.preventValEvent){
		setValue = function(input,val){
			input.setVal(val);
		};
	}
	else{
		setValue = function(){
			input.val(val);
		};
	}
	var populateSelect = function( input, value ) {
		var found = false;
		if(input.hasClass('select2-hidden-accessible')){
			setValue(input,value);
			input.trigger('change');
			return;
		}
		if(input[0].hasAttribute('data-preselect')){
			input.attr('data-preselect',value);
			return;
		}
		$( "option", input ).each( function() {
			if ( $( this ).val() == value ) {
				$( this ).prop( "selected", true );
				found = true;
			}
		} );
		if ( !found && config.addMissing ) {
			input.append( '<option value="' + value + '" selected="selected">' + value + "</option>" );
			$( this ).prop( "selected", true );
		}
	};
	return this.each(function(){
		var input = $(this);
		if ( input.is( "select" ) ) {
			if ( value instanceof Array ) {
				for ( var i = 0, l = value.length; i < l; i++ ) {
					populateSelect( input, value[ i ] );
				}
			} else {
				populateSelect( input, value );
			}
		}
		else if ( input.is( "textarea" ) ) {
			setValue(input, value);
		}
		else {
			switch ( input.attr( "type" ) ){
				case "text":
				case "hidden":
					setValue(input, value);
					break;
				case "radio":
					if ( input.length >= 1 ) {
						$.each( input, function( index ) {
							var elemValue = $( this ).attr( "value" );
							var elemValueInData = singleVal = value;
							if ( elemValue === value ) {
								$( this ).prop( "checked", true );
							} else {
								$( this ).prop( "checked", false );
							}
						} );
					}
					break;
				case "checkbox":
					if ( input.length > 1 ) {
						$.each( input, function( index ) {
							var elemValue = $( this ).attr( "value" );
							var elemValueInData = undefined;
							var singleVal;
							for ( var i = 0; i < value.length; i++ ) {
								singleVal = value[ i ];
								if ( singleVal === elemValue ) {elemValueInData = singleVal;};
							}

							if ( elemValueInData ) {
								$( this ).prop( "checked", true );
							} else {
								$( this ).prop( "checked", false );
							}
						} );
					} else if ( input.length == 1 ) {
						$ctrl = input;
						if ( value ) {$ctrl.prop( "checked", true );} else {$ctrl.prop( "checked", false );}

					}
					break;
			}
		}
	});
};
$.fn.populateForm = function( data, config ) {
	config = $.extend({
		addMissing: false,
		not: false,
		notContainer: false
	},config);
	var $this = this;
	var assignValue = function( key, value ){
		if(value===null){
			value = '';
		}
		var inputs = $this.find('[name="'+key+'"]');
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
	var assignValueRecursive = function(key, value){
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
$.fn.populate = function( value, config ) {
	return this.each(function(){
		if($(this).is('form')){
			$(this).populateForm(value, config);
		}
		else{
			$(this).populateInput(value, config);
		}
	});
};