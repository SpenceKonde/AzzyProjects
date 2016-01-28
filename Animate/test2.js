


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
  leds.flip();
  leds.dotwinkle();
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

function handlePage(pn,q) {
  if (a.pathname=="/setAll.cmd") {
    //lreq=a.query;
    leds.setAll(eval(a.query.color),eval(a.query.mode),eval(a.query.max),eval(a.query.min));
  } else if (a.pathname=="/setPixel.cmd") {
    leds.setPixel2(a.query.led,0,eval(a.query.color),eval(a.query.mode),eval(a.query.max),eval(a.query.min));
  }	
}


// LEDS
var leds = {};
leds.spi=SPI1;
leds.num=numleds;
leds.afr=0;
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
		var mode=this.twimode[i];
		var mo=mode&0x0F;
		var pr=mode>>4;
		if (mo==1) { //0x01 - high nybble is chance to change, from 0 (1/16) to 15 (16/16 chance to change)
			var n=Math.random();
			var th=(pr+1)/32;
      			this.twinkle[i]=E.clip(this.twinkle[i]+(n<(0.5+th)?(n>(0.5-th)?0:-1):1),this.twinklemin[i],this.twinklemax[i]);
		} else if (mo==2) { //fade/pulse. 
          if (this.afr%((1+pr)&7)==0){
            this.twinkle[i]=E.clip(this.twinkle[i]+(pr&8?1:-1),this.twinklemin[i],this.twinklemax[i]);
			if (this.twinkle[i] == this.twinklemin[i] || this.twinkle[i] == this.twinklemax[i]) {
				this.twimode[i]=mode^128;
			}
          }
		}

	}
  this.afr=this.afr==255?0:this.afr+1;
};

leds.pr = function (p,n) {
	
};
leds.setAll= function (color,tmode,tmax,tmin) {
	for (var i=0;i<this.num;i++) {
		for (j=0;j<3;j++){
			this.twinkle[3*i+j]=0;
			this.tbuf[3*i+j]=color[j];
			if (tmode) {
				this.twimode[3*i+j]=tmode[j];
				this.twinklemin[3*i+j]=tmin[j];
				this.twinklemax[3*i+j]=tmax[j];
			}
		}
	}
};
leds.loadBase = function (eep,addr,len) {
  len=len?len:this.num; 
	this.tbuf=eep.read(addr,this.num*3);
	this.twinkle=new Int8Array(this.num*3);
	this.twimode=new Uint8Array(eep.read((addr+len*3),this.num*3));
	this.twinklemin=new Int8Array(eep.read((addr+len*6),this.num*3));
	this.twinklemax=new Int8Array(eep.read((addr+len*9),this.num*3));
};

leds.saveBase = function (eep,addr,base,twim,mint,maxt) {
	var n=base.length;
	eep.write(addr,base);
	eep.write(addr+n*3,twim);
	eep.write(addr+n*6,mint);
	eep.write(addr+n*9,maxt);
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
	this.twimode[x*3]=mode[0];
	this.twimode[x*3+1]=mode[1];
	this.twimode[x*3+2]=mode[2];
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
			if (ma <390 && mi < 300) {
				this.gdim[i]=3;
				mult=10.33;

			} else if (ma <700 && mi < 500) {
				this.gdim[i]=7;
				mult=4.4;

			} else if (ma <1700 && mi < 1000) {
				this.gdim[i]=15;
				mult=2.06;
			} 
		} else if (this.gdim[i] == 15) {
			if (ma <390 && mi < 300) {
				this.gdim[i]=3;
				mult=10.33;
			} else if (ma <700 && mi < 500) {
				this.gdim[i]=7;
				mult=4.4;
			} else if (ma >1980) {
				this.gdim[i]=31;
			} else {
				mult=2.06;
			} 
		} else if (this.gdim[i] == 7) {
			if (ma <390 && mi < 300) {
				this.gdim[i]=3;
				mult=10.33;
			} else if (ma > 1980 ) {
				this.gdim[i]=31;
			} else if (ma >924) {
				this.gdim[i]=15;
				mult=2.06;
			} else {
				mult=4.4;
			}
		} else if (this.gdim[i] == 3) {
			if (ma > 1980 ) {
				this.gdim[i]=31;
			} else if (ma >924) {
				this.gdim[i]=15;
				mult=2.06;
			} else if (ma>390) {
				this.gdim[i]=7;
				mult=4.4;
			} else {
				mult=10.33;
			}
		} 
		x[0]=x[0]*mult;
		x[1]=x[1]*mult;
		x[2]=x[2]*mult;

		this.fbuf[i*4]=(this.ison?(this.gdim[i]|224):224);
		this.fbuf[1+i*4]=(x[2]==0?0:Math.max(x[2]>>4,1));
		this.fbuf[2+i*4]=(x[1]==0?0:Math.max(x[1]>>4,1));
		this.fbuf[3+i*4]=(x[0]==0?0:Math.max(x[0]>>4,1));

	}

	this.spi.write(0,0,0,0,this.fbuf,0xFF,0xFF,0xFF,0xFF);
};

gtab=new Uint16Array(256);
gtab=new Uint16Array([0,1,2,3,4,5,6,7,8,9,11,13,15,17,19,21,23,25,27,30,33,36,39,42,45,48,51,54,58,62,66,70,74,78,82,86,91,96,101,106,111,116,121,126,132,138,144,150,156,162,168,174,181,188,195,202,209,216,223,230,238,246,254,262,270,278,286,294,303,312,321,330,339,348,357,366,376,386,396,406,416,426,436,446,457,468,479,490,501,512,523,534,546,558,570,582,594,606,618,630,643,656,669,682,695,708,721,734,748,762,776,790,804,818,832,846,861,876,891,906,921,936,951,966,982,998,1014,1030,1046,1062,1078,1094,1111,1128,1145,1162,1179,1196,1213,1230,1248,1266,1284,1302,1320,1338,1356,1374,1393,1412,1431,1450,1469,1488,1507,1526,1546,1566,1586,1606,1626,1646,1666,1686,1707,1728,1749,1770,1791,1812,1833,1854,1876,1898,1920,1942,1964,1986,2008,2030,2053,2076,2099,2122,2145,2168,2191,2214,2238,2262,2286,2310,2334,2358,2382,2406,2431,2456,2481,2506,2531,2556,2581,2606,2631,2657,2683,2709,2735,2761,2787,2813,2839,2866,2893,2920,2947,2974,3001,3028,3055,3083,3111,3139,3167,3195,3223,3251,3279,3308,3337,3366,3395,3424,3453,3482,3511,3541,3571,3601,3631,3661,3691,3721,3751,3782,3813,3844,3875,3906,3937,3968,3999,4031,4063,4095]);


//setBusyIndicator(LED1);
leds.setPixel(0,0,[0,255,255]);
gtab=new Uint16Array(256);
gtab=new Uint16Array([0,1,3,5,8,12,15,19,23,28,33,37,43,48,54,59,65,72,78,85,91,98,105,112,120,127,135,143,151,159,167,175,184,193,201,210,219,228,238,247,257,266,276,286,296,306,316,326,337,347,358,369,380,391,402,413,424,435,447,459,470,482,494,506,518,530,542,554,567,579,592,605,617,630,643,656,669,683,696,709,723,736,750,764,777,791,805,819,833,848,862,876,891,905,920,935,949,964,979,994,1009,1024,1039,1055,1070,1085,1101,1116,1132,1148,1164,1179,1195,1211,1227,1244,1260,1276,1292,1309,1325,1342,1359,1375,1392,1409,1426,1443,1460,1477,1494,1511,1528,1546,1563,1581,1598,1616,1634,1651,1669,1687,1705,1723,1741,1759,1777,1796,1814,1832,1851,1869,1888,1906,1925,1944,1963,1981,2000,2019,2038,2057,2077,2096,2115,2134,2154,2173,2193,2212,2232,2252,2271,2291,2311,2331,2351,2371,2391,2411,2431,2451,2472,2492,2512,2533,2553,2574,2595,2615,2636,2657,2678,2699,2720,2741,2762,2783,2804,2825,2846,2868,2889,2911,2932,2954,2975,2997,3019,3040,3062,3084,3106,3128,3150,3172,3194,3216,3238,3261,3283,3305,3328,3350,3373,3395,3418,3441,3463,3486,3509,3532,3555,3578,3601,3624,3647,3670,3693,3716,3740,3763,3786,3810,3833,3857,3881,3904,3928,3952,3975,3999,4023,4047,4071,4095]);

//setBusyIndicator(LED1);
leds.setPixel(0,0,[0,255,255]);
