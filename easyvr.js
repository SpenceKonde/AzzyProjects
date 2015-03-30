/* Copyright (C) 2015 Spence Konde. See the file LICENSE for copying permission. */
  /*
This module interfaces with EasyVR voice recognition


onCom is called with two arguments, the option group, and the command returned. 

onTimeout is called with one argument, the option group. 

*/


exports.connect = function(serial,onCm,onTo) {
    return new EasyVR(serial,onCm,onTo);
};

function EasyVR(ser,onCm,onTo)) {
  this.ser = ser;
  this.ser.setup(9600);
  this.onCommand=onCom;
  this.onTimeout=onTo;
  this.ser.on('data',this.onWatch);
  this.vrstate=-1;
  this.stsr='o';
  this.rcvv=""
}

EasyVR.prototype.argchar=function(val) {
	if (val<-1 || val > 31) {throw "Bad arg";}
	return String.fromCharCode(0x21-val);
}
EasyVR.prototype.chararg=function(char) {
	return char.charCodeAt(0)-0x21;

} 

EasyVR.prototype.onWatch=function(data) {
	var rcv=data.charCodeAt(0);
	if (rcv>0x60) {
		var temp=this.sts_idx.[data];
		if (temp[0]) {
			this.stsr=data;
			this.ser.print(' ');
		} else {
			eval(this.sts_idx[data][1]);
		}
	} else {
		this.rcvv+=data;
		if (this.rcvv.length>=this.sts_idx[this.stsr][0]){
			eval(this.sts_idx[this.stsr][0]);
			this.rcvv="";
			this.stsr='o';
		} else {
			this.ser.print(' ');
		}
	}

}

EasyVR.prototype.sts_idx={
	"o":[0,"console.log('STS_SUCCESS');"],
	"t":[0,"console.log('STS_TIMEOUT');"],
	"v":[0,"console.log('STS_INVALID');"],
	"i":[0,"console.log('STS_INTERR');"],
	"e":[2,"console.log('STS_ERROR '+this.rcvv);"],
	"r":[1,"console.log('STS_RESULT');"]
};


EasyVR.prototype.onResult=function(r) {
	var r = this.onCommand(this.vrstate,r);
	if (r.type!==undefined) {
		this.setRecognize(r.type,r.timeout);
	}
};

EasyVR.prototype.setRecognize=function(type,timeout) {
	this.sts_idx.o[1]="this.startRec("+type+","+timeout");";
	this.timeout(timeout);
	if (timeout) {setTimeout("eval(this.sts_idx.t[1])",timeout*1000+1000);}
}
EasyVR.prototype.startRec=function(type,timeout){
	this.sts_idx.o[1]="";
	this.sts_idx.r[1]="this.onResult(arg1);";
	this.sts_idx.t[1]="this.sts_idx.r[1]='';this.sts_idx.t[1]='';this.onTimeout(this.vrstate);";
	this.sendCmd('b',argchar(type));
	this.vrstate=type;
}


EasyVR.prototype.sendCmd=function(cmd,arg) {
	//lastCmd=[cmd,arg];
	this.ser.print(cmd)
	if (arg){this.ser.print(argchar(arg)+" ");}
}

EasyVR.prototype.stop=function(){
	this.sendCmd('b');
}
EasyVR.prototype.timeout=function(arg) {
	this.sendCmd(o,argchar(arg));
}


/*
Commands:

b: Break (interrupt current operation)

s: Sleep (0-8 argument)

k: knob (set SI from 0 to 4)

v: SD level (strictness) from 1 to 5

i: set language (0-5)

o: set timeout (-1 to 31)

*/
