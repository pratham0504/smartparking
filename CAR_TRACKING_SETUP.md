# Real-Time Car Tracking & Navigation System - Complete Setup Guide

## System Overview

This system enables real-time tracking of vehicles as they navigate through the parking lot, providing live directions to their reserved parking spots.

**Components:**
- **RFID Gate Detection** - Detects car entry with RFID card scan
- **Bluetooth HC-05 Tracking** - Tracks car position via signal strength
- **Ultrasonic Sensors** - Detects car arrival at parking spot
- **IR Checkpoint Sensors** - Zone detection (entrance, middle, spot areas)
- **Backend API** - Processes location data and broadcasts via Socket.io
- **Frontend UI** - Shows real-time car position and navigation

---

## Hardware Setup

### 1. **Bluetooth HC-05 Module (Car Tracking)**

**Purpose:** Track car movement through parking lot based on signal strength (RSSI)

**Wiring:**
```
HC-05 Module           Arduino Uno
--------------------------------------------
VCC (3.3V)     →      3.3V (with voltage divider)
GND            →      GND
TX             →      RX (Pin 19/A5 via SoftwareSerial)
RX             →      TX (Pin 18/A4 via SoftwareSerial)
```

**Installation Steps:**
1. Purchase HC-05 Bluetooth module (~$3-5)
2. Solder 4 wires to VCC, GND, TX, RX pins
3. Connect to Arduino as shown above
4. Place HC-05 module inside vehicle (hidden, powered by car)
5. Place receiving HC-05 modules at parking checkpoints

**Configuration (AT Commands):**
```
1. Connect to HC-05 via serial terminal (9600 baud)
2. Send: AT+NAME=CarTracker (set name)
3. Send: AT+ROLE=1 (set as master)
4. Send: AT+PSWD=1234 (set PIN)
5. Verify with: AT+NAME? (should return CarTracker)
```

### 2. **Ultrasonic Sensor (Distance Detection)**

**Purpose:** Detect when car arrives at parking spot (< 100cm distance)

**Models:** HC-SR04, JSN-SR04T (waterproof)

**Wiring:**
```
Ultrasonic Sensor      Arduino Uno
--------------------------------------------
VCC (5V)       →      5V
GND            →      GND
TRIG           →      Pin 11
ECHO           →      Pin 12
```

**Placement:** Mount at ground level inside parking spot

**Installation Steps:**
1. 3D print or purchase mounting bracket for sensor
2. Mount horizontally in parking spot (pointing at car)
3. Mount at 20-40cm height for optimal detection
4. Angle slightly downward for better detection

### 3. **IR Checkpoint Sensors (Zone Detection)**

**Purpose:** Detect car passing through different zones

**Wiring:**
```
IR Sensor              Arduino Uno
--------------------------------------------
VCC (5V)       →      5V
GND            →      GND
OUT            →      Pin 13 (Zone 1 - Entrance)
                      Pin 14 (Zone 2 - Middle)
                      Pin 15 (Zone 3 - Spot)
```

**Placement:**
- **Zone 1 (Entrance):** At parking lot entrance gate
- **Zone 2 (Middle):** Midway through parking lot
- **Zone 3 (Spot):** Near assigned parking spot

---

## Arduino Configuration

### Step 1: Install Required Libraries

```bash
# Arduino IDE → Sketch → Include Library → Manage Libraries
# Search and install:
1. SoftwareSerial (built-in)
2. Servo (built-in)
3. NewPing (for ultrasonic sensors)
```

### Step 2: Upload Firmware

```bash
# In Arduino IDE:
1. Open: Hardware/ArduinoUnoRFIDGate/CarTrackingModule.ino
2. Select Board: Arduino Uno
3. Select Port: COM3 (Windows) or /dev/ttyUSB0 (Linux/Mac)
4. Click Upload
```

### Step 3: Verify Connection

```bash
# Monitor Serial Output:
1. Tools → Serial Monitor
2. Set Baud Rate: 115200
3. Should see: "CAR TRACKING MODULE - BLUETOOTH + ULTRASONIC"
```

---

## Backend Integration

### Step 1: API Routes

The car tracking API is already integrated:

**Available Endpoints:**

```bash
# POST - Update car location (from Arduino)
curl -X POST http://localhost:3001/api/car-tracking/location-update \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "A1B2C3D4",
    "reservationId": "<reservation_id>",
    "parkingId": "shah-anchor",
    "zone": "ENTRANCE",
    "distance": 50,
    "signalStrength": -75,
    "arrived": 0
  }'

# GET - Get active car locations
curl http://localhost:3001/api/car-tracking/active

# GET - Get specific car location
curl http://localhost:3001/api/car-tracking/reservation/<reservation_id>

# GET - Get parking zone map
curl http://localhost:3001/api/car-tracking/zone-map

# POST - Calculate route to parking spot
curl -X POST http://localhost:3001/api/car-tracking/calculate-route \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "<reservation_id>",
    "currentZone": "ENTRANCE",
    "spotCoordinates": { "lat": 40.7128, "lng": -74.0060 }
  }'
```

### Step 2: Python Bridge Integration

The bridge automatically captures location messages from Arduino:

```bash
# File: Backend/src/rfidGateBridge.py
# Automatically processes LOC: messages

# Example Arduino output:
# LOC:ENTRANCE:DIST:50:SIGNAL:-75:ARRIVED:0
# → Bridge sends to backend → Frontend receives via Socket.io
```

### Step 3: Environment Variables (Render)

Add to Render backend environment:

```env
ARDUINO_PORT=/dev/ttyUSB0
BACKEND_URL=http://localhost:3001
PARKING_ID=shah-anchor
PARKING_NAME=Shah & Anchor
```

---

## Frontend Integration

### Step 1: Add Car Tracking Component

The component is already created at:
```
Front-end-Front-Office-/src/Components/Pages/CarTracking/CarTrackingDisplay.jsx
```

### Step 2: Integrate into Location Page

In `Front-end-Front-Office-/src/Components/Pages/Step/Location.jsx`, add:

```jsx
import CarTrackingDisplay from '../CarTracking/CarTrackingDisplay';

// Inside your Location component:
<CarTrackingDisplay 
  reservationId={reservationData?.id}
  spotCoordinates={{
    lat: selectedParking?.location?.lat,
    lng: selectedParking?.location?.lng
  }}
  onCarArrived={(data) => {
    console.log('Car arrived!', data);
    // Show celebration or next step
  }}
/>
```

### Step 3: Socket.io Connection

The component automatically connects to Socket.io and listens for:
- `car-location-update` - Real-time position update
- `car-location-removed` - Car left the system

---

## Zone Configuration

Customize zone coordinates in `Backend/src/routes/carTrackingRoutes.js`:

```javascript
const zoneCoordinates = {
  'OUTSIDE': { lat: 0, lng: 0 },
  'ENTRANCE': { lat: 10, lng: 10 },    // Entry gate
  'MIDDLE': { lat: 20, lng: 20 },      // Midway
  'SPOT': { lat: 30, lng: 30 }         // Parking spot area
};
```

Update these coordinates to match your parking lot layout (use Google Maps coordinates).

---

## Testing

### Test 1: Hardware Connection

```bash
# Terminal 1: Monitor Arduino
cd Backend
python src/rfidGateBridge.py

# Should see:
# [INFO] Arduino connected!
# [DEBUG] Waiting for Arduino connection...
```

### Test 2: Simulate Car Entry

```bash
# Terminal 2: Simulate RFID scan
echo "CARD:A1B2C3D4:READER:uno-reader-1:GATE:gate-a" > /dev/ttyUSB0
```

### Test 3: Simulate Location Updates

```bash
# Send location data
echo "LOC:ENTRANCE:DIST:50:SIGNAL:-75:ARRIVED:0" > /dev/ttyUSB0
echo "LOC:MIDDLE:DIST:30:SIGNAL:-65:ARRIVED:0" > /dev/ttyUSB0
echo "LOC:SPOT:DIST:10:SIGNAL:-55:ARRIVED:1" > /dev/ttyUSB0
```

### Test 4: API Test

```bash
# Test location update endpoint
curl -X POST http://localhost:3001/api/car-tracking/location-update \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "TEST123",
    "reservationId": "640a1b2c3d4e5f6g7h8i9j0k",
    "parkingId": "shah-anchor",
    "zone": "ENTRANCE",
    "distance": 50,
    "signalStrength": -75,
    "arrived": 0
  }'
```

### Test 5: Frontend Display

1. Open frontend at `http://localhost:3000/booking`
2. Make a booking reservation
3. Frontend should show CarTrackingDisplay component
4. When location updates arrive, they should display in real-time

---

## Production Deployment

### Render (Backend)

```bash
# 1. Add environment variables in Render dashboard:
ARDUINO_PORT=/dev/ttyUSB0
BACKEND_URL=https://your-backend.render.com

# 2. Backend auto-deploys when main branch is pushed

# 3. Verify:
curl https://your-backend.render.com/api/car-tracking/active
```

### Vercel (Frontend)

```bash
# Frontend automatically deploys
# Add backend URL to environment:
REACT_APP_BACKEND_URL=https://your-backend.render.com

# Verify Car Tracking is visible on booking page
```

---

## Troubleshooting

### Issue: Arduino not connecting

```bash
# Solution:
1. Check port: ls /dev/tty* (Linux/Mac) or devicelist (Windows)
2. Set ARDUINO_PORT environment variable
3. Check baud rate: 115200
4. Verify USB cable (try different port)
```

### Issue: No location updates

```bash
# Solution:
1. Verify HC-05 is powered and paired
2. Check IR sensors detect motion
3. Check ultrasonic sensor has 5V power
4. Monitor serial output: python src/rfidGateBridge.py
```

### Issue: Car location not showing on frontend

```bash
# Solution:
1. Check Socket.io connection (browser DevTools → Network → WS)
2. Verify token is valid (localStorage.getItem('token'))
3. Check browser console for errors
4. Verify backend is sending location updates
```

### Issue: Wrong zone detected

```bash
# Solution:
1. Calibrate IR sensor sensitivity (potentiometer)
2. Adjust placement height (should be 20-30cm)
3. Check for sunlight interference
4. Test each sensor individually
```

---

## Hardware Cost Estimate

| Component | Quantity | Cost |
|-----------|----------|------|
| HC-05 Bluetooth Module | 4 | $12-20 |
| Ultrasonic HC-SR04 | 1 | $2-4 |
| IR Sensor Module | 3 | $3-6 |
| Arduino Uno R3 | 1 | $15-20 |
| Wiring & Connectors | 1 | $5-10 |
| **Total** | | **$37-60** |

---

## Advanced Features (Future)

1. **GPS Integration** - For outdoor parking lots
2. **Mobile App Notifications** - Alert driver when arriving
3. **Reserved Spot Highlighting** - Show spot on map in real-time
4. **Multi-Level Parking** - Support basement levels
5. **Charging Detection** - Confirm car actually in spot
6. **Payment Integration** - Auto-charge when car confirmed at spot

---

## Support & Documentation

- Arduino IDE: https://www.arduino.cc/en/software
- HC-05 Datasheet: Search "HC-05 Bluetooth module pinout"
- Socket.io: https://socket.io/docs/v4/client-api/
- API Documentation: See Backend/README.md

---

**Last Updated:** May 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
