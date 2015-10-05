#include <avr/sleep.h>
#include <avr/power.h>

#define txpin 4


void setup() {
  
}

void loop() {

}

void doTransmit(int rep) { //rep is the number of repetitions
#ifdef LED5
  digitalWrite(LED5, LED_ON);
#endif
  byte txchecksum = 0;
  for (byte i = 0; i < TXLength - 1; i++) {
    txchecksum = txchecksum ^ txrxbuffer[i];
  }
  if (TXLength == 4) {
    txchecksum = (txchecksum & 0x0F) ^ (txchecksum >> 4) ^ ((txrxbuffer[3] & 0xF0) >> 4);
    txrxbuffer[3] = (txrxbuffer[3] & 0xF0) + (txchecksum & 0x0F);
  } else {
    txrxbuffer[TXLength - 1] = txchecksum;
  }
#ifdef USE_ACK
  lastCmdSent = txrxbuffer[1];
  lastCscSent = txchecksum;
#endif
  for (byte r = 0; r < rep; r++) {
    for (byte j = 0; j <= 2 * txTrainRep; j++) {
      delayMicroseconds(txTrainLen);
      digitalWrite(txpin, j & 1);
    }
    delayMicroseconds(txSyncTime);
    for (byte k = 0; k < TXLength; k++) {
      //send a byte
      for (int m = 7; m >= 0; m--) {
        digitalWrite(txpin, 1);
        if ((txrxbuffer[k] >> m) & 1) {
          delayMicroseconds(txOneLength);
        } else {
          delayMicroseconds(txZeroLength);
        }
        digitalWrite(txpin, 0);
        delayMicroseconds(txLowTime);
      }
      //done with that byte
    }
    //done with sending this packet;
    digitalWrite(txpin, 0); //make sure it's off;
    //interrupts();
    delayMicroseconds(2000); //wait 2ms before doing the next round.
  }
#ifdef USE_ACK
  if (txrxbuffer[1] == 0xE8) {
    SerialCmd.println(F("RX ACK"));
  } else {
#endif
    SerialCmd.println(F("TX OK"));
#ifdef USE_ACK
  }
#endif
  TXLength = 0;
#ifdef LED5
  digitalWrite(LED5, LED_OFF);
#endif
}
