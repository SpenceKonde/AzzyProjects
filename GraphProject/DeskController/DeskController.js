
//For use with Save on Send and Modules as Functions, otherwise not enough memory. 

//function onInit() {
	USB.setConsole(true); 
	pinMode(BTN1,'input_pulldown');
	setBusyIndicator(A13);
    // initialize hardware. 
	LedPins=[C6,C7,C8,C9,A8];//Ice Blue, Cool White, Warm White, Yellow, Red
	for (var lp in LedPins) {
		digitalWrite(lp,0);
	}
	UPMOD={Clock:0,Sensors:0,Webserver:0,History:0};
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
    fargonames=["Colored","White","Wizard","Tentacl","Desk","Micro","Fan","Under"];
    colornames=["BLUE","COOL","WARM","YELL","RED"];
    nixs=0;
    nixr=0;

    head={'Content-Type': 'application/json', 'Access-Control-Allow-Origin':'*', 'Connection':'close'};
    htypes=["Temp","RH","Pressure","AirQual","Clear","Red","Green","Blue"];
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
    MENU={};
    MENU.page=0;
    MENU.option=0;
    MENU.usermsg="";
    MENU.vfd=0;
    HISTORY={};
    HISTORY.Temp=new Float32Array(48);
    HISTORY.RH=new Float32Array(48);
    HISTORY.Pressure=new Float32Array(48);
    HISTORY.AirQual=new Float32Array(48);
    HISTORY.Clear=new Uint16Array(48);
    HISTORY.Red=new Uint16Array(48);
    HISTORY.Green=new Uint16Array(48);
    HISTORY.Blue=new Uint16Array(48);
    INTERVALS={webserver:-1,sensors:-1,nixie:-1,history:-1,fargo:-1,date:-1,activity:-1,vfd:-1}; //webserver, sensors, fargo, date, activity, 
    menu=[2,4,presets.length-1];
	//if this pin is grounded, we return before actually kicking everything off for maintenance mode. 
    //if (1) {return;}
    INTERVALS.webserver=setTimeout("var WebServer=require('http').createServer(processrequest).listen(80);",15000);
    setTimeout("loadPresets();",1000);
    INTERVALS.sensors=setInterval("readSensors()",15000);
    setTimeout("loadHistory()",3000);
    setTimeout("onHalfHour()",15000);
	setTimeout("INTERVALS.fargo=setInterval(getFargoStatus,30000);",20000);
	setTimeout("INTERVALS.nixie=setInterval(upNixie,30000);",30000);
	setTimeout("getDate();INTERVALS.date=setInterval(getDate,1800000);",2000);
	setTimeout("INTERVALS.vfd=setInterval(upvfd,60000)",60000);
	//setTimeout("delete onInit",500); 
//}



//START OF HISTORY HANDLING


function onHalfHour() {
	if (INTERVALS.history != -1) { //otherwise, interval hasn't been set yet. 
		INTERVALS.history=-1;
	updateHistory();
	saveHistory();
} 
var mins=clk.getDate().getMinutes();
	var m=(30-mins%5); //TEST MODE
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
	a+=48*4;
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
	a+=48*4;
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
4096~4608: (512 bytes) - message on VFD

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
			Nixie.setString(STATUS.AirQual.toFixed(0)+" ");
			Nixie.setAllLED(16,24,64); nixie.setLED(5,0,0,0);
		}
	} else {
		Nixie.setAllLED(0,0,0);
		Nixie.setString("       ");
	}
	Nixie.send();
}

//END OF FARGO CODE

//START VFD CODE 
//MENU.page:
//0: usermessage
//1: Fargo1 
//2: Fargo2
//3: desklamp
//4: 
//5: 
//

function upvfd() {
	if (INTERVALS.activity==-1 || !MENU.vfd) {
		return 0;
	} else {
		switch (MENU.page) {
			case 0: 
				drawUserMessage();
				break;
			case 1:
			case 2:
				drawFargo();
				break;
			case 3: 
				drawLights();
				break;
			default: 
				console.log("Error: Invalid menu page "+MENU.page);
				MENU.page=0;
		}
		return 1;
	}
}

function setActivityTime(t) {
	if (INTERVALS.Activity != -1) {
		clearInterval(INTERVALS.Activity);
		INTERVALS.Activity = setInterval(onActivityOff,t*1000);
	} else {
		INTERVALS.Activity = setInterval(onActivityOff,t*1000);
		onActivityOn();
	}
}

function onActivityOn() {
	digitalWrite(B7,1);
	setTimeout(initvfd,500);
}

function vfdsetcursor(line,pos) {
	var position;
	if (INTERVALS.Activity==-1 || !MENU.vfd) {return 0;}
	if (pos===undefined) { 
		position=line;
	} else 	{
		position=line*20+pos;
	}
	Serial1.print(String.fromCharCode(0x1B,position));
	return 1;
}

function initvfd() {
	Serial1.print('\x15'); //clear screen, home curseor. 
	MENU.vfd=1;
}

function setActivityTime(t) {
	if (INTERVALS.Activity != -1) {
		clearInterval(INTERVALS.Activity);
		INTERVALS.Activity=-1;
		onActivityOn();
	}
	INTERVALS.Activity = setInterval(onActivityOff,t*1000);
	onActivityOn();
}


function onActivityOff() {
	digitalWrite(B7,0);
	if (STATUS.clear < 2000) {
		STATUS.Nixie.on=0;
		upNixie(); 
	}

	INTERVALS.Activity=-1;
}


function drawFargo() {
	Serial1.print('\x15'); //clear screen and home; 
	var m=(MENU.page-1)*4
	for (var i=0;i<4;i++) {
		vfdsetcursor(i*10);
		Serial1.print(STATUS.fargo[m+i]?" \xDB ":" \xD9 "); 
		Serial1.print(fargonames[m+i]); 
	}
	vfdsetcursor(MENU.option*10);
	Serial1.print("\x0B\xBC\x0C"); 
}


function drawStatus() {
	Serial1.print('\x15');
	Serial1.print(STATUS.Temp.toFixed(1)+"\xB9C "+STATUS.RH.toFixed(1)+"%\r\n"+STATUS.Pressure.toFixed(0)+"mBar AQ "+Pressure.AirQual.toFixed(0));
}
function drawLights() {
	Serial1.print('\x15');
    for(var i=0;i<5;i++) {
    	if (MENU.option==i){
    		Serial1.print('\x0B');
    	}
    	Serial1.print(colornames[i]);
    	if (MENU.option==i){
    		Serial1.print('\x0C');
    	}
    	Serial.print(" ");
    }
    vfdsetcursor(1,0);
	for(var i=0;i<5;i++) {
		var f=STATUS.fargo[i];
		for (var j=0,j<4;j++) {
			if (f>0.24) {
				Serial1.print("\x7F")
			} else {
				if (f<0.05) {
					Serial1.print(" ");
				} else if (f<0.09) {
					Serial1.print("\xF0");
				} else if (f<0.09) {
					Serial1.print("\xF1");
				} else if (f<0.09) {
					Serial1.print("\xF2");
				}else {
					Serial1.print("\xF3");
				}
			}
			f-=0.25;
		} 
		Serial.print(" ")
	}
}

function drawUserMessage() {
	if (MENU.usermsg=="") {
		drawStatus();
	} else {
		Serial1.print(MENU.usermsg); 
	}
}

//END OF VFD CODE

//START SENSOR READING CODE

function readSensors() {
	BME680.perform_measurement();
	var t=BME680.get_sensor_data();
	STATUS.RH=t.humidity;
	STATUS.Temp=t.temperature -3.5; // correct for difference in temperature between sensor and bulk temperature of room
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



function getTypedHistString(tdx) {
	var ret="";
	var typen = htypes[tdx];
	if (tdx<4){
		var tstr="[";
		for (var i=0;i<48;i++) {
			tstr=tstr+HISTORY[typen][i].toFixed(1);
			if (i !=47) {
				tstr+=",";
			} 
		}
		tstr+="]";
		return tstr;
	} else {
		return JSON.stringify(HISTORY[typen]);
	}
}


function processrequest(req, res) {
	try {
		var par=url.parse(req.url,true);
		var q=par.query; 
		var path=par.pathname; 
		path=path.split('/');
		path=path[1];
		switch(path) {
			case "status.json":
			var r='{"lamp":{';
			for (var i=0;i<5;i++) {
				r+='"'+colornames[i]+'":'+STATUS.LEDs[i].toFixed(2);
				if (i<4) {r+=",";}
			}
			r+='},\n"sensors":{"RH":'+STATUS.RH.toFixed(1)+',"Temp":'+STATUS.Temp.toFixed(1)+',"Pressure":'+STATUS.Pressure.toFixed(2)+',"Air Quality":'+STATUS.AirQual.toFixed(2)+'},\n"Light":'+JSON.stringify(STATUS.Light)+'}';
			res.writeHead(200,head);
			res.write(r);
			res.end();
			break;
			case "history.json":
			res.writeHead(200,head);
			var n=0;
			res.on('drain',function(){
				res.write('"'+htypes[n]+'"');
				res.write(":");
				res.write(getTypedHistString(n++));
				if (n==8) {res.end("}");} else {res.write(',\r\n');}
			});
			res.write("{");
			break;
			case "usermsg.cmd":
			if (query.msg && query.msg.length > 1) {
				MENU.usrmsg=query.msg;
				MENU.page=10;
				setTimeout("upvfd();",100);
				res.writeHead(200,head);
				res.write("{status:\"ok\",message:\""+query.msg+"\"}");
			} else {
				res.writeHead(400,head);
				res.write("{status:\"error\",error:\"No message supplied\"}");
			}
			res.end();
			break;
			case "lamp.cmd":
			STATUS.LEDs[0]=q.BLUE===undefined ? 0:E.clip(q.BLUE,0,1);
			STATUS.LEDs[1]=q.COOL===undefined ? 0:E.clip(q.COOL,0,1);
			STATUS.LEDs[2]=q.WARM===undefined ? 0:E.clip(q.WARM,0,1);
			STATUS.LEDs[3]=q.YELL===undefined ? 0:E.clip(q.YELL,0,1);
			STATUS.LEDs[4]=q.RED===undefined ? 0:E.clip(q.RED,0,1);
			setTimeout("upled();",100);
			res.writeHead(200,head);
			res.write("{status:\"ok\",message:\"lamp state set\"}");
			res.end();
			break;
			case "code.run":
			if (query.code) {
				var x="";
				try {
					x=eval(query.code);
					res.writeHead(200,head);
					res.write("{status:\"ok\",result:\""+x+"\"}");
				}
				catch (err) {
					res.writeHead(500,head);
					res.write("{status:\"error\",error:\""+err.message+"\"}");
				}
			} else {
				res.writeHead(400,head);
				res.write("{status:\"error\",error:\"No code supplied.\"}");
			}
			res.end();
			break;
			default:
			res.writeHead(404,head);
			res.write("{status:\"error\",error:\"unknown command\"}");
			res.end();
		}
	}
	catch (err){
		res.writeHead(500,head);
		res.write("{status:\"error\",error:\""+err.message+"\"}");
		res.end();
	}
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


//END OF TIMING RELATED CODE
