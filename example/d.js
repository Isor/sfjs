

def("a",function(){		

		$x.a ="123456";

});	
def("b",function(){

	$import("a.js"); 

	console.log("$x.a = "+$x.a +" from a.js");

	var User = this.User = function(){
			var name = "zm";
			var age =24;
	};
	User.prototype={
		toString:function(){
			return "User#{name:zm,age:24}";
		}

	};


	

});	

def("c",function(){

	$import(["b.js","a.js","c"]);
	var user = new $x.User();
	console.log(user);


});

