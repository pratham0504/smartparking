# RFID Gate Authentication System - Setup Guide

## Overview
This system enables real-time RFID card authentication at parking gates, integrated with the ParkEz backend.

## Components

### 1. **Arduino Sketch** (`Hardware/ArduinoUnoRFIDGate/ArduinoUnoRFIDGate.ino`)
- Scans RFID cards via Wiegand protocol
- Detects IR sensors for vehicle detection
- Communicates with bridge via USB serial (115200 baud)

### 2. **Backend Routes** (`Backend/src/routes/rfidGateRoutes.js`)
- `POST /api/rfid/authenticate` - Verify card and check active reservations
- `POST /api/rfid/exit` - Record vehicle exit
- `GET /api/rfid/status` - Health check
- `GET /api/rfid/cards` - List registered RFID cards

### 3. **Bridge Service** (`Backend/src/rfidGateBridge.py`)
- Python service connecting Arduino ↔ Backend
- Listens on serial port for RFID messages
- Sends authentication requests to backend
- Returns ALLOW/DENY to Arduino for gate control

## Installation Steps

### Step 1: Arduino Setup
```
1. Upload ArduinoUnoRFIDGate.ino to Arduino Uno
2. Connect:
   - Relay to Pin 4
   - Select Button to Pin 10
   - RFID Reader (Wiegand) to Pins 5 & 6
   - IR Sensors to Pins 7 & 12
```

### Step 2: Backend Integration
```bash
# Already integrated into server.js
# Just ensure the routes are loaded (done automatically)

# Start backend
cd Backend
npm install
npm start
```

### Step 3: Python Bridge Setup
```bash
# Install required packages
pip install pyserial requests

# Identify Arduino port:
# - Windows: COM3, COM4, etc.
# - Linux/Mac: /dev/ttyUSB0 or /dev/ttyACM0

# Run bridge
python Backend/src/rfidGateBridge.py
```

## Configuration

### Arduino Configuration (ArduinoUnoRFIDGate.ino)
```cpp
constexpr byte SELECT_BUTTON_PIN = 10;    // Select button (DOWN=idle, UP=trigger)
const char* readerId = "uno-reader-1";     // Reader identifier
const char* gateId = "gate-a";             // Gate identifier
```

### Python Bridge Configuration (rfidGateBridge.py)
```python
ARDUINO_PORT = '/dev/ttyUSB0'        # Change based on your system
ARDUINO_BAUD = 115200               # Must match Arduino config
BACKEND_URL = 'http://localhost:3001'
```

## Data Flow

```
┌─────────────┐
│   RFID      │  Scan card (Wiegand)
│   Reader    │──────────────┐
└─────────────┘              │
                             ▼
                      ┌──────────────┐
                      │   Arduino    │
                      │     UNO      │
                      └──────┬───────┘
                             │ Serial (115200)
                             │ "CARD:F5C6CE:READER:uno-reader-1:GATE:gate-a"
                             ▼
                      ┌──────────────────┐
                      │  Python Bridge   │
                      │   rfidGateBridge │
                      └──────┬───────────┘
                             │ HTTP POST
                             │ /api/rfid/authenticate
                             ▼
                      ┌──────────────────┐
                      │    Backend       │
                      │   Node.js API    │
                      └──────┬───────────┘
                             │ Check user & reservation
                             │ in MongoDB
                             ▼
                      Response: ALLOW/DENY
                             │
                             ▼
                      ┌──────────────────┐
                      │  Python Bridge   │
                      └──────┬───────────┘
                             │ Serial write "ALLOW" or "DENY"
                             ▼
                      ┌──────────────────┐
                      │   Arduino UNO    │
                      │  Opens/Denies    │
                      │  Gate Relay      │
                      └──────────────────┘
```

## Message Formats

### Arduino → Bridge (Serial, 115200 baud)
```
CARD:F5C6CE:READER:uno-reader-1:GATE:gate-a
[BUTTON] ↑ Select button UP - RFID ACTIVE
[SENSOR-1] ✓ Slot 1 occupied
```

### Bridge → Backend (HTTP POST)
```json
{
  "cardId": "F5C6CE",
  "readerId": "uno-reader-1",
  "gateId": "gate-a"
}
```

### Backend → Bridge (HTTP Response)
```json
{
  "success": true,
  "decision": "ALLOW",
  "userId": "...",
  "userName": "John Doe",
  "reservationId": "...",
  "parkingName": "Parking A"
}
```

### Bridge → Arduino (Serial)
```
ALLOW
or
DENY
```

## API Endpoints

### 1. Authenticate Card
```
POST /api/rfid/authenticate
Content-Type: application/json

{
  "cardId": "F5C6CE",
  "readerId": "uno-reader-1",
  "gateId": "gate-a"
}

Response (200):
{
  "success": true,
  "decision": "ALLOW",
  "userId": "user123",
  "userName": "John Doe",
  "reservationId": "res456",
  "parkingName": "Downtown Parking"
}
```

### 2. Record Exit
```
POST /api/rfid/exit
Content-Type: application/json

{
  "cardId": "F5C6CE",
  "readerId": "uno-reader-1"
}

Response (200):
{
  "success": true,
  "message": "Exit recorded",
  "reservationId": "res456"
}
```

### 3. Check Status
```
GET /api/rfid/status

Response (200):
{
  "status": "RFID Gate Service Active",
  "timestamp": "2026-05-08T10:30:00Z",
  "gates": ["gate-a", "gate-b", "gate-c"]
}
```

## Database Schema Updates

The system uses existing ParkEz models:
- **User**: Optional `rfidCard` and `vehicleRFID` fields
- **Reservation**: Tracks `entryTime` and `exitTime` for gate events
- **Parking**: Gates linked to parking locations

### Required User Schema Fields
```javascript
{
  name: String,
  email: String,
  rfidCard: String,        // Optional: RFID card ID
  vehicleRFID: String,     // Optional: Vehicle embedded RFID
  fastags: [{
    tagId: String,         // Also supported
    ...
  }]
}
```

### Reservation Schema Fields
```javascript
{
  userId: ObjectId,
  parkingId: ObjectId,
  status: String,          // confirmed, in-progress, completed
  startTime: Date,
  endTime: Date,
  entryTime: Date,         // When vehicle entered
  exitTime: Date,          // When vehicle exited
  ...
}
```

## Testing

### Test with curl
```bash
# Test authentication
curl -X POST http://localhost:3001/api/rfid/authenticate \
  -H "Content-Type: application/json" \
  -d '{"cardId":"F5C6CE","readerId":"uno-reader-1","gateId":"gate-a"}'

# Test status
curl http://localhost:3001/api/rfid/status
```

### Test Arduino-Bridge Communication
```bash
# Monitor Arduino output
python Backend/src/rfidGateBridge.py

# Or on Mac/Linux
minicom -D /dev/ttyUSB0 -b 115200

# On Windows
# Use PuTTY or Arduino IDE Serial Monitor
```

## Troubleshooting

### Arduino Not Connected
```
[ERROR] Failed to connect to Arduino: [Errno 13] Permission denied: '/dev/ttyUSB0'

Solution:
sudo chmod 666 /dev/ttyUSB0    # Temporarily on Linux
# Or add user to dialout group
sudo usermod -a -G dialout $USER
```

### Backend Connection Refused
```
[ERROR] Backend connection failed

Check:
- Backend is running: npm start
- Backend URL is correct
- No firewall blocking localhost:3001
```

### Card Not Found
```
[ERROR] ACCESS DENIED - Reason: Card not registered

Solution:
- Register RFID card in user profile
- Update User document with rfidCard field
- Card ID must match exactly (case-sensitive after uppercase conversion)
```

### No Active Reservation
```
[ERROR] ACCESS DENIED - Reason: No active reservation

Solution:
- User must have active reservation for current time
- Reservation status must be 'confirmed' or 'active'
- Check reservation dates overlap current time
```

## Performance Optimization

- Bridge processes cards at ~100ms per authentication
- Arduino buffer clear prevents message collision
- 3-second backend timeout for responsive gate control
- Persistent connection reduces latency

## Security Considerations

1. **Card ID Validation**: Only alphanumeric characters accepted
2. **Serial Authentication**: Reserved for local communication
3. **Backend Verification**: All decisions made server-side
4. **Timeout Protection**: 3-second max wait prevents lockup
5. **Error Logging**: All access attempts logged

## Future Enhancements

- [ ] Multiple gate support
- [ ] Face recognition backup
- [ ] License plate OCR fallback
- [ ] Mobile app QR code authentication
- [ ] SMS/Email notifications on gate access
- [ ] Real-time dashboard
- [ ] Access logs export (CSV/PDF)
- [ ] Anti-cloning RFID protocols

## Support

For issues or questions:
1. Check logs: `Backend/src/rfidGateBridge.py` console output
2. Verify Arduino connection: Check USB device list
3. Test API manually with curl
4. Check MongoDB for user RFID card data

---
**Last Updated**: May 8, 2026
**Status**: Production Ready ✅
