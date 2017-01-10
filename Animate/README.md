
Version 7:

API:
/save.cmd?index=...

/load.cmd?index=...

load and save the base configurations to the EEPROM. 

/setScene.cmd?scene=...
Set current scene to specified value

/sceneVect.cmd?...
Run specified scene event in current scene. 

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




