var http = require("http");
var eeprom=require("AT24").connect(I2C1, 128, 512);

setBusyIndicator(2);
require("ESP8266").logDebug(0);
require("ESP8266").setLog(0);

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
function onInit() {
	require("http").createServer(onPageRequest).listen(80);
}

function handleCmd(pn,q,r) {
	try {
		if ((q.index!=undefined)&&( q.index>memmap.statMax || q.index < 0)) {
		r.write("MAX INDEX: "+memmap.statMax);
		return 400;
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
  		} else if (pn=="/setScene.cmd") {
    		return leds.setScene(q.scene)?200:404;
  		}else if (pn=="/event.cmd") {
    		return leds.sceneVect(eval(q.vector))?200:500;
  		}else if (pn=="/setAll.cmd") {
    		return leds.setAll(eval(q.color),eval(q.mode),eval(q.max),eval(q.min))?200:0;
  		}else if (pn=="/setPixel.cmd") {
    		return leds.setPixel2(q.led,0,eval(q.color),eval(q.mode),eval(q.max),eval(q.min))?200:0;
  		} else {
  			return 404;
		}
	} catch (err) {
		//r.write(err);
		return 0;
	}
}