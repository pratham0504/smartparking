Serial Bridge for Arduino -> Backend

This small Node.js script listens to a serial port connected to the Arduino and forwards structured slot messages to the backend HTTP endpoint `/api/slots/hardware`.

Install:

```bash
cd Hardware/serial-bridge
npm init -y
npm install serialport axios dotenv
```

Create `.env` with:

```
SERIAL_PORT=/dev/ttyUSB0
BAUD_RATE=115200
BACKEND_URL=http://localhost:3001
```

Run:

```bash
node bridge.js
```

Message format expected from Arduino (single-line ASCII):
- `SLOT:<slotNumber>:OCCUPIED`  => marks slot occupied
- `SLOT:<slotNumber>:FREE`      => marks slot free
- `SLOT:<slotNumber>:PING`      => heartbeat update (updates sensorLastSeen)

The bridge will POST to `POST /api/slots/hardware` with JSON `{ slotNumber, isOccupied, reservedBy }`.
