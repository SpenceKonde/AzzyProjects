<?php
$server="192.168.2.14";
$username="admin";
$password="admin";
$targetrelay = $_GET["relay"];
$targetstate = $_GET["set"];
$command = 'http://' . $username . ':' . $password . '@' . $server . '/api/relay/' . $targetrelay . '/' . $targetstate ;
echo $command;
echo file_get_contents($command);
?>
