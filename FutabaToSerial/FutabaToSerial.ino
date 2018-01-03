#define PORTD_STANDBY 0b01000100
#define PORTD_WRITE 0b00000100
#define PORTD_RESET 0b01000000

void setup() {
  // put your setup code here, to run once:
  PORTB = 0xFF;
  PORTD = 0b01000100 ; Write Strobe = PD6, Reset = PD2
  DDRD=0b01000100;
  DDRB=0xFF;
  Serial.begin(19200);
}

void loop() {
  static byte nullcount=0;
  // put your main code here, to run repeatedly:
  if (Serial.available()) {
    byte recv=Serial.read();
    if (recv==0) {
      nullcount++;
      if (nullcount >=3) {
        doReset();
        nullcount=0;
      }
    } else {
      writeByte(recv);
    }
  }
}

void writeByte(byte data) {
  PORTD=PORTD_WRITE;
  delayMicroseconds(100);
  PORTB=data;
  delayMicroseconds(100);
  PORTD=PORTD_STANDBY;
  delayMicroseconds(200);
}
void doReset() {
  PORTD=PORTD_RESET;
  delayMicroseconds(2500);
  PORTD=PORTD_STANDBY;
  delayMicroseconds(2500);
}
