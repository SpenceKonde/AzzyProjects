//Serial4.setup(9600, { rx: C11, tx : C10 }); //Original Espruino Board
Serial2.setup(9600, { rx: A3, tx : A2 }); //Pico

//SPI2.setup({mosi:B15,miso:B14,sck:B13});
//E.connectSDCard(spi,B10);



var http = require("http");
var wifi = require("ESP8266WiFi").connect(Serial2, function(err) {
  
  if (err) throw err;
  wifi.reset(function(err) {
    if (err) throw err;
    console.log("Connecting to WiFi");
    wifi.connect(wifi.config.ssid,wifi.config.pass, function(err) {
      if (err) throw err;
      console.log("Connected");
      wifi.getIP(function(err,ip){wifi.config.ip=ip;});
      setTimeout(wifi.userinit.bind(wifi),15000);
    });
  });
});
wifi.config={ssid:"TwilightZone", pass:"snip", port:80};
wifi.fpfx="html"; //file prefix for serving files off SD card;

wifi.userinit= function() { //set up the server. 
	console.log("setting up server on "+this.config.ip+":"+this.config.port);
	this.server=require('http').createServer(this.onRequest.bind(this)).listen(this.config.port);
};
wifi.onRequest=function (req, res) {
	var par=url.parse(req.url,true);
	var q=par.query; 
	var nam=par.pathname; 
	var l=nam.indexOf("/");
	nam=nam.slice(l);
	var rd=this.procreq(nam,q);
	res.writeHead(rd.code,rd.head?rd.head:{'Content-Type': 'text/plain'});
	if (!rd.file) {
		res.write(rd.body);
        	res.end();
	} else {
		rd.file.pipe(res);
        	res.end();
	}
};

wifi.procreq = function (path,query) {
	var paths=path.split(".");
	var rd={};
	rd.code=404;
	rd.body="";
	console.log(paths[1]);
	if (paths[1] in this.handler) {
		if (paths[0].slice(1) in this.handler[paths[1]]) {
			rd=this.handler[paths[1]][paths[0].slice(1)](path,query);
		} else if ("_" in this.handler[paths[1]]){
			rd=this.handler[paths[1]]["_"](path,query);
		} else { rd.body="Handler does not support this file.";}
	}
	else {
		//var f = E.openFile(wifi.fpfx+"/"+path, "r");
		//if (f==undefined) {
			rd.body="File "+path+" not found";
		//} else {
		//	rd.code=200;
		//	rd.file=f;
		}	
	}
	return rd;
};
wifi.handler={};
wifi.handler.json={};
wifi.handler.json.status= function (path,query) {
	 return {code:200,body:'{gtg:true,dtf:false,missiles:["armed","armed","repair","mothballed"]}'};
};
wifi.cmdresp="";
wifi.handler.json.cmdresp=function(path,query) {
	setTimeout("wifi.cmdresp='';",10);
	return wifi.cmdresp==""?{code:400,body:'{error:"No command response available"}'}:{code:200,body:this.cmdresp};
};
wifi.handler.json._ = function (path,query) {
	 return {code:404,body:"Invalid json data requested: "+path};
};
wifi.handler.run={};
wifi.handler.run.code= function (path,query) {
	 return {code:403,body:"Forbidden command: "+path};
	 /*try {
	 	return {code:200,body:+eval(query.code)}; //danger! This is about as insecure as it gets!
	 } catch(err) {
	 	return {code:500,body:"Error thrown: "+err};*/
	 } 
wifi.handler.run.delayed=function(path,query) {
	if (1) {
		setTimeout("wifi.cmdresp='{status:1}';",1500)
		return {code:200,body:"Running command",head:{'Content-Type': 'text/html', 'Refresh':'5; url=cmdresp.json'};
	}
};
wifi.handler.run._ = function (path,query) {
	 return {code:404,body:"Unknown command: "+path};
};
