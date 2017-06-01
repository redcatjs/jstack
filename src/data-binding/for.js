const REGEX_FOR_1 = new RegExp('(\\()(.*)(,)(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
const REGEX_FOR_2 = new RegExp('(\\()(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
const REGEX_FOR_3 = new RegExp('(.*)(\\s+)(in)(\\s+)(.*)',["i"]);
	
jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-for');
	},
	callback(el,dataBinder,scope){
		let $this = $(el);
		let jfor = $('<!--j:for-->');
		let jforClose = $('<!--/j:for-->');
		$this.replaceWith(jfor);
		jforClose.insertAfter(jfor);

		let attrFor = el.getAttribute('j-for');
		el.removeAttribute('j-for');
		attrFor = attrFor.trim();
		let index, key, value, myvar;

		let m = REGEX_FOR_1.exec(attrFor);
		if (m != null){
			index = m[2].trim();
			key = m[4].trim();
			value = m[6];
			myvar = m[11].trim();
		}
		else{
			let m = REGEX_FOR_2.exec(attrFor);
			if (m != null){
				key = m[2].trim();
				value = m[4];
				myvar = m[9].trim();
			}
			else{
				let m = REGEX_FOR_3.exec(attrFor);
				if (m != null){
					value = m[1];
					myvar = m[5].trim();
				}
				else{
					throw new Error('Malformed for clause: '+attrFor);
				}
			}
		}

		
		let isTemplate = el.tagName.toLowerCase()=='template';
		
		
		let buildNewRow;
		let removeRow;
		
		$(el).detach();
		if(isTemplate){
			let content = el.content;
			buildNewRow = function(k, jforClose, scopeExtend){
				let addRow = document.createElement('div');
				
				let uid = jstack.uniqid();
				let commentOpener = document.createComment('j-for-uid:'+uid);
				addRow.appendChild( commentOpener );
				addRow.appendChild( document.importNode(content, true) );
				addRow.appendChild( document.createComment('/j-for-uid:'+uid) );
				
				jstack.copyAttributes(el,addRow);
				addRow.removeAttribute('j-for');
				
				let childNodes = addRow.childNodes;
				
				dataBinder.compileDom( addRow, scopeExtend );
				jforClose.before(addRow.childNodes);
				
				return commentOpener;
			};
			removeRow = function(n){
				$(n).commentChildren().remove();
			};
		}
		else{
			buildNewRow = function(k, jforClose, scopeExtend){

				let addRow = $this.clone();
				addRow.attr('j-for-id',k);
				
				jforClose.before(addRow);
				
				dataBinder.compileDom( addRow[0], scopeExtend );
				
				return addRow;
			};
			removeRow = function(n){
				n.remove();
			};
		}
		
		let forStack = {};
		
		let render = function(){
			
			forStack.each(function(row,k){
				$.extend(row.scope, dataBinder.model, scope, row.scopeLocal);
			});
			
			let data = jstack.dataBinder.getValueEval(jfor[0],myvar,scope);
			
			if(!data){
				forStack.each(function(n){
					removeRow(n.el);
				});
				return;
			}
			
			let method = data instanceof Array?'forEach':'each';
						
			//add
			let i = 1;
			data[method](function(v,k){
				let scopeLocal = {};
				scopeLocal[value] = v;
				if(key){
					scopeLocal[key] = k;
				}
				if(index){
					scopeLocal[index] = i;
				}
				let scopeExtend = $.extend({},dataBinder.model,scope,scopeLocal);
				let row = forStack[k];
				if(typeof(row)==='undefined'){
					forStack[k] = {
						el:buildNewRow(k,jforClose,scopeExtend),
						scope:scopeExtend,
						scopeLocal:scopeLocal,
					};
				}
				else if(row.scope[value]!==v){
					removeRow(row.el); //remove
					forStack[k] = {
						el:buildNewRow(k,jforClose,scopeExtend),
						scope:scopeExtend,
						scopeLocal:scopeLocal,
					};
				}
				else if(index){
					row.scope[index] = i;
				}
				i++;
			});

			//remove
			i = 0;
			forStack.each(function(row,k){
				if(typeof(data[k])==='undefined'){
					delete forStack[k];
					removeRow(row.el);
				}
				i++;
			});
			
		};
		
		dataBinder.addWatcher(jfor[0],render);
		render();
		
		return false;
		
	},
});
