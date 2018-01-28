#define PORTD_STANDBY 0b01000100
#define PORTD_WRITE 0b00000100
#define PORTD_RESET 0b01000000

//Purpose: This uses an attiny4313 or 2313 to control a Futaba display like the NA202SD08FA, which takes data over an 8-bit parallel databus with a write latch and reset pin - based on serial (UART) data. 
//PB0~PB7 go to D0~D7 on the display, PD6 goes to Write Latch, PB2 to Reset (not used). 
//Connect to serial port at 19200 baud. All characters are passed through to the display, including control characters. 
//See datasheet for list of control characters and what they do. 
// By Spence Konde, 2017. 

void setup() {
  // put your setup code here, to run once:
  PORTB = 0xFF;
  PORTD = 0b01000100 ; //Write Strobe = PD6, Reset = PD2
  DDRD=0b01000100;
  DDRB=0xFF;
  Serial.begin(19200);
 // delay();
  delay(1000);
  writeByte(0x15);
  writeByte(0x0E);
}

void loop() {
  static byte nullcount=0;
  // put your main code here, to run repeatedly:
  if (Serial.available()) {
    byte recv=Serial.read();
      writeByte(recv);
  }
}

void writeByte(byte data) {
  PORTD=PORTD_WRITE;
  delayMicroseconds(100);
  PORTB=data;
  delayMicroseconds(150);
  PORTD=PORTD_STANDBY;
  delayMicroseconds(200);
  PORTB=0xFF;
}
