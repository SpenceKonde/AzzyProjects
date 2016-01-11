/*\
*/

#define ListenST 1
#define CommandST 2

//Pin definitions:

//pins 0,1: Serial
//pins 15,16: Serial1 (programming only)
//pins 16,12: I2C

#define SerialCmd Serial
#define SerialDbg Serial1
#define MAX_SER_LEN 10
char serBuffer[MAX_SER_LEN];



const char ROAR[] PROGMEM = {"ROAR"};
const char REBOOT[] PROGMEM = {"BOOT"};
const char RESTART[] PROGMEM = {"RESTART"};
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
  pinMode(1,INPUT_PULLUP);
  SerialCmd.Begin(9600);
  SerialCmd.println("ROAR");
  delay(1000);  
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
    
    lastSer = millis();
  }
}

void checkCommand() {
  if (strcmp_P (serBuffer, ROAR) == 0) {
    SerialCmd.println("ROAR");
  } else if (strcmp_P (serBuffer, BOOT) == 0) {
    SerialCmd.println("ENTERING BOOTLOADER");
    delay(500); 
    asm volatile ("  jmp 0x3900");
  } else if (strcmp_P (serBuffer, RESTART) == 0) {
    SerialCmd.println("REBOOTING");
    delay(500); 
    asm volatile ("  jmp 0");
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


