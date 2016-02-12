
Version 4:

API:
/saveBase.cmd?eeprom=...&address=...&len=...
/loadBase.cmd?eeprom=...&address=...&len=...

load and save the base configurations to the EEPROM. 
len is the length that should be assumed (in terms of number of LEDs) for the purpose of spacing the writes on the EEPROM (eg, to make sure things line up on page boundaries, etc. 
Address is the address of the start of the data. 

/showState.cmd
output the current state in json format

/setAll.cmd?base=[r:g:b]&mode=[r:g:b]&min=[r:g:b]&max=[r:g:b]

/setPixel.cmd?led=...&base=[r:g:b]&mode=[r:g:b]&min=[r:g:b]&max=[r:g:b]
led is the number of the LED for setPixel()

base, mode, max and min are the base color, and twinkle parameters. 


Animation Modes:
Animation modes are set globally. 

Twinkle Modes:
Twinkle mode is set on a per color channel basis, 




