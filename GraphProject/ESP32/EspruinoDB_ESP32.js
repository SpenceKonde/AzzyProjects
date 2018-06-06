var http = require("http");



function startup() {
	initDB();
    Serial2.setup(115200,{rx:16, tx:17}); //Serial for RF interface
    Serial2.on('data',function(data){handleSerial(data);}); //
	E.setTimeZone(-5);
	fetchTime();
    require("http").createServer(onPageRequest).listen(7348);
}

function fetchTime() {
	require("http").get("http://drazzy.com/getTime.shtml", function(res) {
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
  if (resu == -1) {
	  ;
  }
  else if (resu) {
  	  res.writeHead(resu,CORS);
  	  if (resu==200) {res.write('{"error":false,"code":200,"text":"OK"}');}
  	  else if (resu==404) {res.write('{"error":true,"code":404,"text":"Not Found"}');}
  	  else if (resu==403) {res.write('{"error":true,"code":403,"text":"Unauthorized Client"}');}
  	  else if (resu==400) {res.write('{"error":true,"code":400,"text":"Bad Request"}');}
  } else {
  	  res.writeHead(500,CORS);
  	  res.write('{"error":true,"code":500,"text":"Unknown Error"}');
  }
  res.end();
}

'{"error":true,"code":404,"errorText":"Not Found"}'

function handleCmd(path,query,res) {
	console.log(path);
	console.log(query);
	if (query.un!="testuser" || query.pw!="testpass") { 
		return 403;
	}
	if (path=="/status") {
		res.writeHead(200,CORS);
		res.write(JSON.stringify(cs));
	} else {
		return 404;
	}
}

var cs={ //cs=Current State
	DoorUp:0,
	DoorDown:0,
	Fridge:0,
	Fargo:new Uint8Array(8);
	Humidity:null,
	Temperature:null,
	Pressure:null,
	Light:null
}
	

var db={};
db.humidity=[];
db.temp=[];
db.aqi=[];
db.light[];

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
		db.temp.push(null);
		db.humidity.push(null);
		db.aqi.push(null);
	}
	
}

function onInit() {
	setTimeout("startup()",5000)
}

var RFAddresses=[31];

function handleSerial(data) {
  console.log(data);
  var rcv={};
  if (data.charAt(0)=="=") {
    rcv.version=2;
  } else {
    rcv.version=1;
  }
  v=parseInt(data.substr(1,2),16)>>6;
  l=(v?(v==3?31:v==2?15:7):4);
  rcv.data=new Uint8Array(l);
  for (i=0;i<l;i++){
    rcv.data[i]=parseInt(data.substr(2*i+1,2),16);
  }
  rcv.length=l;
  rcv.destaddress=rcv.data[0]&0x3F;
  if (RFAddresses[0]==0 || RFAddresses.indexOf(rcv.destaddress)!=-1) { //is the packet for this device, or is this device universal listener?
    processPacket(rcv);
  }
}

function processPacket(rcvpkt) {
  if (rcvpkt.version==1) {
    processPacket_V1(rcvpkt);
  } else {
    processPacket_V2(rcvpkt);
  }
}


function processPacket_V1(r) {
  if(r.destaddress==31) {
  	if (r.data[1]==225) {
  	  updateSwitch(r.data[2],r.data[3]);
  	}
  }
}

function processPacket_V2(rcvpkt) {
  
}


