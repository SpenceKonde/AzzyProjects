volatile byte edge = 0;
volatile byte receiving = 0;
volatile byte data[32];
byte recvMessage[32];
volatile byte bitnum = 0;
volatile unsigned int lastTime = 0;
volatile byte seenStart = 0;
volatile byte gotMessage = 0;
volatile byte dataIn = 0;
volatile byte pktLength = 31;

volatile unsigned int durationerr = 0;

#define TX_PIN_STATE (PINB&1)

// Version 2.2
const unsigned int rxSyncMin  = 1750 * 2;
const unsigned int rxSyncMax  = 2250 * 2;
const unsigned int rxZeroMin  = 100 * 2;
const unsigned int rxZeroMax  = 390 * 2;
const unsigned int rxOneMin  = 410 * 2;
const unsigned int rxOneMax  = 700 * 2;
const unsigned int rxLowMax  = 600 * 2;
const unsigned int txOneLength  = 500 * 2;
const unsigned int txZeroLength  = 300 * 2;
const unsigned int txLowTime  = 400 * 2;
const unsigned int txSyncTime  = 2000 * 2;
const unsigned int txTrainLen  = 200 * 2;
byte txTrainRep  = 30;
unsigned long lastPacketSig;
unsigned long lastPacketTime;
unsigned long commandForgetTime = 5000;
byte MyAddress = 0;

#define SERIAL_CMD Serial
#define SERIAL_DBG Serial


void setup() {
  // put your setup code here, to run once:
  TCCR1A = 0;
  TCCR1B = 0;
  TIFR1 = bit (ICF1) | bit (TOV1);  // clear flags so we don't get a bogus interrupt
  TCNT1 = 0;          // Counter to zero
  TIMSK1 = 1 << ICIE1; // interrupt on Timer 1 input capture
  // start Timer 1, prescalar of 8, edge select on falling edge
  TCCR1B =  1 << CS11 | 1 << ICNC1; //prescalar 8, noise cancler active
  //ready to rock and roll
  Serial.begin(115200);
}

void loop() {
  // put your main code here, to run repeatedly:
  byte rlen = handleReceive();
  if (rlen) {
    outputPacket(rlen);
  }
}

void outputPacket(byte rlen) {
  byte vers = (rlen & 196) >> 6;
  rlen &= 0x3F;
  if (vers==1){
    SERIAL_CMD.print('+');
  } else {
    SERIAL_CMD.print('=');
  }
  for (byte i = 0; i < (rlen - 1); i++) {
    if (rlen==4&&i==3){
      showHex(recvMessage[3]>>4,1);
    } else {
      showHex(recvMessage[i],1);
    }
  }
  SERIAL_CMD.println();
}

void showHex (const byte b, const byte c) {
  // try to avoid using sprintf
  char buf [3] = { ((b >> 4) & 0x0F) | '0', (b & 0x0F) | '0', 0};
  if (buf [0] > '9')
    buf [0] += 7;
  if (buf [1] > '9')
    buf [1] += 7;

  if (c) {
    SERIAL_CMD.print(buf);
  } else {
#ifdef SERIAL_DBG
    SERIAL_DBG.print(buf);
#endif
  }
}

byte handleReceive() {
  if (gotMessage) {
    byte vers = checkCSC(); //checkCSC() gives 0 on failed CSC, 1 on v1 structure (ACD...), 2 on v2 structure (DSCD...)
    if (!vers) { //if vers=0, unknown format ot bad CSC
      resetReceive();
      return 0;
    }
    if (!isForMe()) { //matches on MyAddress==0, destination address==0, destination address==MyAddress.
      resetReceive();
      return 0;
    }
    if (lastPacketSig == getPacketSig() && lastPacketTime) {
      resetReceive();
      return 0;
    }
    lastPacketSig = getPacketSig();
    lastPacketTime = millis();
    byte rlen = (bitnum >> 3 + 1) & ((vers - 1) << 6);
                memcpy(recvMessage, data, 32);
    resetReceive();
    return rlen;
  } else {
    if (lastPacketTime && (millis() - lastPacketTime > commandForgetTime)) {
      lastPacketTime = 0;
      lastPacketSig = 0;
    }
  }
}

void resetReceive() {

  bitnum = 0;
  memset(data, 0, 32);
  gotMessage = 0;
  TIMSK1 = 1 << ICIE1;
  return;
}

byte checkCSC() {
  byte rxchecksum = 0;
  byte rxchecksum2 = 0;
  byte rxc2;
  for (byte i = 0; i < bitnum >> 3; i++) {
    rxchecksum = rxchecksum ^ data[i];
    rxc2 = rxchecksum2 & 128 ? 1 : 0;
    rxchecksum2 = (rxchecksum2 << 1 + rxc2)^data[i];
  }
  if (bitnum >> 3 == 3) {
    rxchecksum = (rxchecksum & 0x0F) ^ (rxchecksum >> 4) ^ ((data[3] & 0xF0) >> 4);
    rxchecksum2 = (rxchecksum2 & 0x0F) ^ (rxchecksum2 >> 4) ^ ((data[3] & 0xF0) >> 4);
    if (rxchecksum == rxchecksum2)rxchecksum2++;
    return (data[3] & 0x0F) == rxchecksum ? 1 : ((data[3] & 0x0F) == rxchecksum2 ) ? 2 : 0;
  } else {
    if (rxchecksum == rxchecksum2)rxchecksum2++;
    return ((data[bitnum >> 3] == rxchecksum) ? 1 : ((data[bitnum >> 3] == rxchecksum2 ) ? 2 : 0));
  }
}

byte isForMe() {
  if ((data[0] & 0x3F) == MyAddress || MyAddress == 0 || (data[0] & 0x3F) == 0) {
    return 1;
  }
  return 0;
}

unsigned long getPacketSig() {
  byte len = bitnum >> 3;
  unsigned long lastpacketsig;
  for (byte i = (len == 3 ? 0 : 1); i < (len == 3 ? 3 : 4); i++) {
    lastpacketsig += data[i];
    lastpacketsig = lastpacketsig << 8;
  }
  lastpacketsig += data[len];
  return lastpacketsig;
}

ISR (TIMER1_CAPT_vect)
{
  unsigned int newTime = ICR1; //immediately get the ICR value
  byte state = (TX_PIN_STATE);
  TCCR1B = state ? (1 << CS11 | 1 << ICNC1) : (1 << CS11 | 1 << ICNC1 | 1 << ICES1); //and set edge
  unsigned int duration = newTime - lastTime;
  lastTime = newTime;
  if (state) {
    if (receiving) {
      if (duration > rxLowMax) {
        receiving = 0;
        bitnum = 0; // reset to bit zero
        memset(data, 0, 32); //clear buffer
      }
    } else {
      if (duration > rxSyncMin && duration < rxSyncMax) {
        receiving = 1;
      }
    }
  } else {
    if (receiving) {
      if (duration > rxZeroMin && duration < rxZeroMax) {
        dataIn = dataIn << 1;
      } else if (duration > rxOneMin && duration < rxOneMax) {
        dataIn = (dataIn << 1) + 1;
      } else {
        receiving = 0;
        gotMessage = 2;
        TIMSK1 = 0;
        durationerr = duration;
        data[bitnum >> 3] = dataIn;
        return;
      }
      if ((bitnum & 7) == 7) {
        data[bitnum >> 3] = dataIn;
        if (bitnum == 7) {
          byte t = dataIn >> 6;
          pktLength = t ? (t == 1 ? 63 : (t == 2 ? 127 : 255)) : 31;
        }
        dataIn = 0;
      }
      if (bitnum >= pktLength) {
        bitnum = 0;
        receiving = 0;
        gotMessage = 1;
        TIMSK1 = 0; //turn off input capture;

      } else {
        bitnum++;
      }
    }
  }
}

