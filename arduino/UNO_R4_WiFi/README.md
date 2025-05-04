## Race Coordinator Arduino UNO R4 WiFi sketch
This repository contains a modified version of the Race Coordinator Arduino sketch that supports use of an Arduino UNO R4 WiFi.

This sketch supports Arduino UNO R4 WiFi as well as Arduino UNO R3 / Mega.  The code will detect which board is being used (based on the Arduino IDE) and **should** just work without any further code changes.

The sketch also supports Espressif Systems' ESP32 DevKit.  ESP32 code was obtained from SlotForum member Slingshotx; refer to the lapCounter_and_ESP32 folder for the latest ESP32 code, instructions and any caveats.

## REQUIRES Race Coordinator Version 1.15.3.0 and up
The serial port implemenation in the Arduino UNO R4 WiFi is different than previous versions of the UNO.  The UNO R4 WiFi's serial-over-USB communication requires that serial Data Terminal Ready (DTR) be enabled; RC version 1.15.3.0 is the first version of the appliication to support this.

## REQUIRES Modified Arduino IDE Environment
There are bugs in the current implementation of UNO R4 UART code that prevent correct operation with Race Coordinator.  Until fixes to those bugs get incorporated into the Arduino UNO R4 board package, you will need to make the following changes to your Arduino IDE code development environment:

-  Open the Arduino IDE. Once the IDE is up and running, in the Arduino IDE Board Manager, load/select Arduino R4 board package version 1.2.0.  The files you will install in the next two steps are specific to UNO R4 board package version 1.2.0.
-  Download files IRQManager.cpp, serial.cpp and serial.h;.  On the Windows PC running Race Coordinator, copy them to folder C:\Users\YourUserName\AppData\Local\Arduino15\packages\arduino\hardware\renesas_uno\1.2.0\cores\arduino .  [Make sure to change YourUserName above to whatever your PC user name is]
-  Download file HardwareSerial.h; , On the Windows PC running Race Coordinator, copy the file to folder C:\Users\YourUserName\AppData\Local\Arduino15\packages\arduino\hardware\renesas_uno\1.2.0\cores\arduino\api .  [Make sure to change YourUserName above to whatever your PC user name is]
-  Download file lapCounter_UNOR4WiFi.ino, rename it to lapCounter.ino, and use the Arduino IDE to verify/upload as you would any other RC sketch. You may need to install library ArduinoGraphics in order to eliminate verify errors.
