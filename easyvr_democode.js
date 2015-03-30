var ocm=function(menu,option) {
  console.log("menu:"+menu+" option: "+option);
  if (menu==1&&option==2) {
    return {type:2,timeout:10};
  } else {
    if (menu==2) {
      if (option==0) {
        digitalWrite([LED1,LED2,LED3],2);
      } else if(option==1) {
        digitalWrite([LED1,LED2,LED3],4);
      } else {
        
        digitalWrite([LED1,LED2,LED3],1);
      }
    }
    return {type:1,timeout:0};
  }
  
};

var otm=function(){
  this.setRecognize(1,0);
};



Serial4.setup(9600,{tx:C10,rx:C11});
    
var evr=require("easyvr").connect(Serial4,ocm,otm,otm);
