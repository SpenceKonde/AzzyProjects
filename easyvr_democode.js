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
      if (option < 8) {
        setFargo(option,!fargo[option]);
      } 
    } else if (menu==3) { // control desk lamp
      console.log("desk lamp "+option);
    } else if (menu==4) { // control nixie clock
      if (option==0) { //clock on
        setDesk("nixs=1;uplcd();")
      } else if (option==1) { //clock off
        setDesk("nixs=0;uplcd();")
      } else if (option==2) { //time
        setDesk("nixs=1;MnuS=0;Mnu0=0;uplcd();")
      } else if (option==3) { //temp
        setDesk("nixs=1;MnuS=0;Mnu0=1;uplcd();")
      } else if (option==4) { //humidity
        setDesk("nixs=1;MnuS=0;Mnu0=2;uplcd();")
      //} else if (option==5) { //pressure
      //  setDesk("nixs=1;MnuS=0;Mnu0=3;uplcd();")
      } 
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


//My standard fargo network commands
fargosturl="http://192.168.2.12/fargostatus.php";
dateurl="http://192.168.2.12/date.php";
fargourl="http://192.168.2.14/api/relay/";
deskurl="http://192.168.2.16/code.run"
fargo=new Uint8Array(8);

function setDesk(command) {
	require("http").get(fargourl+(relay+1).toString()+postfix, function(res) {
		res.on('close',function () {
			if(this.code!=200) {
				console.log("Error commanding desklamp/nixie: "+this.code);
			}
		});
	});
}


function getFargostatus() {
	var fargost="";
	require("http").get(fargosturl, function(res) {
		res.on('data',function (data) {fargost+=data;});
		res.on('close',function() {var tfs=JSON.parse(fargost); vtfs=tfs; for (var i=0;i<8;i++) { fargo[i]=tfs.relaystate[i].state;} if(MnuS==3){uplcd(1);}});
	});
}

function setFargo(relay,state) {
	var postfix = (state) ? "/on":"/off";
	require("http").get(fargourl+(relay+1).toString()+postfix, function(res) {
		res.on('close',function () {
			if(this.code!=200) {
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
