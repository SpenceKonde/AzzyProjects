leds.flip = function () {
	var j=0;
	var i=0;
	while (i<numleds*3) {
      var rch=gtab[leds.tclb[i++]];
		var gch=gtab[leds.tclb[i++]];
		var bch=gtab[leds.tclb[i++]];
		
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
		
		this.fbuf[j++]=(this.ison?(gdim|224):224);
		this.fbuf[j++]=(bch?Math.max((bch*mult)>>4,1):0);
		this.fbuf[j++]=(gch?Math.max((gch*mult)>>4,1):0);
		this.fbuf[j++]=(rch?Math.max((rch*mult)>>4,1):0);

	}

	this.spi.write(0,0,0,0,this.fbuf,0xFF,0xFF,0xFF,0xFF);
};


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
		if (b[i] != z[i]){ //fade
          		b[i]=b[i]+(z[i]>b[i]?1:-1);
		}
		var mode=tm[i];
		var mo=mode&0x0F;
		var pr=mode>>4;
		if (mo==1) { //0x01 - high nybble is chance to change, from 0 (1/16) to 15 (16/16 chance to change)
			var n=Math.random();
			var th=(pr+1)/32;
      			t[i]=E.clip(t[i]+(n<(0.5+th)?(n>(0.5-th)?0:-1):1),ti[i],ta[i]);
		} else if (mo==2) { //fade/pulse. 
          		if (this.afr%((1+pr)&7)==0){
            			t[i]=t[i]+(pr&8?1:-1);
				if (t[i] == ti[i] || t[i] == ta[i]) {
					tm[i]=mode^128;
				}
        		}
		}
		leds.tclb[i]=b[i]+(b[i]?t[i]:0)+o[i];
	}
	this.afr=this.afr==255?0:this.afr+1;
};
