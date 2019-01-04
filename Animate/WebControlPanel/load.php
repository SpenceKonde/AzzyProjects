<?php 
if ($_GET['index'] > -1 && $_GET['index']<101) {
http_get("http://pong1/load.cmd?" . $_GET['index']);
http_get("http://pong2/load.cmd?" . $_GET['index']);
http_get("http://pong3/load.cmd?" . $_GET['index']);
http_get("http://pong4/load.cmd?" . $_GET['index']);
http_get("http://pong5/load.cmd?" . $_GET['index']);
http_get("http://pong6/load.cmd?" . $_GET['index']);
http_get("http://pong7/load.cmd?" . $_GET['index']);
}
