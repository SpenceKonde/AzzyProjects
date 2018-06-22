


function onInit() {
	pinMode(FIXME,'input_pullup');
	setBusyIndicator(A13);
    // initialize hardware. 
	LedPins=[A8,C9,C8,C7,C6];
	LedState=new Float32Array([0.0,0.0,0.0,0.0,0.0]);
	for (lp in ledpins) {
		pinMode(lp,'output');
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
	KeyPad=require("KeyPad").connect([C2,C3,A0,A1],[C1,C0,B7,C12,B12], function(e) {onKey("AB#*123U456D789CL0RE"[e]);});
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
	fargo=new Uint8Array(8);
	colors="BLUECOOLWARMYELLRED ";
	fargostrs="Colored,White,Wizard,Tentacle,Desk,Micro,Fan,Under";
	nixs=0;
	nixr=0;
	//presets=[new Float32Array([0.0,0.0,0.0,0.0,0.0]),new Float32Array([0.9,1,0.6,0,0]),new Float32Array([0,0.6,1,0.8,0.4]),new Float32Array([0.5,0.5,0.5,0.5,0.5])];
	//prenames=["OFF","COLD\nWHIT","VERY\nWARM","HALF\nHALF"];
	
	presets=[new Float32Array([0.0,0.0,0.0,0.0,0.0])];
	prenames=["OFF"];
	var i=1;
	while (fram.read(24*(i-1),1) != 255) { //read presets from fram
		 prenames[i]=E.toString(fram.read(24*(i-1),12));
		 var temp=fram.read(24*(i-1)+16,5);
		 presets[i]=new Float32Array([temp[0]/100.0,temp[1]/100.0,temp[2]/100.0,temp[3]/100.0,temp[4]/100.0]);
		 i++;
	}
	if (fram.read(320,1)!=255) { //if we have stored history in the fram, read it in
		rhh=fram.read(320,48);
		temh=fram.read(368,48);
		prh=fram.read(416,48);
	}

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

function getfargostatus() {
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

function getDate() {
	var date="";
	require("http").get(dateurl, function(res) {
		res.on('data',function (data) {date+=data;});
		res.on('close',function() {clk=new Clock(date);});
	});
	//delete getDate;
}