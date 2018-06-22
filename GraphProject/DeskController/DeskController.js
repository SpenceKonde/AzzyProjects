


function onInit() {
	pinMode(FIXME,'input_pullup');
	setBusyIndicator(A13);
    // initialize hardware. 
	LedPins=[A8,C9,C8,C7,C6];
	LedState=new Float32Array([0.0,0.0,0.0,0.0,0.0]);
	for (lp in ledpins) {
		digitalWrite(lp,0);
	}
	
	Clock = require("clock").Clock;
	// I2C devices
    I2C1.setup({scl:B8,sda:B9});
    BME680=require("BME680").connect(I2C1); //T/P/RH/AQI sensor. 
    TCS=require("TCS34725").connect(I2C1); //light color sensor.
    FRAM=require("AT24").connect(I2C1,0,256,0); //256 kbit FRAM for storing presets and other data that may change frequently
    //Nixie Clock
	Serial5.setup(115200,{tx:C12});
	Nixie=require("SmartNixie2").connect(Serial5,6);
	//Keypad
	KeyPad=require("KeyPad").connect([A0,A1,B0,B1],[C0, C1, C2, C3, C4], function(e) {onKey("AB#*123U456D789CL0RE"[e]);});
	//WIZnet
    SPI3.begin({sck:B5,mosi:B3,miso:B4})
	Eth=require("WIZnet").connect(SPI3,C4);
	Eth.setIP();
	//VFD
    Serial1.begin(19200,{tx:B6});
	digitalWrite(B7,0); // Turn off the power for the VFD. 
	//AzzyRF
    Serial3.begin(115200,{tx:C10,rx:C11});
    //
    //initialize variables
	fargosturl="http://raspi/fargostatus.php";
	dateurl="http://drazzy.com/time.shtml";
	fargourl="http://192.168.2.14/api/relay/";
	blankpreset="\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255\x255";
	fargo=new Uint8Array(8);
	colors="BLUECOOLWARMYELLRED ";
	fargostrs="Colored,White,Wizard,Tentacle,Desk,Micro,Fan,Under";
	nixs=0;
	nixr=0;
	//presets=[new Float32Array([0.0,0.0,0.0,0.0,0.0]),new Float32Array([0.9,1,0.6,0,0]),new Float32Array([0,0.6,1,0.8,0.4]),new Float32Array([0.5,0.5,0.5,0.5,0.5])];
	//prenames=["OFF","COLD\nWHIT","VERY\nWARM","HALF\nHALF"];
	
	loadPresets();
	/*if (fram.read(320,1)!=255) { //if we have stored history in the fram, read it in
		rhh=fram.read(320,48);
		temh=fram.read(368,48);
		prh=fram.read(416,48);
	}*/ //unsure if we need this now. 

	menu=[2,4,presets.length-1];
	//if this pin is grounded, we return before actually kicking everything off for maintenance mode. 
    if (!digitalRead(FIXME)) {return;}
	setTimeout("var s=require('http').createServer(function (req, res) {var par=url.parse(req.url,true);var q=par.query; var nam=par.pathname; nam=nam.split('/');nam=nam[1];var rd=procreq(nam,q);res.writeHead(rd.code,{'Content-Type': 'text/plain'}); res.write(rd.body);res.end();}).listen(80);",15000);
	setInterval("upSensors();",15000);
	setTimeout('setInterval("upHist()",60000*30);',59000);
	setTimeout("setInterval(function(){uplcd();},30000);",15000);
	setTimeout("setInterval('getfargostatus();',30000);",20000);
	setTimeout("getDate();setInterval('getDate();',1800000);",2000);
	setInterval("delete onInit",500); 
}

//START OF PRESET AND LED HANDLING CODE

function loadPresets() {
	presets=[new Float32Array([0.0,0.0,0.0,0.0,0.0])];
	prenames=["OFF"];
	var i=1;
	while ((FRAM.read(32*(i-1),1) != 255)&&i<=32) { //read presets from fram
		 prenames[i]=E.toString(FRAM.read(32*(i-1),20));
		 var temp=FRAM.read(32*(i-1)+20,5);
		 presets[i]=new Float32Array([temp[0]/100.0,temp[1]/100.0,temp[2]/100.0,temp[3]/100.0,temp[4]/100.0]);
		 i++;
	}
}

function savePresets() {
	for (var i=1;i<presets.length;i++) {
		var tstring=prenames[i]; 
		while (tstring.length<20) {
			tstring+=" ";
		}
		tstring+=getPresetString(i);
		while (tstring.length<20) {
			tstring+=" ";
		}
	    FRAM.write((presets.length-2)*32,tstring);
	} 
	//clean up any deleted functions
	var t=presets.length-1; 
	while ((FRAM.read(32*t,1) != 255)&&i<=32) { //read presets from fram
		FRAM.write(32*t,blankpreset);
		t++;
	}
}

function saveNewPreset(name) {
	prenames.push(name);
	var t=new Float32Array(5);
	for (var x=0;i<5;i++) {
		t[x]=ledstate[x];
	}
	presets.push(t);
	savePresets();
}
function deletePreset(n) {
	prenames.splice(n,1);
	presets.splice(n,1);
	savePresets();
}

function getPresetString(x) {
	var rtst="";
	for (var it=0;it < 5; it++ ) {
		rtst+=String.fromCharCode(Math.round(presets[x][it]*100));
	}
	return rtst;
}

function upled() {
	for (var i=0;i<5;i++) {
		analogWrite(ledpins[i],ledstate[i]);
	}
}


//END OF PRESET AND LED HANDLING CODE


//START OF FARGO CODE

function getFargoStatus() {
	var fargost="";
	require("http").get(fargosturl, function(res) {
		res.on('data',function (data) {fargost+=data;});
		res.on('close',function() {var tfs=JSON.parse(fargost); for (var i=0;i<8;i++) { fargo[i]=tfs.relaystate[i].state;} /*if(MnuS==3){uplcd(1);}*/});
	});
}

function setFargo(relay,state) {
	var postfix = (state) ? "/on":"/off";
	require("http").get(fargourl+(relay+1).toString()+postfix, function(res) {
		res.on('close',function () {
			if(this.code==200) {
				fargo[relay]=state;
			}
		});
	});
}

//END OF FARGO CODE

//START SENSOR READING CODE

function readSensors() {
	//TODO
}



//END SENSOR READING CODE

//START AZZYRF CODE

function sendRFMessage(msg) {
    //TODO
}

function onRFMessage(msg) {
	//TODO
}

//END AZZYRF CODE


//START HTTP INTERFACE CODE

function procreq(path,query) {
	var rd={};
	rd.code=404;
	rd.body="";
	if (path=="status.json") {
		rd.code=200;
		var r='{"lamp":{';
		for (var i=0;i<5;i++) {
			r+='"'+colors.substr(i*4,4)+'":'+ledstate[i].toFixed(2);
			if (i<4) {r+=",";}
		}
		r+='},\n"sensors":{"rh":'+rh.toFixed(1)+',"temp":'+t.toFixed(1)+',"pressure":'+pr.toFixed(2)+'}}';
		rd.body=r;
	} else if (path=="lamp.cmd") {
		rd.code=200;
		rd.body="Command applied";
		ledstate[0]=query.BLUE==undefined ? 0:E.clip(query.BLUE,0,1);
		ledstate[1]=query.COOL==undefined ? 0:E.clip(query.COOL,0,1);
		ledstate[2]=query.WARM==undefined ? 0:E.clip(query.WARM,0,1);
		ledstate[3]=query.YELL==undefined ? 0:E.clip(query.YELL,0,1);
		ledstate[4]=query.RED==undefined ? 0:E.clip(query.RED,0,1);
		setTimeout("uplcd(); upled();",100);
	} else if (path=="code.run") {
		if (query.code) {
			rd.code=200;
			rd.body=eval(query.code);
		} else {
			rd.code=400;
			rd.body="400 Bad Request: No code supplied!";
		}
	} else if (path=="usrmsg.cmd") {
		if (query.msg && query.msg.length > 1) {
			rd.code=200;
			usrmsg=query.msg;
			rd.body="Message set: "+query.msg;
			MnuS=10;
			setTimeout("uplcd();",100);
		} else {rd.code=400; rd.body="400 Bad Request: No message supplied";}
	} else {rd.code=403; rd.body="403 Forbidden";}
	return rd;
}

//END HTTP INTERFACE CODE

//Start of timing related code 

function getTStr(sep){
  var hrs=clk.getDate().getHours();
  var mins=clk.getDate().getMinutes();
  return (hrs>9?hrs:" "+hrs)+sep+(mins>9?mins:"0"+mins);
}

function getDstr(){
  var mon=clk.getDate().getMonth()+1;
  var day=clk.getDate().getDate();
  var year=clk.getDate().getFullYear();
  return (mon+"/"+day+"/"+year);
}

function getDate() {
	var date="";
	require("http").get(dateurl, function(res) {
		res.on('data',function (data) {date+=data;});
		res.on('close',function() {clk=new Clock(date);});
	});
}

function initTimers() {
	intervals["rfup"]=
	
}

//END OF TIMING RELATED CODE
