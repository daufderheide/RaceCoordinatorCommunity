## Race Coordinator Arduino and ESP32 sketch
This repository contains a modified version of the Race Coordinator Arduino sketch.

This version will work on an ESP32 (dev kit only tested) aswell as an Arduino R3/mega, although not all features have been tested i.e. RGB LED and fuel stutter. The code will detect which board is being used and **should** just work for both Arduino and ESP32 without any further code changes.

## Wireless Bluetooth
If you add *#define ESP32_BT* at the start of the sketch then the board will use a Bluetooth serial connection to communicate with RC. The board will then appear as a bluetooth device called **RC Lap Counter**. Connecting the PC to this device will create 2 new COM ports, one of these (probably lower number) can be used as the Arduino address in RC track management.

### Caveats
- Select the Mega board in Race Coordinator since that allows configuration of all pins.
- Do **not** configure pins 6,7,8,9,10 and 11 in the RC configuration screen, ensure they are set to RESERVED. On ESP32 these pins are reserved for flash memory use and will crash the board
- Bluetooth classic is only available on some ESP32 implementation i.e. DevKit with ESP32 and will **not** work on S3 board, C3 board etc.
