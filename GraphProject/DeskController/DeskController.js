


function onInit() {
	USB.setConsole(true); 
	pinMode(BTN1,'input_pulldown');
	setBusyIndicator(A13);
    // initialize hardware. 
	LedPins=[C6,C7,C8,C9,A8];//Ice Blue, Cool White, Warm White, Yellow, Red
	for (var lp in LedPins) {
		digitalWrite(lp,0);
	}
	
	Clock = require("clock").Clock;
	// I2C devices
    I2C1.setup({scl:B8,sda:B9});
    BME680=require("BME680").connectI2C(I2C1); //T/P/RH/AQI sensor. 
    TCS=require("TCS3472x").connect(I2C1,16,1); //light color sensor.
    FRAM=require("AT24").connect(I2C1,0,256,0); //256 kbit FRAM for storing presets and other data that may change frequently
    //Nixie Clock
	Serial5.setup(115200,{tx:C12});
	Nixie=require("SmartNixie").connect(Serial5,6);
	//Keypad
	KeyPad=require("KeyPad").connect([C0, C1, C2, C3, C4],[A0,A1,B0,B1], function(e) {onKey("AL741B0852#R963*ECDU"[e]);});
	//WIZnet
    SPI3.setup({sck:B3,mosi:B5,miso:B4});
	Eth=require("WIZnet").connect(SPI3,B2);
	Eth.setIP();
	//VFD
    Serial1.setup(19200,{tx:B6});
	digitalWrite(B7,0); // Turn off the power for the VFD. 
	//AzzyRF
    Serial3.setup(115200,{tx:C10,rx:C11});
    //
    //initialize variables
	fargosturl="http://192.168.2.21/fargostatus.php";
	dateurl="http://drazzy.com/time.shtml";
	fargourl="http://192.168.2.14/api/relay/";
	blankpreset="\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF";
	colors="BLUECOOLWARMYELLRED ";
	fargostrs="Colored,White,Wizard,Tentacle,Desk,Micro,Fan,Under";
	nixs=0;
	nixr=0;
	presets=[new Float32Array([0.0,0.0,0.0,0.0,0.0]),new Float32Array([0.9,1,0.6,0,0]),new Float32Array([0,0.6,1,0.8,0.4]),new Float32Array([0.5,0.5,0.5,0.5,0.5])];
	prenames=["OFF","COLD WHITE","VERY WARM","HALF AND HALF"];
	STATUS={}; 
	STATUS.Fargo=new Uint8Array(8);
	STATUS.Nixie={on:0,mode:0};
    STATUS.LEDs=[0.0,0.0,0.0,0.0,0.0];
	STATUS.Temp=0;
	STATUS.RH=0;
	STATUS.Pressure=0;
	STATUS.AirQual=0;
	HISTORY={};
	HISTORY.Temp=new Float32Array(48);
	HISTORY.RH=new Float32Array(48);
	HISTORY.Pressure=new Float32Array(48);
	HISTORY.AirQual=new Float32Array(48);
	HISTORY.Clear=new Uint16Array(48);
	HISTORY.Red=new Uint16Array(48);
	HISTORY.Green=new Uint16Array(48);
	HISTORY.Blue=new Uint16Array(48);
    INTERVALS={webserver:-1,sensors:-1,nixie:-1,history:-1,fargo:-1,date:-1,activity:-1}; //webserver, sensors, fargo, date, activity, 
	menu=[2,4,presets.length-1];
	//if this pin is grounded, we return before actually kicking everything off for maintenance mode. 
    //if (1) {return;}
	INTERVALS.webserver=setTimeout("var WebServer=require('http').createServer(function (req, res) {var par=url.parse(req.url,true);var q=par.query; var nam=par.pathname; nam=nam.split('/');nam=nam[1];var rd=procreq(nam,q);res.writeHead(rd.code,{'Content-Type': 'text/plain'}); res.write(rd.body);res.end();}).listen(80);",15000);
    setTimeout("loadPresets();",1000);
	INTERVALS.sensors=setInterval(readSensors,15000);
	setTimeout(loadHistory,3000);
	setTimeout(onHalfHour,15000);
	//setTimeout("setInterval(function(){uplcd();},30000);",15000);
	setTimeout("INTERVALS.fargo=setInterval(getFargoStatus,30000);",20000);
	setTimeout("INTERVALS.nixie=setInterval(upNixie,30000);",30000);
	setTimeout("getDate();INTERVALS.date=setInterval(getDate,1800000);",2000);
	setTimeout("delete onInit",500); 
}



//START OF HISTORY HANDLING


function onHalfHour() {
	if (INTERVALS.history != -1) { //otherwise, interval hasn't been set yet. 
		INTERVALS.history=-1;
		updateHistory();
        saveHistory();
	} 
	var mins=clk.getDate().getMinutes();
	var m=(5-mins%5); //TEST MODE
    m=m*60;
    m=m-clk.getDate().getSeconds(); 
	INTERVALS.history=setTimeout(onHalfHour,m*1000); //now we set t
}

function loadHistory() {
	var a=2048;
	var t=new Uint8Array(FRAM.read(a,48*4));
	HISTORY.Temp=new Float32Array(t.buffer);
	a+=48*4;
	t=new Uint8Array(FRAM.read(a,48*4));
	HISTORY.RH=new Float32Array(t.buffer);
	a+=48*4;
	t=new Uint8Array(FRAM.read(a,48*4));
	HISTORY.Pressure=new Float32Array(t.buffer);
	a+=48*4;
	t=new Uint8Array(FRAM.read(a,48*4));
	HISTORY.AirQual=new Float32Array(t.buffer);
	a+=48*2;
	t=new Uint8Array(FRAM.read(a,48*2));
	HISTORY.Clear=new Uint16Array(t.buffer);
	a+=48*2;
	t=new Uint8Array(FRAM.read(a,48*2));
	HISTORY.Red=new Uint16Array(t.buffer);
	a+=48*2;
	t=new Uint8Array(FRAM.read(a,48*2));
	HISTORY.Green=new Uint16Array(t.buffer);
	a+=48*2;
	t=new Uint8Array(FRAM.read(a,48*2));
	HISTORY.Blue=new Uint16Array(t.buffer);
}
function saveHistory() {
	var a=2048;
   var t=new Uint8Array(HISTORY.Temp.buffer);
   FRAM.write(a,t);
   a+=48*4;
   t=new Uint8Array(HISTORY.RH.buffer);
   FRAM.write(a,t);
   a+=48*4;
   t=new Uint8Array(HISTORY.Pressure.buffer);
   FRAM.write(a,t);
   a+=48*4;
   t=new Uint8Array(HISTORY.AirQual.buffer);
   FRAM.write(a,t);
   a+=48*2;
   t=new Uint8Array(HISTORY.Clear.buffer);
   FRAM.write(a,t);
   a+=48*2;
   t=new Uint8Array(HISTORY.Red.buffer);
   FRAM.write(a,t);
   a+=48*2;
   t=new Uint8Array(HISTORY.Green.buffer);
   FRAM.write(a,t);
   a+=48*2;
   t=new Uint8Array(HISTORY.Blue.buffer);
   FRAM.write(a,t);
}

function updateHistory() {
   for (var i=0;i<47;i++) {
   	HISTORY.Temp[i]=HISTORY.Temp[i+1];
   	HISTORY.RH[i]=HISTORY.RH[i+1];
   	HISTORY.Pressure[i]=HISTORY.Pressure[i+1];
   	HISTORY.AirQual[i]=HISTORY.AirQual[i+1];
   	HISTORY.Clear[i]=HISTORY.Clear[i+1];
   	HISTORY.Red[i]=HISTORY.Red[i+1];
   	HISTORY.Green[i]=HISTORY.Green[i+1];
   	HISTORY.Blue[i]=HISTORY.Blue[i+1];
   }
   HISTORY.Temp[47]=STATUS.Temp;
   HISTORY.RH[47]=STATUS.RH;
   HISTORY.Pressure[47]=STATUS.Pressure;
   HISTORY.AirQual[47]=STATUS.AirQual;
   HISTORY.Clear[47]=STATUS.Light.clear;
   HISTORY.Red[47]=STATUS.Light.red;
   HISTORY.Green[47]=STATUS.Light.green;
   HISTORY.Blue[47]=STATUS.Light.blue;

}


/* FRAM Map 

0~1023: Presets (32 at 32 bytes each)
1024~2047: Reserved for other settings
2048~3248: history of last 24 hours

*/

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
	    FRAM.write((i-1)*32,tstring);
	} 
	//clean up any deleted functions
	var t=presets.length-1; 
	while ((FRAM.read(32*t,1) != 255)&&i<=32) { //read presets from fram
		FRAM.write(32*t,blankpreset);
		t++;
	}
}

function loadPreset(number) {
	if (number>=presets.length) {return 0;}
	for (var i=0;i<5;i++) {
		STATUS.LEDs[i]=presets[number][i];
	}
	upled();
	return 1;
}

function saveNewPreset(name) {
	prenames.push(name);
	var t=new Float32Array(5);
	for (var x=0;i<5;i++) {
		t[x]=STATUS.LEDs[x];
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
		analogWrite(LedPins[i],STATUS.LEDs[i]);
	}
}


//END OF PRESET AND LED HANDLING CODE


//START OF FARGO CODE

function getFargoStatus() {
	var fargost="";
	require("http").get(fargosturl, function(res) {
		res.on('data',function (data) {fargost+=data;});
		res.on('close',function() {var tfs=JSON.parse(fargost); for (var i=0;i<8;i++) { STATUS.Fargo[i]=tfs.relaystate[i].state;} /*if(MnuS==3){uplcd(1);}*/});
	});
}

function setFargo(relay,state) {
	var postfix = (state) ? "/on":"/off";
	require("http").get(fargourl+(relay+1).toString()+postfix, function(res) {
		res.on('close',function () {
			if(this.code==200) {
				STATUS.Fargo[relay]=state;
			} else {
              console.log(this.code);
            }
		});
	});
}



function upNixie() {
	if (STATUS.Nixie.on){
		if (STATUS.Nixie.mode==0) { // Time
			Nixie.setAllLED(0,0,0);
			Nixie.setString(getTStr(" ")+" ");
		} else if (STATUS.Nixie.mode==1) { // Temp
			Nixie.setString("  "+STATUS.Temp.toFixed(1)+"5");
			Nixie.setAllLED(96,0,0);Nixie.setLED(1,0,0,0);Nixie.setLED(0,0,0,0);
		} else if (STATUS.Nixie.mode==2) { // RH 
			Nixie.setString("  "+STATUS.RH.toFixed(1)+"6");
			Nixie.setAllLED(16,24,64); Nixie.setLED(1,0,0,0); nixie.setLED(0,0,0,0);
		} else if (STATUS.Nixie.mode==3) { // pressure
			Nixie.setString((STATUS.Pressure+"8"));
			Nixie.setAllLED(16,48,16);
		} else if (STATUS.Nixie.mode==4) { // Air Quality
			Nixie.setString("  "+STATUS.AirQual.toFixed(1)+" ");
			Nixie.setAllLED(16,24,64); Nixie.setLED(1,0,0,0); nixie.setLED(7,0,0,0);
		}
	} else {
		Nixie.setAllLED(0,0,0);
		Nixie.setString("       ");
	}
	Nixie.send();
}

//END OF FARGO CODE

//START SENSOR READING CODE

function readSensors() {
	BME680.perform_measurement();
    var t=BME680.get_sensor_data();
    STATUS.RH=t.humidity;
    STATUS.Temp=t.temperature;
    STATUS.Pressure=t.pressure;
  STATUS.AirQual=t.gas_resistance;
  STATUS.Light=TCS.getValue();
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
			r+='"'+colors.substr(i*4,4)+'":'+STATUS.LEDs[i].toFixed(2);
			if (i<4) {r+=",";}
		}
		r+='},\n"sensors":{"RH":'+STATUS.RH.toFixed(1)+',"Temp":'+STATUS.Temp.toFixed(1)+',"Pressure":'+STATUS.Pressure.toFixed(2)+',"Air Quality":'+STATUS.AirQual.toFixed(2)+'},\nLight:'+JSON.stringify(STATUS.Light)+'}';
		rd.body=r;
	} else if (path=="history.json") {
		rd.code=200;
		rd.body=JSON.stringify(HISTORY);
	} else if (path=="lamp.cmd") {
		rd.code=200;
		rd.body="Command applied";
		STATUS.LEDs[0]=query.BLUE===undefined ? 0:E.clip(query.BLUE,0,1);
		STATUS.LEDs[1]=query.COOL===undefined ? 0:E.clip(query.COOL,0,1);
		STATUS.LEDs[2]=query.WARM===undefined ? 0:E.clip(query.WARM,0,1);
		STATUS.LEDs[3]=query.YELL===undefined ? 0:E.clip(query.YELL,0,1);
		STATUS.LEDs[4]=query.RED===undefined ? 0:E.clip(query.RED,0,1);
		setTimeout("uplcd(); upled();",100);
	} else if (path=="code.run") {
		if (query.code) {
			rd.code=200;
			rd.body="{status:\"ok\",result=\""+eval(query.code)+"\"}";
		} else {
			rd.code=400;
			rd.body="{status:\"error\",error:\"No code supplied.\"}";
		}
	} else if (path=="usrmsg.cmd") {
		if (query.msg && query.msg.length > 1) {
			rd.code=200;
			usrmsg=query.msg;
			rd.body="{status:\"ok\",message:\""+query.msg+"\"}";
			MnuS=10;
			setTimeout("uplcd();",100);
		} else {rd.code=400; rd.body="{status:\"error\",error:\"No message supplied\"}";}
	} else {rd.code=403; rd.body="";}
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
//	intervals["rfup"]=
	
}

//END OF TIMING RELATED CODE
