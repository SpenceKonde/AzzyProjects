
/*

Scene format:

16-bit fields: 

[Base ID, interval for events, (Random 0) (Random 1) (Random 2) (Random 3) (Random 4) (Random 5) (Random 6) ] //32 bytes
[Event 0 through 15] // 32 bytes

System supports up to (in theory) 16768 scenes or animation frames.

That corresponds to 512 KB or 256 KB respectively, so more than would realistically be used. 

Scene Event is 16-bit: | S1 |  S0  | A13~A0

S: 
00: Start animation at this frame
01: Switch to this other scene
10: Unused
11: Special command

11cc ccc ffff fff
c0~5: Command
1: Resume last scene. 

f0~7: Flags
Bit 0: Reset twinkle





*/



SPI1.setup({sck:14,mosi:13,mode:1,order:"msb",baud:4000000});
I2C1.setup({scl:5,sda:4});

var http = require("http");
var eeprom=require("AT24").connect(I2C1, 32, 32);

setBusyIndicator(2);
require("ESP8266").logDebug(0);
require("ESP8266").setLog(0);


// Parameters:
numleds=10;

//global functions
function animate() {
  setTimeout("animate()",20);
  var x;
  if (leds.animode) {x=getTime();}
  leds.flip();
  leds.dotwinkle();
  if (leds.animode) {console.log(getTime()-x);}
}

var CORS={'Access-Control-Allow-Origin':'*'};
// Network

function onPageRequest(req, res) {
  var a = url.parse(req.url, true);
  if (a.pathname.split(".")[1]=="cmd"){
  	if (handleCmd(a.pathname,a.query,res)) {
  		res.writeHead(200,CORS);
  	} 
  	res.end();
  } else {
	res.writeHead(404,CORS);
	res.end("NOT FOUND");	
  }
}
require("http").createServer(onPageRequest).listen(80);

function handleCmd(pn,q,r) {
	try {
  if (pn=="/save.cmd") {
    //lreq=a.query;
    if (q.index==undefined || q.index>memmap.statMax || q.index < 0) {
    	r.write("MAX INDEX:");
    	r.write(memmap.statMax);
    	return 0;
    }
    leds.save(q.index);
    r.write("OK");
    return 1;
  } else if (pn=="/load.cmd") {
    if (q.index==undefined || q.index>memmap.statMax || q.index < 0) {
    	r.write("MAX INDEX:");
    	r.write(memmap.statMax);
    	return 0;
    }
    if (!leds.load(q.index)){
    	r.writeHead(404,CORS);
    	r.write("No such pattern");
    	return 0;
    }
    r.write("OK");
    return 1;
  }else if (pn=="/delete.cmd") {
    if (q.index==undefined || q.index>memmap.statMax || q.index < 0) {
    	r.write("MAX INDEX:");
    	r.write(memmap.statMax);
    	return 0;
    }
    if (!leds.delete(q.index)){
    	r.writeHead(404,CORS);
    	r.write("No such pattern");
    	return 0;
    }
    r.write("OK");
    return 1;
  } else if (pn=="/showState.cmd") {
    //lreq=a.query;
    r.write(JSON.stringify({"base":leds.tbuf,"twinkle":[leds.tm,leds.ti,leds.ta]}));
    return 1;
  } else if (pn=="/setScene.cmd") {
    //lreq=a.query;
    leds.setScene(q.scene);
    r.write("OK");
    return 1;
  }else if (pn=="/event.cmd") {
    //lreq=a.query;
    leds.sceneVect(eval(q.vector));
    r.write("OK");
    return 1;
  }else if (pn=="/setAll.cmd") {
    //lreq=a.query;
    leds.setAll(eval(q.color),eval(q.mode),eval(q.max),eval(q.min));
    r.write("OK");
    return 1;
  }else if (pn=="/setPixel.cmd") {
    leds.setPixel2(q.led,0,eval(q.color),eval(q.mode),eval(q.max),eval(q.min));
    r.write("OK");
    return 1;
  } else {
  	r.writeHead(404,CORS);
	r.write("NO CMD");
  	return 0;
  }
	} 
	catch (err) {
		r.writeHead(500,CORS);
		r.write("ERROR");
		return 0;
	}
}

/*
var memmap={
	slen:32,
	rlen:40,
	statOff:0x100,
	statMax:14,
	sEep:eeprom,
	oEep:eeprom,
	oOff:0x800,
	oMax:64,
	oIEE:eeprom,
	oIOF:0
};

*/
 //512kbit
var memmap={
	slen:32,
	rlen:40,
	statOff:0x2000,
	statMax:192,
	sEep:eeprom,
	oEep:eeprom,
	oOff:0x8000,
	oMax:1024,
	oIEE:eeprom,
	oIOF:0,
	scEE:eeprom,
	scOF:0x1000,
	scMX:64
};

// LEDS
gtab=new Uint16Array([0,1,2,3,4,5,6,7,8,9,11,13,15,17,19,21,23,25,27,30,33,36,39,42,45,48,51,54,58,62,66,70,74,78,82,86,91,96,101,106,111,116,121,126,132,138,144,150,156,162,168,174,181,188,195,202,209,216,223,230,238,246,254,262,270,278,286,294,303,312,321,330,339,348,357,366,376,386,396,406,416,426,436,446,457,468,479,490,501,512,523,534,546,558,570,582,594,606,618,630,643,656,669,682,695,708,721,734,748,762,776,790,804,818,832,846,861,876,891,906,921,936,951,966,982,998,1014,1030,1046,1062,1078,1094,1111,1128,1145,1162,1179,1196,1213,1230,1248,1266,1284,1302,1320,1338,1356,1374,1393,1412,1431,1450,1469,1488,1507,1526,1546,1566,1586,1606,1626,1646,1666,1686,1707,1728,1749,1770,1791,1812,1833,1854,1876,1898,1920,1942,1964,1986,2008,2030,2053,2076,2099,2122,2145,2168,2191,2214,2238,2262,2286,2310,2334,2358,2382,2406,2431,2456,2481,2506,2531,2556,2581,2606,2631,2657,2683,2709,2735,2761,2787,2813,2839,2866,2893,2920,2947,2974,3001,3028,3055,3083,3111,3139,3167,3195,3223,3251,3279,3308,3337,3366,3395,3424,3453,3482,3511,3541,3571,3601,3631,3661,3691,3721,3751,3782,3813,3844,3875,3906,3937,3968,3999,4031,4063,4095]);
var leds = {};
leds.map=memmap;
leds.spi=SPI1;
leds.num=numleds;
leds.afr=0;
leds.ison=1;
leds.animode=0;
leds.aniframe=0;
leds.anilast=0;
leds.aniaddr=0;
leds.zz="\x00\x00";
leds.sceneid=0;
leds.lastscene=0;
leds.scenetime=0;

/* 
Animation functions, dotwinkle and flip, are located here. 
*/


leds.dotwinkle = function () {
	var t=this.t;
	var tm= this.tm;
	var ta=this.ta;
	var ti=this.ti;
	var b=this.buff;
	var z=this.tbuf;
	var o=this.overlay;
	if (this.animode) {
		if (this.aniframe > this.anilast) {
			this.animode=0;
			this.anilast=0;
			this.aniframe=0;
			leds.aniaddr=0;
			this.overlay.fill(0);
		} else {
			this.overlay=this.map.oEep.read(this.aniaddr+this.map.slen*this.aniframe++,this.num*3);
		}
	}
	if (this.animode & 4 ){
		leds.tclb.set(o);
    } else if (this.animode & 2){
        for (var i=0;i<30;i++){
          leds.tclb[i]=b[i]+t[i]+o[i];
        }
	} else {
		for (var i=0;i<30;i++){
			var mode=tm[i];
			var mo=mode&0x03;
			var s=1+((mode&12)>>2);
			var pr=mode>>4;
			if (!(this.animode&2)) {
				if (mo==1) { //0x01 - high nybble is chance to change, from 0 (1/16) to 15 (16/16 chance to change)
					var n=Math.random(); //3ms
					var th=(pr+1)/32;
	      				if (n<0.5+th){ //8ms
	      					if(n<=(0.5-th) && t[i]>ti[i]){t[i]-=s;}
		      			} else {
	      					if (t[i]<ta[i]){t[i]+=s;}
	      				}
				} else if (mo==2) { //fade/pulse. 
	          			if (this.afr%((1+pr)&7)==0){
	            				t[i]=E.clip(t[i]+pr&8?s:-1*s,ti[i],ta[i]);
						if (t[i] == ti[i] || t[i] == ta[i]) {
							tm[i]=mode^128;
						}
	        			}
				} else {
					if (t[i]!==0){if(t[i]>0){t[i]--;} else {t[i]++;}}
				}
			}
			var c=b[i];
			if (mo || this.afr%((1+pr)&7)==0) {
				b[i]+=E.clip(z[i]-c,-1,1);
			}
			leds.tclb[i]=c+(c?t[i]:0)+o[i]; //10ms
		}
	}
	this.afr=this.afr==255?0:this.afr+1;
};

leds.flip = function () {
	var j=0;
	var i=0;
	var z=leds.num*3;
	while (i<z) {
      var rch=gtab[leds.tclb[i++]];
		var gch=gtab[leds.tclb[i++]];
		var bch=gtab[leds.tclb[i++]];
		
		var ma = Math.max(rch,gch,bch);
		var mult=1;
        var gdim=31;
		
			if (ma <390) {
				gdim=3;
				mult=10.33;
			} else if (ma <700) {
				gdim=7;
				mult=4.4;
			} else if (ma <1700) {
				gdim=15;
				mult=2.06;
			} 
		
		this.fbuf[j++]=(this.ison?(gdim|224):224);
		this.fbuf[j++]=(bch?Math.max((bch*mult)>>4,1):0);
		this.fbuf[j++]=(gch?Math.max((gch*mult)>>4,1):0);
		this.fbuf[j++]=(rch?Math.max((rch*mult)>>4,1):0);

	}

	this.spi.write(0,0,0,0,this.fbuf,0xFF,0xFF,0xFF,0xFF);
};

/* 
LED control functions start here. 
*/

leds.setAll= function (color,tmode,tmax,tmin,instant) {
	for (var i=0;i<this.num;i++) {
		for (j=0;j<3;j++){
			
			this.tbuf[3*i+j]=color[j];
            if (instant) {this.buff[3*i+j]=color[j];}
			if (tmode) {
				this.tm[3*i+j]=tmode[j];
				if (tmode[j]&0x02) {this.t[3*i+j]=0;} //reset it if we're making it pulse, since the pulse animations will assume 
				this.ti[3*i+j]=tmin[j];
				this.ta[3*i+j]=tmax[j];
			}
		}
	}
};

leds.load = function (index) {
	var s=this.map.slen;
	var addr=this.map.statOff+(4*index*s);
	if (this.map.sEep.read(addr+s-1,1)[0]==255) {
		return 0;
	}
	this.tbuf=this.map.sEep.read(addr,this.num*3);
	this.tm=this.map.sEep.read((addr+s),this.num*3);
	this.ti=new Int8Array(this.map.sEep.read((addr+s*2),this.num*3));
	this.ta=new Int8Array(this.map.sEep.read((addr+s*3),this.num*3));
	return 1;
};

leds.delete = function (index) {
	var t=new Uint8Array(this.map.slen*4);
	t.fill("\xFF");
	this.map.sEep.write(this.map.statOff+(4*index*this.map.slen),t);
};

leds.setAnimate = function (address){
  leds.anilast=this.map.oEep.read(address+30);
  leds.aniaddr=this.map.oOff+address*this.map.slen;
  leds.animode=this.map.oEep.read(address+31);
};

leds.save = function (index) {
	var s=this.map.slen;
	var addr=this.map.statOff+(4*index*s);
	this.map.sEep.write(addr,E.toString(this.tbuf)+leds.zz+E.toString(this.tm)+leds.zz+E.toString(this.ti)+leds.zz+E.toString(this.ta)+leds.zz);
};

leds.setPixel2 = function (x, y, color,mode,mintwi,maxtwi,instant) {
	x*=3;
	for (var i=0;i<3;i++){
		this.tbuf[x+i]=color[i];
      if (instant) {this.buff[x+i]=color[i];}
		this.tbuf[x+i]=color[i];
		this.tm[x+i]=mode[i];
		this.ta[x+i]=maxtwi[i];
		this.ti[x+i]=mintwi[i];
	}
};


leds.setScene = function(id) {
	if (id > this.map.scMX || id <0) { return 0;}
	var adr=this.map.scOF+id*64;
	if (this.map.scEE.read(adr,1)[0]==255) { return 0; }
	//now we've passed sanity checks, use the new scene:
	if (this.scenetimer) {clearTimeout(this.scenetimer);this.scenetimer=0;}
	this.scene.set(this.map.scEE.read(adr,32));
	this.lastscene=this.sceneid;
	this.sceneid=id;
	this.scenetimer=setTimeout(this.sceneRand,this.scene[1]);
	return 1;
}; 

leds.sceneRand = function () {
	for (var i=0;i<14;i+=2) {
		if (65536*Math.random() < this.scene[i+2]) {
			return sceneEvent(this.scene[i+3])
		}
	}// if we're here, we didn't match anything. 
	this.scenetimer=setTimeout(this.sceneRand,this.scene[1]);
}

leds.sceneEvent = function (event) {
	var t=event&0x3FFF;
	event=event>>14;
	if (event == 0) {
		return this.setScene(t);
	} else if (event ==1) {
		return this.setAnimation(t);
	} else if (event ==3) {
		//var cmd=t>>8;
		//if (t&1) { //blank current twinkle
		//	this.t.fill(0);
		//} 
		//if (cmd==1) {
			return this.setScene(this.lastscene);
		//}
	}
	return 0;
}
leds.sceneVect = function (id) {
	var adr=this.map.scOF+this.sceneid*64;
	var z=this.map.scEE.read(adr+32+id,2);
	this.sceneEvent(z[1]+(z[0]<<8));
}


// Do this here, so we don't have these eating up memory while processing the other stuff.

leds.fbuf=new Uint8Array(numleds*4);
leds.buff=new Uint8Array(numleds*3);
leds.tbuf=new Uint8ClampedArray(numleds*3);
leds.t=new Int8Array(numleds*3);
leds.tm=new Uint8Array(numleds*3);
leds.ti=new Int8Array(numleds*3);
leds.ta=new Int8Array(numleds*3);
leds.overlay=new Uint8Array(numleds*3);
leds.tclb=new Uint8ClampedArray(numleds*3);
leds.scene=new Uint16Array(16);


setBusyIndicator(2);
leds.setPixel2(0,0,[0,255,255],[0,0,0],[0,0,0],[0,0,0]);
