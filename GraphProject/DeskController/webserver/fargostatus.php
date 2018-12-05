<?php
$server="192.168.2.14";
$username="admin";
$password="admin";


$tjson='{"relaystate":['.PHP_EOL;
$command = 'http://' . $username . ':' . $password . '@' . $server . '/p/relayStatus.xml' ;
$response= file_get_contents($command);
$relayxml=simplexml_load_string($response);
$relaystates= $relayxml->state;
$relayrdtiev = $relayxml->rdtiev;
$relaystatearray = explode(',', $relaystates);
$relayrdtievarray = explode(',', $relayrdtiev);
$relaycount=count($relaystatearray);
for($rlynum=0; $rlynum < $relaycount; $rlynum++) //loop over values
{
	$tjson .= '{"state":'.$relaystatearray[$rlynum].',"rdtiev":'.$relayrdtievarray[$rlynum].'},'.PHP_EOL;
}
$tjson=chop($tjson,",".PHP_EOL).PHP_EOL.'],"fargostatus":{'.PHP_EOL;

$command = 'http://' . $username . ':' . $password . '@' . $server . '/p/tekDate.xml' ; //now we do the same thing again because there's no single xml page that gives all the info we might want.
$response= file_get_contents($command);
$fargoxml=simplexml_load_string($response);
$tjson.='"temperature":'.chop($fargoxml->temperature,"|C").', "volts":'.chop($fargoxml->volts," VDC").PHP_EOL.'}}';
echo $tjson
?>
	