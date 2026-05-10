## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure `prom-client` is installed:
   ```bash
   npm install prom-client
   ```

3. Run tests with increased timeout:
   ```bash
   jest --testTimeout=30000
   ```

## Arduino RFID Gate Flow

Use Arduino Uno + EM-18 RFID reader to send tag scans to backend.

### Link a tag to a user

```bash
POST /api/fastag/link
{
   "userId": "<user_id>",
   "tagId": "A1B2C3D4",
   "vehiclePlate": "MH12AB1234"
}
```

### Authorize gate access (ENTRY/EXIT)

```bash
POST /api/fastag/scan
{
   "tagId": "A1B2C3D4",
   "readerId": "reader-1",
   "gateId": "gate-A",
   "direction": "ENTRY",
   "parkingId": "<parking_id>",
   "meta": { "source": "arduino" }
}
```

JSON response:

```json
{
   "ok": true,
   "allow": true,
   "action": "OPEN",
   "reason": "AUTHORIZED"
}
```

Arduino-friendly text response:

```bash
POST /api/fastag/scan?format=text
```

Response format:

```text
ALLOW|OPEN|AUTHORIZED|TAG:A1B2C3D4|DIR:ENTRY|USER:<id>|NAME:<name>
```

### Notes

- `POST /api/fastag/authorize` is available as an alias to `/scan`.
- Anti-passback is enabled:
   - ENTRY is denied if the last allowed movement is already ENTRY.
   - EXIT is denied if there is no prior allowed ENTRY.
- RFID access now requires an active booked reservation for the same user and parking.
- If you use the Arduino sketch, set `parkingId` to the gate's parking before uploading.
- Reference Arduino Uno sketch: [Hardware/ArduinoUnoRFIDGate/ArduinoUnoRFIDGate.ino](../Hardware/ArduinoUnoRFIDGate/ArduinoUnoRFIDGate.ino)
