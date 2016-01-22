
I2C1.setup({sda:B6,sda:B7});
var eep=require("AT24").connect(I2C1,...);

SPI1.setup(...) //set up SPI1 for APA102;

function APA102Lite(data){
  SPI1.send(data);
  SPI1.send([0xFF,0xFF,0xFF,0xFF]);
}

