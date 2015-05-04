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


#define rxpin 19
#define txpin 18
#define CommandForgetTime 1000 //short, for testing

#define btn1 15
#define btn2 14
#define btn3 17
#define btn4 16
#define rcvled 3
#define rxmaxlen 256 //Used to set the size of txrx buffer (and checked against this to prevent overflows from messing stuff up)

//These set the parameters for transmitting. 


#define txOneLength 550 //length of a 1
#define txZeroLength 300 //length of a 0
#define txLowTime 420 //length of the gap between bits
#define txTrainRep 30 //number of pulses in training burst
#define txSyncTime 2000 //length of sync
#define txTrainLen 200 //length of each pulse in training burst


/*
//These set the parameters for receiving; any packet where these criteria are not met is discarded. 
// Version 2.0
int rxSyncMin=1900; //minimum valid sync length
int rxSyncMax=2100; //maximum valid sync length
int rxZeroMin=100; //minimum length for a valid 0
int rxZeroMax=300; //maximum length for a valid 0
int rxOneMin=400; //minimum length for a valid 1
int rxOneMax=600; //maximum length for a valid 1
int rxLowMax=450; //longest low before packet discarded

*/

// Version 2.1
#define rxSyncMin 1900 //minimum valid sync length
#define rxSyncMax 2100 //maximum valid sync length
#define rxZeroMin 120 //minimum length for a valid 0
#define rxZeroMax 400 //maximum length for a valid 0
#define rxOneMin 450 //minimum length for a valid 1
#define rxOneMax 750 //maximum length for a valid 1
#define rxLowMax 600 //longest low before packet discarded


unsigned long units[]={1000,60000,900000,14400000,3600000,1,10,86400000}; //units for the 8/12/16-bit time values. 


unsigned char MyAddress=31;


//Pin state tracking and data for receiving. 
byte lastPinState;
unsigned long lastPinHighTime;
unsigned long lastPinLowTime;
unsigned long lastTempHighTime=0;
unsigned long lastTempLowTime=0;
byte rxdata;
byte lastTempPinState;
byte bitsrx;
byte rxing;
byte rxaridx;
unsigned char txrxbuffer[rxmaxlen>>3];
byte SerRXidx;
unsigned long lastSer;
byte SerRXmax;

byte MyState;
unsigned char MyCmd;
unsigned char MyParam;
unsigned char MyExtParam;
unsigned long curTime;
int count=0;
int badcsc=0;
byte pksize=32;
byte TXLength;
unsigned long lastChecksum; //Not the same as the CSC - this is our hack to determine if packets are identical
unsigned long forgetCmdAt; 
byte last1;
byte last2;
byte last3;
byte last4;
int reccount;

// digital out stuff

// format: (enable)(pwm)pin - enable = 0, disable =1 (so unprogrammed eeprom reads as disabled) 
byte  digOutOpts[16]={0x49,0x0A,0x4B,255,255,255,255,255,255,255,255,255,255,255,255,255};


unsigned long digOutOnAt[4]={0,0,0,0};
unsigned long digOutOffAt[4]={0,0,0,0};
unsigned long digOutTimer[4]={0,0,0,0};  //cycle time for blinking, fade step size for fading
byte digOutOnPWM[4]={255,255,255,255};
byte digOutOffPWM[4]={0,0,0,0};
byte digOutFade[4]={0,0,0,0};
byte digOutMode[4]={0,0,0,0};



void setup() {
	lastPinState=0;
	lastPinLowTime=0;
	lastPinHighTime=0;
	rxdata=0;
	bitsrx=0;
	rxing=0;
	MyState=ListenST;
	pinMode(btn1,INPUT_PULLUP); //buttons for testing
	pinMode(btn2,INPUT_PULLUP);
	pinMode(btn3,INPUT_PULLUP);
	pinMode(btn4,INPUT_PULLUP);
	pinMode(9,OUTPUT);  //lights for testing
	pinMode(10,OUTPUT);
	pinMode(11,OUTPUT);
	pinMode(rcvled,OUTPUT);
	Serial.begin(9600);
	digitalWrite(9,1);  // RGB LED for testing on demo board
	digitalWrite(10,1); // set them to 1 to turn off, since it's inverted
	digitalWrite(11,1); //
	digitalWrite(rcvled,1);
	delay(1000);
	Serial.println("Startup OK");

}


void loop() {
	curTime=micros();
	if (MyState==ListenST) {
		ClearCMD(); //do the command reset only if we are in listenst but NOT receiving.
		onListenST();
		if (rxing==1){
			return; //don't do anything else while actively receiving.
		} else {
			processSerial();
		}
	} else if (MyState==CommandST){ 
		onCommandST();
	} else {
		MyState=ListenST; //in case we get into a bad state somehow.
	}
	if (millis()-lastSer  > 5000) {
		resetSer();
	}
}

void processSerial() {
	while (Serial.available() > 0) {
		if (SerRXidx < SerRXmax && rxing==2) {
                 txrxbuffer[SerRXidx]= Serial.read();
                 SerRXidx++;
                 if (SerRXidx==SerRXmax) {
                 	preparePayloadFromSerial();
                 	doTransmit();
                 	resetSer();
                 }
		} else if (rxing==0) {
			byte rcv=Serial.read();
			if (rcv=='S') {
				SerRXmax=4;
				rxing=2;
			} else if (rcv=='M') {
				SerRXmax=7;
				rxing=2;
			} else if (rcv=='L') {
				SerRXmax=15;
				rxing=2;
			} else if (rcv=='E') {
				SerRXmax=31;
				rxing=2;
			}
		}
		lastSer=millis();
        }
}

void resetSer() {
	if (rxing==2) {
		rxing=0;
	}
	SerRXmax=0;
	SerRXidx=0;
}
void preparePayloadFromSerial() {
	txrxbuffer[0]=(txrxbuffer[0] & 0x3F);
	if (SerRXmax>4) {
		txrxbuffer[0]=txrxbuffer[0]|(SerRXmax==7?0x40:(SerRXmax==15?0x80:0xC0));
		TXLength=SerRXmax+1;
	} else {
		txrxbuffer[3]=txrxbuffer[3]<<4;
		TXLength=4;
	}
}

void doTransmit(int rep) { //rep is the number of repetitions
	byte txchecksum=0;
	for (byte i=0;i<TXLength-1;i++) {
		txchecksum=txchecksum^txrxbuffer[i];
	}
	if (TXLength==4) {
		txchecksum=(txchecksum&0x0F)^(txchecksum>>4)^((txrxbuffer[3]&0xF0)>>4);
		txrxbuffer[3]=(txrxbuffer[3]&0xF0)+(txchecksum&0x0F);
	} else {
		txrxbuffer[TXLength-1]=txchecksum;
	} 
	for (byte r=0;r<rep;r++) {;
		for (byte j=0; j < txTrainRep; j++) {
			delayMicroseconds(txTrainLen);
			digitalWrite(txpin, 1);
			delayMicroseconds(txTrainLen);
			digitalWrite(txpin, 0);
		}
		delayMicroseconds(txSyncTime);
		for (byte k=0;k<TXLength;k++) {
			//send a byte
			for (int m=7;m>=0;m--) {
				digitalWrite(txpin, 1);
				if ((txrxbuffer[k]>>m)&1) {
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
		delayMicroseconds(2000); //wait 2ms before doing the next round. 
	}
	Serial.println("Transmit done");
	TXLength=0;
}


void onCommandST() {
  byte tem=txrxbuffer[0]>>6;
  tem=4<<tem-1
  for (byte x=0;x<tem;x++) {
    Serial.print(txrxbuffer[x]);
  }
  if (tem==3) {Serial.print((txrxbuffer[3]&0xF0)>>4);}
  Serial.println("\r\n");
  MyState=LISTEN_ST
}

void onListenST() {
	byte pinState=digitalRead(rxpin);
	if (pinState==lastPinState) {
		return;
	} else {
		lastPinState=pinState;
	}
	if (pinState==0) {
		lastPinLowTime=curTime;
		unsigned long bitlength=lastPinLowTime-lastPinHighTime;
		if (rxing==1) {
			if (bitlength > rxZeroMin && bitlength < rxZeroMax) {
				rxdata=rxdata<<1;
			} else if (bitlength > rxOneMin && bitlength < rxOneMax ) {
				rxdata=(rxdata<<1)+1;
			} else {
  				//Serial.print("Reset wrong high len ");
  				//Serial.print(bitlength);
  				//Serial.print(" ");
  				//Serial.println(bitsrx);
				resetListen();
				return;
			}
			bitsrx++;
			if (bitsrx==2) {
				pksize=32<<rxdata;
				if (pksize>rxmaxlen) {
					Serial.println("Packet this size not supported");
					resetListen();
					return;
				}
			} else if (bitsrx==8*(1+rxaridx)) {
				txrxbuffer[rxaridx]=rxdata;
				rxdata=0;
				rxaridx++;
				if (rxaridx*8==pksize) {
					Serial.println("Receive done");
					parseRx();
					//parseRx2(txrxbuffer,pksize/8);
					resetListen();
				}
			}
			return;
		}   
	} else {
		lastPinHighTime=curTime;
		if (lastPinHighTime-lastPinLowTime > rxSyncMin && lastPinHighTime-lastPinLowTime <rxSyncMax && rxing==0) {
			rxing=1;
			return;
		}
		if (lastPinHighTime-lastPinLowTime > rxLowMax && rxing==1) {
			//Serial.println(bitsrx);
			resetListen();
			return;
		}
	}
}




void parseRx() { //uses the globals. 
	Serial.println("Parsing");
	unsigned char calccsc=0;
	unsigned char rcvAdd=txrxbuffer[0]&0x3F;
	//if (rcvAdd==MyAddress) {
		if (lastChecksum!=calcBigChecksum(byte(pksize/8))) {
			lastChecksum=calcBigChecksum(byte(pksize/8));
		    if (pksize==32) { //4 byte packet
		    	calccsc=txrxbuffer[0]^txrxbuffer[1]^txrxbuffer[2];
		    	calccsc=(calccsc&15)^(calccsc>>4)^(txrxbuffer[3]>>4);
		    	if (calccsc==(txrxbuffer[3]&15)) {
		    		MyCmd=txrxbuffer[1];
		    		MyParam=txrxbuffer[2];
		    		MyExtParam=txrxbuffer[3]>>4;
		    		MyState=CommandST;
		    		Serial.println(MyCmd);
		    		Serial.println(MyParam);
		    		Serial.println(MyExtParam);
		    		Serial.println("Valid transmission received");
	    		} else {
	    			Serial.println("Bad CSC on 4 byte packet");
	    		}
			} else {
				for (byte i=1;i<(pksize/8);i++) {
					calccsc=calccsc^txrxbuffer[i-1];
				}
				if (calccsc==txrxbuffer[(pksize/8)-1]) {
					MyCmd=txrxbuffer[1];
					MyParam=txrxbuffer[2];
					MyExtParam=txrxbuffer[3];
					MyState=CommandST; //The command state needs to handle the rest of the buffer if sending long commands.  
					Serial.println(MyCmd);
					Serial.println(MyParam);
					Serial.println(MyExtParam);
					Serial.println("Valid long transmission received");
				} else {
					Serial.println("Bad CSC on long packet");
				}  
			}
		} else {
			Serial.println("Already got it");
		} 
	//} else {
	//	Serial.println("Not for me");
	//}
}

unsigned long calcBigChecksum(byte len) {
	unsigned long retval=0;
	for (byte i=0;i<len;i++) {
		retval+=(txrxbuffer[i]<<(i>>1));
	}
	return retval;
}

void resetListen() {
    bitsrx=0;
    rxdata=0;
    rxing=0;
    rxaridx=0;
}

//decode times 
unsigned long decode8(byte inp) { return (inp&0x3F)*units[inp>>6]; }
unsigned long decode12(unsigned int inp) { return (inp&0x01FF)*units[(inp>>9)&0x07]; }
unsigned long decode16(unsigned int inp) { return (inp&0x1FFF)*units[inp>>13]; }

//Just for test/debug purposes;
void parseRx2(unsigned char rxd[],byte len) {

	Serial.println("Parsing long packet");
	for (byte i=0;i<len;i++) {
		Serial.println(rxd[i]);
	}
	Serial.println("Done");
}

void ClearCMD() {  //This handles clearing of the commands, and also clears the lastChecksum value, which is used to prevent multiple identical packets received in succession from being processed.
	if (MyCmd) {
		forgetCmdAt=millis()+CommandForgetTime;
		MyParam=0;
		MyExtParam=0;
		MyCmd=0;
	} else if (millis()>forgetCmdAt) {
		forgetCmdAt=0;
		lastChecksum=0;
	}
}
