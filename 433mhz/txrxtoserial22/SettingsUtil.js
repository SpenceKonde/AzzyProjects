
var AzzyRF={};

AzzyRF.Serial=Serial1;

Serial1.setup(9600,{rx:A10,tx:A9});



AzzyRF.onData = function(data) {
	if (data=="#" && AzzyRF.datastring) {
		if (AzzyRF.datastring) {
			AzzyRF.Serial.print(AzzyRF.datastring);
			AzzyRF.datastring="";
		}
	} else if (data==">" && AzzyRF.datastring) {
		//TODO
	} else {
		AzzyRF.inString+=data;
      if (AzzyRF.timeout > 0) {
        clearTimeout(AzzyRF.timeout);
	}
      AzzyRF.timeout=setTimeout("AzzyRF.outputFormat(AzzyRF.inString);AzzyRF.inString='';AzzyRF.timeout=0;",1000);
    }
};
AzzyRF.timeout=0;
AzzyRF.inString="";
AzzyRF.Serial.on('data',AzzyRF.onData);

AzzyRF.writeA24 = function(addr,data) {
	if (data.length > 16) {
		throw "Data too long";
	} else {
      var tstr="";
		//tstr=E.toString([(addr>>8)&255,addr&255,data.length]);
        tstr+=String.fromCharCode((addr>>8)&255,addr&255,data.length);
		//tstr+=E.toString(data);
        tstr+=data;
		AzzyRF.datastring=tstr;
		AzzyRF.Serial.print("AT+24WL\r");
	}
};

AzzyRF.outputFormat = function(text) {
  console.log(text);
  var outstr="";
  var len=text.length;
  for (var i=0;i<len;i+=2) {
    //console.log(i);
    //console.log(text.substr(i,2));
    var tnum=parseInt(text.substr(i,2),16);
    if (!isNaN(tnum)) {
      outstr+=String.fromCharCode(tnum);
    }
  }
  if (outstr!="0") {
  //console.log(outstr);
  console.log(E.toUint8Array(outstr));
  }
};


AzzyRF.readA24 = function(addr,len) {
	if (len > 16) {
		throw "Data too long";
	} else {
		tstr=E.toString([(addr>>8)&255,addr&255,len]);
		AzzyRF.datastring=tstr;
		AzzyRF.Serial.print("AT+24RL\r");
	}
};

AzzyRF.send(addr,cmd,data) {
	if data.length==2 {
		this.datastring=E.toString([addr*0x3F,cmd,data[0],data[1]]);
		AzzyRF.Serial.print("AT+SEND");
	} else if data.length==5 {
		this.datastring=E.toString([addr*0x3F,cmd,data[0],data[1]]);
		AzzyRF.Serial.print("AT+SENDM");
	} else if data.length==13 {
		this.datastring=E.toString([addr*0x3F,cmd,data[0],data[1]]);
		AzzyRF.Serial.print("AT+SENDL");
	} else if data.length==29 {
		this.datastring=E.toString([addr*0x3F,cmd,data[0],data[1]]);
		AzzyRF.Serial.print("AT+SENDE");
	} else {
		throw "Invalid Length";
	}
}

AzzyRF.setRFConfig = function(set) {
	tarr=new Uint8Array(28);
	tarr[0]=set.txSyncTime;
	tarr[1]=set.txSyncTime>>8;
	tarr[2]=set.txTrainRep;
	tarr[3]=set.txTrainTime;
	tarr[4]=set.txTrainTime>>8;
	tarr[5]=set.txOneLength;
	tarr[6]=set.txOneLength>>8;
	tarr[7]=set.txZeroLength;
	tarr[8]=set.txZeroLength>>8;
	tarr[9]=set.txLowTime;
	tarr[10]=set.txLowTime>>8;
	tarr[11]=set.rxSyncMin;
	tarr[12]=set.rxSyncMin>>8;
	tarr[13]=set.rxSyncMax;
	tarr[14]=set.rxSyncMax>>8;
	tarr[15]=set.rxZeroMin;
	tarr[16]=set.rxZeroMin>>8;
	tarr[17]=set.rxZeroMax;
	tarr[18]=set.rxZeroMax>>8;
	tarr[19]=set.rxOneMin;
	tarr[20]=set.rxOneMin>>8;
	tarr[21]=set.rxOneMax;
	tarr[22]=set.rxOneMax>>8;
	tarr[23]=set.rxLowMax;
	tarr[24]=set.rxLowMax>>8;
	tarr[23]=set.txRepDelay;
	tarr[24]=set.txRepDelay>>8;
	tarr[23]=set.txRepCount;
	this.datastring=E.toString(tarr);
	console.log("Writing to config EEPROM on AzzyRF");
	AzzyRF.Serial.print("AT+CONF\r");
};
