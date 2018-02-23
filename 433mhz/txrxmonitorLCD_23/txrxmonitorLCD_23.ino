/*
This sketch continually listens to a 433 or 315mhz receiver connected to rxpin.
It listens for 4, 8, 16, or 32 byte packets, sent 2ms after the training burst with 0.65ms low between bits, 1.1ms high for 1, 0.6ms for 0.




Description of packet format:

The first byte of packets is:

| SZ1 | SZ0 | A5 | A4 | A3 | A2 | A1 | A0 |

A5~0: Address bits - 6 bit address of the device, compared to MyAddress. Only packets matching address are processed.

SZ1~SZ0: Size setting

SZ1=0, SZ0=0: 4 bytes
SZ1=0, SZ0=1: 8 bytes
SZ1=1, SZ0=0: 16 bytes
SZ1=1, SZ0=1: 32 bytes

The next two bytes go into MyCmd and MyParam, respectively, if the transmission is accepted (ie, device address matches and checksum is OK)

In a 4 byte packet, the first 4 bits of the last byte goes into MyExtParam (extended parameter), and the last 4 bits are the checksum.

For all longer packets, the whole fourth byte goes into MyExtParam, and the final byte is the checksum.

For 4 byte packets, checksum is calculated by XORing the first three bytes, then XORing the first 4 bits of the result with the last 4 bits, and the first 4 bits of the fourth byte.

For longer packets, checksum is calculated by XORing all bytes of the packet.


How to extend this:


Most of the heavy lifting has been done with regards to receiving, transmitting, and ignoring repeated commands. Ideally, you should only have to edit onCommandST() to handle your new commands, and loop() if you want to add new states, poll sensors, etc.

Receiving:

On receiving a valid packet, MyState will be set to CommandST, and MyCmd, MyParam, and MyExtParam will be populated.

Add a test for the new command to onCommandST() that calls code to handle your new command.
If you're receiving a long packet, you can get bytes beyond the first 4 from txrxbuffer[] (these are not stored as a separate variable in order to save on SRAM)


Transmitting:

Populate txrxbuffer with the bytes you want to send (bytes beyond that are ignored), including the size/address byte.
set TXLength to the length of the packet you are sending. Do not set up the checksum - this is done by doTransmit();

Call doTransmit(rep) to send it, where rep is the number of times you want to repeat the transmission to ensure that it arrives. This blocks until it finishes sending.


The example commands are:

0xF2 - Respond with a 4-byte packet containing the values at 2 locations on the EEPROM, at the addresses (MyParam) and (MyParam+MyExtParam). The first byte is the address of this device, and the first half of the fourth byte is the checksum of the received command (likely not useful here).

0xF4 - Respond with a packet (MyParam) bytes long, repeated (MyExtParam) times. For testing reception. This calculates the checksum, but doesn't set the size and address byte to anything meaningful.

*/

#define ListenST 1
#define CommandST 2
#include <EEPROM.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 20, 4);

//Pin definitions:

//pins 0,1: Serial
//pins 15,16: Serial1 (programming only)
//pins 16,12: I2C

#define LED1 13
//#define LED2 11
//#define LED3 4
//#define LED4 5
//#define LED5 6
//#define LED6 8
#define BTN0 3
#define BTN4 5
#define BTN3 6
#define BTN2 11
#define BTN1 8

#define LED_RX LED1
//#define LED_TX LED3
#define LED_START LED1
//#define BTN_ACK BTN1

//#define SHUT_PIN 8


#define LED_ON 1
#define LED_OFF 0


#define HEX_OUT
//#define HEX_IN
#define USE_ACK
//#define AUTO_ACK



#define rxpin 7
#define rxPIN PINA
#define rxBV 2

#define txpin 14
#define txPIN PINB
#define txBV 8


#define CommandForgetTime 10000 //short, for testing

volatile byte receiving = 0;
volatile byte bitnum = 0; //current bit received

volatile byte gotMessage = 0;
volatile byte dataIn = 0;
volatile byte pktLength = 31;
unsigned long lastPacketTime = 0;
unsigned long lastPacketSig = 0;
unsigned long lastSendSig = 0;
unsigned long lastSer = 0;
char * pEnd; //dummy pointer for strtol


//Microcontroller-specific
//328p

#define RX_PIN_STATE (PINB&1)
#define TX_PIN 7
#define txPIN PIND
#define txBV 128
#define SERIAL_CMD Serial
//#define SERIAL_DBG Serial

//Configuration

byte MyAddress = 0;


//#define SERIAL_DBG Serial

//Buffers
volatile byte rxBuffer[32];
byte txBuffer[32];
byte recvMessage[32];
#define MAX_SER_LEN 10
char serBuffer[MAX_SER_LEN];

// ##############
// TIMING VALUES
// ##############

// Version 2.2/2.3
#if(F_CPU==8000000)
#define TIME_MULT * 1
#elif(F_CPU==16000000)
#define TIME_MULT * 2
#endif

const unsigned int rxSyncMin  = 1750 TIME_MULT;
const unsigned int rxSyncMax  = 2250 TIME_MULT;
const unsigned int rxZeroMin  = 100 TIME_MULT;
const unsigned int rxZeroMax  = 390 TIME_MULT;
const unsigned int rxOneMin  = 410 TIME_MULT;
const unsigned int rxOneMax  = 700 TIME_MULT;
const unsigned int rxLowMax  = 600 TIME_MULT;
const unsigned int txOneLength  = 500;
const unsigned int txZeroLength  = 300;
const unsigned int txSyncTime  = 2000;
const unsigned int txTrainLen  = 200;
const unsigned int txRepCount = 12;
const unsigned int txRepDelay = 2000;
const byte txTrainRep  = 30;
const int commandForgetTime = 5000;
const char endMarker = '\r';
const char endMarker2 = '\n';


unsigned long units[] = {1000, 60000, 900000, 14400000, 3600000, 1, 10, 86400000}; //units for the 8/12/16-bit time values.




void showHex (const byte b, const byte c = 0); //declare this function so it will compile correctly with the optional second argument.

void setup() {
  Wire.begin();
  lcd.begin();

  // Turn on the blacklight and print a message.
  lcd.backlight();
  pinMode(txpin, OUTPUT);
  pinMode(rxpin, INPUT);
  pinMode(12,OUTPUT);
  pinMode(16,OUTPUT);

  pinMode(1,INPUT_PULLUP);
  Serial.begin(9600);
  digitalWrite(LED_START, LED_ON);
  delay(1000);
  digitalWrite(LED_START, LED_OFF);
  lcd.print(F("Startup OK"));
  ////xSerialDbg.print(decode8(123));
  delay(1000);
  lcd.noBacklight();


}


void loop() {
  // put your main code here, to run repeatedly:
  byte rlen = handleReceive();
  if (rlen) {
    outputPacket(rlen);
  }
}


void outputPacket(byte rlen) { //format of rlen: what is passed back from handleReceive(), first 2 bits are version-1, last 6 are length in bytes
  
  byte vers = (rlen & 196) >> 6;
  rlen &= 0x3F;
  if (vers == 0) { //version 1
    Serial.print('+');
  } else {
    Serial.print('=');
  }
  for (byte i = 0; i < (rlen-1); i++) {
    showHex(recvMessage[i], 1);
  }
  if (rlen == 4) {
      showHex(recvMessage[3] >> 4, 1);
  }
  Serial.println();
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
      
    lastPacketTime = millis();
      resetReceive();
      return 0;
    }
    lastPacketSig = getPacketSig();
    lastPacketTime = millis();
    byte rlen = ((pktLength >> 3) + 1) | ((vers - 1) << 6);
    
    memcpy(recvMessage, rxBuffer, 32);
    resetReceive();
    return rlen;
  } else {
    unsigned long t=(millis()-lastPacketTime);
    if (lastPacketTime && (t > commandForgetTime)) {
      lastPacketTime = 0;
      lastPacketSig = 0;
    }
    return 0;
  }
}

void resetReceive() {

  bitnum = 0;
  memset(rxBuffer, 0, 32);
  gotMessage = 0;
  TIMSK = 1 << ICIE1;
  return;
}

byte checkCSC() {
  byte rxchecksum = 0;
  byte rxchecksum2 = 0;
  byte rxc2;
  for (byte i = 0; i < pktLength >> 3; i++) {
    rxchecksum = rxchecksum ^ rxBuffer[i];
    rxc2 = rxchecksum2 & 128 ? 1 : 0;
    rxchecksum2 = (rxchecksum2 << 1 + rxc2)^rxBuffer[i];
  }
  if (pktLength >> 3 == 3) {
    rxchecksum = (rxchecksum & 0x0F) ^ (rxchecksum >> 4) ^ ((rxBuffer[3] & 0xF0) >> 4);
    rxchecksum2 = (rxchecksum2 & 0x0F) ^ (rxchecksum2 >> 4) ^ ((rxBuffer[3] & 0xF0) >> 4);
    if (rxchecksum == rxchecksum2)rxchecksum2++;
    return (rxBuffer[3] & 0x0F) == rxchecksum ? 1 : ((rxBuffer[3] & 0x0F) == rxchecksum2 ) ? 2 : 0;
  } else {
    if (rxchecksum == rxchecksum2)rxchecksum2++;
    return ((rxBuffer[pktLength >> 3] == rxchecksum) ? 1 : ((rxBuffer[bitnum >> 3] == rxchecksum2 ) ? 2 : 0));
  }
}

byte isForMe() {
  if ((rxBuffer[0] & 0x3F) == MyAddress || MyAddress == 0 || (rxBuffer[0] & 0x3F) == 0) {
    return 1;
  }
  return 0;
}

unsigned long getPacketSig() {
  byte len = pktLength >> 3;
  unsigned long lastpacketsig=0;
  for (byte i = (len == 3 ? 0 : 1); i < (len == 3 ? 3 : 4); i++) {
    lastpacketsig += rxBuffer[i];
    lastpacketsig = lastpacketsig << 8;
  }
  lastpacketsig += rxBuffer[len];
  return lastpacketsig;
}

ISR (TIMER1_CAPT_vect)
{
  static unsigned long lasttime = 0;
  unsigned int newTime = ICR1; //immediately get the ICR value
  byte state = (RX_PIN_STATE);
  TCCR1B = state ? (1 << CS11 | 1 << ICNC1) : (1 << CS11 | 1 << ICNC1 | 1 << ICES1); //and set edge
  unsigned int duration = newTime - lasttime;
  lasttime = newTime;
  if (state) {
    if (receiving) {
      if (duration > rxLowMax) {
        receiving = 0;
        bitnum = 0; // reset to bit zero
        memset(rxBuffer, 0, 32); //clear buffer
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
        bitnum = 0; // reset to bit zero
        memset(rxBuffer, 0, 32); //clear buffer
        return;
      }
      if ((bitnum & 7) == 7) {
        rxBuffer[bitnum >> 3] = dataIn;
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
        TIMSK = 0; //turn off input capture;

      } else {
        bitnum++;
      }
    }
  }
}


int readLDR() {
  int retval=0;
  analogRead(1);
  for (byte i=0;i<4;i++) {
    retval+=analogRead(1);
  }
  //lcd.print(retval);
  return retval;
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
#ifdef BTN0
  pinMode(BTN0, INPUT_PULLUP);
#endif
#ifdef BTN1
  pinMode(BTN1, INPUT_PULLUP);
#endif
#ifdef BTN2
  pinMode(BTN2, INPUT_PULLUP);
#endif
#ifdef BTN3
  pinMode(BTN3, INPUT_PULLUP);
#endif
#ifdef BTN4
  pinMode(BTN4, INPUT_PULLUP);
#endif

}

void showHex (const byte b, const byte c) {
  // try to avoid using sprintf
  char buf [3] = { ((b >> 4) & 0x0F) | '0', (b & 0x0F) | '0', 0};
  if (buf [0] > '9')
    buf [0] += 7;
  if (buf [1] > '9')
    buf [1] += 7;

  if (c==2) {
    delay(10);
    lcd.print(buf);
}  else if (c==1){
    Serial.print(buf);
  }
  else {
    //xSerialDbg.print(buf);
  }
}
