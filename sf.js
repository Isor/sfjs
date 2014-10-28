/*
	One by One to implements a js loader by self.
*/
(function(){
		var $_tos= Object.prototype.toString ;
		var $x = window.$x = {
				isFunc:function(obj){
					return $_tos.call(obj) === "[object Function]";
				},
				isArray:function(obj){
					return $_tos.call(obj) === "[object Array]";
				},
				isObj:function(obj){
					return $_tos.call(obj) === "[object Object]";
				},
				isStr:function(obj){
					return $_tos.call(obj) === "[object String]";
				},			
				get:function(src){ 
							var meta = module_meta(src);							
							
							if(!$x.CACHE[meta.id]){ 
								$x.CACHE[meta.id] = new Module(meta.id,meta.src);
							} 
							return $x.CACHE[meta.id];
				},
				libId:function(src){
						var _jsIndex = src.indexOf(".js");
						if(_jsIndex !=-1){
							return src.substring(0,_jsIndex);
						}
						return src;
				},




				CACHE: {},
				root : "" 			
		}; 


		/*事件Event 对象 */

		function Entity(func,num){
		this.func = func;
		this.num =  (num === undefined) ? -1 : num ;
		this.time = new Date();
		this.isExpired= function(){
			return this.num == 0;
		}
		this.exec =function(){
			if(!this.isExpired()){
				func.call();
				if(this.num > 0){
					this.num -= 1;
				}
			}
		}
	}


	function Event(){
	
		this.eventSource={};
	}
	Event.prototype ={
		on:function(key,func,num){
			
			if(!$x.isFunc(func)) { throw "func not a  function" ;}
			var ls = this.eventSource[key] || (this.eventSource[key]=[]);
				ls.push(new Entity(func,num));
		},
		fire:function(key){
			console.log(this.eventSource)
			var ls = this.eventSource[key] || [];
			
			for(var i = 0 ; i<ls.length; i++ ){
				//console.log(ls[i]);
				 var entity = ls[i];
					 entity.exec();
			} 
			this.flush(key);
			
		},
		one:function(key,func){
		
			this.on(key,func,1);
		},
		flush:function(key){
			var ls = this.eventSource[key] || [];
			var survivors = [];
			for(var i =0 ; i < ls.length;  i++ ){
				var entity = ls[i];
				if(!entity.isExpired()){
					survivors.push(entity);
				}
			}
			this.eventSource[key] = survivors;
		}
					
	}

	



		/* 模块状态 : 存在错误, 未加载, 加载中, 已加载, 已执行 */
		var STATUS ={ ERROR:0, UNLOAD:1, LOADING:2,LOADED:3 ,EXECUTED:4};
		var EVENTS ={ LOADED :"loaded", EXECUTED:"execed"}; 
		var CURRENT_MODULE = null;

		function module_meta(src){
			var indexOfPointJs=src.indexOf(".js");
			return {
				id: (indexOfPointJs != -1 ? src.substring(0,indexOfPointJs) : src),
				src: (indexOfPointJs !=-1  ? src : src+".js")
			}
		}
		/* 模块 */
		function Module(id,src,func){

			if(func) { func.module = this } // 记录func 和module 的对应关系
			this.id = id; 
			this.src =src;
			this.func = func || null;
			this.status = STATUS.UNLOAD; 
			this.depsnum = 0;
			this.eventbus =  new Event();
			this._deps = []; 


		}
		
		
		Module.prototype ={

			load:function(callback){ // for some reason , it just invock by self.
				var self = this;	
					
				this.on(EVENTS.LOADED,callback);				
				if(this.status >= STATUS.LOADING){ return ;}
				this.status = STATUS.LOADING;
				var script = document.createElement("SCRIPT");
					script.type="text/javascript";
					script.async=true;
					script.src=this.src;		
					script.onload=function(){
					//	if(!$x.eax_func){ return ;}					
						self.func = $x.eax_func;
					//	$x.eax_func = null ;
						self.status = STATUS.LOADED;
						self.emit(EVENTS.LOADED);


					}				 
					document.getElementsByTagName("HEAD")[0].appendChild(script);
			},

			exec:function(){
				var self = this;
				if(this.func == null || this.status < STATUS.LOADED){
					this.load(function(){
						self.exec();
					});
					return;
				}
				if(this.status == STATUS.EXECUTED){
					//this.emit(EVENTS.EXECUTED);
					return;
				}
				try{
					
					 this.func.call($x,$x);	

					 this.status = STATUS.EXECUTED;
					 this.emit(EVENTS.EXECUTED);
				}catch(e){
				
					 if(e instanceof ModuleDepException){
					 	 var modules = e.modules;
					 	 var deps = [] ; 
					 	 for(var i = 0 ; i< modules.length; i++){	
					 	 	if(modules[i].id  != this.id ){	 // 屏蔽对自己的依赖
					 	 		self.afterExec(modules[i]);
					 	 		deps.push(modules[i]);
					 	 	}else{
					 	 		throw "Self-reliance #"+this.id;
					 	 	}
					 	 }
					 	 for(var i = 0 ; i< deps.length; i++){
						 	 	deps[i].exec();
						 }



					 }else{
					 	throw e;
					 }

				}
				

			},
			afterExec:function(module){
					var self = this;
					this.depsnum += 1;
					this._deps.push(module);
					
					module.on(EVENTS.EXECUTED,function(){
						self.depsnum -- ;
						if(self.depsnum == 0){
							self.exec();
						}
					});
			},

			on:function(key,func){
				/*
				    the old code ,implements a eventsource at self.
				    and change to a sf-event.js Event Object
					var ls = this.listener[key] || (this.listener[key] =[] );
					ls.push(func);	

				*/
				this.eventbus.one(key,func);
			},
			emit:function(key){
				console.log( this.id);
				this.eventbus.fire(key);
			}	


		}

		function ModuleDepException(modules){
			this.modules = $x.isArray(modules) ? modules : [modules];
		}

		
		/*
			<模块入口函数>
			1 id代表模块的唯一标识, 在通常的开发模式下只需要如下定义代码即可:
				def(function($x){ .... })
			  在此情况下加载器使用js文件的相对全路径作为id标识,http://demo/js/a.js对应id为js/a.
			2 当只有一个method参数时, 其id值初始化会延迟到js加载完成.(针对js兼容性问题暂时不考虑)
			

		*/
		function def(id,func){
			 /*
			 	 to adpater def(function(){....})
			 */
			 if($x.isFunc(id)){ 
			 	id = null;
			 	func = id;
			 }
			 if(!($x.isStr(id) && $x.isFunc(func))){
			 	throw "unexpected arguments ...";
			 }

			  if(id == null){
			 		$x.eax_func = func;
			 }else{
			 		def0(id,func);
			 }
			

		}
		function def0(id,func){

				var meta = module_meta(id);				
				var id = meta.id, src = meta.src;

				if($x.CACHE[id]){
					throw "ERROR : duplicate definition  module#"+ id +" has exist";
				}
				var newModule  = new Module(id, src,func);
					newModule.status = STATUS.LOADED;

				$x.CACHE[id] = newModule;
		}

		function $import(src){
			
			var src = $x.isArray(src)  ? src : [src];
			var deps= [];
			for(var i = 0 ; i< src.length; i ++){
				var meta = module_meta(src[i]);
				deps.push(meta.id);
			}

			var unExecedDepsModule = [] ;
			for(var i = 0 ; i < deps.length ; i++){
				var module = $x.get(deps[i]);	
				/*
					{@code $import.caller.module != module } 排除直接自依赖
				*/			
				if(module.status < STATUS.EXECUTED  && $import.caller.module != module ){				
					unExecedDepsModule.push(module);
				}
			}
			
			if(unExecedDepsModule.length > 0){
				throw new ModuleDepException(unExecedDepsModule);
			}

		}

		function $run(src){
			
			var meta = module_meta(src);
			var module = $x.get(meta.id);
				
				module.exec();
				
			
		}



		window.$import = $import;
		window.def = def;
		
		$x.$run = $run;




})();