var http = require("http");


function startup() {
  require("http").createServer(onPageRequest).listen(80);
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



function onInit() {
	setTimeout("startup()",5000)
}
