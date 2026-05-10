# Arduino Code - Critical Fix for Live Slot Updates

## 🔴 The Problem That Was Fixed

**Before:** The Arduino code had **blocking delays** during RFID card scanning. This meant:
- When a card was being read/authenticated, slot sensor checks would pause
- Slot update messages weren't being published while waiting for bridge decision
- The live slot map on the booking page would freeze during card scanning

**Example of the bug:**
```cpp
// OLD CODE - BLOCKING
while (millis() - started < RFID_DECISION_TIMEOUT) {
    // ... wait for decision ...
    // MEANWHILE: checkDualIRSensors() never runs!
    // Result: Slot updates stop flowing to the bridge
}
```

## ✅ The Solution: Non-Blocking State Machine

**After:** Complete rewrite using a **non-blocking state machine**:

### Key Changes

1. **RFID Processing is Now a State Machine (Non-Blocking)**
   ```cpp
   enum RFIDState { RFID_IDLE, RFID_READING, RFID_WAITING_DECISION };
   ```
   - `RFID_IDLE` → Wait for card
   - `RFID_READING` → Read card ID (timeout: 400ms)
   - `RFID_WAITING_DECISION` → Wait for bridge (timeout: 3000ms)
   - Each state checks timeout and returns immediately if nothing to do

2. **Slot Sensor Checks Run Every Loop Iteration**
   ```cpp
   void loop() {
     checkDualIRSensors();      // ← ALWAYS runs, non-blocking
     processRFIDStateMachine(); // ← ALWAYS runs, non-blocking
     delay(10);                 // ← Minimal delay
   }
   ```

3. **Slot Publishing is Continuous**
   - Every 250ms: Check for sensor changes
   - Every 5 seconds: Full state snapshot
   - **Never blocked** by RFID operations

### How It Works Now

#### Loop Iteration 1-10: Normal State
```
→ checkDualIRSensors()         [250ms check] Publishes SLOT:1:OCCUPIED if changed
  processRFIDStateMachine()     [IDLE state] Returns immediately, nothing to do
→ delay(10)
```

#### Loop Iteration where card is scanned
```
→ checkDualIRSensors()         [✓ Still publishes slots]
  processRFIDStateMachine()     [READING state] Reads card ID
→ delay(10)
```

#### Loop Iterations while waiting for bridge decision
```
→ checkDualIRSensors()         [✓ Still publishes slots every 250ms]
  processRFIDStateMachine()     [WAITING_DECISION] Checks if bridge replied
→ delay(10)
```

**CRITICAL DIFFERENCE:** Slot checks never stop, even during authentication!

## 📤 Message Format

### Slot Messages (Continuous)
```
SLOT:1:OCCUPIED:VAL:1:PIN:8    ← Slot 1 is occupied
SLOT:2:FREE:VAL:0:PIN:9        ← Slot 2 is free
```

Published every:
- **250ms** when state changes
- **5000ms** full snapshot (even if nothing changed) for sync

### Card Messages (On Scan)
```
CARD:1234567890AB:READER:uno-reader-1:GATE:gate-a
```

Arduino waits for bridge response on USB serial (not SoftwareSerial):
- `ALLOW` → Open gate
- `DENY` → Reject
- Timeout after 3 seconds

## 🔍 Debug Output

Watch the serial monitor (115200 baud) for:

**Normal operation:**
```
[DIAG] Sensors: IR1=1 IR2=1           ← Sensor readings
[SENSOR-1] ✓ Slot 1 occupied          ← State change detected
SLOT:1:OCCUPIED:VAL:1:PIN:8           ← Bridge ingest line
[SLOT-1] ⬆ OCCUPIED                   ← State update
```

**Card scan + authentication:**
```
[RFID] Card detected: 1234567890AB
CARD:1234567890AB:READER:uno-reader-1:GATE:gate-a
[RFID] Bridge decision: ALLOW
[AUTH] ✓ ALLOW - opening gate
[GATE] Opening gate...
[GATE] Gate closed
```

**IMPORTANT:** While the above happens, you should also see:
```
SLOT:1:OCCUPIED:VAL:1:PIN:8           ← Still publishing slots!
[SENSOR-2] ✗ Slot 2 cleared           ← Slot changes still detected!
SLOT:2:FREE:VAL:0:PIN:9               ← Still sent to bridge!
```

## 🚀 Testing the Fix

1. **Start Arduino** with serial monitor at 115200 baud

2. **Start Python Bridge**
   ```bash
   python3 src/rfidGateBridge.py
   ```

3. **Trigger slot sensors** (place/remove objects from IR pins 8, 9)
   - You should see `SLOT:` messages continuously
   - Bridge should log: `✓ Slot N => OCCUPIED` or `✓ Slot N => FREE`

4. **Scan a card**
   - RFID messages appear in serial monitor
   - Bridge asks backend for authentication
   - Gate opens if ALLOW
   - **Meanwhile: Keep seeing `SLOT:` messages!**

5. **Booking page** (http://localhost:3000/booking?step=2)
   - LiveParkingStatus should update in real-time
   - Check browser console for: `[LIVE-PARKING] Received slots:update event with 2 slots`

## 💾 Code Structure

### `processRFIDStateMachine()`
Non-blocking RFID processor that:
- Checks if data is available (returns immediately if not)
- Reads card ID from EM-18 (up to 400ms timeout, non-blocking)
- Sends CARD message to bridge
- Waits for decision (up to 3000ms timeout, non-blocking)
- Opens gate on ALLOW
- Returns to IDLE state

### `checkDualIRSensors()`
Non-blocking slot sensor checker that:
- Runs every 250ms (returns immediately if not time)
- Reads IR pins 8 and 9
- Publishes `SLOT:N:...` message on any change
- Publishes full snapshot every 5 seconds

### `loop()`
Minimal loop that:
1. Calls `checkDualIRSensors()` → returns in <1ms if not time
2. Calls `processRFIDStateMachine()` → returns in <1ms if not time
3. Delays 10ms
4. **Total: ~10ms per loop, everything runs concurrently**

## ⚙️ Configuration

```cpp
const unsigned long SENSOR_CHECK_INTERVAL = 250;      // Check slots every 250ms
const unsigned long SNAPSHOT_PUBLISH_INTERVAL = 5000; // Full snapshot every 5s
const unsigned long RFID_READ_TIMEOUT = 400;          // 400ms to read card ID
const unsigned long RFID_DECISION_TIMEOUT = 3000;     // 3000ms to get bridge decision
```

## 📊 Performance

- **Loop frequency:** ~100 Hz (10ms per loop)
- **Slot check frequency:** ~4 Hz (250ms when changed)
- **Slot snapshot frequency:** 0.2 Hz (5000ms)
- **RFID latency:** 0-3400ms (depending on card detection time)
- **Slot message throughput:** 1-20 messages/second (depends on activity)

## ✨ Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| Slot updates during RFID | ❌ Stopped | ✅ Continuous |
| Loop blocking | ❌ 3000ms waits | ✅ <1ms per loop |
| Concurrent operations | ❌ No | ✅ Yes (via state machine) |
| Slot sync guarantee | ❌ Lost if card scanned | ✅ Every 5 seconds |
| Real-time booking map | ❌ Froze during auth | ✅ Updates every 250ms |

## 🔧 Troubleshooting

### "Slots update stopped after scanning card"
- **Before fix:** Expected - blocking code
- **After fix:** Bug! Check:
  - Arduino is running the NEW code
  - Sensors are connected to pins 8 and 9
  - IR sensors return LOW when occupied

### "RFID card doesn't work"
- Check bridge is running
- Check Arduino → Bridge → Backend connection
- Wait 3 seconds for decision timeout

### "Bridge doesn't receive SLOT messages"
- Check Arduino serial output has `SLOT:` lines
- Check baud rate is 115200
- Check `/dev/cu.usbserial-A5069RR4` is correct port

## ✅ Verification Checklist

- [ ] Arduino code uploaded (NEW version)
- [ ] Serial monitor shows `SLOT:` messages continuously
- [ ] Bridge starts and connects to Arduino
- [ ] Bridge logs `✓ Slot N =>` for each message
- [ ] Backend logs `[SLOTS:HW] Received hardware update`
- [ ] Backend logs `[SLOTS] Emitting slots:update`
- [ ] Browser console shows `[LIVE-PARKING] Received slots:update`
- [ ] Booking page updates when you trigger IR sensors
- [ ] Card scanning still works (gate opens)
- [ ] Slots keep updating WHILE card is being authenticated

If all checks pass: **Live slot updates are working!** 🎉
