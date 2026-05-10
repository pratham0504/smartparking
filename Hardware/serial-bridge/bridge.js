require('dotenv').config();
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

const requestedPort = process.env.SERIAL_PORT;
const baudRate = Number(process.env.BAUD_RATE || 115200);
const backend = process.env.BACKEND_URL || 'http://localhost:3001';

async function chooseAndOpenPort() {
  let portPath = requestedPort;
  try {
    const ports = await SerialPort.list();
    if (!portPath) {
      if (!ports || ports.length === 0) {
        console.error('No serial ports found. Connect the Arduino and retry, or set SERIAL_PORT env.');
        process.exit(1);
      }
      // Prefer macOS /dev/cu.* or /dev/tty.* names
      const preferred = ports.find(p => /cu\.|usbmodem|usbserial|tty\./i.test(p.path || p.device || '')) || ports[0];
      portPath = preferred.path || preferred.device || ports[0].path;
      console.log('Auto-selected serial port:', portPath);
    } else {
      // check requested exists
      const found = ports.find(p => (p.path || p.device || '').includes(portPath) || (portPath || '').includes(p.path || p.device || ''));
      if (!found) {
        console.warn('Requested SERIAL_PORT not found among available ports. Available ports:');
        ports.forEach(p => console.log(' -', p.path || p.device));
        // Try macOS naming variants: /dev/cu.* vs /dev/tty.*
        let alt = null;
        try {
          if (portPath && portPath.includes('/dev/cu.')) alt = portPath.replace('/dev/cu.', '/dev/tty.');
          else if (portPath && portPath.includes('/dev/tty.')) alt = portPath.replace('/dev/tty.', '/dev/cu.');
        } catch (e) { alt = null; }

        if (alt) {
          const altFound = ports.find(p => (p.path || p.device || '').includes(alt) || (alt || '').includes(p.path || p.device || ''));
          if (altFound) {
            console.log('Requested port not listed, using alternate match:', altFound.path || altFound.device);
            portPath = altFound.path || altFound.device;
          } else {
            console.warn('Requested port not found; proceeding to use requested port as-is (may fail to open).');
          }
        } else {
          console.warn('Proceeding to use requested port; it may fail to open.');
        }
      }
    }

    const port = new SerialPort({ path: portPath, baudRate }, (err) => {
      if (err) return console.error('SerialPort open error:', err.message);
      console.log('Serial port opened', portPath, baudRate);
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
    return { port, parser };
  } catch (err) {
    console.error('Error enumerating serial ports:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

(async () => {
  const { port, parser } = await chooseAndOpenPort();

  parser.on('data', async (line) => {
    // existing handler below will be moved; keep same logic
    line = line.trim();
    if (!line) return;
    console.log('Serial:', line);
    const parts = line.split(':');
    const kind = (parts[0] || '').toUpperCase();

    if (kind === 'SLOT') {
      const slotNumber = Number(parts[1]);
      const action = (parts[2] || '').toUpperCase();

      let payload = { slotNumber };
      if (action === 'OCCUPIED') payload.isOccupied = true;
      else if (action === 'FREE') payload.isOccupied = false;
      else if (action === 'PING') payload.sensorSeen = true;
      if (parts[3]) payload.reservedBy = parts.slice(3).join(':');

      try {
        const resp = await axios.post(`${backend}/api/slots/hardware`, payload, { timeout: 5000 });
        console.log('Backend response:', resp.data && resp.data.success);
      } catch (err) {
        console.error('Failed to send SLOT to backend:', err.message || err);
      }
      return;
    }

    if (kind === 'CARD' || kind === 'TAG') {
      const tail = parts.slice(1);
      if (!tail || tail.length === 0) return console.warn('Empty CARD tag received');

      const findValue = (arr, key) => {
        const idx = arr.findIndex(a => String(a).toUpperCase() === String(key).toUpperCase());
        if (idx >= 0 && idx + 1 < arr.length) return arr[idx + 1];
        return null;
      };

      let hex = null;
      let dec = null;
      if (tail[0] && String(tail[0]).toUpperCase() === 'HEX') {
        hex = findValue(tail, 'HEX');
        dec = findValue(tail, 'DEC');
      } else {
        const first = String(tail[0]).trim();
        if (first.length === 12 && /^[0-9A-Fa-f]+$/.test(first)) hex = first;
        else dec = first;
      }

      const hexToDec10 = (hexStr) => {
        try {
          if (!hexStr) return null;
          const s = String(hexStr).trim();
          if (s.length !== 12) return null;
          const middle = s.substring(2, 10);
          const val = parseInt(middle, 16);
          if (Number.isNaN(val)) return null;
          return String(val).padStart(10, '0');
        } catch (e) {
          return null;
        }
      };

      if (!dec && hex) dec = hexToDec10(hex);

      const readerIdVal = findValue(tail, 'READER') || process.env.READER_ID || null;
      const gateIdVal = findValue(tail, 'GATE') || process.env.GATE_ID || null;

      // Backend expects { cardId, readerId, gateId }
      const payload = {
        cardId: dec || hex || tail.join(':'),
        readerId: readerIdVal,
        gateId: gateIdVal,
      };

      try {
        console.log('Sending RFID auth payload to backend:', payload);
        const resp = await axios.post(`${backend}/api/rfid/authenticate`, payload, { timeout: 5000 });
        console.log('RFID auth response:', resp.data && resp.data.decision);

        const decision = resp?.data?.decision;
        const minutesRemaining = resp?.data?.minutesRemaining ?? null;
        const reason = resp?.data?.reason ?? '';

        if (decision === 'ALLOW') {
          // Keep message simple but include remaining time for the website/Arduino UI.
          const msg = `ALLOW|MINUTES:${minutesRemaining ?? 0}|REASON:${reason}\n`;
          port.write(msg, (err) => {
            if (err) console.error('Write ALLOW error', err.message);
            else console.log('Sent', msg.trim(), 'to device');
          });
        } else {
          const msg = `DENY|REASON:${encodeURIComponent(reason || 'DENY')}|MINUTES:${minutesRemaining ?? ''}\n`;
          port.write(msg, (err) => {
            if (err) console.error('Write DENY error', err.message);
            else console.log('Sent', msg.trim(), 'to device');
          });
        }
      } catch (err) {
        console.error('Failed to send CARD to backend:', err.message || err);
        port.write('DENY\n', (e) => {
          if (e) console.error('Write DENY error', e.message);
        });
      }
      return;
    }
  });

  port.on('error', (err) => {
    console.error('SerialPort error:', err.message);
  });

})();
// Event handlers are registered inside the async initializer where `port` and `parser` are defined.
