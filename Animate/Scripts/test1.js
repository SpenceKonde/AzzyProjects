
I2C1.setup({sda:B6,sda:B7});
var eep=require("AT24").connect(I2C1,...);

SPI1.setup(...) //set up SPI1 for APA102;

function APA102Lite(data){
  SPI1.send(data);
  SPI1.send([0xFF,0xFF,0xFF,0xFF]);
}
var frameNumber =0;
var ledCount=5;
var offset=0x100;
var frameCount = 10;
function onTimeout() {
  data=eep.read(offset+(frameNumber)*(ledCount*4+4), (ledCount*4+4));
  var dly=data[3]+(data[2]<<8); 
  dly=20;
  data[0]=0; data[1]=0; data[2]=0; data[3]=0;
  APA102Lite(data);
  setTimeout("onTimeout()",dly);
}
