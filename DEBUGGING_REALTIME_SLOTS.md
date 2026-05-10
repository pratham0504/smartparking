# Debugging Real-time Slot Updates on Booking Page

## Current Setup

The system architecture for live slot updates is:
1. **Arduino Uno** → sends `SLOT:N:OCCUPIED|FREE:VAL:0|1:PIN:pin` messages via serial
2. **Python Bridge** → reads serial, POSTs to `/api/slots/hardware`
3. **Backend (Node.js/Express)** → receives POST, saves to DB, emits `slots:update` via Socket.IO
4. **Frontend (React)** → connects to Socket.IO, receives `slots:update`, displays live slot status

## Step 1: Verify Backend is Running

```bash
cd /Users/prathamved/Downloads/Parkini-main/Backend
npm start
```

Check that you see:
```
Server started on port 3001!
```

And look for Socket.IO initialization message.

## Step 2: Verify Arduino is Connected and Sending

On macOS, check available serial ports:
```bash
ls -la /dev/tty.* | grep -i usb
ls -la /dev/cu.* | grep -i usb
```

You should see something like: `/dev/cu.usbserial-A5069RR4`

Open Arduino IDE or use a serial monitor:
```bash
# Install minicom if needed
brew install minicom

# Connect to Arduino
minicom -D /dev/cu.usbserial-A5069RR4 -b 115200
```

You should see:
- Startup messages from Arduino
- `[SLOT-SNAPSHOT]` messages every 5 seconds
- `SLOT:1:OCCUPIED:VAL:...` or `SLOT:1:FREE:VAL:...` messages

## Step 3: Start Python Bridge

```bash
cd /Users/prathamved/Downloads/Parkini-main/Backend
source ../.venv/bin/activate
python3 src/rfidGateBridge.py
```

Expected output:
```
[2025-05-08 HH:MM:SS] [INFO    ] ==================================================
[2025-05-08 HH:MM:SS] [INFO    ] RFID Gate Arduino-Backend Bridge
[2025-05-08 HH:MM:SS] [INFO    ] ==================================================
[2025-05-08 HH:MM:SS] [INFO    ] Backend URL: http://localhost:3001
[2025-05-08 HH:MM:SS] [INFO    ] Arduino Port: /dev/cu.usbserial-A5069RR4
[2025-05-08 HH:MM:SS] [INFO    ] Waiting for Arduino connection...
[2025-05-08 HH:MM:SS] [SUCCESS] Arduino connected!
[2025-05-08 HH:MM:SS] [INFO    ] Arduino: [SLOT-SNAPSHOT] Slot 1 -> FREE
[2025-05-08 HH:MM:SS] [INFO    ] Slot 1 is free
[2025-05-08 HH:MM:SS] [SUCCESS] ✓ Slot 1 => FREE (saved to DB & emitted via Socket.IO)
```

Watch for:
- `Arduino connected!` - Bridge found Arduino
- `Slot N is occupied|free` - Bridge parsed slot messages
- `✓ Slot N =>` - Bridge successfully POSTed to backend

## Step 4: Verify Backend is Receiving Slot Updates

Watch the **Backend terminal** for messages like:
```
[SLOTS:HW] Received hardware update: Slot 1 = FREE
[SLOTS:HW] Slot 1 saved to database
[SLOTS] Emitting slots:update to all clients with 2 slots
```

If you don't see these, the bridge isn't connecting to the backend. Check:
- Backend URL in bridge: `http://localhost:3001` ✓
- Endpoint path: `/api/slots/hardware` ✓
- Backend is listening on port 3001 ✓

## Step 5: Verify Frontend Socket.IO Connection

1. Open browser: `http://localhost:3000/booking?step=2`
2. Open **DevTools** → **Console** tab
3. Look for messages like:
```
[LIVE-PARKING] Socket.IO connected: socket_id_here
[LIVE-PARKING] Got 2 slots from initial snapshot
[LIVE-PARKING] Received slots:update event with 2 slots
```

If you see `Socket connect error`, check:
- Frontend is running on port 3000 ✓
- Backend is running on port 3001 ✓
- CORS is configured in backend (it is) ✓

## Step 6: Check Database

Verify slots exist in MongoDB:
```bash
# Connect to your MongoDB Atlas or local instance
# Run this query in MongoDB Atlas UI or mongosh CLI

db.slots.find()
```

Should return:
```json
[
  { "_id": "...", "slotNumber": 1, "isOccupied": false, "parkingName": "shah&anchor", ... },
  { "_id": "...", "slotNumber": 2, "isOccupied": false, "parkingName": "shah&anchor", ... }
]
```

## Step 7: Test End-to-End

With everything running:

1. **Terminal 1**: Backend
   ```bash
   cd Backend && npm start
   ```

2. **Terminal 2**: Python Bridge
   ```bash
   cd Backend && source ../.venv/bin/activate && python3 src/rfidGateBridge.py
   ```

3. **Terminal 3**: Frontend (if not already running)
   ```bash
   cd Front-end-Front-Office- && npm start
   ```

4. **Browser**: Open DevTools Console on `http://localhost:3000/booking?step=2`

5. **Arduino**: Place/remove objects from IR sensors to toggle slot states

You should see in the console:
```
[LIVE-PARKING] Received slots:update event with 2 slots
```

And the parking slot map should update in real-time!

## Troubleshooting

### "Arduino connected but no slot messages in bridge"
- Check Arduino serial output (use minicom to verify)
- Verify pins 8 and 9 have IR sensors connected and working
- Verify Arduino baud rate: 115200

### "Bridge connects but 'Slot publish error'"
- Check backend is running: `curl http://localhost:3001/api/slots`
- Check CORS headers
- Verify `/api/slots/hardware` endpoint exists

### "Backend receives update but Socket.IO not emitting"
- Check `app.set('io', io)` is called in server.js ✓
- Check no errors in backend console
- Verify Socket.IO port (default 3001 same as backend) ✓

### "Frontend shows console error but slots not updating"
- Refresh page with Ctrl+Shift+R (hard refresh)
- Check Socket.IO connection in Network tab
- Verify parkingName matches: `shah&anchor`

## Key Debugging Log Patterns

| Component | Log Pattern | Meaning |
|-----------|------------|---------|
| Arduino | `SLOT:1:OCCUPIED:VAL:1:PIN:8` | Raw slot message being sent |
| Bridge | `[SUCCESS] ✓ Slot 1 => OCCUPIED` | Bridge successfully POSTed |
| Backend | `[SLOTS:HW] Received hardware update` | Backend received POST |
| Backend | `[SLOTS] Emitting slots:update` | Socket.IO event emitted |
| Frontend | `[LIVE-PARKING] Received slots:update event` | Frontend got the event |

## Files Modified for Debugging

- `Backend/src/controllers/slotController.js` - Added console logs to `emitSlotsUpdate` and `hardwareUpdate`
- `Backend/src/rfidGateBridge.py` - Added better logging to `publish_slot_update`
- `Front-end-Front-Office-/src/Components/Pages/LiveParkingStatus.jsx` - Added console logs to Socket.IO connections
- `Hardware/ArduinoUnoRFIDGate/ArduinoUnoRFIDGate.ino` - Improved `publishSlotState` formatting

## Next Steps

1. Start all services in the order above
2. Watch each console for the patterns described
3. Open booking page and check browser console
4. Toggle slot states using IR sensors
5. Verify real-time updates on the map

Good luck! 🚗
