/*
  Blink
  Turns on an LED on for one second, then off for one second, repeatedly.

  Most Arduinos have an on-board LED you can control. On the Uno and
  Leonardo, it is attached to digital pin 13. If you're unsure what
  pin the on-board LED is connected to on your Arduino model, check
  the documentation at http://www.arduino.cc

  This example code is in the public domain.

  modified 8 May 2014
  by Scott Fitzgerald
 */


// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin 13 as an output.
  pinMode(13, OUTPUT);
  Serial1.begin(9600);
  unsigned long temp=20000;
  //Serial1.println(((temp<<8)*64/11));
  //Serial1.println(((temp*64/11)<<8));
}

// the loop function runs over and over again forever
void loop() {
  digitalWrite(13, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(1000);              // wait for a second
  digitalWrite(13, LOW);    // turn the LED off by making the voltage LOW
  delay(1000);              // wait for a second
  //unsigned long t=micros();
  //int v=digitalRead(2);
  //t=micros()-t;
  //unsigned long a ;
  //a=micros();
  //unsigned long b = (100L *64+v)/(11+v);
  //a=micros()-a;
  Serial1.println(micros());
  Serial1.println(millis());
  //Serial1.println(b);

  
}
