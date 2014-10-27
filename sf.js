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
							if(!$x.CACHE[src]){ 
								$x.CACHE[src] = new Module(src,src);
							} 
							return $x.CACHE[src];
				},
				CACHE: {},
				root : "" 			
		}; 
		/* 模块状态 : 存在错误, 未加载, 加载中, 已加载, 已执行 */
		var STATUS ={ ERROR:0, UNLOAD:1, LOADING:2,LOADED:3 ,EXECUTED:4};
		var EVENTS ={ LOADED :"0", EXECUTED:"1"}; 

		/*  事件对象 */

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
			this.eventSource=[];
		}
		Event.prototype ={
			on:function(key,func,num){				
				if(!$x.isFunc(func)) { throw "func not a  function" ;}
				var ls = this.eventSource[key] || (this.eventSource[key]=[]);
					ls.push(new Entity(func,num));
			},
			fire:function(key){
				var ls = this.eventSource[key] || [];				
				for(var i = 0 ; i<ls.length; i++ ){
					 console.log(ls[i]);
					 var entity = ls[i];
						 entity.exec();
				} 
				this.flush();
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




		/* 模块 */
		function Module(id,src){
			this.id = id; 
			this.src =src;
			this.func = null;
			this.status = STATUS.UNLOAD; 
			this.listener ={};
			this.depsnum = 0;
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
						self.func = $x.eax_func;
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
					this.emit(EVENTS.EXECUTED);
					return;
				}
				try{
					 this.func.call($x,$x);	

					 this.status = STATUS.EXECUTED;
					 this.emit(EVENTS.EXECUTED);
				}catch(e){
				
					 if(e instanceof ModuleDepException){
					 	 var modules = e.modules;
					 	 for(var i = 0 ; i< modules.length; i++){
					 	 	self.afterExec(modules[i]);
					 	 }
					 	 for(var i = 0 ; i< modules.length; i++){
					 	 	modules[i].exec();
					 	 }


					 }else{
					 	throw e;
					 }

				}
				

			},
			afterExec:function(module){
					var self = this;
					this.depsnum += 1;
					
					module.on(EVENTS.EXECUTED,function(){
						self.depsnum -- ;
						if(self.depsnum == 0){
							self.exec();
						}
					});
			},

			on:function(key,func){
				var ls = this.listener[key] || (this.listener[key] =[] );
					ls.push(func);	
			},
			emit:function(key){
				var ls = this.listener[key] || [];
				this.listener[key] = [];
				for(var i = 0 ; i < ls.length; i++ ){
					ls[i].call();
				}

			}	


		}
		/*
		   模块依赖异常
		*/

		function ModuleDepException(modules){
			this.modules = $x.isArray(modules) ? modules : [modules];
		}
		/*
			模块定义函数
		*/
		function def(func){

				$x.eax_func = func;

		}
		/*
		  模块导入入口函数
		*/
		function $import(src){
			
			var deps = $x.isArray(src)  ? src : [src];
			var unExecedDepsModule = [] ;
			for(var i = 0 ; i < deps.length ; i++){
				var module = $x.get(deps[i]);
				
				if(module.status < STATUS.EXECUTED){
					unExecedDepsModule.push(module);
				}
			}
			
			if(unExecedDepsModule.length > 0){
				throw new ModuleDepException(unExecedDepsModule);
			}

		}

		function $run(src){
			
			var main = $x.get(src);
				main.exec();
			
		}



		window.$import = $import;
		window.def = def;
		$x.$run = $run;




})();