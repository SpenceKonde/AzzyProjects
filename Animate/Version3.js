


SPI1.setup({sck:14,mosi:13,mode:1,order:"msb",baud:4000000});
I2C1.setup({scl:5,sda:4});

var http = require("http");
var eeprom=require("AT24").connect(I2C1, 32, 32);

setBusyIndicator(2);
require("ESP8266").logDebug(0);
require("ESP8266").setLog(0);


// Parameters:
numleds=5;

//global functions
function animate() {
  setTimeout("animate()",20);
  //var x=getTime();
  leds.flip();
  leds.dotwinkle();
  //console.log(getTime()-x);
}


// Network

function onPageRequest(req, res) {
  var a = url.parse(req.url, true);
  if (a.pathname.split(".")[1]=="cmd"){
  	if (handleCmd(a.pathname,a.query)) {
  		res.writeHead(200,{'Access-Control-Allow-Origin':'*'});
  		res.end("OK");
  	} else {
  		res.writeHead(400,{'Access-Control-Allow-Origin':'*'});
  		res.end("ERROR");
  	}
  } else {
	res.writeHead(404);
	res.end("ERROR");	
  }
}
require("http").createServer(onPageRequest).listen(80);

function handleCmd(pn,q) {
  if (pn=="/setAll.cmd") {
    //lreq=a.query;
    leds.setAll(eval(q.color),eval(q.mode),eval(q.max),eval(q.min));
    return 1;
  } else if (pn=="/setPixel.cmd") {
    leds.setPixel2(q.led,0,eval(q.color),eval(q.mode),eval(q.max),eval(q.min));
    return 1;
  }	
}


// LEDS
gtab=new Uint16Array(256);
gtab=new Uint16Array([0,1,2,3,4,5,6,7,8,9,11,13,15,17,19,21,23,25,27,30,33,36,39,42,45,48,51,54,58,62,66,70,74,78,82,86,91,96,101,106,111,116,121,126,132,138,144,150,156,162,168,174,181,188,195,202,209,216,223,230,238,246,254,262,270,278,286,294,303,312,321,330,339,348,357,366,376,386,396,406,416,426,436,446,457,468,479,490,501,512,523,534,546,558,570,582,594,606,618,630,643,656,669,682,695,708,721,734,748,762,776,790,804,818,832,846,861,876,891,906,921,936,951,966,982,998,1014,1030,1046,1062,1078,1094,1111,1128,1145,1162,1179,1196,1213,1230,1248,1266,1284,1302,1320,1338,1356,1374,1393,1412,1431,1450,1469,1488,1507,1526,1546,1566,1586,1606,1626,1646,1666,1686,1707,1728,1749,1770,1791,1812,1833,1854,1876,1898,1920,1942,1964,1986,2008,2030,2053,2076,2099,2122,2145,2168,2191,2214,2238,2262,2286,2310,2334,2358,2382,2406,2431,2456,2481,2506,2531,2556,2581,2606,2631,2657,2683,2709,2735,2761,2787,2813,2839,2866,2893,2920,2947,2974,3001,3028,3055,3083,3111,3139,3167,3195,3223,3251,3279,3308,3337,3366,3395,3424,3453,3482,3511,3541,3571,3601,3631,3661,3691,3721,3751,3782,3813,3844,3875,3906,3937,3968,3999,4031,4063,4095]);
var leds = {};
leds.spi=SPI1;
leds.num=numleds;
leds.afr=0;
leds.fbuf=new Uint8Array(numleds*4);
leds.buff=new Uint8Array(numleds*3);
leds.tbuf=new Uint8Array(numleds*3);
leds.t=new Int8Array(numleds*3);
leds.tm=new Uint8Array(numleds*3);
leds.ti=new Int8Array(numleds*3);
leds.ta=new Int8Array(numleds*3);
leds.overlay=new Uint8Array(numleds*3);
leds.tclb=new Uint8ClampedArray(numleds*3);
for (var tem=0;tem<numleds;tem++){
	//leds.gdim[tem]=31; 
	for (var j=0;j<3;j++){
		leds.ti[tem*3+j]=-10;
		leds.ta[tem*3+j]=10;
	}
}
leds.ison=1;
leds.animode=0;
leds.aniframe=0;
leds.anilast=0;

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
			this.overlay=new Uint8Array(this.num*3);
		} else {
			this.overlay=this.animation[this.aniframe++];
		}
	}
	for (var i=0;i<this.num*3;i++){
		var c=b[i]
		//if (c != z[i]){
		//if (b[i] != z[i]){ //fade
          		//b[i]=b[i]+(z[i]>b[i]?1:-1); //11ms
          		//b[i]=c+(z[i]>c?1:-1); 
          		//b[i]+=(z[i]>c?1:-1); 
          		 
		//}
		b[i]+=E.clip(z[i]-c,-1,1));
		//b[i]+=E.clip(z[i]-b[i],-1,1));
		var mode=tm[i];
		var mo=mode&0x0F;
		var pr=mode>>4;
		if (mo==1) { //0x01 - high nybble is chance to change, from 0 (1/16) to 15 (16/16 chance to change)
			var n=Math.random(); //3ms
			var th=(pr+1)/32;
      			if (n<0.5+th){
      				if(n<=(0.5-th) && t[i]>ta[i]){t[i]--;}
      			} else {
      				if (t[i]<ta[i]){t[i]++;}
      			}
		} else if (mo==2) { //fade/pulse. 
          		if (this.afr%((1+pr)&7)==0){
            			//t[i]=t[i]+(pr&8?1:-1);
            			t[i]+=(pr&8?1:-1);
				if (t[i] == ti[i] || t[i] == ta[i]) {
					tm[i]=mode^128;
				}
        		}
		}
		//leds.tclb[i]=b[i]+(b[i]?t[i]:0)+o[i]; //11ms
		leds.tclb[i]=c+(c?t[i]:0)+o[i];
	}
	this.afr=this.afr==255?0:this.afr+1;
};

leds.setAll= function (color,tmode,tmax,tmin) {
	for (var i=0;i<this.num;i++) {
		for (j=0;j<3;j++){
			this.t[3*i+j]=0;
			this.tbuf[3*i+j]=color[j];
			if (tmode) {
				this.tm[3*i+j]=tmode[j];
				this.ti[3*i+j]=tmin[j];
				this.ta[3*i+j]=tmax[j];
			}
		}
	}
};
leds.loadBase = function (eep,addr,len) {
  len=len?len:this.num; 
	this.tbuf=eep.read(addr,this.num*3);
	this.t=new Int8Array(this.num*3);
	this.tm=new Uint8Array(eep.read((addr+len*3),this.num*3));
	this.ti=new Int8Array(eep.read((addr+len*6),this.num*3));
	this.ta=new Int8Array(eep.read((addr+len*9),this.num*3));
};

leds.saveBase = function (eep,addr,len) {
	
	eep.write(addr,this.tbuf);
	eep.write(addr+len*3,this.tm);
	eep.write(addr+len*6,this.ti);
	eep.write(addr+len*9,this.ta);
};


leds.setPixel = function (x, y, color) {
	this.tbuf[x*3]=color[0];
	this.tbuf[x*3+1]=color[1];
	this.tbuf[x*3+2]=color[2];
};

leds.setPixel2 = function (x, y, color,mode,mintwi,maxtwi) {
	this.tbuf[x*3]=color[0];
	this.tbuf[x*3+1]=color[1];
	this.tbuf[x*3+2]=color[2];
	this.tm[x*3]=mode[0];
	this.tm[x*3+1]=mode[1];
	this.tm[x*3+2]=mode[2];
	this.ta[x*3]=maxtwi[0];
	this.ta[x*3+1]=maxtwi[1];
	this.ta[x*3+2]=maxtwi[2];
	this.ti[x*3]=mintwi[0];
	this.ti[x*3+1]=mintwi[1];
	this.ti[x*3+2]=mintwi[2];
};


leds.flip = function () {
	for (var i=0;i<numleds;i++) {
      var rch=gtab[leds.tclb[i*3]];
		var gch=gtab[leds.tclb[i*3+1]];
		var bch=gtab[leds.tclb[i*3+2]];
		
		var ma = Math.max(rch,gch,bch);
		var mult=1;
        	gdim=31;
		
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
		
		this.fbuf[i*4]=(this.ison?(gdim|224):224);
		this.fbuf[1+i*4]=(bch?Math.max(bch*mult>>4,1):0);
		this.fbuf[2+i*4]=(gch?Math.max(gch*mult>>4,1):0);
		this.fbuf[3+i*4]=(rch?Math.max(rch*mult>>4,1):0);

	}

	this.spi.write(0,0,0,0,this.fbuf,0xFF,0xFF,0xFF,0xFF);
};




setBusyIndicator(2);
leds.setPixel(0,0,[0,255,255]);
