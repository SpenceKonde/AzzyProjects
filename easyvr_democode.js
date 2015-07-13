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
mirrorurl="http://192.168.2.12/mirrorup.php";
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
  if (dev==0 && RFDevState[0]==0) {
    sendLRF(dinf.addr,[0x41,1+(dinf.devnum<<4),2,170,85,170]);
    setTimeout("RFDevState[0]=0;updateRFStatus(0,0);",682000);
  } else {
    sendRF(dinf.addr,0x40,170>>RFDevState[dev],dinf.devnum);
  }
  RFDevState[dev]=!RFDevState[dev];
  updateRFStatus(dev,RFDevState[dev]);
}

function updateRFStatus(dev,val) {
  //require("http").get(mirrorurl+"?RFDev"+(dev).toString()+"="+(val).toString(),function(res){return;})
}

var RFDevs=[ 
  {name:"Ozone Generator",addr:20,devnum:0,pwm:0},
  {name:"Plasma Cube",addr:20,devnum:1,pwm:0},
  {name:"Plasma Tower",addr:20,devnum:2,pwm:0}
  ];
var RFDevState=[0,0,0];

function sendRF(addr,cmd,parm,ext) {
  Serial2.println("AT+SEND");
  Serial2.println(E.toString([addr,cmd,parm,ext]));
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
  Serial2.print(String.fromCharCode(addr)+E.toString(data));
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
  //initiating hardware...
  //status lights
  SPI1.setup({mosi:A7,baud:3200000});
  stLD={};
  stLD.leds=new Uint8Array(6);
  stLD.set=function(led,color){
    if (led<2 && color.length==3) {
      stLD.leds[led*3]=color[0];
      stLD.leds[led*3+1]=color[1];
      stLD.leds[led*3+2]=color[2];
      SPI1.send4bit(stLD.leds,1,3);
    } else {
      throw "Invalid led or color";
    }
  };
  stLD.set(0,[0,255,0]);
  //keypad
  //pinMode(A4,'input_pullup'); //button '4'
  pinMode(B1,'input_pullup'); //button '3'
  setWatch("switchRF(2);",B1,{edge:'falling',repeat:true, debounce:10});
  pinMode(A10,'input_pullup'); //button '2'
  setWatch("switchRF(1);",A10,{edge:'falling',repeat:true, debounce:10});
  pinMode(A0,'input_pullup'); //button '1'
  setWatch("switchRF(0);",A0,{edge:'falling',repeat:true, debounce:10});
  //easyvr
  Serial1.setup(9600,{tx:B6,rx:B7});
  evr=require("easyvr").connect(Serial1,ocm,otm,otm);
  //azzyrf
  Serial2.setup(9600, { rx: A3, tx : A2 });
  stLD.set(0,[128,255,0]);
  //ethernet
  SPI2.setup({ mosi:B15, miso:B14, sck:B13 });
  eth = require("WIZnet").connect(SPI2, B10);
  stLD.set(0,[128,255,128]);
  eth.setIP();
  stLD.set(0,[255,0,0]);
  //I2C devices
  I2C1.setup({scl:B8,sda:B9});
  eep=require("AT24").connect(I2C1,64,256,0);
  tcs=require("TCS3472x").connect(I2C1,64,1);
  //bmp=require("BMP180",I2C1);
  
}
