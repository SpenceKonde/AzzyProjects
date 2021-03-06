## Purpose
This uses an attiny4313 or 2313 to control a Futaba display like the NA202SD08FA, which takes data over an 8-bit parallel databus with a write latch and reset pin - based on serial (UART) data. Note that this is for boards that don't emulate the HD44780 (with several more pins and the option to use a 4-bit databus). For those boards, the ubiquitous HD44780 I2C backpacks are more appropriate.

## Wiring
PB0 through PB7 go to D0 through D7 on the display, PD6 goes to Write Latch, PB2 to Reset (not used). 
Connect to serial port at 19200 baud. All characters are passed through to the display, including control characters. 

See Futaba datasheet for list of control characters and what they do. 

By Spence Konde (Dr. Azzy) 2017

drazzy.com/e 

Tindie.com/stores/drazzy

github.com/SpenceKonde 

