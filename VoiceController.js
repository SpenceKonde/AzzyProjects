systemStatus={
  light:{
    clear:-1,
    red:-1,
    green:-1,
    blue:-1
  },
  temperature:-1,
  pressure: -1,
  RFDevs:[0,0,0]
}

function updateSensors() 
{
  var tColors=tcs.getValue();
  if (tColors.clear >0) {
    systemStatus.light=tColors;
  }
  // handle BMP180
}

var cmd="";
Serial2.on('data', function (data) { 
  cmd+=data;
  var idx = cmd.indexOf("\r");
  while (idx>=0) { 
    var line = cmd.substr(0,idx);
    cmd = cmd.substr(idx+1);
    console.log(cmd);
    handleCommand(cmd);
    idx = cmd.indexOf("\r");
  }
});

function handleCommand(cmd) {
  if (cmd.charAt(0)=='+') {
    processRF(cmd.substr(1));
  } else if (RFCommands[cmd]===undefined) {
    console.log("bad command received: "+cmd);
  } else {
    console.log("parsing command"+cmd);
    eval(RFCommands[cmd]);
  }
}

function processRF(msg) {
  if (RFMessages[msg]!==undefined) {
    console.log("processing known message "+msg);
    eval(RFMessages[msg]);
  } else {
    console.log("received unknown message "+msg);
  }
}

RFCommands = {
  "ERROR":"console.log('ERROR received from AzzyRF');",
  "RX ACK":"console.log('acknowledgement of last message received');"
}
