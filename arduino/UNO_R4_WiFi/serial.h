/*
  Serial.h - Hardware serial library for Wiring
  Copyright (c) 2006 Nicholas Zambetti.  All right reserved.

  This library is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation; either
  version 2.1 of the License, or (at your option) any later version.

  This library is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this library; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

  Modified 28 September 2010 by Mark Sproul
  Modified 14 August 2012 by Alarus
  Modified 3 December 2013 by Matthijs Kooijman
*/

/*
  Modifications for v1.2.0 Arduino UNO R4 Board package to fix:
  
  1. Ring Buffer not thread safe.
  2. Added Tx buffer.
  3. Removed TEIE.
  4. Both Hardware UARTS can be used at the same time.
  
  Modified 1 November 2024 by Christian Huygen
  www.zevendevelopment.com  
*/


#define _TIMEVAL_DEFINED
#define _SYS_SELECT_H

#include "Arduino.h"
#include "api/HardwareSerial.h"

#ifdef __cplusplus

#ifndef __ARDUINO_UART_IMPLEMENTATION__
#define __ARDUINO_UART_IMPLEMENTATION__

#include "r_sci_uart.h"
#include "r_uart_api.h"

#include "SafeRingBuffer.h"

#undef SERIAL_BUFFER_SIZE
//#define SERIAL_BUFFER_SIZE 512
// Need to add one because the SerialRingBuffer no longer uses _numItems
// This will make the Serial Ring Buffer Interrupt Safe.
// _numElems gets updated when a character is received in the Interrupt and also when you UART::read() *** CORRUPTION OF SafeRingBufferN ***
// The SerialRingBuffer updates the _head when a character is received in the Interrupt, but updates the _tail when you UART::read().
#define SERIAL_BUFFER_SIZE 64+1

#define MAX_UARTS    10

typedef enum {
  TX_STARTED,
  TX_STOPPED
} TxStatus_t;

namespace arduino {
	
template <int N>
class SerialRingBuffer   
{
  public:
    SerialRingBuffer() { clear(); }
	inline void clear() { _head = _tail = 0; }
	inline bool isEmpty() { return (_head == _tail); }
	inline bool isFull() 
	{
		int i = (_head + 1) % N;
		return (i == _tail);
	}
  bool store_char(uint8_t c)
  {
      int i = (_head + 1) % N;
      if (i == _tail) return false;
        
      _buffer[_head] = c;
      _head = i;
        
      return true;
  }
  int read_char()
	{
		if (isEmpty()) return -1;
		
		uint8_t c = _buffer[_tail];
		_tail = (_tail + 1) % N;
		
		return c;
	}
	int available() { return (N + _head - _tail) % N; }
	int peek()
	{
		if (isEmpty()) return -1;
		return _buffer[_tail];
	}
	
  private:
    volatile int _head, _tail;
	uint8_t _buffer[N];
};

}

class UART : public arduino::HardwareSerial {
  public:
    static UART *g_uarts[MAX_UARTS]; 
    static void WrapperCallback(uart_callback_args_t *p_args);

    UART(int _pin_tx, int _pin_rx, int pin_rts = -1, int pin_cts = -1);
    void begin(unsigned long);
    void begin(unsigned long, uint16_t config);
    void end();
    int available(void);
    int peek(void);
    int read(void);
    void flush(void);
    size_t write(uint8_t c);
    size_t write(uint8_t* c, size_t len);
    size_t write_raw(uint8_t* c, size_t len);
	void address(uint8_t c); 
	using Print::write; 
    operator bool(); // { return true; }

  private:          
    int                       tx_pin;
    int                       rx_pin;
    int                       rts_pin = -1;
    int                       cts_pin = -1;
    bool                      cfg_pins(int max_index);

    int                       channel;
    //arduino::SafeRingBufferN<SERIAL_BUFFER_SIZE> rxBuffer;
    //arduino::SafeRingBufferN<SERIAL_BUFFER_SIZE> txBuffer;
	arduino::SerialRingBuffer<SERIAL_BUFFER_SIZE> rxBuffer;
	arduino::SerialRingBuffer<SERIAL_BUFFER_SIZE> txBuffer;

    //volatile bool tx_done;

    sci_uart_instance_ctrl_t  uart_ctrl;
    uart_cfg_t                uart_cfg;
    baud_setting_t            uart_baud;
    sci_uart_extended_cfg_t   uart_cfg_extend;

    uart_ctrl_t*              get_ctrl() { return &uart_ctrl; }
    
    bool                      setUpUartIrqs(uart_cfg_t &cfg);

  protected:
    bool                      init_ok;
};

   
    
    
    


extern UART _UART1_;
extern UART _UART2_;
extern UART _UART3_;
extern UART _UART4_;
extern UART _UART5_;

#endif
#endif
