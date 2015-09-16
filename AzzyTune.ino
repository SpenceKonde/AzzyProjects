// Crude tuning using blink from a properly tuned board. 


#include <EEPROM.h>
#define BLINK_IN_PIN_REG PINB
#define BLINK_IN_BIT 1<<0
#define LED_DONE 2

byte on=0;
unsigned long mstart;
void setup() {
byte OKCount=0; 
}

void loop() {
  if (!on) {
    if (BLINK_IN_PIN_REG & BLINK_IN_BIT) {
      mstart=millis();
      on=1;
  } else {
    if (!(BLINK_IN_PIN_REG & BLINK_IN_BIT)) {
      unsigned long mcount=mstart-millis();
      on=0
      if (process(mcount)) {
        digitalWrite(LED_DONE,1);
        EEPROM.write(0,OSCCAL);
        while 1; //all done. 
      }
    }
  }
}
byte process(unsigned long length) {
  if (length > 1010) {
    OSCCAL++;
    OKCount=0;
  } else if (length < 990) {
    OSCCAL--;
    OKCount=0;
  } else {
    OKCount++;
    if (OKCount>10) return 1;
  }
  return 0;
}
