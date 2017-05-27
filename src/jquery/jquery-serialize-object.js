/**
 * jQuery serializeObject
 * @copyright 2014, macek <paulmacek@gmail.com>
 * @link https://github.com/macek/jquery-serialize-object
 * @license BSD
 * @version 2.5.0
 * @patched by surikat
 */
 
(function(){

//surikat
const rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i,
	rcheckableType = ( /^(?:checkbox|radio)$/i );
$.fn.serializeArrayWithEmpty = function() {
	return this.map( function() {
		// Can add propHook for "elements" to filter or add form elements
		let elements = $.prop( this, "elements" );
		return elements ? $.makeArray( elements ) : this;
	} )
	.filter( function() {
		let type = this.type;

		// Use .is( ":disabled" ) so that fieldset[disabled] works
		return this.name && !$( this ).is( ":disabled" ) &&
			rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type )
			&&( this.checked || !rcheckableType.test( type ) )
		;
	} )
	.map( function( i, elem ) {
		let val = $( this ).val();

		if ( val == null ) {
			//return null;
			val = ''; //surikat
		}

		if ( $.isArray( val ) ) {
			return $.map( val, function( val ) {
				return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
			} );
		}

		return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
	} ).get();
}; 


const patterns = {
	validate: /^[a-z_][a-z0-9_]*(?:\[(?:\d*|[a-z0-9_]+)\])*$/i,
	key:			/[a-z0-9_]+|(?=\[\])/gi,
	push:		 /^$/,
	//fixed:		/^\d+$/, //surikat
	named:		/^[a-z0-9_]+$/i
};

function FormSerializer(helper, $form) {

	// private variables
	let data		 = {},
			pushes	 = {};

	// private API
	function build(base, key, value) {
		base[key] = value;
		return base;
	}

	function makeObject(root, value) {

		let keys = root.match(patterns.key), k;

		// nest, nest, ..., nest
		while ((k = keys.pop()) !== undefined) {
			// foo[]
			if (patterns.push.test(k)) {
				let idx = incrementPush(root.replace(/\[\]$/, ''));
				value = build([], idx, value);
			}

			// foo[n]
			//else if (patterns.fixed.test(k)) { //surikat
				//value = build([], k, value);
			//}
			else if (k==0) { //surikat
				value = build([], k, value);
			}
			// foo; foo[bar]
			else if (patterns.named.test(k)) {
				value = build({}, k, value);
			}
		}

		return value;
	}

	function incrementPush(key) {
		if (pushes[key] === undefined) {
			pushes[key] = 0;
		}
		return pushes[key]++;
	}

	function encode(pair) {
		switch ($('[name="' + pair.name + '"]', $form).attr("type")) {
			case "checkbox":
				return pair.value === "on" ? true : pair.value;
			default:
				return pair.value;
		}
	}

	function addPair(pair) {
		if (!patterns.validate.test(pair.name)) return this;
		let obj = makeObject(pair.name, encode(pair));
		data = helper.extend(true, data, obj);
		return this;
	}

	function addPairs(pairs) {
		if (!helper.isArray(pairs)) {
			throw new Error("formSerializer.addPairs expects an Array");
		}
		for (let i=0, len=pairs.length; i<len; i++) {
			this.addPair(pairs[i]);
		}
		return this;
	}

	function serialize() {
		return data;
	}

	function serializeJSON() {
		return JSON.stringify(serialize());
	}

	// public API
	this.addPair = addPair;
	this.addPairs = addPairs;
	this.serialize = serialize;
	this.serializeJSON = serializeJSON;
}

FormSerializer.patterns = patterns;

FormSerializer.serializeObject = function serializeObject() {
	return new FormSerializer($, this).
		//addPairs(this.serializeArray()).
		addPairs(this.serializeArrayWithEmpty()). //surikat
		serialize();
};

FormSerializer.serializeJSON = function serializeJSON() {
	return new FormSerializer($, this).
		//addPairs(this.serializeArray()).
		addPairs(this.serializeArrayWithEmpty()). //surikat
		serializeJSON();
};

if (typeof $.fn !== "undefined") {
	$.fn.serializeObject = FormSerializer.serializeObject;
	$.fn.serializeJSON	 = FormSerializer.serializeJSON;
}
	
})();
