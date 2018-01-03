void setup() {
  // put your setup code here, to run once:
  PORTB = 0xFF;
  PORTD = 0b01000100 ; Write Strobe = PD6, Reset = PD2
  DDRD=0b01000100;
  DDRB=0xFF;
  Serial.begin();
}

void loop() {
  // put your main code here, to run repeatedly:
  if (Serial.available()) {
    byte recv=Serial.read();
    
  }
}
