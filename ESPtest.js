Serial4.setup(9600, { rx: C11, tx : C10 });
var http = require("http");
var wifi = require("ESP8266WiFi").connect(Serial4, function(err) {
  if (err) throw err;
  wifi.reset(function(err) {
    if (err) throw err;
    console.log("Connecting to WiFi");
    wifi.connect("TwilightZone","L0st1nTheZ0ne", function(err) {
      if (err) throw err;
      console.log("Connected");
      wifi.getIP(print);
      setTimeout("server=require('http').createServer(function (req, res) {var par=url.parse(req.url,true);var q=par.query; var nam=par.pathname; nam=nam.split('/');nam=nam[1];var rd=procreq(nam,q);res.writeHead(rd.code,rd.head?rd.head:{'Content-Type': 'text/plain'}); res.write(rd.body);res.end();}).listen(80);",15000);

    });
  });
});

function procreq(path,query) {
	var rd={};
	rd.code=404;
	rd.body="";
	// code goes here
	switch (path) {
		case "status.json": {
			rd.body="{gtg:true,dtf:false,missiles:["armed","armed","repair","mothballed"]}";
			break;
		}
		default: {
			rd.body="Invalid command path"
		}
	}
	return rd;
}
