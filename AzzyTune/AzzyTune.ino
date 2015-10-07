// Crude tuning using blink from a properly tuned board.


#include <EEPROM.h>
#define EEEPADDRESS 3
#define BLINK_IN_PIN_REG PINB
#define BLINK_IN_BIT 1<<0
#define LED_DONE 2

byte OKCount = 0;

byte on = 0;
unsigned long mstart;
void setup() {
  Serial.begin(9600);
  BLINK_IN_PIN_REG=BLINK_IN_BIT;
  if (EEPROM.read(EEEPADDRESS) != 255) {
    OSCCAL=EEPROM.read(EEEPADDRESS);
    while (1) {
      Serial.println("Hello World!");
      Serial.println(OSCCAL);
      delay(1000);
    }
  }
}

void loop() {
  if (!on) {
    if (BLINK_IN_PIN_REG & BLINK_IN_BIT) {
      mstart = millis();
      on = 1;
    }
  } else {
    if (!(BLINK_IN_PIN_REG & BLINK_IN_BIT)) {
      unsigned long mcount = millis() - mstart;
      on = 0;
      if (process(mcount)) {
        //digitalWrite(LED_DONE, 1);
        EEPROM.write(0, OSCCAL);
        while (1) {
        }; //all done.
      }
      delay(100); //let new clock stabilize
    }
  }
}


byte process(unsigned long length) {
  if (length > 1010) {
    OSCCAL++;
    OKCount = 0;
  } else if (length < 990) {
    OSCCAL--;
    OKCount = 0;
  } else {
    OKCount++;
    if (OKCount > 10) return 1;
  }
  return 0;
}
