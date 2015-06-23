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
      console.log("set fargo"+(option-4);
    } else {
      switchRF(option-12);
      }
    }
  } else {
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

va


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
  dinf=RFDevs[dev];
  if (dev==0 && RFDevState[0]==0) {
    sendLRF(dinf.addr,[0x41,1+(dinf.devnum<<4),2,170,85,170]);
    setTimeout("RFDevState[0]=0;updateRFStatus(0,0);",682000)
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
  ]
]
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
  //Serial1.setup(9600,{tx:B6,rx:B7});
  //evr=require("easyvr").connect(Serial1,ocm,otm,otm);
  Serial2.setup(9600, { rx: A3, tx : A2 });
  SPI2.setup({ mosi:B15, miso:B14, sck:B13 });

  eth = require("WIZnet").connect(SPI2, B10);
  
  eth.setIP();
  //wifi = require("ESP8266WiFi").connect(Serial2, function(err) {
  //if (err) throw err;
  //wifi.reset(function(err) {
  //  if (err) throw err;
  //  console.log("Connecting to WiFi");
  //  wifi.connect("TwilightZone","L0st1nTheZ0ne", function(err) {
   //   if (err) throw err;
  //    console.log("Connected");
       //Now you can do something, like an HTTP request
      //evr.setRecognize(1,0);
      setTimeout(getFargostatus,1000);
      setInterval(getFargostatus,30000);
//    });
//  });
//});
  
}
