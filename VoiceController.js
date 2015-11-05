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



var systemStatus= {};


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


function getFargoStatus() {
  console.log("getFargoStatus called");
  var fargost="";
  require("http").get(fargosturl, function(res) {
    res.on('data',function (data) {fargost+=data;});
    res.on('close',function() {
      var tem=0;
      var tfs=JSON.parse(fargost);
      vtfs=tfs; 
      for (var i=0;i<8;i++) {
        tem+=(systemStatus.fargo[i]!=tfs.relaystate[i].state);
        systemStatus.fargo[i]=tfs.relaystate[i].state;
      }
      if (tem){
        updateMirrorFargo();
      }
    });
  });
}

function setFargo(relay,state) {
  console.log("setFargo called");
  var postfix = (state) ? "/on":"/off";
  require("http").get(fargourl+(relay+1).toString()+postfix, function(res) {
    res.on('close',function () {
          console.log("onClose called");
      if(this.code==200) {
        systemStatus.fargo[relay]=state;
        updateMirrorFargo();
      } else {
        console.log("setFargo failed: "+this.code);
      }
    });
  });
}

function switchRF(dev) {
  console.log("switchrf called"+dev);
  dinf=RFDevs[dev];
  RFCommands["TX OK"]="RFMessages['TX OK']=''; systemStatus.RFDevs["+dev+"]=!systemStatus.RFDevs["+dev+"];stLD.set(1,"+dev+",255*systemStatus.RFDevs["+dev+"]);updateRFStatus("+dev+",systemStatus.RFDevs["+dev+"]);";
  AzzyRF.send(dinf.addr,0x40,[170>>systemStatus.RFDevs[dev],dinf.devnum]);
}

function updateRFStatus(dev,val) {
  require("http").get(mirrorurl+"?RFDev"+dev.toString()+"="+(val?1:0),function(){return;});
}

var RFDevs=[ 
  {name:"Ozone Generator",addr:20,devnum:0,pwm:0},
  {name:"Plasma Cube",addr:20,devnum:1,pwm:0},
  {name:"Plasma Tower",addr:20,devnum:2,pwm:0}
  ];


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
  USB.setConsole();
  Clock = require("clock").Clock;
  //initiating hardware...
  //status lights
  SPI1.setup({mosi:A7,baud:3200000});
  stLD={};
  stLD.leds=new Uint8Array(6);
  stLD.set=function(led,color,brightness){
    if (led<2 && color <3) {
      stLD.leds[led*3+color]=brightness;
      this.upd();
    } else {
      throw "Invalid led or color";
    }
  };
  stLD.upd=function(){
    var tled=new Uint8Array(this.leds);
    var rat=this.maxb/256;
    for(var i=0;i<6;i++){
        tled[i]*=rat;
    }
    SPI1.send4bit(tled,1,3);
  };
  stLD.maxb=256;
  stLD.sMax=function(a){
    if (this.maxb!=a) {
      this.maxb=a;
      this.upd();
    }
  };
  stLD.sets=function(led,color){
    if (led<2 && color.length==3) {
      stLD.leds[led*3]=color[0];
      stLD.leds[led*3+1]=color[1];
      stLD.leds[led*3+2]=color[2];
      this.upd();
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
  setWatch("systemStatus.lastMotion=safeGetTime();",A8,{edge:'rising',repeat:true});
  //easyvr
  Serial1.setup(9600,{tx:B6,rx:B7});
  evr=require("easyvr").connect(Serial1,ocm,otm,otm,function(){stLD.set(1,1,0);});
  //azzyrf
  Serial2.setup(9600, { rx: A3, tx : A2 });
  AzzyRF=require("AzzyRF").connect(Serial2);
  //AzzyRF.onMsgOut=function(a){return;};
  AzzyRF.onDataOut=function(a){return;};
  AzzyRF.onTextOut=function(a) {
    console.log(E.toUint8Array(a));
    if (RFCommands[a]===undefined) {
      console.log("bad command received: "+a);
    } else {
      console.log("parsing command"+a);
      eval(RFCommands[a]);
    }
  };
  AzzyRF.onRcvOut=function(a) {
    msg=E.toString(a);
    if (RFMessages[msg]!==undefined) {
      console.log("processing known message "+msg);
      eval(RFMessages[msg]);
    } else {
      console.log("received unknown message "+msg);
    }
  };
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
    fridge:0,
    lastMotion:0,
    fargo:new Uint8Array(8)
  };
  updateSensors(1);
  getDate();
  setInterval(updateSensors,30000);
  cmd="";
}


function updateSensors(nohttp) {
  var tColors=tcs.getValue();
  if (tColors.clear >0) 
  {
    stLD.sMax((tColors.clear < 10000)?(tColors.clear<1000?0:(tColors.clear<5000?64:128)):255);
    systemStatus.light=tColors;
    if(!nohttp){
      console.log("CallingMirror");
      //console.log(getMirrorString());
      require("http").get(mirrorurl+getMirrorString(),function(){return;});
    }
  }
  bmp.getPressure(function(b){if (systemStatus.pressure==-1){systemStatus.pressure=b.pressure;} else {systemStatus.pressure=systemStatus.pressure*0.8+b.pressure*0.2;}});
  getFargoStatus();
}


function updateMirrorFargo() {
  console.log(mirrorurl+getFargoString())
  require("http").get(mirrorurl+getFargoString(),function(){return;});
}

function getFargoString() {
  s=systemStatus.fargo;
  return "?fargo0="+s[0]+"&fargo1="+s[1]+"&fargo2="+s[2]+"&fargo3="+s[3]+"&fargo4="+s[4]+"&fargo5="+s[5]+"&fargo6="+s[6]+"&fargo7="+s[7];
}
function getMirrorString() {
  var s=systemStatus;
  var tstr="?door_up="+s.door_upstairs+"&door_down="+s.door_downstairs+"&fridge="+s.fridge;
  tstr+=(s.light.clear>=0?"&clear="+s.light.clear+"&red="+s.light.red+"&green="+s.light.green+"&blue="+s.light.blue:"");
  tstr+=(s.pressure>0?"&pressure="+s.pressure:"")+"&LastMove="+(safeGetTime()-s.lastMotion);
  return tstr;
}

function safeGetTime(){
  if (clk) {
    return clk.getDate().getTime();
  } else {
    return -1;
  }
}


RFMessages = {
  "1FE10001":"systemStatus.door_upstairs=0;",
  "1FE10101":"systemStatus.door_upstairs=1;",
  "1FE10002":"systemStatus.door_downstairs=0;",
  "1FE10102":"systemStatus.door_downstairs=1;"
};

RFCommands = {
  "ERROR":"console.log('ERROR received from AzzyRF');Serial2.print('\r');",
  "RX ACK":"console.log('acknowledgement of last message received');",
  "TX OK":"console.log('transmit OK');"
};
