Serial4.setup(9600, { rx: C11, tx : C10 });


var http = require("http");
var wifi = require("ESP8266WiFi").connect(Serial4, function(err) {
  
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
wifi.config={ssid:"TwilightZone", pass:"L0st1nTheZ0ne", port:80};
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
	// code goes here
    console.log(paths[1]);
	switch (paths[1]) {
		case "json": 
			if (this.json.hasOwnProperty(paths[0].slice(1)))
			{
				rd=this.json[paths[0].slice(1)](path,query);
			} else {
				rd.body="json "+paths[0].slice(1)+" not found";
			}
			break;
		case "cmd": 
			rd=runCMD(path,query);
			break;
		default: 
			var f = E.openFile(wifi.fpfx+"/"+path, "r");
			if (f==undefined) {
				rd.body="File "+path+" not found";
			} else {
				rd.code=200;
				rd.file=f;
			}
		
	}
	return rd;
};
wifi.json={};
wifi.json.status= function (path,query) {
	 return {code:200,body:'{gtg:true,dtf:false,missiles:["armed","armed","repair","mothballed"]}'};
};
