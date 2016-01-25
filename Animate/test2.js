


SPI1.setup({sck:14,mosi:13,mode:1,order:"msb",baud:4000000});
I2C1.setup({sck:5,scl:4});

var http = require("http");
var eeprom=require("AT24").connect(I2C1, 128, 512);



// Parameters:
numleds=5;

//global functions
function animate() {
  setTimeout("animate()",20);
  leds.flip();
  leds.dotwinkle();
}



// LEDS
var leds = {};
leds.spi=SPI1;
leds.num=numleds;
leds.fbuf=new Uint8Array(numleds*4);
leds.buff=new Uint8Array(numleds*3);
leds.tbuf=new Uint8Array(numleds*3);
leds.twinkle=new Int8Array(numleds*3);
leds.twimode=new Uint8Array(numleds*3);
leds.twinklemin=new Int8Array(numleds*3);
leds.twinklemax=new Int8Array(numleds*3);
leds.overlay=new Uint8Array(numleds*3);
leds.gdim=new Uint8Array(numleds);
for (var tem=0;tem<numleds;tem++){
	leds.gdim[tem]=31; 
	for (var j=0;j<3;j++){
		leds.twinklemin[tem*3+j]=-10;
		leds.twinklemax[tem*3+j]=10;
	}
}
leds.ison=1;
leds.dotwinkle = function () {
	for (var i=0;i<numleds*3;i++){
		if (this.buff[i] != this.tbuf[i]){ //fade
          		this.buff[i]=this.buff[i]+(this.tbuf[i]>this.buff[i]?1:-1);
		}
		var mode=this.twimode[i]
		var mo=mode&0x0F;
		var pr=mode>>4;
		if (mode==1) { //0x01 - high nybble is chance to change, from 0 (1/16) to 15 (16/16 chance to change)
			var n=Math.random();
			var th=(pr+1)/32;
      			this.twinkle[i]=E.clip(this.twinkle[i]+(n<(0.5+th)?(n>(0.5-th)?0:-1):1),this.twinklemin[i],this.twinklemax[i]);
		} else if (mode==2) { //fade/pulse. 
			var d=pr-8;
			d=(d==0?d+1;-9-d); //0b1000 = +1, 0b1001 = +2, 0b0000 = -1, 0b0001 = -2
			this.twinkle[i]=E.clip(this.twinkle[i]+d,this.twinklemin[i],this.twinklemax[i]);
			if (this.twinkle[i] == this.twinklemin[i] || this.twinkle[i] == this.twinklemax[i]) {
				this.twimode[i]=mode^128;
			}
		}

	}
};
leds.pr = function (p,n) {
	
}
leds.setAll= function (color,tmode,tmax,tmin) {
	for (var i=0;i<this.num;i++) {
		for (j=0;j<3;j++){
			this.twinkle[3*i+j]=0;
			this.base=color[j];
			if (tmode) {
				this.twimode[3*i+j]=tmode[j];
				this.twinklemin[3*i+j]=tmin[j];
				this.twinklemax[3*i+j]=tmax[j];
			}
		}
	}
}
leds.loadBase = function (eep,addr,len) {
	len=len?this.num; 
	this.buff=eep.read(addr,this.num*3);
	this.twinkle=new Int8Array(this.num*3);
	this.twimode=new Uint8Array(eep.read((addr+len*3),this.num*3))
	this.twinklemin=new Int8Array(eep.read((addr+len*6),this.num*3));
	this.twinklemax=new Int8Array(eep.read((addr+len*9),this.num*3));
}

leds.saveBase = function (eep,addr,base,twim,mint,maxt) {
	var n=base.length;
	eep.write(addr,base);
	eep.write(addr+n*3,twim);
	eep.write(addr+n*6,mint);
	eep.write(addr+n*9,maxt);
}


leds.setPixel = function (x, y, color) {
	this.tbuf[x*3]=color[0];
	this.tbuf[x*3+1]=color[1];
	this.tbuf[x*3+2]=color[2];
};

leds.setPixel2 = function (x, y, color,mintwi,maxtwi) {
	this.tbuf[x*3]=color[0];
	this.tbuf[x*3+1]=color[1];
	this.tbuf[x*3+2]=color[2];
	this.twinklemax[x*3]=maxtwi[0];
	this.twinklemax[x*3+1]=maxtwi[1];
	this.twinklemax[x*3+2]=maxtwi[2];
	this.twinklemin[x*3]=mintwi[0];
	this.twinklemin[x*3+1]=mintwi[1];
	this.twinklemin[x*3+2]=mintwi[2];
};

leds.flip = function () {
	var tclb=new Uint8ClampedArray(this.num*3);
	for (var i=0;i<(this.num*3);i++) {
      tclb[i]=leds.buff[i]+(leds.buff[i]?leds.twinkle[i]:0)+leds.overlay[i];
	}
  //console.log(tclb);
	for (var i=0;i<numleds;i++) {
		//var x = new Uint16Array([tclb[i*3]<<5,tclb[(i*3)+1]<<5,tclb[(i*3)+2]<<5]);
		var x = new Uint16Array([gtab[tclb[i*3]],gtab[tclb[(i*3)+1]],gtab[tclb[(i*3)+2]]]);
		
		var ma = Math.max(x[0],x[1],x[2]);
		var mi = Math.min(x[0],x[1],x[2]);
		var mult=1;
		if (this.gdim[i] == 31) {
			if (ma <700 && mi < 200) {
				this.gdim[i]=7;
				mult=4.4;

			} else if (ma <1700 && mi < 500) {
				this.gdim[i]=15;
				mult=2.06;
			} 
		} else if (this.gdim[i] == 15) {
			if (ma <700 && mi < 200) {
				this.gdim[i]=7;
				mult=4.4;
			} else if (ma >1980) {
				this.gdim[i]=31;
			} else {
				mult=2.06;
			} 
		} else if (this.gdim[i] == 7) {
			if (ma > 1980 ) {
				this.gdim[i]=31;
			} else if (ma >924) {
				this.gdim[i]=15;
				mult=2.06;
			} else {
				mult=4.4;
			}
		} 
		x[0]=x[0]*mult;
		x[1]=x[1]*mult;
		x[2]=x[2]*mult;

		this.fbuf[i*4]=(this.ison?(this.gdim[i]|224):224);
		this.fbuf[1+i*4]=(x[0]==0?0:Math.max(x[0]>>4,1));
		this.fbuf[2+i*4]=(x[1]==0?0:Math.max(x[1]>>4,1));
		this.fbuf[3+i*4]=(x[2]==0?0:Math.max(x[2]>>4,1));

		if (i==-1) {

      console.log(x);
      console.log(mult);
      console.log(this.fbuf[i*4]+" "+this.fbuf[1+i*4]+" "+this.fbuf[2+i*4]+" "+this.fbuf[3+i*4]);
		}
	}

	this.spi.send([0,0,0,0]);
	this.spi.send(this.fbuf);
    this.spi.send([0xFF,0xFF,0xFF,0xFF]);
};

leds.gtab=new Uint16Array(256);
leds.gtab=new Uint16Array([0,1,3,5,8,12,15,19,23,28,33,37,43,48,54,59,65,72,78,85,91,98,105,112,120,127,135,143,151,159,167,175,184,193,201,210,219,228,238,247,257,266,276,286,296,306,316,326,337,347,358,369,380,391,402,413,424,435,447,459,470,482,494,506,518,530,542,554,567,579,592,605,617,630,643,656,669,683,696,709,723,736,750,764,777,791,805,819,833,848,862,876,891,905,920,935,949,964,979,994,1009,1024,1039,1055,1070,1085,1101,1116,1132,1148,1164,1179,1195,1211,1227,1244,1260,1276,1292,1309,1325,1342,1359,1375,1392,1409,1426,1443,1460,1477,1494,1511,1528,1546,1563,1581,1598,1616,1634,1651,1669,1687,1705,1723,1741,1759,1777,1796,1814,1832,1851,1869,1888,1906,1925,1944,1963,1981,2000,2019,2038,2057,2077,2096,2115,2134,2154,2173,2193,2212,2232,2252,2271,2291,2311,2331,2351,2371,2391,2411,2431,2451,2472,2492,2512,2533,2553,2574,2595,2615,2636,2657,2678,2699,2720,2741,2762,2783,2804,2825,2846,2868,2889,2911,2932,2954,2975,2997,3019,3040,3062,3084,3106,3128,3150,3172,3194,3216,3238,3261,3283,3305,3328,3350,3373,3395,3418,3441,3463,3486,3509,3532,3555,3578,3601,3624,3647,3670,3693,3716,3740,3763,3786,3810,3833,3857,3881,3904,3928,3952,3975,3999,4023,4047,4071,4095]);

//setBusyIndicator(LED1);
leds.setPixel(0,0,[255,255,0]);
