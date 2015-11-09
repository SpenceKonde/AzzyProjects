
function onInit() {
  USB.setConsole();
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
}

function switchRF(dev) {
  console.log("switchrf called"+dev);
  dinf=RFDevs[dev];
  RFCommands["TX OK"]="RFMessages['TX OK']=''; systemStatus.RFDevs["+dev+"]=!systemStatus.RFDevs["+dev+"];stLD.set(1,"+dev+",255*systemStatus.RFDevs["+dev+"]);updateRFStatus("+dev+",systemStatus.RFDevs["+dev+"]);";
  AzzyRF.send(dinf.addr,0x40,[170>>systemStatus.RFDevs[dev],dinf.devnum]);
}


var RFDevs=[ 
  {name:"Ozone Generator",addr:20,devnum:0,pwm:0},
  {name:"Plasma Cube",addr:20,devnum:1,pwm:0},
  {name:"Plasma Tower",addr:20,devnum:2,pwm:0}
  ];


RFMessages = {
  "1FE10001":"systemStatus.door_upstairs=0;",    //Upstairs door closed
  "1FE10101":"systemStatus.door_upstairs=1;",    //Upstairs door opened
  "1FE10002":"systemStatus.door_downstairs=0;",  //Downstairs door closed
  "1FE10102":"systemStatus.door_downstairs=1;"   //Downstairs door opened
};

RFCommands = {
  "ERROR":"console.log('ERROR received from AzzyRF');Serial2.print('\r');",
  "RX ACK":"console.log('acknowledgement of last message received');",
  "TX OK":"console.log('transmit OK');" //this will never actually be see, see sendRF
};
