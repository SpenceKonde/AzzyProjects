var http = require("http");


function startup() {
	initDB();
	E.setTimeZone();
	fetchTime();
  require("http").createServer(onPageRequest).listen(80);
}

function fetchTime() {
	require("http").get("http://raspi/getTime.shtml", function(res) {
  var contents = "";
  res.on('data', function(data) { contents += data; });
  res.on('close', function() { setTime(contents); });
}).on('error', function(e) {
  console.log("ERROR", e);
});
}

var CORS={'Access-Control-Allow-Origin':'*'};
// Network

function onPageRequest(req, res) {
  var a = url.parse(req.url, true);
  var resu = handleCmd(a.pathname,a.query,res);
  if (resu == -1) {;}
  	else if (resu) {
  	res.writeHead(resu,CORS);
  	if (resu==200) {res.write("OK");}
  	else if (resu==404) {res.write("Not Found");}
  } else {
  	res.writeHead(500,CORS);
  	res.write("ERROR");
  }
  res.end();
}

var db={};
db.humidity=[];
db.temp=[];
db.aqi=[];

function newRecord(h,t,a) {
	db.temp.shift();
	db.humidity.shift();
	db.aqi.shift();
	db.temp.push(t);
	db.humidity.push(h);
	db.aqi.push(a);
}

function initDB() {
	for (i=0;i<49;i++){
		db.temp.push(NaN);
		db.humidity.push(NaN);
		db.aqi.push(NaN);
	}
	
}

function onInit() {
	setTimeout("startup()",5000)
}
