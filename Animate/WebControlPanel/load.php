<?php 
if ($_GET['index'] > -1 && $_GET['index']<101) {
http_get("http://192.168.2.35/load.cmd?" . $_GET['index']);
http_get("http://192.168.2.36/load.cmd?" . $_GET['index']);
http_get("http://192.168.2.37/load.cmd?" . $_GET['index']);
http_get("http://192.168.2.38/load.cmd?" . $_GET['index']);
http_get("http://192.168.2.39/load.cmd?" . $_GET['index']);
http_get("http://192.168.2.40/load.cmd?" . $_GET['index']);
http_get("http://192.168.2.41/load.cmd?" . $_GET['index']);
}
