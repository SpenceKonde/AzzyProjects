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
db.currentpos=0;

function newRecord(h,t,a) {
	db.temp.shift();
	db.humidity.shift();
	db.aqi.shift();
	db.temp.push(t);
	db.humidity.push(h);
	db.aqi.push(a);
	db.currentpos++;
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

