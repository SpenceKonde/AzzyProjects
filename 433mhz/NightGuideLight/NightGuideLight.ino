/*
Night guidance light, will respond to AzzyRF signal indicating that the door has closed, and respond by turning on an LED for 20 seconds, followed by fade. 
*/

#define ListenST 1
#define CommandST 2
#include <EEPROM.h>

#define rxpin 3
#define CommandForgetTime 10000 

//These set the parameters for transmitting. 

//These set the parameters for receiving; any packet where these criteria are not met is discarded. 
// Version 2.1
#define rxSyncMin 1900 //minimum valid sync length
#define rxSyncMax 2100 //maximum valid sync length
#define rxZeroMin 120 //minimum length for a valid 0
#define rxZeroMax 400 //maximum length for a valid 0
#define rxOneMin 450 //minimum length for a valid 1
#define rxOneMax 750 //maximum length for a valid 1
#define rxLowMax 600 //longest low before packet discarded

unsigned long units[]={1000,60000,900000,14400000,3600000,1,10,86400000}; //units for the 8/12/16-bit time values. 


byte MyAddress=0x00;


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

byte MyState;
unsigned char MyCmd;
unsigned char MyParam;
unsigned char MyExtParam;
unsigned long curTime;
int count=0;
int badcsc=0;
int pksize=32;
//byte TXLength;
unsigned long lastChecksum; //Not the same as the CSC - this is our hack to determine if packets are identical
unsigned long forgetCmdAt; 
//int reccount;

// digital out stuff

// format: (enable)(pwm)pin - enable = 0, disable =1 (so unprogrammed eeprom reads as disabled) 
//byte  digOutOpts[16]={0x09,0x0A,0x0B,0x43,255,255,255,255,255,255,255,255,255,255,255,255};

byte fadeSt;
byte shelfSt;
byte shelfst=0;
unsigned long fadeAt;
unsigned long shelfTimeout;
unsigned long lastShelfBtn;




void setup() {
	//MyAddress=EEPROM.read(0)&0x3F;
	lastPinState=0;
	lastPinLowTime=0;
	lastPinHighTime=0;
	rxdata=0;
	bitsrx=0;
	rxing=0;
	MyState=ListenST;
	//pinMode(btn1,INPUT_PULLUP); //buttons for testing
	//pinMode(btn2,INPUT_PULLUP);
	//pinMode(btn3,INPUT_PULLUP);
	//pinMode(btn4,INPUT_PULLUP);
	//Serial.begin(9600);
	//Serial.println("Startup OK");

}


void loop() {
	curTime=micros();
	if (MyState==ListenST) {
		ClearCMD(); //do the command reset only if we are in listenst but NOT receiving.
		onListenST();
		if (rxing==1){
			return; //don't do anything else while actively receiving.
		}
	} else if (MyState==CommandST){ 
		onCommandST();
	} else {
		MyState=ListenST; //in case we get into a bad state somehow.
	}
	handleButtons();
	handleDigOut();
}

void handleButtons() {
	if (digitalRead(switchPin)==0) {
		if (millis() - lastShelfBtn>100) { //debounce
			if (shelfSt) {
				shelfTimeout=millis(); 
			} else {
				shelfOnAt=millis();
			}
		} 
		lastShelfBtn=millis(); 
	}
}

void handleDigOut() {
	unsigned long curMillis=millis();
	if (curMillis>fadeAt && fadeSt) {
		analogWrite(RED_PIN,fadeSt--);
		fadeAt+=40;
	}
	if (curMillis>shelfTimeout) {
		if (shelfSt) {
			analogWrite(SHELF_PIN,shelfSt--);
			shelfTimeout+=2
		}
	} else if (curMillis>shelfOnTimer){
		if (shelfSt < SHELF_MAX) {
			analogWrite(SHELF_PIN,shelfSt++);
			shelfOnAt+=2
		}
	}
	if (shelfSt==SHELF_MAX || shelfSt==0) {shelfTimeout=0; shelfOnTimer=0;}

}


void onCommandST() {
	switch (MyCmd) {
	case 0xE1: {
		if (MyExtParam==1 && MyParam==0) { //Upstairs door has been closed
			if (analogRead(LDR_PIN) > LDR_THRESH) {
				analogWrite(RED_PIN,RED_MAX);
				fadeAt=millis()+20000;
				fadeSt=255;
			}
		}
	}
		/* falls through */
	default:
		//Serial.print("Invalid command type");
		//Serial.println(MyCmd);
		MyState=ListenST;
	}
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
					//Serial.println("Packet this size not supported");
					resetListen();
					return;
				}
			} else if (bitsrx==8*(1+rxaridx)) {
				txrxbuffer[rxaridx]=rxdata;
				rxdata=0;
				rxaridx++;
				if (rxaridx*8==pksize) {
					//Serial.println("Receive done");
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
	//Serial.println("Parsing");
	unsigned char calccsc=0;
	unsigned char rcvAdd=txrxbuffer[0]&0x3F;
	if (rcvAdd==MyAddress || MyAddress==0) {
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
		    		//Serial.println(MyCmd);
		    		//Serial.println(MyParam);
		    		//Serial.println(MyExtParam);
		    		//Serial.println("Valid transmission received");
		    		//EEPROM.write(0x38,MyCmd);
	    		} else {
	    			//EEPROM.write(0x39,0);
	    			//Serial.println("Bad CSC on 4 byte packet");
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
					//Serial.println(MyCmd);
					//Serial.println(MyParam);
					//Serial.println(MyExtParam);
					//Serial.println("Valid long transmission received");
				} else {
					//Serial.println("Bad CSC on long packet");
				}  
			}
		} //else {
			//Serial.println("Already got it");
		//} 
	} //else {
	    //EEPROM.write(0x39,0);
		//Serial.println("Not for me");
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

/*
//Just for test/debug purposes;
void parseRx2(unsigned char rxd[],byte len) {

	//Serial.println("Parsing long packet");
	for (byte i=0;i<len;i++) {
		//Serial.println(rxd[i]);
	}
	//Serial.println("Done");
}
*/

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
