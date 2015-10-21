/*
This sketch continually listens to a 433 or 315mhz receiver connected to rxpin, and listens for 4-byte packet of type 0xF8, which will trigger it to light and delight the LEDs. 

*/

#define ListenST 1
#define CommandST 2
#include <EEPROM.h>
//#include <TinyWireM.h>

//Pin definitions:

//pins 0,1: Serial
//pins 15,16: Serial1 (programming only)
//pins 16,12: I2C

#define LED1 4
#define LED2 5
#define LED3 6
#define LED4 11
#define LED5 8
#define LED6 13
//#define BTN1 3
//#define txpin 2
#define rxpin 2

//#define SHUT_PIN 8


#define LED_ON 0
#define LED_OFF 1

#define SerialCmd Serial1
#define SerialDbg Serial
#define MAX_SER_LEN 10
char serBuffer[MAX_SER_LEN];


#define HEX_OUT
//#define HEX_IN
//#define USE_ACK

#define rxPIN PINA
#define rxBV 64
//#define txPIN
//#define txBV


#define CommandForgetTime 1000 //short, for testing

#define rcvled LED1
#define RX_MAX_LEN 256 //Used to set the size of txrx buffer in BITS (and checked against this to prevent overflows from messing stuff up)

#define EEPROM_OFFSET_CONF 32
#define EEPROM_LENGTH_CONF 28

const char AT24R[] PROGMEM = {"AT+24R"};
const char ATSEND[] PROGMEM = {"AT+SEND"};
const char ATSENDM[] PROGMEM = {"AT+SENDM"};
const char ATSENDL[] PROGMEM = {"AT+SENDL"};
const char ATSENDE[] PROGMEM = {"AT+SENDE"};
const char ATCONF[] PROGMEM = {"AT+CONF"};
const char ATHEX[] PROGMEM = {"AT+HEX?"};
const char ATADRQ[] PROGMEM = {"AT+ADR?"};
const char ATADR[] PROGMEM = {"AT+ADR"};
const char AT24W[] PROGMEM = {"AT+24W"};
const char AT24WL[] PROGMEM = {"AT+24WL"};
const char AT24RL[] PROGMEM = {"AT+24RL"};



/*

//X1
unsigned int rxSyncMin  = 1750;
unsigned int rxSyncMax  = 2250;
unsigned int rxZeroMin  = 300;
unsigned int rxZeroMax  = 740;
unsigned int rxOneMin  = 760;
unsigned int rxOneMax  = 1200;
unsigned int rxLowMax  = 1000;
unsigned int txOneLength  = 950;
unsigned int txZeroLength  = 550;
unsigned int txLowTime  = 750;
unsigned int txSyncTime  = 2000;
unsigned int txTrainLen  = 250;
byte txTrainRep  = 30;
*/

/*
//X2
unsigned int rxSyncMin  = 1750;
unsigned int rxSyncMax  = 2250;
unsigned int rxZeroMin  = 100;
unsigned int rxZeroMax  = 390;
unsigned int rxOneMin  = 410;
unsigned int rxOneMax  = 700;
unsigned int rxLowMax  = 600;
unsigned int txOneLength  = 500;
unsigned int txZeroLength  = 300;
unsigned int txLowTime  = 400;
unsigned int txSyncTime  = 2000;
unsigned int txTrainLen  = 200;
byte txTrainRep  = 30;

*/


unsigned int  rxSyncMin = 1900; //minimum valid sync length
unsigned int  rxSyncMax = 2100; //maximum valid sync length
unsigned int  rxZeroMin = 120; //minimum length for a valid 0
unsigned int  rxZeroMax = 400; //maximum length for a valid 0
unsigned int  rxOneMin = 450; //minimum length for a valid 1
unsigned int  rxOneMax = 750; //maximum length for a valid 1
unsigned int  rxLowMax = 600; //longest low before packet discarded

unsigned int  txOneLength = 550; //length of a 1
unsigned int  txZeroLength = 300; //length of a 0
unsigned int txLowTime = 420; //length of the gap between bits
byte txTrainRep = 30; //number of pulses in training burst
unsigned int txSyncTime = 2000; //length of sync
unsigned int txTrainLen = 200; //length of each pulse in training burst



unsigned int txRepDelay = 2000; //delay between consecutive transmissions
byte txRepCount = 5; //number of times to repeat each transmission



byte recCount=0;

byte defaultAT24i2ca = 0x50;


unsigned long units[] = {1000, 60000, 900000, 14400000, 3600000, 1, 10, 86400000}; //units for the 8/12/16-bit time values.


byte MyAddress = 0;


//Pin state tracking and data for receiving.
byte lastPinState;
unsigned long lastPinHighTime;
unsigned long lastPinLowTime;
unsigned long lastTempHighTime = 0;
unsigned long lastTempLowTime = 0;
byte rxdata;
byte lastTempPinState;
int bitsrx;
byte rxing;
byte rxaridx;
unsigned char txrxbuffer[RX_MAX_LEN >> 3];
byte SerRXidx;
unsigned long lastSer = 0;
byte SerRXmax;
byte SerCmBuff[16];
byte SerCmd;

unsigned long led1OffAt;
unsigned long led2OffAt;
unsigned long led3OffAt;
unsigned long led4OffAt;
unsigned long led5OffAt;

char * pEnd; //dummy pointer for sto



//byte MyState;
//unsigned char MyCmd;
//unsigned char MyParam;
//unsigned char MyExtParam;
unsigned long curTime;
int count = 0;
int badcsc = 0;
int pksize = 32;
byte TXLength;
unsigned long lastChecksum; //Not the same as the CSC - this is our hack to determine if packets are identical
unsigned long forgetCmdAt;
int receiveCount;

#ifdef USE_ACK
byte lastCmdSent;
byte lastCscSent;
#endif

void showHex (const byte b, const byte c = 0); //declare this function so it will compile correctly with the optional second argument.

void setup() {
  lastPinState = 0;
  lastPinLowTime = 0;
  lastPinHighTime = 0;
  rxdata = 0;
  bitsrx = 0;
  rxing = 0;
  initializeOutputs();

  //pinMode(txpin, OUTPUT);
  pinMode(rxpin, INPUT);
  SerialDbg.begin(9600);

  SerialCmd.begin(9600);
  digitalWrite(LED6, LED_ON);
//  TinyWireM.begin();
  delay(1000);
  digitalWrite(LED6, LED_OFF);
  SerialDbg.println(F("Startup OK"));
  //SerialDbg.print(decode8(123));


}


void loop() {
  //if (MyState == ListenST) {
  onListenST();
  if (rxing == 1) {
    PORTC &= ~1;
    return; //don't do anything else while actively receiving.
  } else {
    PORTC |= 1;
    //digitalWrite(LED2, rxing >> 1 ? LED_ON : LED_OFF);
    ClearCMD(); //do the command reset only if we are in listenst but NOT receiving.
    if (led1OffAt && (led1OffAt < millis())) {
      digitalWrite(LED1, LED_OFF);
      led1OffAt = 0;
    }
    if (led2OffAt && (led2OffAt < millis())) {
      digitalWrite(LED2, LED_OFF);
      led2OffAt = 0;
    }
    if (led3OffAt && (led3OffAt < millis())) {
      digitalWrite(LED3, LED_OFF);
      led3OffAt = 0;
    }
    if (led4OffAt && (led4OffAt < millis())) {
      digitalWrite(LED4, LED_OFF);
      led4OffAt = 0;
    }
    if (led5OffAt && (led5OffAt < millis())) {
      digitalWrite(LED5, LED_OFF);
      led5OffAt = 0;
    }
  }
  //} else if (MyState == CommandST) {
  //  onCommandST();
  //} else {
  //  MyState = ListenST; //in case we get into a bad state somehow.
  //}
}



void processSerial() {
  static char minb[3] = {0, 0, 0};
  static byte ndx = 0;
  char endMarker = '\r';
  char endMarker2 = '\n';
  while (SerialCmd.available() > 0) {

    if (SerRXidx < SerRXmax && rxing == 2) {
#ifdef HEX_IN
      if (ndx == 1) {
        minb[1] = SerialCmd.read();
        ndx = 0;
        txrxbuffer[SerRXidx] = strtol(minb, &pEnd, 16);
        SerRXidx++;
      } else {
        minb[0] = SerialCmd.read();
        ndx = 1;
      }
#else
      txrxbuffer[SerRXidx] = SerialCmd.read();
      SerRXidx++;
#endif
      if (SerRXidx == SerRXmax) {
        ndx = 0;
        if (SerCmd == 0) {
          if (SerRXmax == 28) {
//            writeConfigToEEPROM();
          } else {
//            preparePayloadFromSerial();
//            doTransmit();
          }
        } else if (SerCmd == 1) { //AT+ADR
          MyAddress = txrxbuffer[0];
          //  EEPROM.write(0,MyAddress)
        } else if (SerCmd == 2) { //AT+24R
#ifdef HEX_OUT
//          showHex(readAT24(defaultAT24i2ca, txrxbuffer[0] << 8 + txrxbuffer[1]), 1);
#else
          SerialCMD.println(readAT24(defaultAT24i2ca, txrxbuffer[0] << 8 + txrxbuffer[1]));
#endif
        } else if (SerCmd == 3) { //AT+24W
//          writeAT24(defaultAT24i2ca, txrxbuffer[0] << 8 + txrxbuffer[1], txrxbuffer[2]);
        } else if (SerCmd == 4) { //AT+24RL
//          readAT24(defaultAT24i2ca, (txrxbuffer[0] << 8) + txrxbuffer[1], txrxbuffer[2], txrxbuffer + 3);
          for (byte i = 0; i < txrxbuffer[2]; i++) {
#ifdef HEX_OUT
            showHex(txrxbuffer[i + 3], 1);
#else
            SerialCmd.println(txrxbuffer[i + 3]);
#endif
          }
        } else if (SerCmd == 5) { //AT+24WL
//          writeAT24(defaultAT24i2ca, (txrxbuffer[0] << 8 + txrxbuffer[1]), txrxbuffer[2], txrxbuffer + 3);
        }
        resetSer();
      } else if (SerRXidx == 3 && SerCmd == 5) {
        SerialCmd.println(txrxbuffer[2]);
        SerialDbg.println(F("Adjusting characther RX"));
        SerRXmax = txrxbuffer[2] + 3;
      }
    } else {
      char rc = SerialCmd.read();
      if (rc != endMarker && rc != endMarker2) {
        serBuffer[SerRXidx] = rc;
        SerRXidx++;
        if (SerRXidx >= MAX_SER_LEN) {
          SerRXidx = 0;
          SerialCmd.println(F("ERROR"));
          resetSer();
        }
      } else {
        if (SerRXidx) { //index 0? means it's a \r\n pattern.
          serBuffer[SerRXidx] = '\0'; // terminate the string
          SerRXidx = 0;
          checkCommand();
        }
      }
    }
    lastSer = millis();
  }
}

void checkCommand() {
  if (strcmp_P (serBuffer, ATSEND) == 0) {
    SerRXmax = 4;
    rxing = 2;
  } else if (strcmp_P (serBuffer, ATSENDM) == 0) {
    SerRXmax = 7;
    rxing = 2;
  } else if (strcmp_P (serBuffer, ATSENDL) == 0) {
    SerRXmax = 15;
    rxing = 2;
  } else if (strcmp_P (serBuffer, ATSENDE) == 0) {
    SerRXmax = 31;
    rxing = 2;
  } else if (strcmp_P (serBuffer, ATCONF) == 0) {
    SerRXmax = 28;
    rxing = 2;
  } else if (strcmp_P (serBuffer, ATHEX) == 0) {
#ifdef HEX_IN
#ifdef HEX_OUT
    SerialCmd.println(F("03"));
#else
    byte a = 2;
    SerialCmd.println(a);
#endif
#else
#ifdef HEX_OUT
    SerialCmd.println(F("01"));
#else
    byte a = 0;
    SerialCmd.println(a);
#endif
#endif

  } else if (strcmp_P (serBuffer, ATADRQ) == 0) { //AT+ADR?
    SerialCmd.println(MyAddress);
  } else if (strcmp_P (serBuffer, ATADR) == 0) {
    SerCmd = 1;
    SerRXmax = 1;
    rxing = 2;
  } else if (strcmp_P (serBuffer, AT24R) == 0) {
    SerCmd = 2;
    SerRXmax = 2;
    rxing = 2;
  } else if (strcmp_P (serBuffer, AT24W) == 0) {
    SerCmd = 3;
    SerRXmax = 3;
    rxing = 2;
  } else if (strcmp_P (serBuffer, AT24RL) == 0) {
    SerCmd = 4;
    SerRXmax = 3;
    rxing = 2;
  } else if (strcmp_P (serBuffer, AT24WL) == 0) {
    SerCmd = 5;
    SerRXmax = 19;
    rxing = 2;
  } else {
    SerialCmd.println(F("ERROR"));
    SerialCmd.println(serBuffer);
    resetSer();
  }
  if (rxing == 2) {
#ifdef HEX_IN
    SerialCmd.print(F(">"));
#else
    SerialCmd.print(F("#"));
#endif
  }


}

void resetSer() {
  //SerialDbg.println(lastSer);
  //SerialDbg.println(millis());
  SerCmd = 0;
  if (lastSer) { //if we've gotten any characters since last reset, print newline to signify completion.
    lastSer = 0;
    SerialCmd.println();
  }
  if (rxing == 2) {
    rxing = 0;
  }
  for (int i = 0; i < 16; i++) {
    SerCmBuff[i] = 0;
  }
  SerRXmax = 0;
  SerRXidx = 0;
}



void outputPayload() {
#ifdef USE_ACK
  if (txrxbuffer[1] == 0xE8) {
    if ( txrxbuffer[2] == lastCmdSent && (txrxbuffer[3] >> 4) == (lastCscSent & 0x0F)) {
      SerialCmd.println(F("ACK"));
    } else {
      SerialDbg.println(F("Other ACK"));
    }
  } else {
#endif
    byte tem = txrxbuffer[0] >> 6;
    tem = (4 << tem) - 1;
    SerialCmd.print(F("+"));
#ifdef HEX_OUT
    for (byte x = 0; x < tem ; x++) {
      showHex(txrxbuffer[x], 1);
    }
    if (tem == 3) { //means it was a short
      showHex((txrxbuffer[3] & 0xF0) >> 4, 1);
    }
#else
    SerialCmd.print(tem == 3 ? 4 : tem);
    SerialCmd.print(F(","));
    for (byte x = 0; x < tem; x++) {
      SerialCmd.print(txrxbuffer[x]);
    }
    if (tem == 3) { //means it was a short
      SerialCmd.print((txrxbuffer[3] & 0xF0) >> 4);
    }
#endif
    if (txrxbuffer[1]==0xF8) {
      byte temp=txrxbuffer[3]&0xF0;
      temp=temp>>4;
      if (temp==0) {
        digitalWrite(LED1, LED_ON);
        led1OffAt=millis()+8000;
      } else if (temp==1) {
        digitalWrite(LED2, LED_ON);
        led2OffAt=millis()+8000;
      }else if (temp==2) {
        digitalWrite(LED3, LED_ON);
        led3OffAt=millis()+8000;
      }else if (temp==3) {
        digitalWrite(LED4, LED_ON);
        led4OffAt=millis()+8000;
      }else if (temp==14) {
        digitalWrite(LED5, LED_ON);
        led5OffAt=millis()+8000;
      }
    }
#ifdef USE_ACK
    if (((txrxbuffer[0] & 0x3F) == MyAddress) && (txrxbuffer[1] != 0xE8)) {
      prepareAckPayload();
      delay(1000);
      doTransmit();
    }
  }
#endif
  SerialCmd.println();
}

void onListenST() {

  curTime = micros();
#ifdef rxPIN
  byte pinState = (rxPIN & rxBV) ? 1 : 0;
#else
  byte pinState = digitalRead(rxpin);
#endif
  if (pinState == lastPinState) {
    return;
  } else {
    //digitalWrite(LED1,pinState);
    lastPinState = pinState;
  }
  if (pinState == 0) {
    lastPinLowTime = curTime;
    unsigned long bitlength = lastPinLowTime - lastPinHighTime;
    if (rxing == 1) {
      //digitalWrite(LED1,0);
      if (bitlength > rxZeroMin && bitlength < rxZeroMax) {
        rxdata = rxdata << 1;
      } else if (bitlength > rxOneMin && bitlength < rxOneMax ) {
        rxdata = (rxdata << 1) + 1;
      } else {
        if (bitsrx > 10) {
          SerialDbg.print(F("Reset wrong high len "));
          SerialDbg.print(bitlength);
          SerialDbg.print(" ");
          SerialDbg.println(bitsrx);
        }
        resetListen();
        return;
      }
      bitsrx++;
      if (bitsrx == 2) {
        pksize = 32 << rxdata;
#if (RX_MAX_LEN < 256)
        if (pksize > RX_MAX_LEN) {
          SerialDbg.println(F("Packet this size not supported"));
          resetListen();
          return;
        }
#endif

      } else if ((bitsrx & 0x07) == 0 && bitsrx) {
        txrxbuffer[(bitsrx >> 3) - 1] = rxdata;
        showHex(rxdata);
        rxdata = 0;
      }
      //SerialDbg.println(bitsrx);
      if (bitsrx == pksize) {
        SerialDbg.println(F("RX done"));
        parseRx();
        //parseRx2(txrxbuffer,pksize/8);
        resetListen();
      }

      return;
    }
  } else {
    lastPinHighTime = curTime;
    if (lastPinHighTime - lastPinLowTime > rxSyncMin && lastPinHighTime - lastPinLowTime < rxSyncMax && rxing == 0) {
      rxing = 1;
      return;
    }
    if (lastPinHighTime - lastPinLowTime > rxLowMax && rxing == 1) {
      SerialDbg.print("rxlow");
      SerialDbg.println(lastPinHighTime - lastPinLowTime);
      resetListen();
      return;
    }
  }
}




void parseRx() { //uses the globals.
  SerialDbg.println(F("Parsing"));
  unsigned char calccsc = 0;
  unsigned char rcvAdd = txrxbuffer[0] & 0x3F;
  if (rcvAdd == MyAddress || MyAddress == 0) {
    if (lastChecksum != calcBigChecksum(byte(pksize / 8))) {
      SerialCmd.println(F("RX Count: "));
      SerialCmd.println(receiveCount);
      receiveCount=0;
      lastChecksum = calcBigChecksum(byte(pksize / 8));
      if (pksize == 32) { //4 byte packet
        calccsc = txrxbuffer[0] ^ txrxbuffer[1] ^ txrxbuffer[2];
        calccsc = (calccsc & 15) ^ (calccsc >> 4) ^ (txrxbuffer[3] >> 4);
        if (calccsc == (txrxbuffer[3] & 15)) {
          //MyCmd = txrxbuffer[1];
          //MyParam = txrxbuffer[2];
          //MyExtParam = txrxbuffer[3] >> 4;

          /* showHex(txrxbuffer[0], 0);
           SerialDbg.print(F(":"));
           showHex(MyCmd);
           SerialDbg.print(F(":"));
           showHex(MyParam);
           SerialDbg.print(F(":"));
           showHex(MyExtParam);
           SerialDbg.println(); */
          SerialDbg.println(F("Valid RX"));
          outputPayload();
          receiveCount++;
        } else {
          SerialDbg.println(F("Bad CSC RX"));
          outputPayload();
        }
      } else {
        for (byte i = 1; i < (pksize / 8); i++) {
          calccsc = calccsc ^ txrxbuffer[i - 1];
        }
        if (calccsc == txrxbuffer[(pksize / 8) - 1]) {
          //MyCmd = txrxbuffer[1];
          //MyParam = txrxbuffer[2];
          //MyExtParam = txrxbuffer[3];
          /*
          for (byte i = 0; i < (pksize / 8); i++) {
            showHex(txrxbuffer[i]);
            SerialDbg.print(":");
          }
          SerialDbg.println();
          */
          SerialDbg.println(F("Valid long RX"));
          outputPayload();
        } else {
          SerialDbg.println(F("Bad CSC long RX"));
        }
      }
    } else {
      receiveCount++;
      SerialDbg.println(F("Already got it"));
    }
  } else {
    SerialDbg.println(F("Not for me"));
  }
}



unsigned long calcBigChecksum(byte len) {
  unsigned long retval = 0;
  for (byte i = 0; i < len; i++) {
    retval += (txrxbuffer[i] << (i >> 1));
  }
  return retval;
}

void resetListen() {
  //SerialDbg.println(F("reset listen"));
  bitsrx = 0;
  rxdata = 0;
  rxing = 0;
  rxaridx = 0;
}


//decode times
unsigned long decode8(byte inp) {
  return (inp & 0x3F) * units[inp >> 6];
}
unsigned long decode12(unsigned int inp) {
  return (inp & 0x01FF) * units[(inp >> 9) & 0x07];
}
unsigned long decode16(unsigned int inp) {
  return (inp & 0x1FFF) * units[inp >> 13];
}


void ClearCMD() {  //This handles clearing of the commands, and also clears the lastChecksum value, which is used to prevent multiple identical packets received in succession from being processed.
  if (lastChecksum) {
    forgetCmdAt = millis() + CommandForgetTime;
    //MyParam = 0;
    //MyExtParam = 0;
    //MyCmd = 0;
  } else if (millis() > forgetCmdAt) {
    forgetCmdAt = 0;
    lastChecksum = 0;
  }
}

void initializeOutputs() {
#ifdef LED1
  pinMode(LED1, OUTPUT);
  digitalWrite(LED1, LED_OFF);
#endif
#ifdef LED2
  pinMode(LED2, OUTPUT);
  digitalWrite(LED2, LED_OFF);
#endif
#ifdef LED3
  pinMode(LED3, OUTPUT);
  digitalWrite(LED3, LED_OFF);
#endif
#ifdef LED4
  pinMode(LED4, OUTPUT);
  digitalWrite(LED4, LED_OFF);
#endif
#ifdef LED5
  pinMode(LED5, OUTPUT);
  digitalWrite(LED5, LED_OFF);
#endif
#ifdef LED6
  pinMode(LED6, OUTPUT);
  digitalWrite(LED6, LED_OFF);
#endif
#ifdef SHUT_PIN
  pinMode(SHUT_PIN, OUTPUT);
  digitalWrite(SHUT_PIN, 0);
#endif
#ifdef BTN1
  pinMode(BTN1, INPUT_PULLUP);
#endif

}

void showHex (const byte b, const byte c) {
  // try to avoid using sprintf
  char buf [3] = { ((b >> 4) & 0x0F) | '0', (b & 0x0F) | '0', 0};
  if (buf [0] > '9')
    buf [0] += 7;
  if (buf [1] > '9')
    buf [1] += 7;

  if (c) {
    SerialCmd.print(buf);
  }
  else {
    SerialDbg.print(buf);
  }
}
