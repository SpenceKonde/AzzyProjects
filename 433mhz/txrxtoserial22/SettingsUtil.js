
var AzzyRF={}

AzzyRF.Serial=Serial2;

AzzyRF.Serial.on('data',AzzyRF.onData);

AzzyRF.onData(data) {
	if (data=="#") {
		if (AzzyRF.datastring) {
			AzzyRF.Serial.print(AzzyRF.datastring);
			AzzyRF.datastring="";
		}
	} else if (data==">") {
		//TODO
	} else {
		console.log(data);
	}
}

AzzyRF.writeA24 (addr,data) {
	if (data.length > 16) {
		throw "Data too long"
	} else {
		tstr=E.toString([(addr>>8)&255,addr&255,data.length]);
		tstr+=E.toString(data);
		AzzyRF.datastring=tstr;
		AzzyRF.Serial.print("AT+24WL\r");
	}
}

AzzyRF.readA24 (addr,len) {
	if (data.length > 16) {
		throw "Data too long"
	} else {
		tstr=E.toString([(addr>>8)&255,addr&255,data.length]);
		AzzyRF.datastring=tstr;
		AzzyRF.Serial.print("AT+24RL\r");
	}
}


AzzyRF.setRFConfig(set) {
	tarr=new Uint8Array(25);
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
	this.datastring=E.toString(tarr);
	console.log("Writing to config EEPROM on AzzyRF");
	AzzyRF.Serial.print("AT+CONF\r");
}


txSyncTime = EEPROM.read(2) + (EEPROM.read(1) << 8); //length of sync
    txTrainRep = EEPROM.read(3); //number of pulses in training burst
    txTrainLen = EEPROM.read(5) + (EEPROM.read(4) << 8); //length of each pulse in training burst

    txOneLength = EEPROM.read(7) + (EEPROM.read(6) << 8); //length of a 1
    txZeroLength = EEPROM.read(9) + (EEPROM.read(8) << 8); //length of a 0
    txLowTime = EEPROM.read(11) + (EEPROM.read(10) << 8); //length of the gap between bits

    rxSyncMin = EEPROM.read(13) + (EEPROM.read(12) << 8); //minimum valid sync length
    rxSyncMax = EEPROM.read(15) + (EEPROM.read(14) << 8); //maximum valid sync length
    rxZeroMin = EEPROM.read(17) + (EEPROM.read(16) << 8); //minimum length for a valid 0
    rxZeroMax = EEPROM.read(19) + (EEPROM.read(18) << 8); //maximum length for a valid 0
    rxOneMin = EEPROM.read(21) + (EEPROM.read(20) << 8); //minimum length for a valid 1
    rxOneMax = EEPROM.read(23) + (EEPROM.read(22) << 8); //maximum length for a valid 1
    rxLowMax = EEPROM.read(25) + (EEPROM.read(24) << 8); //longest low before packet discarded