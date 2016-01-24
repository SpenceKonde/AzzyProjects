/*\
*/

#define ListenST 1
#define CommandST 2

#define SerialCmd Serial1
//#define SerialDbg Serial
#define MAX_SER_LEN 10
char serBuffer[MAX_SER_LEN];



const char ROAR[] PROGMEM = {"ROAR"};
const char BOOT[] PROGMEM = {"BOOT"};
const char RESTART[] PROGMEM = {"RESTART"};

//This is just junk to take up space in flash. 
const char ATVERS[] PROGMEM = {"AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERS?"};
const char ATJUNK[] PROGMEM = {"AT+VERST+VERasdRST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERS?"};
const char ATJUNK2[] PROGMEM = {"AT+VERST+VERasdRST+VERST+VERST+VERST+VERST+VERST+VERSjfhgjghfjfhgjhgfjfhg4647565645ERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERS?"};
const char ATJUNK3[] PROGMEM = {"AT+VERST+VERasdRST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+V234wer46redfgsdfgVERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERS?"};
const char ATJUNK4[] PROGMEM = {"AT+VERST+VERasdRST+VERST+VERST+VERST+VERSTasdfasdfsdfasdfasdfasdfasdfasdfasdfT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+AT+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERST+VERS?"};

byte SerRXidx;
unsigned long lastSer = 0;
byte SerRXmax;
byte SerCmBuff[16];
byte SerCmd;
byte rxing =0;
char * pEnd; //dummy pointer for sto
//void (*boot)(void)=0xF000;
//void *bl = (void *) 0x1D00;

#define bootaddr 0x3a00

void setup() {
  pinMode(1,INPUT_PULLUP);
  pinMode(13,OUTPUT);
  SerialCmd.begin(19200);
  SerialCmd.println("FUCK");
  delay(1000);    
}


void loop() {
  static unsigned long blinkAt = 0;
  static int ledst=0;
  if ((millis()-blinkAt) > 200) {
  digitalWrite(13,ledst);
  ledst=!ledst;
  blinkAt=millis();
  }
    processSerial();
    
}



void processSerial() {
  static char minb[3] = {0, 0, 0};
  static byte ndx = 0;
  char endMarker = '\r';
  char endMarker2 = '\n';
  while (SerialCmd.available() > 0) {
      char rc = SerialCmd.read();
      if (rc != endMarker && rc != endMarker2) {
        serBuffer[SerRXidx] = rc;
        SerRXidx++;
        if (SerRXidx >= MAX_SER_LEN) {
          SerRXidx = 0;
          //SerialCmd.println(F("ERROR"));
          SerialCmd.println(serBuffer);
          resetSer();
        }
      } else {
        if (SerRXidx) { //index 0? means it's a \r\n pattern.
          serBuffer[SerRXidx] = '\0'; // terminate the string
          SerRXidx = 0;
          checkCommand();
        }
      }
    
    lastSer = millis();
  }
}

void checkCommand() {
  if (strcmp_P (serBuffer, ROAR) == 0) {
    SerialCmd.println("ROsdfAR");
  } else if (strcmp_P (serBuffer, BOOT) == 0) {
    //SerialCmd.println("EBL");
    delay(500); 
    //UDR0=0;
    //boot();
    //((void (*)())0x1FC00)();
    //((void(*)())0x3a00)();
    //goto *bl;
    //CCP = 0xD8;            // UNLOCK SIGNATURE CHAGE IN PROTECTED I/O
    //WDTCSR = 8;
    //while(1);
    asm volatile ("  jmp 0x3F800");
    //((void (*)())0x1FC00)();
    //asm volatile ("  jmp 0");
  } else if (strcmp_P (serBuffer, RESTART) == 0) {
    SerialCmd.println("REBOOTING");
    delay(500); 
    asm volatile ("  jmp 0");
    //comment out from here 
    //--------------------
  //} else if (strcmp_P(serBuffer,ATVERS)==0) { //this can never be called in practice, because the gibberish string is far longer than MAX_SER_LEN - this is just to fool the compiler into storing all this crap in flash to make the program larger, so I could make sure it was doing erases properly. 
    //delay(200);
    //SerialCmd.println(ATJUNK);
    //SerialCmd.println(ATJUNK2);
    //SerialCmd.println(ATJUNK3);
    //SerialCmd.println(ATJUNK4);
  //-----------------------
  //to here to generate a smaller binary.  
  }
  resetSer();


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


