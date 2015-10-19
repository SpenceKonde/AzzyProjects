/*

This sketch uses the AzzyRF protocol to continually send packet type 0xF8 to address 0 
(param is low byte of millis() and extparam is the channel), using each of 5 different transmitters in turn.

LEDs light up to show the most recent transmitting pin.


*/

#define ListenST 1
#define CommandST 2

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
#define BTN1 3
//#define txpin 2

byte txpin=14;
#define rxpin 7

//#define SHUT_PIN 8


#define LED_ON 0
#define LED_OFF 1

#define SerialCmd Serial1
#define SerialDbg Serial1
#define MAX_SER_LEN 10
char serBuffer[MAX_SER_LEN];


#define HEX_OUT
//#define HEX_IN
//#define USE_ACK

#define rxPIN PINA
#define rxBV 2
//#define txPIN
//#define txBV


#define CommandForgetTime 1000 //short, for testing

#define rcvled LED1
#define RX_MAX_LEN 256 //Used to set the size of txrx buffer in BITS (and checked against this to prevent overflows from messing stuff up)



//These set the parameters for transmitting.

/*
#define txOneLength 550 //length of a 1
#define txZeroLength 300 //length of a 0
#define txLowTime 420 //length of the gap between bits
#define txTrainRep 30 //number of pulses in training burst
#define txSyncTime 2000 //length of sync
#define txTrainLen 200 //length of each pulse in training burst



//These set the parameters for receiving; any packet where these criteria are not met is discarded.
// Version 2.0
int rxSyncMin=1900; //minimum valid sync length
int rxSyncMax=2100; //maximum valid sync length
int rxZeroMin=100; //minimum length for a valid 0
int rxZeroMax=300; //maximum length for a valid 0
int rxOneMin=400; //minimum length for a valid 1
int rxOneMax=600; //maximum length for a valid 1
int rxLowMax=450; //longest low before packet discarded



// Version 2.1
#define rxSyncMin 1900 //minimum valid sync length
#define rxSyncMax 2100 //maximum valid sync length
#define rxZeroMin 120 //minimum length for a valid 0
#define rxZeroMax 400 //maximum length for a valid 0
#define rxOneMin 450 //minimum length for a valid 1
#define rxOneMax 750 //maximum length for a valid 1
#define rxLowMax 600 //longest low before packet discarded
*/
// Version 2.1
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

unsigned long led3OffAt;
unsigned long led4OffAt;

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
int reccount;

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
  pinMode(0,OUTPUT);
  pinMode(1,OUTPUT);
  pinMode(2,OUTPUT);
  pinMode(3,OUTPUT);
  pinMode(14,OUTPUT);
  pinMode(rxpin, INPUT);
  SerialDbg.begin(9600);
//  if (EEPROM.read(0) < 255) {
//    initFromEEPROM();
    //SerialDbg.println(F("Load from EEPROM"));
//  }
  SerialCmd.begin(9600);
  digitalWrite(LED6, LED_ON);
  //TinyWireM.begin();
  delay(1000);
  digitalWrite(LED6, LED_OFF);
  SerialDbg.println(F("Startup OK"));
  //SerialDbg.print(decode8(123));


}


void loop() {
	digitalWrite(LED1,LED_ON);
	prepareTestPayload(0x00,0);
	doTransmit(20);
	delay(2000);
	digitalWrite(LED1,LED_OFF);
	digitalWrite(LED2,LED_ON);
	prepareTestPayload(0x00,1);
	doTransmit(20);
	delay(2000);
	digitalWrite(LED2,LED_OFF);
	digitalWrite(LED3,LED_ON);
	prepareTestPayload(0x00,2);
	doTransmit(20);
	delay(2000);
	digitalWrite(LED3,LED_OFF);
	digitalWrite(LED4,LED_ON);
	prepareTestPayload(0x00,3);
	doTransmit(20);
	delay(2000);
	digitalWrite(LED4,LED_OFF);
	digitalWrite(LED5,LED_ON);
	prepareTestPayload(0x00,14);
	doTransmit(20);
	delay(2000);
	digitalWrite(LED5,LED_OFF);
}


void prepareTestPayload(byte addr, byte channel) {
  txrxbuffer[0] = addr&0x3F; //address zero
  txrxbuffer[2] = millis() & 255;
  txrxbuffer[1] = 0xF8;
  txrxbuffer[3] = channel<<4;
  txpin=channel;
  TXLength = 4;
}

void doTransmit() {
  doTransmit(txRepCount);
}

void doTransmit(byte rep) { //rep is the number of repetitions
#ifdef LED6
  digitalWrite(LED6, LED_ON);
#endif
#ifdef SHUT_PIN
  digitalWrite(SHUT_PIN, 1);
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
    delayMicroseconds(txRepDelay); //wait 2ms before doing the next round.
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
#ifdef LED6
  digitalWrite(LED6, LED_OFF);
#endif

#ifdef SHUT_PIN
  digitalWrite(SHUT_PIN, 0);
#endif
}




unsigned long calcBigChecksum(byte len) {
  unsigned long retval = 0;
  for (byte i = 0; i < len; i++) {
    retval += (txrxbuffer[i] << (i >> 1));
  }
  return retval;
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
