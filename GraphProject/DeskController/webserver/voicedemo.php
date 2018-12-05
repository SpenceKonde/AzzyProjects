

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>title</title>

    http://music/relaycommand.php?relay=1&set=on
    
<script src="./annyang.min.js"></script>
<script>
if (annyang) {
  // Let's define a command.
  var commands = {
    'hello': function() { alert('Hello world!'); },
    'color on': function() {var xmlhttp=new XMLHttpRequest(); xmlhttp.open("GET","http://music/relaycommand.php?relay=1&set=on",false); xmlhttp.send(); },
    'color off': function() {var xmlhttp=new XMLHttpRequest(); xmlhttp.open("GET","http://music/relaycommand.php?relay=1&set=off",false); xmlhttp.send();}
  };

  // Add our commands to annyang
  annyang.addCommands(commands);

  // Start listening.
  annyang.start();
}
</script>
  </head>
  <body>
    <!-- page content -->
  </body>
</html>