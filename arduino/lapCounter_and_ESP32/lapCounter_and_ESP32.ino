/*
   Arduino slot car lap sensor

   I/O Sketch - V1.0.0.13

   The Race Coordinator Arduino sketch is covered by the Creative Commons - Attribution-NonCommercial-ShareAlike 4.0 International license.
   Copyright 2014 by Dave Aufderheide and Kevin Gee.  All rights reserved.
   If you find this sketch and corresponding wiring suggestions useful please
   consider making a donation to the RC charity
   http://racecoordinator.net/charity.html

   This is a human-readable summary of (and not a substitute for) the license which can be found here:
   http://creativecommons.org/licenses/by-nc-sa/4.0/legalcode

   You are free to:

   Share — copy and redistribute the material in any medium or format
   Adapt — remix, transform, and build upon the material
   The licensor cannot revoke these freedoms as long as you follow the license terms.
   Under the following terms:

   Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
   NonCommercial — You may not use the material for commercial purposes.
   ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.
   No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.
   Notices:

   You do not have to comply with the license for elements of the material in the public domain or where your use is permitted by an applicable exception or limitation.
   No warranties are given. The license may not give you all of the permissions necessary for your intended use. For example, other rights such as publicity, privacy, or moral rights may limit how you use the material.

   For complete license details please visit:
   http://creativecommons.org/licenses/by-nc-sa/4.0/
*/

// Use Bluetooth for a standard ESP32 (not s2 or c3 etc) needs to support Bluetooth 4
#define ESP32_BT

// Required for ESP32 only (defined by compiler when selecting board in IDE)
#ifdef ESP32
#ifdef ESP32_BT
#include "BluetoothSerial.h"
BluetoothSerial SerialBT;
#define Serial SerialBT
#endif
#else
#define WITH_WATCH_DOG
#endif

//#define WITH_FAST_LED
//#define WITH_FUEL_STUTTER
//#define WITH_SERIAL_DEBUG

#ifdef WITH_WATCH_DOG
#include <avr/wdt.h>
#endif

#ifdef WITH_FAST_LED
#include <FastLED.h>
#endif

#define BT_TRACK_NAME "RC Lap Counter"

const byte term = 0x3B;  // ;

// Version is "major"."minor"."patch"."drop"
// V1.0.0.13
const byte rcVersion[] = { 0x56, 0x01, 0x00, 0x00, 0x0d, term };

// Setting for the baud rate RC will run at 115200
const long iBaudRate = 115200;
// For WAVGAT boards set this baudrate in the sketch and
// connect to the board at 9600.  My money says timing 
// will be 4x off so we'll likely have to adjust timing 
// in the sketch
//const long iBaudRate = 38400;

// Bytes for messages
const byte resetRequest = 0x52;  // R
const byte pinModeRequest = 0x50;  // P
const byte writeRequest = 0x4F;  // O
const byte analogRequest = 0x41;  // A
const byte digitalRequest = 0x44;  // D

// Extended protocol
const byte extendedRequest = 0x45;    // E
// Extended protocol sub-commands
const byte extRaceState = 0;
const byte extHeatLeader = 1;
const byte extHeatStandings = 2;
const byte extFuel = 3;
const byte extRefueling = 4; 
const byte extRaceTime = 5;
const byte extDeslot = 6;
const byte extLapPerformance = 7;

const byte getInfoRequest = 0x47;  // G
const byte versionRequest = 0x56;  // V
const byte timeResetRequest = 0x54;  // T
const byte debounceRequest = 0x64;  // d
const byte ledModeRequest = 0x6C;  // l
const byte ledWriteRequest = 0x4C;  // L

byte timeResponse[] = { 0x54, 0x00, 0x00, 0x00, 0x00, 0, term };

byte inputChanged[] = { 0x49, 0xFF, 0xFF, 0xFF, term };

// Unknown
const byte getInfo[] = { 0x47, 0x3F, 0xFF, 0xFF, term };  // G ? -1 -1 ;
// Trinket
//const byte getInfo[] = {0x47, 0x54, 0x05, 0x00, term};  // G T 5 0 ;
// Nano
//const byte getInfo[] = {0x47, 0x4E, 0x08, 0x0E, term};  // N N 8 14 ;
// Uno
//const byte getInfo[] = {0x47, 0x55, 0x06, 0x0E, term};  // G U 6 14 ;
// Mega
//const byte getInfo[] = {0x47, 0x4D, 0x10, 0x36, term};  // G M 16 54 ;

int iPinSignal = HIGH;
int iNumReadPins = 0;
int* pReadPins = NULL;
int* pLastReadSignal = NULL;

unsigned long ulDebounceHighUs = 0;
unsigned long ulDebounceLowUs = 0;
int* pDebounceState = NULL;
int* pDebounceNextState = NULL;
unsigned long* pDebounceTime = NULL;

#ifdef WITH_FUEL_STUTTER

// TODO: WITH_FUEL_STUTTER: Set these to the values you want
#define FUEL_NUM_LANES 4
#define FUEL_ON_TIME_US  (1000L * 1000L)
#define FUEL_OFF_TIME_US (1000L * 1000L)
#define FUEL_POWER_ON HIGH
#define FUEL_POWER_OFF LOW

boolean fuelHeatInProgress;
boolean fuelOOF[FUEL_NUM_LANES];
boolean fuelPowerOn[FUEL_NUM_LANES];
long fuelTimeUs[FUEL_NUM_LANES];
byte fuelRelayPin[FUEL_NUM_LANES];
byte fuelRCPower[FUEL_NUM_LANES];
#endif

boolean bReset = true;
int iNumWritePins = 0;

// inBuffer will hold any requests made by RC i.e. power control
byte inBuffer[512];
int iReadCount = 0;
boolean bRead = false;

// Hw timing
unsigned long ulPrevHwTimeUs;

// Just keep track of last keepAlive signal
unsigned long ulPrevPingUs;
unsigned long ulPingTimeUs = 1000000UL;
#ifdef WITH_SERIAL_DEBUG
#define INT_TO_TXT_CONVERSION  + '0'
#define TXT_TO_INT_CONVERSION  - '0'

#define SERIAL_PRINT(x) Serial.print(x);
#define SERIAL_PRINTLN(x) Serial.println(x);
#else
#define INT_TO_TXT_CONVERSION
#define TXT_TO_INT_CONVERSION

#define SERIAL_PRINT(x)
#define SERIAL_PRINTLN(x)
#endif

unsigned long ulCurDebounceUs;

#ifdef WITH_FAST_LED
// RGB pixels
#define MAX_RGB_LED_STRINGS 4
#define STRING_PIN_1  A0
#define STRING_PIN_2  A1
#define STRING_PIN_3  A2
#define STRING_PIN_4  A3

// Here's all the types of leds FastLed supports.  There are actually others that require a CLOCK pin
// that we could support but as of right now I didn't bother.
//  #define LED_TYPE_1 TM1803
//  #define LED_TYPE_1 TM1804
//  #define LED_TYPE_1 TM1809
//  #define LED_TYPE_1 WS2811
//  #define LED_TYPE_1 WS2812
//  #define LED_TYPE_1 WS2812B
//  #define LED_TYPE_1 APA104
//  #define LED_TYPE_1 UCS1903
//  #define LED_TYPE_1 UCS1903B
//  #define LED_TYPE_1 GW6205
//  #define LED_TYPE_1 GW6205_400

#define LED_TYPE_1 WS2811
#define LED_TYPE_2 WS2811
#define LED_TYPE_3 WS2811
#define LED_TYPE_4 WS2811

// Comment in LED_TYPE_1 through LED_TYPE_4 and set them to the correct value.  Then comment in
// these 4 macros, OR leave these 4 macros commented out and comment in the 4 NEOPIXEL macros
// which are basically WS2811 with the color format set to GRB.
//#define SETUP_LED_1(leds, numLeds) FastLED.addLeds<LED_TYPE_1, STRING_PIN_1, RGB>(leds, numLeds);
//#define SETUP_LED_2(leds, numLeds) FastLED.addLeds<LED_TYPE_2, STRING_PIN_2, RGB>(leds, numLeds);
//#define SETUP_LED_3(leds, numLeds) FastLED.addLeds<LED_TYPE_3, STRING_PIN_3, RGB>(leds, numLeds);
//#define SETUP_LED_4(leds, numLeds) FastLED.addLeds<LED_TYPE_4, STRING_PIN_4, RGB>(leds, numLeds);

#define SETUP_LED_1(leds, numLeds) FastLED.addLeds<NEOPIXEL, STRING_PIN_1>(leds, numLeds);
#define SETUP_LED_2(leds, numLeds) FastLED.addLeds<NEOPIXEL, STRING_PIN_2>(leds, numLeds);
#define SETUP_LED_3(leds, numLeds) FastLED.addLeds<NEOPIXEL, STRING_PIN_3>(leds, numLeds);
#define SETUP_LED_4(leds, numLeds) FastLED.addLeds<NEOPIXEL, STRING_PIN_4>(leds, numLeds);

typedef struct {
  int numLeds;
  CRGB* leds;
} s_rgbLedString;
s_rgbLedString rgbLedStrings[MAX_RGB_LED_STRINGS];
CLEDController* rgbLedControllers[MAX_RGB_LED_STRINGS];
byte rgbLedBrightness[MAX_RGB_LED_STRINGS];
int rgbLedUpdateRateMs = 20;
boolean rgbLedUpdateString[MAX_RGB_LED_STRINGS];
unsigned long rgbLedUpdateTime;
boolean rgbLedInit = false;
#endif

/*
   Setup on start configure input pins for track sensors
*/
void setup()
{
#ifdef ESP32_BT
  Serial.begin(BT_TRACK_NAME);  
#else
  Serial.begin(iBaudRate);
#endif

  // If the Leonardo or Micro is used,
  // wait for the serial monitor to open.
  while (!Serial);

  SERIAL_PRINT("Num Read Pins: ");
  SERIAL_PRINTLN(iNumReadPins);

  SERIAL_PRINT("A0 = ");
  SERIAL_PRINT(A0);
  SERIAL_PRINT(", A5 = ");
  SERIAL_PRINTLN(A5);

  // First send the version number
  sendVersion();

#ifdef WITH_FAST_LED
  // Mark all the rgb leds as unused
  for (int i = 0; i < MAX_RGB_LED_STRINGS; i++) {
    if (rgbLedStrings[i].numLeds > 0 && rgbLedInit) {
      free(rgbLedStrings[i].leds);
    }
    rgbLedStrings[i].numLeds = 0;
    rgbLedUpdateString[i] = false;
  }
  rgbLedInit = true;
  rgbLedUpdateTime = 0xffffffff;
#endif

#ifdef WITH_FUEL_STUTTER
  // TODO: WITH_FUEL_STUTTER: 
  // This puts the lane relays on pins D2-D5, change
  // this to your pin configuration as needed.  Make sure
  // to comment in/out any lanes you are/are not using.
  // The defaults here are assuming a 4 lane track.
  fuelRelayPin[0] = 2;  // Lane 1
  fuelRelayPin[1] = 3;  // Lane 2
  fuelRelayPin[2] = 4;  // Lane 3
  fuelRelayPin[3] = 5;  // Lane 4
//  fuelRelayPin[4] = 6;  // Lane 5
//  fuelRelayPin[5] = 7;  // Lane 6
//  fuelRelayPin[6] = 8;  // Lane 7
//  fuelRelayPin[7] = 9;  // Lane 8

  fuelHeatInProgress = false;
  for (int i = 0; i < FUEL_NUM_LANES; i++) {
    fuelOOF[i] = false;
    fuelPowerOn[i] = false;
    fuelTimeUs[i] = 0;
    fuelRCPower[i] = FUEL_POWER_OFF;
    pinMode(fuelRelayPin[i], OUTPUT);
  }

  
#endif

  ulPrevHwTimeUs = micros();
  // Force an immediate ping
  ulPrevPingUs = ulPrevHwTimeUs - ulPingTimeUs;
  sendPing();

  ulCurDebounceUs = micros();
}

/*
   Main loop for processing lap counting
*/

unsigned long ulStartMs = 0;
unsigned long ulLoopCnt = 0;

#ifdef WITH_FUEL_STUTTER
void stutterRelays(unsigned long ulDeltaUs) {  
  if (fuelHeatInProgress) {
    for (int i = 0; i < FUEL_NUM_LANES; i++) {
      // Fuel Stuttering only occurs if RC wants the power
      // on for a lane.  Otherwise don't touch it.
      if (fuelRCPower[i] == FUEL_POWER_ON) {
        if (fuelOOF[i]) {
          fuelTimeUs[i] -= ulDeltaUs;
          if (fuelTimeUs[i] < 0) {
            if (fuelPowerOn[i]) {
              // Turn power off
              fuelTimeUs[i] = FUEL_OFF_TIME_US;
              fuelPowerOn[i] = false;
              digitalWrite(fuelRelayPin[i], FUEL_POWER_OFF);
            }
            else {
              // Turn power on
              fuelTimeUs[i] = FUEL_ON_TIME_US;
              fuelPowerOn[i] = true;
              digitalWrite(fuelRelayPin[i], FUEL_POWER_ON);
            }
          }
        }
        else {
          if (!fuelPowerOn[i]) {
            // Turn power on
            fuelTimeUs[i] = FUEL_ON_TIME_US;
            fuelPowerOn[i] = true;
            digitalWrite(fuelRelayPin[i], FUEL_POWER_ON);
          }
        }
      }
    }
  }
}
#endif

void loop()
{
  // Need micros for debounce and milis for timing data
  // TODO: consider calling micros and milis rather than
  // the divide.  There's a good chance the divide is more
  // expensive than the milis call...  we'll see
  unsigned long ulCurTimeUs = micros();
  unsigned long ulDeltaUs = ulCurTimeUs - ulCurDebounceUs;
  ulCurDebounceUs = ulCurTimeUs;

  unsigned long ulCurTimeMs = ulCurTimeUs / 1000;

  for (int i = 0; i < iNumReadPins; i++) {
    handleDebounce(i, ulCurTimeUs, ulDeltaUs);
    iPinSignal = digitalRead(pReadPins[i]);

    // Send if the input has changed or
    // this is the first time through the loop
    if (bReset) {
      sendStateChange(i, iPinSignal, ulCurTimeMs);
    }
    else if (iPinSignal != pLastReadSignal[i]) {
      setupStateChange(i, iPinSignal, ulCurTimeMs);
    }
    pLastReadSignal[i] = iPinSignal;
  }
  bReset = false;

  serialEvent();
  // If there is some data from RC to process do it here
  if (bRead)
  {
    processMessage();
  }
#ifdef WITH_FAST_LED
  else if (ulCurTimeMs >= rgbLedUpdateTime) {
    // NOTE: We've seen that if we try to update the pixels too fast
    // that crazy things happen.  So we'll make sure we don't update
    // them faster than 10ms and we'll only update them if we didn't
    // read anything from the serial port.  This should allow us to
    // read any transient led updates from RC and still refresh the
    // pixels fast enough so you can't actually tell we may delay
    // the update.
    rgbLedUpdateTime = 0xffffffff;
    for (int i = 0; i < MAX_RGB_LED_STRINGS; i++) {
      if (rgbLedUpdateString[i]) {
        rgbLedControllers[i]->showLeds(rgbLedBrightness[i]);
        rgbLedUpdateString[i] = false;

        // Only update 1 led string every 10 ms
        rgbLedUpdateTime = ulCurTimeMs + rgbLedUpdateRateMs;
        break;
      }
    }
  }
#endif

#ifdef WITH_FUEL_STUTTER
  stutterRelays(ulDeltaUs);
#endif

  keepAlive();

#ifdef WITH_SERIAL_DEBUG
  ulLoopCnt++;
  if (ulLoopCnt == 50000) {
    unsigned long endMs = millis();
    unsigned long timeMs = endMs - ulStartMs;

    SERIAL_PRINT("Avg Poll time: ");
    SERIAL_PRINT((timeMs / (float)ulLoopCnt));
    SERIAL_PRINTLN("ms");

    ulStartMs = endMs;
    ulLoopCnt = 0;
  }
#endif
}

void handleDebounce(int pinIndex, unsigned long ulCurTimeMs, unsigned long ulDeltaUs) {
  if (pDebounceTime[pinIndex] != 0xffffffff) {
    // Currently debouncing this pin
    pDebounceTime[pinIndex] += ulDeltaUs;

    unsigned long time = ulDebounceHighUs;
    if (pDebounceNextState[pinIndex] == LOW) {
      time = ulDebounceLowUs;
    }

    if (pDebounceTime[pinIndex] >= time) {
      // State confirmed
      SERIAL_PRINT("Pin ");
      SERIAL_PRINT(pReadPins[pinIndex]);
      SERIAL_PRINT(" state changed confirmed to ");
      SERIAL_PRINT(pDebounceNextState[pinIndex]);
      SERIAL_PRINT(" with debounce time of ");
      SERIAL_PRINT(pDebounceTime[pinIndex]);
      SERIAL_PRINTLN("us");

      sendStateChange(pinIndex, pDebounceNextState[pinIndex], ulCurTimeMs);
      pDebounceState[pinIndex] = pDebounceNextState[pinIndex];
      pDebounceTime[pinIndex] = 0xffffffff;
    }
  }
}

void sendVersion()
{
    Serial.write(rcVersion, sizeof(rcVersion));
}

void sendStateChange(int pinIndex, int pinState, unsigned long ulCurTimeMs) {
  SERIAL_PRINT("Pin ");
  SERIAL_PRINT(pReadPins[pinIndex]);
  SERIAL_PRINT(" changed, was ");
  SERIAL_PRINT(pLastReadSignal[pinIndex]);
  SERIAL_PRINT(", is ");
  SERIAL_PRINT(iPinSignal);
  SERIAL_PRINT(" at time ");
  SERIAL_PRINTLN(ulCurTimeMs);

  // Set the signal in the message
  byte pinType = 0x44;
  byte pin = pReadPins[pinIndex];
  if (pReadPins[pinIndex] >= A0) {
    // Analog pin
    pinType = 0x41;
    pin -= A0;
  }

  sendTime(ulCurTimeMs);

  pDebounceState[pinIndex] = pinState;
  pDebounceNextState[pinIndex] = pinState;
  pDebounceTime[pinIndex] = 0xffffffff;

  // Force pin value to 0 or 1.  This is probably
  // not needed, but it's what RC is looking for
  if (pinState == HIGH) {
    pinState = 1;
  }
  else {
    pinState = 0;
  }

  inputChanged[1] = pinType;
  inputChanged[2] = pin;
  inputChanged[3] = pinState;

  // TODO: Handle debounce, make sure one way or the other
  // to force the write if bReset is true...
  // TODO: Probably only debounce digital pins
  Serial.write(inputChanged, sizeof(inputChanged));
}

void setupStateChange(int pinIndex, int pinState, unsigned long ulCurTimeMs) {
  if (pinState == pDebounceState[pinIndex]) {
    // Pin bounced
    SERIAL_PRINT("Pin ");
    SERIAL_PRINT(pReadPins[pinIndex]);
    SERIAL_PRINT(" bounced back to ");
    SERIAL_PRINT(pinState);
    SERIAL_PRINT(" with bounce time ");
    SERIAL_PRINTLN(pDebounceTime[pinIndex]);

    pDebounceNextState[pinIndex] = pinState;
    pDebounceTime[pinIndex] = 0xffffffff;
  }
  else if (pinState != pDebounceNextState[pinIndex]) {
    pDebounceNextState[pinIndex] = pinState;
    pDebounceTime[pinIndex] = 0;

    SERIAL_PRINT("Pin ");
    SERIAL_PRINT(pReadPins[pinIndex]);
    SERIAL_PRINT(" setting up debounce to state ");
    SERIAL_PRINTLN(pinState);
  }
  else {
    // Should never be here, this would mean we're trying
    // to change states to the state we're already debouncing
    // which shouldn't be possible.
    SERIAL_PRINT("ERROR: Pin ");
    SERIAL_PRINT(pReadPins[pinIndex]);
    SERIAL_PRINT(" changing state to same state we're already debouncing: ");
    SERIAL_PRINTLN(pinState);
  }
}

/*
   Process any requests from RC
*/
void processMessage()
{
  SERIAL_PRINTLN("");
  SERIAL_PRINT("PM Opcode: ");
  SERIAL_PRINTLN(inBuffer[0]);

  switch (inBuffer[0]) {
    // Process Reset
  case resetRequest:
    // RESET
    if (inBuffer[1] == 0x45 && inBuffer[2] == 0x53 && inBuffer[3] == 0x45 && inBuffer[4] == 0x54)
    {
      SERIAL_PRINTLN("");
      SERIAL_PRINTLN("Handle Reset");
      softwareReboot();
    }
    break;

#ifdef WITH_FAST_LED
    // Process RGB led setup
  case ledModeRequest:
  {
    SERIAL_PRINTLN("");
    SERIAL_PRINT("Setting LED Pin mode: ");
    SERIAL_PRINTLN(inBuffer[1])

      byte stringNum = inBuffer[1] TXT_TO_INT_CONVERSION;
    byte numLeds = inBuffer[2] TXT_TO_INT_CONVERSION;
    if (stringNum < MAX_RGB_LED_STRINGS && numLeds > 0) {
#ifdef WITH_SERIAL_DEBUG
      rgbLedBrightness[stringNum] = 64;
#else
      rgbLedBrightness[stringNum] = inBuffer[3];
      rgbLedUpdateRateMs = inBuffer[4];
      rgbLedUpdateRateMs |= (inBuffer[5] << 8);
#endif          
      SERIAL_PRINTLN("");
      SERIAL_PRINT("Led String ");
      SERIAL_PRINT(stringNum);
      SERIAL_PRINT(", numLeds ");
      SERIAL_PRINT(numLeds);
      SERIAL_PRINTLN(" enabled");

      bool needsController = false;
      if (numLeds > rgbLedStrings[stringNum].numLeds) {
        needsController = true;
        if (rgbLedStrings[stringNum].numLeds > 0) {
          free(rgbLedStrings[stringNum].leds);
        }
        rgbLedStrings[stringNum].numLeds = numLeds;
        rgbLedStrings[stringNum].leds = (CRGB*)malloc(sizeof(CRGB) * numLeds);
      }

      for (int i = 0; i < rgbLedStrings[stringNum].numLeds; i++) {
        rgbLedStrings[stringNum].leds[i] = CRGB::Black;
      }

      if (needsController) {
        switch (stringNum) {
        case 0:
          rgbLedControllers[stringNum] = &SETUP_LED_1(rgbLedStrings[stringNum].leds, rgbLedStrings[stringNum].numLeds);
          break;
        case 1:
          rgbLedControllers[stringNum] = &SETUP_LED_2(rgbLedStrings[stringNum].leds, rgbLedStrings[stringNum].numLeds);
          break;
        case 2:
          rgbLedControllers[stringNum] = &SETUP_LED_3(rgbLedStrings[stringNum].leds, rgbLedStrings[stringNum].numLeds);
          break;
        case 3:
          rgbLedControllers[stringNum] = &SETUP_LED_4(rgbLedStrings[stringNum].leds, rgbLedStrings[stringNum].numLeds);
          break;
        }
      }
    }
  }
  break;

  case ledWriteRequest:
  {
    byte stringNum = inBuffer[1] TXT_TO_INT_CONVERSION;
    byte numUpdates = inBuffer[2] TXT_TO_INT_CONVERSION;
    if (stringNum < MAX_RGB_LED_STRINGS) {
      SERIAL_PRINTLN("");
      SERIAL_PRINT("Setting pixels on led string ");
      SERIAL_PRINT(stringNum);
      SERIAL_PRINT(" with ");
      SERIAL_PRINT(numUpdates);
      SERIAL_PRINTLN(" updates");

      int bufferIndex = 3;
      for (int i = 0; i < numUpdates; i++) {
        byte pixel = inBuffer[bufferIndex + 0] TXT_TO_INT_CONVERSION;
        byte r = inBuffer[bufferIndex + 1] TXT_TO_INT_CONVERSION;
        byte g = inBuffer[bufferIndex + 2] TXT_TO_INT_CONVERSION;
        byte b = inBuffer[bufferIndex + 3] TXT_TO_INT_CONVERSION;
        bufferIndex += 4;

        if (pixel < rgbLedStrings[stringNum].numLeds) {
#ifdef WITH_SERIAL_DEBUG
          r *= 255;
          g *= 255;
          b *= 255;
#endif
          SERIAL_PRINT("Setting Pixel: ");
          SERIAL_PRINT(pixel);
          SERIAL_PRINT(" [");
          SERIAL_PRINT(r);
          SERIAL_PRINT(", ");
          SERIAL_PRINT(g);
          SERIAL_PRINT(", ");
          SERIAL_PRINT(b);
          SERIAL_PRINTLN("]");

          rgbLedStrings[stringNum].leds[pixel].r = r;
          rgbLedStrings[stringNum].leds[pixel].g = g;
          rgbLedStrings[stringNum].leds[pixel].b = b;
        }
      }

      // Wait a small amount of time before updating the strings so that
      // we can filter out transients from RC and make sure we don't spam
      // the leds too hard.
      // NOTE: if rgbLedUpdateTime != 0xffffffff we should consider not
      // updating this time.  But the rate RC updates the leds should not
      // be this fast and we're trying to avoid transients so for now this
      // is fine.
      rgbLedUpdateTime = millis() + rgbLedUpdateRateMs;
      rgbLedUpdateString[stringNum] = true;
    }
  }
  break;
#endif

  // Process pin modes
  case pinModeRequest:
    if (inBuffer[1] == 0x49) {
      // Read pins
      SERIAL_PRINTLN("");
      SERIAL_PRINTLN("Read Pin Modes");

      // Free the old setup if it existed
      if (pReadPins != NULL) {
        free(pReadPins);
        free(pLastReadSignal);

        free(pDebounceState);
        free(pDebounceNextState);
        free(pDebounceTime);
      }

      // Setup the new configuration
      iNumReadPins = inBuffer[2] TXT_TO_INT_CONVERSION;
      pReadPins = (int*)malloc(iNumReadPins * sizeof(int));
      pLastReadSignal = (int*)malloc(iNumReadPins * sizeof(int));

      pDebounceState = (int*)malloc(iNumReadPins * sizeof(int));
      pDebounceNextState = (int*)malloc(iNumReadPins * sizeof(int));
      pDebounceTime = (unsigned long*)malloc(iNumReadPins * sizeof(unsigned long));

      int iBufIndex = 3;
      for (int i = 0; i < iNumReadPins; i++) {
        pDebounceState[i] = HIGH;
        pDebounceNextState[i] = HIGH;
        pDebounceTime[i] = 0xffffffff;

        pLastReadSignal[i] = HIGH;
        int mode = INPUT_PULLUP;
        int pin = inBuffer[iBufIndex + 1] TXT_TO_INT_CONVERSION;

        if (inBuffer[iBufIndex] == 0x41) {
          // Analog pin
          pin += A0;
        }

        pReadPins[i] = pin;
        iBufIndex += 2;
        pinMode(pin, mode);
      }
      // Force send the initial pin states
      bReset = true;
    }
    else {
      // Write pins
      SERIAL_PRINTLN("");
      SERIAL_PRINTLN("Write Pin Modes");

      iNumWritePins = inBuffer[2] TXT_TO_INT_CONVERSION;
      int iBufIndex = 3;
      for (int i = 0; i < iNumWritePins; i++) {
        int pin = inBuffer[iBufIndex + 1] TXT_TO_INT_CONVERSION;
        if (inBuffer[iBufIndex] == 0x41) {
          // Analog pin
          pin += A0;
        }

        SERIAL_PRINTLN("");
        SERIAL_PRINT("Write pin:");
        SERIAL_PRINTLN(pin);

        iBufIndex += 2;
        pinMode(pin, OUTPUT);
      }
    }
    break;

    // Process write requests
  case writeRequest:
  {
    int pin = inBuffer[2] TXT_TO_INT_CONVERSION;      
    if (inBuffer[1] == 0x41) {
      // Write to an analog pin
      pin += A0;
    }

    byte state = inBuffer[3] TXT_TO_INT_CONVERSION;
#ifdef WITH_FUEL_STUTTER
    // Check if this is a per lane relay pin, if so,
    // figure out what to do    
    boolean fuelPin = false;
    for (int i = 0; i < FUEL_NUM_LANES; i++) {
      if (fuelRelayPin[i] == pin) {
        // This is a fuel relay pin
        fuelPin = true;
        fuelRCPower[i] = state;

        if (state == FUEL_POWER_OFF) {
          fuelPowerOn[i] = false;
          fuelTimeUs[i] = 0;                
        }
        
        break;
      }
    }

    // Let the stutter code handle turning the relay back on
    if (fuelPin && state == FUEL_POWER_ON) {
      break;
    }
#endif

    digitalWrite(pin, inBuffer[3] TXT_TO_INT_CONVERSION);

    SERIAL_PRINTLN("");
    SERIAL_PRINT("Write Pin: ");
    SERIAL_PRINT(pin);
    SERIAL_PRINT(" to ");
    SERIAL_PRINTLN(inBuffer[3] TXT_TO_INT_CONVERSION);
  }
  break;

  case getInfoRequest:
  {
    Serial.write(getInfo, sizeof(getInfo));
  }
  break;

  case versionRequest:
  {
    Serial.write(rcVersion, sizeof(rcVersion));
  }
  break;

  case timeResetRequest:
  {
    // Note: RC does not send a lane, but DRC does
    // I don't this DRC needs to...
    byte lane;
    if (inBuffer[1] == term) {
      lane = 0;
    }
    else {
      lane = inBuffer[1] TXT_TO_INT_CONVERSION;
    }

    // First send whatever time we have, the RMS
    // will either take it or dump it, but we don't care.
    sendTime(0xffffffff);

    // Now mark it such that the next time sent has
    // the reset flag so the RMS knows what to do.
    timeResponse[5] = (1 << lane);
  }
  break;

  case debounceRequest:
    ulDebounceHighUs = (inBuffer[1] TXT_TO_INT_CONVERSION) * 1000;
    ulDebounceHighUs += (inBuffer[2] TXT_TO_INT_CONVERSION) * 4;
    ulDebounceLowUs = (inBuffer[3] TXT_TO_INT_CONVERSION) * 1000;
    ulDebounceLowUs += (inBuffer[4] TXT_TO_INT_CONVERSION) * 4;

    SERIAL_PRINT("Debounce set to H/L");
    SERIAL_PRINT(ulDebounceHighUs);
    SERIAL_PRINT("/");
    SERIAL_PRINTLN(ulDebounceLowUs)
      break;

  case extendedRequest:
  {
    // NOTE: Extended protocol can be anything the application chooses to send.
    // The extended protocol always starts with 0x45 (E) and ends with the
    // terminator 0x3B (;)
    SERIAL_PRINT("Got Extended Protocal: ");
    SERIAL_PRINT(inBuffer[0]);
    SERIAL_PRINT(" ");
    SERIAL_PRINT(inBuffer[1]);
    SERIAL_PRINT(" ");
    SERIAL_PRINT(inBuffer[2]);
    SERIAL_PRINT(" ");
    SERIAL_PRINT(inBuffer[3]);
    SERIAL_PRINT(" ");
    SERIAL_PRINTLN(inBuffer[4]);

    switch ((inBuffer[1] TXT_TO_INT_CONVERSION)) {
    case extRaceState:
    {
      SERIAL_PRINTLN("Got extRaceState");

      //  Race State
      switch (inBuffer[2]) {
      case 0:
      case 1:
        // Heat not started (0)
        // Heat not restarted (1)
#ifdef WITH_FUEL_STUTTER
        fuelHeatInProgress = false;
#endif                
        break;

      case 2:
      case 3:
        // Heat starting (2)
        // Heat re-started (3)

        // NOTE: inBuffer[3] is the countdown timer (4, 3, 2, 1, 0)
        // But there's some whacked things like a -2 which I think is
        // a jammed in "go" state.  It should be considered a green flag
#ifdef WITH_FUEL_STUTTER
        fuelHeatInProgress = true;
#endif
        break;

      case 4:
        // Heat is running
#ifdef WITH_FUEL_STUTTER
        fuelHeatInProgress = true;
#endif        
        break;

      case 5:
        // Heat is paused
#ifdef WITH_FUEL_STUTTER
        fuelHeatInProgress = true;
#endif        
        break;

      case 6:
        // Heat ended
#ifdef WITH_FUEL_STUTTER
        fuelHeatInProgress = false;
#endif        
        break;

      case 7:
        // Race ended
#ifdef WITH_FUEL_STUTTER
        fuelHeatInProgress = false;
#endif        
        break;

      case 8:
        // RC is closing
#ifdef WITH_FUEL_STUTTER
        fuelHeatInProgress = false;
#endif        
        break;        
      }
      break;
    }
    case extHeatLeader:
      // Heat Leader
      // byte lane = inBuffer[2];
      SERIAL_PRINTLN("Got extHeatLeader");

      break;

    case extHeatStandings:
      // Heat Standings
      // byte count = inBuffer[2];
      // for (i = 0; i < count; i++) {
      // Each value is the lane at the positional index
      // So the current 1st place lane would be
      // inbuffer[3 + 0]
      // Position [i] = inbuffer[3 + i];
      // }
      SERIAL_PRINTLN("Got extHeatStandings");
      break;

    case extFuel:
      // Fuel      
#ifdef WITH_FUEL_STUTTER
    {
      SERIAL_PRINTLN("**********Got extFuel*********");

      byte lane = inBuffer[2] TXT_TO_INT_CONVERSION;
      if (lane < FUEL_NUM_LANES) {
        byte level = inBuffer[3] TXT_TO_INT_CONVERSION;

        SERIAL_PRINT("Got fuel for lane ");
        SERIAL_PRINT(lane);
        SERIAL_PRINT(" and value ");
        SERIAL_PRINTLN(level);

        if (level == 0 && !fuelOOF[lane]) {
          // Assume power is on, setting time to 0 will cause it 
          // to turn off
          fuelOOF[lane] = true;
          fuelTimeUs[lane] = 0;
          fuelPowerOn[lane] = true;
        }
        else if (level > 0) {
          // This will turn power back on if its not already
          fuelOOF[lane] = false;
        }
      }
    }
#endif
    break;

    case extRefueling:
      // Refueling
      // byte lane = inBuffer[2];
      // bool refueling = (inBuffer[3] != 0);
      SERIAL_PRINTLN("**********Got extRefueling*********");
      break;

    case extRaceTime:
      // Race Time
      // byte timePct = inBuffer[2];
      // timePct range is [0, 100]
      SERIAL_PRINTLN("**********Got extRaceTime*********");
      break;

    case extDeslot:
      // Deslot
      // byte lane = inBuffer[2];
      // byte deslotes = inBuffer[3];
      // byte maxDeslots = inBuffer[4];
      SERIAL_PRINTLN("**********Got extDeslot*********");
      break;

    case extLapPerformance:
      // Lap Performance
      // byte lane = inBuffer[2];
      // Performance values.  I think 0 indicates the last lap
      // underperforms, 1 indicates the last lap is better and
      // 2 indicates that the performance value is not applicable
      // byte recordPerf = inBuffer[3];
      // byte heatPerf = inBuffer[4];
      // byte selfPerf = inBuffer[5];
      // byte bestLap = inBuffer[6];
      // byte bestHeatLap = inBuffer[7];
      SERIAL_PRINTLN("**********Got extLapPerformance*********");
      break;

    default:
      SERIAL_PRINTLN("");
      SERIAL_PRINT("***Unknown OpCode: ");
      SERIAL_PRINTLN(inBuffer[1]);
      break;
    }
  }
  }
  SERIAL_PRINTLN("**** PM DONE ****");

  iReadCount = 0;
  bRead = false;
}

/*
   Receive any messages from RC
   add them until we have a complete message
*/
void serialEvent()
{
  while (!bRead && Serial.available())
  {
    byte inChar = Serial.read();

    // Note: The opening of the serial port ends up sending us
    // a bunch of control characters.  We've only ever seen 0xF0,
    // but to be safe let's ignore lots of junk as long as we
    // haven't read in one of our opcodes yet.
    if (iReadCount > 0 || (inChar > 0x19 && inChar < 0x7f)) {
      inBuffer[iReadCount++] = inChar;
      if (inChar == term)
      {
        bRead = true;
      }
    }
  }
}

unsigned long g_curTimeMs = 0;
void sendTime(unsigned long ulCurTimeMs) {
  // Total Hack
  if (ulCurTimeMs == 0xffffffff) {
    // Force time to be sent, but don't change the
    // last time value used.
    ulCurTimeMs = g_curTimeMs;
    g_curTimeMs++;
  }

  if (g_curTimeMs != ulCurTimeMs) {
    g_curTimeMs = g_curTimeMs;

    unsigned long ulCurTimeUs = micros();
    unsigned long ulDeltaUs = ulCurTimeUs - ulPrevHwTimeUs;
    ulPrevHwTimeUs = ulCurTimeUs;

    timeResponse[1] = ((ulDeltaUs >> 24) & 0xff);
    timeResponse[2] = ((ulDeltaUs >> 16) & 0xff);
    timeResponse[3] = ((ulDeltaUs >> 8) & 0xff);
    timeResponse[4] = (ulDeltaUs & 0xff);

    Serial.write(timeResponse, sizeof(timeResponse));

    // Make sure the reset bit is cleared after we send
    // so the reset will only be there once.
    timeResponse[5] = 0;
  }
}

void sendPing() {
  ulPrevPingUs += ulPingTimeUs;
  sendTime(0xffffffff);
}

/*
   RC requires a keep alive once every 5 seconds
   so do 1 every second just in case
*/
void keepAlive()
{
  unsigned long ulCurTimeUs = micros();
  unsigned long ulDeltaUs = ulCurTimeUs - ulPrevPingUs;

  if (ulDeltaUs > ulPingTimeUs)
  {
    sendPing();
  }
}

#ifdef WITH_FAST_LED
void resetLeds() {
  // NOTE: watch dog is a full reset so if we want
  // to reset the pixels we just have to do this and
  // pray
  for (int i = 0; i < MAX_RGB_LED_STRINGS; i++) {
    boolean needShow = false;
    for (int k = 0; k < rgbLedStrings[i].numLeds; k++) {
      rgbLedStrings[i].leds[k] = CRGB::Black;
      needShow = true;
    }

    if (needShow) {
      rgbLedControllers[i]->showLeds(rgbLedBrightness[i]);
    }
  }
}
#endif

void softwareReboot()
{
#ifdef WITH_FAST_LED
  resetLeds();
#endif

#ifdef WITH_WATCH_DOG
  wdt_enable(WDTO_15MS);
  while (1)
  {
    SERIAL_PRINTLN("Waiting for watch dog reboot");
  }
#else
  SERIAL_PRINTLN("Doing software reboot");
#ifdef ESP32
#ifdef ESP32_BT
  sendVersion();
#else
  ESP.restart();
#endif
#else
  asm volatile("jmp 0");
#endif
#endif
}
