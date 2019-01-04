<?php 
if ($_GET['index'] > -1 && $_GET['index']<101) {
file_get_contents("http://pong1/load.cmd?" . "index=".$_GET['index']);
file_get_contents("http://pong2/load.cmd?" . "index=".$_GET['index']);
file_get_contents("http://pong3/load.cmd?" . "index=".$_GET['index']);
file_get_contents("http://pong4/load.cmd?" . "index=".$_GET['index']);
file_get_contents("http://pong5/load.cmd?" . "index=".$_GET['index']);
file_get_contents("http://pong6/load.cmd?" . "index=".$_GET['index']);
file_get_contents("http://pong7/load.cmd?" . "index=".$_GET['index']);
}
