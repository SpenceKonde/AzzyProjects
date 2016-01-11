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
#include <TinyWireM.h>

//Pin definitions:

//pins 0,1: Serial
//pins 15,16: Serial1 (programming only)
//pins 16,12: I2C

#define SerialCmd Serial
#define SerialDbg Serial1
#define MAX_SER_LEN 10
char serBuffer[MAX_SER_LEN];



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
const char ATVERS[] PROGMEM = {"AT+VERS?"};

byte SerRXidx;
unsigned long lastSer = 0;
byte SerRXmax;
byte SerCmBuff[16];
byte SerCmd;
byte rxing =0;
char * pEnd; //dummy pointer for sto

void setup() {
  rxdata = 0;
  bitsrx = 0;
  rxing = 0;
  pinMode(1,INPUT_PULLUP);
}


void loop() {
  static unsigned long blinkAt = 0;
  static int ledst=0;
  if ((millis()-blinkAt) > 1000) {
  digitalWrite(13,ledst);
  ledst=!ledst;
  }
    processSerial();
    
}



void processSerial() {
  static char minb[3] = {0, 0, 0};
  static byte ndx = 0;
  char endMarker = '\r';
  char endMarker2 = '\n';
  while (SerialCmd.available() > 0) {
  
    if (SerRXidx < SerRXmax && rxing == 2) {
      txrxbuffer[SerRXidx] = SerialCmd.read();
      SerRXidx++;
      if (SerRXidx == SerRXmax) {
        ndx = 0;
        if (SerCmd == 0) {
          if (SerRXmax == 28) {
            writeConfigToEEPROM();
          } else {
            preparePayloadFromSerial();
            doTransmit();
          }
        } else if (SerCmd == 1) { //AT+ADR
          MyAddress = txrxbuffer[0];
          //  EEPROM.write(0,MyAddress)
        } else if (SerCmd == 2) { //AT+24R
#ifdef HEX_OUT
          SerialCmd.print(F("="));
          showHex(readAT24(defaultAT24i2ca, txrxbuffer[0] << 8 + txrxbuffer[1]), 1);
#else
          SerialCmd.println(readAT24(defaultAT24i2ca, txrxbuffer[0] << 8 + txrxbuffer[1]));
#endif
        } else if (SerCmd == 3) { //AT+24W
          writeAT24(defaultAT24i2ca, txrxbuffer[0] << 8 + txrxbuffer[1], txrxbuffer[2]);
        } else if (SerCmd == 4) { //AT+24RL
          readAT24(defaultAT24i2ca, (txrxbuffer[0] << 8) + txrxbuffer[1], txrxbuffer[2], txrxbuffer + 3);
          #ifdef HEX_OUT
          SerialCmd.print(F("="));
          #endif
          for (byte i = 0; i < txrxbuffer[2]; i++) {
#ifdef HEX_OUT
            showHex(txrxbuffer[i + 3], 1);
#else
            SerialCmd.println(txrxbuffer[i + 3]);
#endif
          }
        } else if (SerCmd == 5) { //AT+24WL
          writeAT24(defaultAT24i2ca, (txrxbuffer[0] << 8 + txrxbuffer[1]), txrxbuffer[2], txrxbuffer + 3);
        }
        resetSer();
      } else if (SerRXidx == 3 && SerCmd == 5) {
        SerialCmd.println(txrxbuffer[2]);
        SerialDbg.println(F("Adjusting char RX"));
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
  PORTA|=1;
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
  } else if (strcmp_P (serBuffer, ATVERS) == 0) {
    SerialCmd.println("AzzyRF v2.2");
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
    #ifdef USE_ACK
  } else if (strcmp_P (serBuffer, ATACK) == 0) { //AT+ADR?
    if (lastChecksum) {
        prepareAckPayload();
        doTransmit();
    } else {
      SerialCmd.println(F("ERROR"));
      resetSer();
    }
    #endif
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


