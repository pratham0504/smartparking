# TODO

- [x] Inspect current Arduino sketch and confirm required behavior/messages.
- [x] Refactor Arduino code for reliability: remove duplicate Wiegand/serial decision logic, avoid long blocking loops where possible.
- [x] Keep same external interface formats: 
  - CARD:HEX:<hex>:DEC:<dec>:READER:<id>:GATE:<id>
  - SLOT:<1|2>:OCCUPIED:VAL:<0|1>:PIN:<pin>
  - Expect bridge decision containing ALLOW or DENY.
- [x] Update `Hardware/ArduinoUnoRFIDGate/ArduinoUnoRFIDGate.ino` with improved structure.
- [ ] Final review for compile-safety (Arduino C++), especially around String usage and interrupt safety.

- [ ] (Optional) Provide compile/flash commands for Arduino IDE.




