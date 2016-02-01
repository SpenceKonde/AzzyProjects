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
