var ocm=function(menu,option) {
  console.log("menu:"+menu+" option: "+option);
  if (menu==0) {
    if (option==0) {
      console.log("LIGHTS ON");
      //do lights on calls
    } else if (option==1) {
      console.log("LIGHTS OFF");
      //do lights off calls
    } else if (option==2) {
      console.log("SWITCH :");
      digitalWrite(LED1,1);
      return {type:2,timeout:15};
    } else if (option==3) {
      console.log("DESK :");
      digitalWrite(LED1,1);
      return {type:3,timeout:15};
    } else if (option==4) {
      console.log("NIXIE :");
      digitalWrite(LED1,1);
      return {type:4,timeout:15};
    }
  } else {
    if (menu==2) { // toggle a fargo or RF controlled device
      console.log("toggle device "+option);
    } else if (menu==3) { // control desk lamp
      console.log("desk lamp "+option);
    } else if (menu==4) { // control nixie clock
      console.log("control nixie clock "+option);
    }
    digitalWrite(LED1,0);
    return {type:1,timeout:0};
  }
  
};

var otm=function(){
  digitalWrite(LED1,0);
  this.setRecognize(1,0);
};



Serial4.setup(9600,{tx:C10,rx:C11});
    
var evr=require("easyvr").connect(Serial4,ocm,otm,otm);

