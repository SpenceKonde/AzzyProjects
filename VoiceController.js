//require("AT");



/*
Menu 1:
Lights On
Lights Off
White XMas Lights
Colored XMas Lights
Wizard Light
Tentacle Light
Desk Light
Microwave
Fan
Under-desk light
Ozone
Plasma Cube
Plasma Tower
Desk-lamp





*/
var ocm=function(menu,option) {
  console.log("menu:"+menu+" option: "+option);
  if (menu==1) {
    if (option==0) {
      console.log("LIGHTS ON");
      //do lights on calls
    } else if (option==1) {
      console.log("LIGHTS OFF");
      //do lights off calls
    } else if (option==2) {
      console.log("DESK :");
      digitalWrite(LED1,1);
      return {type:2,timeout:15};
    } else if (option==3) {
      console.log("NIXIE :");
      digitalWrite(LED1,1);
      return {type:3,timeout:15};
    } else if (option < 12) {
      setFargo(option,!fargo[option-4]);
      console.log("set fargo"+(option-4));
    } else {
      switchRF(option-12);
    }
  } else if (menu==3) { // control desk lamp
      console.log("desk lamp "+option);
  } else if (menu==4) { // control nixie clock
    if (option==0) { //clock on
      setDesk("nixs=1;uplcd();");
    } else if (option==1) { //clock off
      setDesk("nixs=0;uplcd();");
    } else if (option==2) { //time
      setDesk("nixs=1;MnuS=0;MnuO=0;uplcd();");
    } else if (option==3) { //temp
      setDesk("nixs=1;MnuS=0;MnuO=1;uplcd();");
    } else if (option==4) { //humidity
      setDesk("nixs=1;MnuS=0;MnuO=2;uplcd();");
      //} else if (option==5) { //pressure
      //  setDesk("nixs=1;MnuS=0;Mnu0=3;uplcd();") 
    }
  }
  digitalWrite(LED1,0);
  return {type:1,timeout:0};
  
};

var otm=function(){
  digitalWrite(LED1,0);
  this.setRecognize(1,0);
};






//My standard fargo network commands
fargosturl="http://192.168.2.12/fargostatus.php";
dateurl="http://192.168.2.12/date.php";
fargourl="http://192.168.2.14/api/relay/";
deskurl="http://192.168.2.16/code.run?code=";
mirrorurl="http://192.168.2.123/mirrorup.php";
fargo=new Uint8Array(8);


function setDesk(command) {
  console.log("setDesk:"+deskurl+command);
  require("http").get(deskurl+command, function(res) {
    res.on('close',function () {
          console.log("onClose called"); 
      if(this.code!=200) {
        console.log("Error commanding desklamp/nixie: "+this.code);
            }
    });
  });
  console.log("desk command"+command);
}


function getFargostatus() {
  console.log("getFargoStatus called");
  var fargost="";
  require("http").get(fargosturl, function(res) {
    res.on('data',function (data) {fargost+=data;});
    res.on('close',function() {var tfs=JSON.parse(fargost); vtfs=tfs; for (var i=0;i<8;i++) { fargo[i]=tfs.relaystate[i].state;} if(MnuS==3){uplcd(1);}});
  });
}

function setFargo(relay,state) {
  console.log("setFargo called");
  var postfix = (state) ? "/on":"/off";
  require("http").get(fargourl+(relay+1).toString()+postfix, function(res) {
    res.on('close',function () {
          console.log("onClose called");
      if(this.code==200) {
        fargo[relay]=state;
      }
    });
  });
}

function switchRF(dev) {
  console.log("switchrf called"+dev);
  dinf=RFDevs[dev];
  //if (dev==0 && RFDevState[0]==0) {
    //sendLRF(dinf.addr,[0x41,1+(dinf.devnum<<4),2,170,85,170]);
    //setTimeout("RFDevState[0]=0;updateRFStatus(0,0);",682000);
  //} //else {
    sendRF(dinf.addr,0x40,170>>systemStatus.RFDevs[dev],dinf.devnum);
  //}
  systemStatus.RFDevs[dev]=!systemStatus.RFDevs[dev];
  stLD.set(1,dev,255*systemStatus.RFDevs[dev]);
  updateRFStatus(dev,systemStatus.RFDevs[dev]);
}

function updateRFStatus(dev,val) {
  require("http").get(mirrorurl+"?RFDev"+dev.toString()+"="+(val?1:0),function(){return;});
}

var RFDevs=[ 
  {name:"Ozone Generator",addr:20,devnum:0,pwm:0},
  {name:"Plasma Cube",addr:20,devnum:1,pwm:0},
  {name:"Plasma Tower",addr:20,devnum:2,pwm:0}
  ];

function sendRF(addr,cmd,parm,ext) {
  //setTimeout(function(a,c,p,e){
  
  tstr=addr+','+cmd+','+parm+','+ext;
  RFCommands[">"]='console.log(E.toUint8Array(['+tstr+']));RFCommands[">"]=undefined;cmd="";Serial2.print(E.toString(['+tstr+']));'; //},25,addr,cmd,parm,ext);
  Serial2.print("AT+SEND\r");
}


function sendLRF(addr,data) {
  if (addr>63) throw "bad address";
  if (data.length==6) { //subtract 1 for address, 1 for checksum
    Serial2.println("AT+SENDM");
    addr+=64;
  } else if (data.length==14) {
    Serial2.println("AT+SENDL");
    addr+=128;
  } else if (data.length==30) {
    Serial2.println("AT+SENDE");
    addr+=192;
  } else {
    throw "Invalid length";
  }
  setTimeout(function(a,d){Serial2.print(String.fromCharCode(a)+E.toString(d));},25,addr,data);
}
function getDate() {
  console.log("getDate called");
  var date="";
  require("http").get(dateurl, function(res) {
    res.on('data',function (data) {date+=data;});
    res.on('close',function() {console.log("onClose called");clk=new Clock(date);});
  });
  //delete getDate;
}


function onInit() {
  Clock = require("clock").Clock;
  //initiating hardware...
  //status lights
  SPI1.setup({mosi:A7,baud:3200000});
  stLD={};
  stLD.leds=new Uint8Array(6);
  stLD.set=function(led,color,brightness){
    if (led<2 && color <3) {
      stLD.leds[led*3+color]=brightness;
      SPI1.send4bit(stLD.leds,1,3);
    } else {
      throw "Invalid led or color";
    }
  };
  stLD.sets=function(led,color){
    if (led<2 && color.length==3) {
      stLD.leds[led*3]=color[0];
      stLD.leds[led*3+1]=color[1];
      stLD.leds[led*3+2]=color[2];
      SPI1.send4bit(stLD.leds,1,3);
    } else {
      throw "Invalid led or color";
    }
  };
  stLD.set(0,1,255);
  stLD.set(1,1,255);
  //keypad
  //pinMode(A4,'input_pullup'); //button '4'
  pinMode(B1,'input_pullup'); //button '3'
  setWatch("switchRF(2);",B1,{edge:'falling',repeat:true, debounce:250});
  pinMode(A10,'input_pullup'); //button '2'
  setWatch("switchRF(1);",A10,{edge:'falling',repeat:true, debounce:250});
  pinMode(A0,'input_pullup'); //button '1'
  setWatch("switchRF(0);",A0,{edge:'falling',repeat:true, debounce:250});
  pinMode(A8,'input');
  setWatch("systemStatus.lastMotion=getTime();")
  //easyvr
  Serial1.setup(9600,{tx:B6,rx:B7});
  evr=require("easyvr").connect(Serial1,ocm,otm,otm,function(){stLD.set(1,1,0);});
  //azzyrf
  Serial2.setup(9600, { rx: A3, tx : A2 });
  //ethernet
  SPI2.setup({ mosi:B15, miso:B14, sck:B13 });
  eth = require("WIZnet").connect(SPI2, B10);
  stLD.set(0,2,128);
  eth.setIP();
  stLD.sets(0,[255,0,0]);
  //I2C devices
  I2C1.setup({scl:B8,sda:B9});
  eep=require("AT24").connect(I2C1,64,256,0);
  tcs=require("TCS3472x").connect(I2C1,64,1);
  bmp=require("BMP085").connect(I2C1);
  setInterval("updateSensors();",30000);
  systemStatus={
    light:{
      clear:-1,
      red:-1,
      green:-1,
      blue:-1
    },
    temperature:-1,
    pressure: -1,
    RFDevs:[0,0,0],
    door_upstairs:0,
    door_downstairs:0,
    fridge:0
  };
  updateSensors();
  setInterval(updateSensors,30000);
  cmd="";
  Serial2.on('data', function (data) { 
    cmd+=data;
    if (cmd.charCodeAt(0)==10){cmd=cmd.substr(1);}
    if (cmd==">"){eval(RFCommands[">"]);}
    console.log(E.toUint8Array(cmd));
    var idx = cmd.indexOf("\r");
    while (idx>=0) { 
      var line = cmd.substr(0,idx);
      cmd = cmd.substr(idx+1);
      if (line!="") {
        handleCommand(line);
      }
      idx = cmd.indexOf("\r");
    }
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

function updateSensors() {
  var tColors=tcs.getValue();
  if (tColors.clear >0) 
  {
    systemStatus.light=tColors;
    require("http").get(mirrorurl+"?clear="+tColors.clear+"&red="+tColors.red+"&green="+tColors.green+"&blue="+tColors.blue,function(){return;});
  }
  bmp.getPressure(function(b){if (systemStatus.pressure==-1){systemStatus.pressure=b.pressure;} else {systemStatus.pressure=systemStatus.pressure*0.8+b.pressure*0.2;}});
}



function handleCommand(cmd) {
  if (cmd.charAt(0)=='+') {
    processRF(cmd.substr(1));
  } else if (RFCommands[cmd]===undefined) {
    console.log("bad command received: "+cmd);
  } else {
    console.log("parsing command"+cmd);
    eval(RFCommands[cmd]);
  }
}

function processRF(msg) {
  if (RFMessages[msg]!==undefined) {
    console.log("processing known message "+msg);
    eval(RFMessages[msg]);
  } else {
    console.log("received unknown message "+msg);
  }
}

RFMessages = {
  "1FE10001":"systemStatus.door_upstairs=0;",
  "1FE10101":"systemStatus.door_upstairs=1;",
  "1FE10002":"systemStatus.door_downstairs=0;",
  "1FE10102":"systemStatus.door_downstairs=1;"
};

RFCommands = {
  "ERROR":"console.log('ERROR received from AzzyRF');",
  "RX ACK":"console.log('acknowledgement of last message received');",
  "TX OK":"console.log('transmit OK');"
};