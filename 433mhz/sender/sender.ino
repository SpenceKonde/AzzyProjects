#include <avr/sleep.h>
#include <avr/power.h>

#define txpin 4
#define myid 0
#define mytarget 10
#define RX_MAX_LEN 32
#include <EEPROM.h>



unsigned char txrxbuffer[RX_MAX_LEN >> 3];
byte btnst=0;

void setup() {
  
}

void loop() {
  btnst=(~PINB)&0x0F;
  
  if (btnst) {
    if (btnst & 1 ) {
      preparePayload(1);
    } else if (btnst & 2) {
      preparePayload(2);
    } else if (btnst & 4) {
      preparePayload(3);
    } else if (btnst & 8) {
      preparePayload(4);
    } else {
      prepareErrorPayload(btnst); //error
    }
  }
}

void preparePayload(btn) {
  byte plen = txrxbuffer[0] >> 6;
  plen = 4 << plen;
  txrxbuffer[0] = mytarget;
  txrxbuffer[1] = 0x55;
  txrxbuffer[2] = ((myid & 0xF0)<<4)+btn;
  txrxbuffer[3] = 0x50;
  TXLength = 4;
}

void prepareErrorPayload(state) {
  byte plen = txrxbuffer[0] >> 6;
  plen = 4 << plen;
  txrxbuffer[0] = mytarget;
  txrxbuffer[1] = 0x55;
  txrxbuffer[2] = ((myid & 0xF0)<<4);
  txrxbuffer[3] = 0xA0;
  TXLength = 4;
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
