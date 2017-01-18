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
var eeprom=require("AT24").connect(I2C1, 128, 512);

setBusyIndicator(2);
require("ESP8266").logDebug(0);
require("ESP8266").setLog(0);


// Parameters:
numleds=10;

//global functions
function animate() {
  setTimeout("animate()",20);
  var x;
  //if (leds.animode) {x=getTime();}
  leds.flip();
  leds.dotwinkle();
  //if (leds.animode) {console.log(getTime()-x);}
}

var CORS={'Access-Control-Allow-Origin':'*'};
// Network

function onPageRequest(req, res) {
  var a = url.parse(req.url, true);
  var resu = handleCmd(a.pathname,a.query,res);
  if (resu == -1) {;}
  	else if (resu) {
  	res.writeHead(resu,CORS);
  	if (resu==200) {res.write("OK");}
  	else if (resu==404) {res.write("Not Found");}
  } else {
  	res.writeHead(500,CORS);
  	res.write("ERROR");
  }
  res.end();
}
require("http").createServer(onPageRequest).listen(80);

function handleCmd(pn,q,r) {
	try {
		if (q.hasOwnProperty("index")){
			if( q.index>memmap.statMax || q.index < 0) {
				r.write("MAX INDEX: "+memmap.statMax);
				return 400;
			}
		}
		if (pn=="/save.cmd") {
		    return (leds.save(q.index))?200:500;
	  	} else if (pn=="/load.cmd") {
		    return leds.load(q.index)?200:404;
  		}else if (pn=="/delete.cmd") {
		    return leds.del(q.index)?200:404;
		} else if (pn=="/showState.cmd") {
			r.writeHead(200,CORS);
    		r.write(JSON.stringify({"base":leds.tbuf,"twinkle":[leds.tm,leds.ta,leds.ti]}));
    		return -1;
  		} else if (pn=="/off.cmd") {
    		if (leds.lastscene) {
	    		return leds.setScene(0)?200:404;
	    	} else {
	    		return 200;
	    	}
  		} else if (pn=="/on.cmd") {
  			if (leds.lastscene) {
	    		return leds.setScene(leds.lastscene)?200:404;
	    	} else {
	    		return 200;
	    	}
  		} else if (pn=="/setScene.cmd") {
    		return leds.setScene(q.scene)?200:404;
  		}else if (pn=="/event.cmd") {
    		return leds.sceneVect(eval(q.vector))?200:500;
  		}else if (pn=="/setAll.cmd") {
    		return leds.setAll(eval(q.color),eval(q.mode),eval(q.max),eval(q.min))?200:0;
  		}else if (pn=="/setPixel.cmd") {
    		return leds.setPixel2(q.led,0,eval(q.color),eval(q.mode),eval(q.max),eval(q.min))?200:0;
  		}else if (pn=="/export.cmd") {
    			var resp=leds.export(eval(q.type),eval(q.index));
			if (resp==""){
				return 400;
			} else {
              r.writeHead(200,CORS);
				r.write(resp);
				return -1;
			}
  		}else if (pn=="/import.cmd") {
    		return leds.import(eval(q.type),eval(q.index),q.data)?200:0;
  		} else {
  			return 404;
		}
	} catch (err) {
		console.log(err);
		//r.write(err);
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
	slen:32, //length of single frame of overlay
	rlen:40, 
	statOff:0x2000, //offset of first base pattern
	statMax:192, //maximum number of base patterns
	sEep:eeprom, //eeprom with base patterns on it
	oEep:eeprom, //eeprom with the overlays
	oOff:0x8000, //offset of start of overlays
	oMax:1024, //maximum number of overlays
	oIEE:eeprom, 
	oIOF:0,
	scEE:eeprom, //scene eeprom
	scOF:0x1000, //scene offset - scene length = 64 bytes
	scMX:64      //maximum number of scenes
};
scEE=eeprom;
oEE=eeprom;
sEE=eeprom;

eepromtype={"scene":[scEE,memmap.scOF,64],"overlay":[oEE,memmap.oOff,32],"base":[sEE,memmap.statOff,memmap.slen*4]};

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
leds.lastscene=1;
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
		if (this.aniframe >= this.anilast) {
			this.animode=0;
			this.anilast=0;
			this.aniframe=0;
			leds.aniaddr=0;
			this.overlay.fill(0);
		} else {
            console.log(this.aniaddr+this.map.slen*(this.aniframe));
			this.overlay=oEE.read(this.aniaddr+this.map.slen*(this.aniframe++),this.num*3);
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
	            				t[i]=E.clip(t[i]+(pr&8?s:-1*s),ti[i],ta[i]);
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
				this.ta[3*i+j]=tmax[j];		}
		}
	}
	return 1;
};

leds.load = function (index) {
	var s=this.map.slen;
	var addr=this.map.statOff+(4*index*s);
	if (sEE.read(addr+s-1,1)[0]==255) {
		return 0;
	}
	this.tbuf=sEE.read(addr,this.num*3);
	this.tm=sEE.read((addr+s),this.num*3);
	this.ti=new Int8Array(sEE.read((addr+s*2),this.num*3));
	this.ta=new Int8Array(sEE.read((addr+s*3),this.num*3));
	return 1;
};

leds.del = function (index) {
	var t=new Uint8Array(this.map.slen*4);
	t.fill("\xFF");
	sEE.write(this.map.statOff+(4*index*this.map.slen),t);
	return 1;
};



leds.setAnimate = function (address){
  var addressmod=this.map.oOff+address*this.map.slen;
  leds.anilast=oEE.read(addressmod+30,1)[0];
  leds.aniaddr=addressmod;
  leds.animode=oEE.read(addressmod+31,1)[0];
  //console.log("adr"+addressmod+" anilast:"+leds.anilast+" animode:"+leds.animode);
  return 1;
};

leds.save = function (index) {
	var s=this.map.slen;
	var addr=this.map.statOff+(4*index*s);
	sEE.write(addr,E.toString(this.tbuf)+leds.zz+E.toString(this.tm)+leds.zz+E.toString(this.ti)+leds.zz+E.toString(this.ta)+leds.zz);
	return 1;
};

leds.export = function (type,index) {
  console.log(type);
	try {
		var eep=eepromtype[type][0];
		var off=eepromtype[type][1]+eepromtype[type][2]*index;
      var lenh=(eepromtype[type][2]/2);
      console.log(off);
		var rv= String.fromCharCode.apply(null,(eep.read(off,lenh)));
      rv+= String.fromCharCode.apply(null,(eep.read(off+lenh,lenh)));
      return btoa(rv);
	} catch (err) {
      console.log(err);
		return "";
	}
	
};

leds.import = function (type,index,data) {
	try {
		var eep=eepromtype[type][0];
		var off=eepromtype[type][1]+eepromtype[type][2]*index;
		eep.write(off,E.toUint8Array(atob(data)));
		return 200;
	} catch (err) {
		return 400;
	}
};

leds.setPixel2 = function (x, y, color,mode,maxtwi,mintwi,instant) {
	x*=3;
	for (var i=0;i<3;i++){
		this.tbuf[x+i]=color[i];
      if (instant) {this.buff[x+i]=color[i];}
		this.tbuf[x+i]=color[i];
		this.tm[x+i]=mode[i];
		this.ta[x+i]=maxtwi[i];
		this.ti[x+i]=mintwi[i];
	}
	return 1;
};


leds.setScene = function(id) {
	if (id > this.map.scMX || id <0) { return 0;}
	var adr=this.map.scOF+id*64;
	if (scEE.read(adr,1)[0]==255) { return 0; }
	//now we've passed sanity checks, use the new scene:
	if (this.scenetimer) {clearTimeout(this.scenetimer);this.scenetimer=0;}
	var raw=scEE.read(adr,32);
	this.scene=new Uint16Array(raw.buffer);
	this.lastscene=this.sceneid;
	this.sceneid=id;
    this.load(this.scene[0]);
	leds.scenetimer=setTimeout(this.sceneRand,this.scene[1]*10);
	return 1;
}; 

leds.sceneRand = function () {
  leds.scenetimer=undefined;
  //console.log("scr");
	for (var i=0;i<14;i+=2) {
		if (65535*Math.random() > leds.scene[i+2]) {
            console.log(i);
			leds.sceneEvent(leds.scene[i+3]);
            break;
		}
	}// if we're here, we didn't match anything. 
  if (!leds.scenetimer) {	
    leds.scenetimer=setTimeout(leds.sceneRand,leds.scene[1]*10);
  }
};

leds.sceneEvent = function (event) {
	var t=event&0x3FFF;
	event=event>>14;
	if (event == 0) {
		return this.setAnimate(t);
	} else if (event ==1) {
		return this.setScene(t);
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
};
leds.sceneVect = function (id) {
	var adr=this.map.scOF+this.sceneid*64;
	var z=scEE.read(adr+32+id,2);
	this.sceneEvent(z[1]+(z[0]<<8));
};


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