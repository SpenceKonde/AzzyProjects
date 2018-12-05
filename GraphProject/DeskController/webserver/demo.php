<!DOCTYPE html>

<html>
<head>
<script type="text/javascript">
	var fargostatus
	function update()
	{

	}
	function getstatus()
	{
	    var xmlHttp = null;
	    var theUrl = 'fargostatus.php'
	    xmlHttp = new XMLHttpRequest();
	    xmlHttp.onreadystatechange = function() {
	    	if (xmlHttp.readyState === 4){
		    	fargostatusnew=JSON.parse(xmlHttp.responseText);
		    	if (typeof(fargostatusnew)=='object') 
		   		{
		    		fargostatus=fargostatusnew
				}
			}
	    };
	    xmlHttp.open( "GET", theUrl, true );
	    xmlHttp.send( null );
	}
	function sendcommand(relay,state)
	{
		var xmlHttp = null;
	    var theUrl = 'relaycommand.php?'
	    var relaystr=relay
	    var statestr
		if (state=="off" || state=="on")
		{
			statestr=state
		}
		else if (state)
		{
			statestr="on"
		}
		else 
		{
			statestr="off"
		}
		theUrl=theUrl+"relay="+relaystr+"&set="+statestr
	    xmlHttp = new XMLHttpRequest();
	    xmlHttp.open( "GET", theUrl, false );
	    xmlHttp.send( null );
	}
	getstatus();
	setInterval("getstatus()",2000)
	function alertstatus(relay)
	{
		var relaystats = fargostatus.relaystate[parseInt(relay)-1]
		alert('Relay number '+relay+'\n status '+relaystats.state+' rdtiev '+relaystats.rdtiev)
	}

	function alertfargo()
	{
		var outstring="Fargo Status \n Operating temperature "+fargostatus.fargostatus.temperature+"C, supply voltage: "+fargostatus.fargostatus.volts+"V";
		alert(outstring);
	}
	
</script>

</head>
<body>

	<select id="relay">
		<option value="1">1</option>
		<option value="2">2</option>
		<option value="3">3</option>
		<option value="4">4</option>
		<option value="5">5</option>
		<option value="6">6</option>
		<option value="7">7</option>
		<option value="8">8</option>
	</select>
	<select id="set">
		<option value="on">On</option>
		<option value="off">Off</option>
		<option value="0">0</option>
		<option value="1">1</option>
	</select>
	<button onclick='sendcommand(document.getElementById("relay").value,document.getElementById("set").value)'>SET</button>
	<button onclick='alertstatus(document.getElementById("relay").value)'<>GET</button>
	<button onclick='alertfargo()'>STATUS</button>

</body>
</html>
