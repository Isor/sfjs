/*
	描述: 一个测试 js 文件,代码还在测试用来实现一个带计数的事件对象
	目的: 打算建一个 任务依赖处理系统 , 用来整合到 sf.js 的模块执行工作中.
*/
(function(){


	var $_tos= Object.prototype.toString ;
	var $x =  {
			isFunc:function(obj){
				return $_tos.call(obj) === "[object Function]";
			},
			isArray:function(obj){
				return $_tos.call(obj) === "[object Array]";
			}	
	}; 
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
			console.log(this.eventSource)
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

	/*  test  */

		
		function Task(name){
			this.name=name;
			var e = new Event();
			this.deps = {num:0, _:[]};

			this.on =function (key, func){
				e.one(key,func);
			};
			this.emit=function(key){
				e.fire(key);
			};
			this.exec = function(){
				console.log("exec "+ this.name +" begin");
				if(this.deps.num > 0){
					for(var i = 0; i < this.deps._.length; i++){
						this.deps._[i].exec();
					}
					return ;
				}
				
				console.log("exec "+this.name +" end");
				this.emit("exec");
			};
			this.after=function(task){
				var self = this;
				this.deps.num += 1;
				this.deps._.push(task);				
				task.on("exec",function(){
					console.log(self);
					self.deps.num --;
					if(self.deps.num == 0){
						self.exec();
					}
				});
				return this;
			};
			


		}
		
		function DSLTask(mainTask){
			 this.dependsOn = {num:0 , _:[];
			 this.task =task;
			 this.isFinish =false;
			 this.id = mainTask._id ||  mainTask._id= new Date().getTime(); 
		}
		DSLTask.prototype={
			 cache:{ },
			 get:function(task){
			 	 var  existDslTask = this.cache[task.id];
			 	 if(!existDslTask){
					 existDslTask = this.cache[task.id] = new DSLTask(task);
			 	 }
			 	 return existDslTask;
			 }
			 run:function(){
			 	var self = this , dependsOn = this.dependsOn;
			 	if(dependsOn.num > 0){
			 		for( var i = 0 ; i < dependsOn.num ; i++){
			 			dependsOn[i].on("exec",function(){
			 				  self.dependsOn.num -- ; 
			 				  if(self.dependsOn.num == 0){
			 				  	  self.task.exec();
			 				  }	
			 			});	
			 			dependsOn[i].run();
			 		}
			 	}

			 },
			 after:function(task){
			 	   this.dependsOn.push(new DSLTask(tas))
			 },
			 before:function(task){

			 }
		}



	var  t1 = new Task(1);
	var  t2 = new Task(2);
	var  t3 = new Task(3);
	var  t4 = new Task(4);
	var  main = new Task("Main");
 	main.after(t4).after(t3);
 //	t3.after(t2).after(t1);

 	main.exec();

 	console.log(main);




	/*  test */

})();