Serial1.setup(9600, {tx:B6,rx:B7});
Serial1.on('data', function (data) { 
  cmd+=data;
  var idx = cmd.indexOf("\r");
  while (idx>=0) { 
    var line = cmd.substr(0,idx);
    cmd = cmd.substr(idx+1);
    processLine(line);
    idx = cmd.indexOf("\r");
  }
});
var cmd="";

function processLine(l) {
  console.log(l)
  if (l.indexOf("$"==0){
    recpack=E.toUint8Array();
  }
}

function sendCmd(dat) {
  var len=dat.length;
  var cChar="";
  if (len==4) {
    cChar="S";
  } else if (len==7){
    cChar="M";
  } else if (len==15){
    cChar="L";
  } else if (len==31){
    cChar="E";
  }
  Serial1.print(cChar+E.toString(dat));
}
