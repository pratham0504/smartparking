#!/usr/bin/env python3
"""
RFID Gate Arduino-Backend Bridge
Listens to Arduino serial port for RFID card scans and communicates with backend
"""

import serial
import requests
import time
import sys
import json
import os
from datetime import datetime
import re

# ========== CONFIGURATION ==========
DEFAULT_ARDUINO_PORT = '/dev/cu.usbserial-A5069RR4'  # Your Arduino USB port (macOS)
ARDUINO_PORT = os.getenv('ARDUINO_PORT', DEFAULT_ARDUINO_PORT).strip()
ARDUINO_BAUD = 115200
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:3001').rstrip('/')  # Your backend URL
RFID_AUTH_ENDPOINT = f'{BACKEND_URL}/api/rfid/authenticate'
RFID_EXIT_ENDPOINT = f'{BACKEND_URL}/api/rfid/exit'
RFID_GATE_EVENTS_ENDPOINT = f'{BACKEND_URL}/api/rfid/gate-events'
SLOT_HARDWARE_ENDPOINT = f'{BACKEND_URL}/api/slots/hardware'

# Throttle repeated slot publishes coming from Arduino snapshots (seconds)
SLOT_THROTTLE_SECONDS = 10

# Parking identity shown in the website for this gate setup
PARKING_NAME = 'shah&anchor'
PARKING_ID = 'shah-anchor'

# Timeout settings
CONNECTION_TIMEOUT = 1
RETRY_INTERVAL = 5  # Seconds between retry attempts

# ========== LOGGING ==========
def log_msg(level, msg):
    """Print formatted log messages"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] [{level:8}] {msg}")

def log_info(msg):
    log_msg("INFO", msg)

def log_error(msg):
    log_msg("ERROR", msg)

def log_success(msg):
    log_msg("SUCCESS", msg)

def log_debug(msg):
    log_msg("DEBUG", msg)

# ========== ARDUINO CONNECTION ==========
def connect_arduino():
    """Establish connection to Arduino"""
    if os.getenv('RENDER') == 'true' and 'ARDUINO_PORT' not in os.environ:
        log_info('RENDER=true and no ARDUINO_PORT was provided; skipping RFID bridge startup.')
        return None

    try:
        log_info(f"Connecting to Arduino on {ARDUINO_PORT}@{ARDUINO_BAUD}...")
        arduino = serial.Serial(ARDUINO_PORT, ARDUINO_BAUD, timeout=CONNECTION_TIMEOUT)
        time.sleep(2)  # Wait for Arduino to initialize
        
        # Clear any buffered data
        arduino.reset_input_buffer()
        log_success("Arduino connected!")
        return arduino
    except serial.SerialException as e:
        log_error(f"Failed to connect to Arduino: {e}")
        return None

# ========== MESSAGE PARSING ==========
def parse_rfid_message(line):
    """
    Parse Arduino RFID message format:
    CARD:<12digit_id>:READER:<reader_id>:GATE:<gate_id>
    
    Returns dict with cardId, readerId, gateId or None if invalid
    """
    if not line:
        return None

    # quick check for CARD token
    if 'CARD:' not in line:
        return None

    try:
        # Use regex to be tolerant of missing colons or small typos like GATEgte-a
        # CARD:<cardId> (any non-space), READER[:]?<readerId>, GATE[:]?<gateId>
        card_match = re.search(r'CARD:([A-Za-z0-9\-]+)', line)
        reader_match = re.search(r'READER:?(?:\s*)?([A-Za-z0-9\-]+)', line)
        gate_match = re.search(r'GATE:?(?:\s*)?([A-Za-z0-9\-]+)', line)

        card_id = card_match.group(1).strip() if card_match else None
        reader_id = reader_match.group(1).strip() if reader_match else 'unknown'
        gate_id = gate_match.group(1).strip() if gate_match else 'unknown'

        if not card_id:
            log_error(f"Invalid card message format: {line}")
            return None

        # normalize card id
        card_id = card_id.strip()

        # Basic validation
        if len(card_id) < 4:
            log_error(f"Invalid card ID: {card_id}")
            return None

        return {
            'cardId': card_id,
            'readerId': reader_id,
            'gateId': gate_id
        }
    except Exception as e:
        log_error(f"Error parsing card message: {e} -- raw: {line}")
        return None

def parse_slot_message(line):
    """
    Parse Arduino slot message format:
    SLOT:<slotNumber>:OCCUPIED|FREE:VAL:<0|1>:PIN:<pin>

    Returns dict with slotNumber, isOccupied, meta or None if invalid.
    """
    if not line or 'SLOT:' not in line:
        return None

    try:
        slot_match = re.search(r'SLOT:(\d+)', line)
        occupied_match = re.search(r':(OCCUPIED|FREE):', line)
        val_match = re.search(r'VAL:(\d+)', line)
        pin_match = re.search(r'PIN:(\d+)', line)

        slot_number = int(slot_match.group(1)) if slot_match else None
        is_occupied = None
        if occupied_match:
            is_occupied = occupied_match.group(1).upper() == 'OCCUPIED'
        elif val_match:
            is_occupied = val_match.group(1) == '1'

        if slot_number is None or is_occupied is None:
            log_error(f"Invalid slot message format: {line}")
            return None

        return {
            'slotNumber': slot_number,
            'isOccupied': is_occupied,
            'parkingName': PARKING_NAME,
            'parkingId': PARKING_ID,
            'meta': {
                'rawLine': line,
                'pin': int(pin_match.group(1)) if pin_match else None,
                'source': 'arduino-bridge'
            }
        }
    except Exception as e:
        log_error(f"Error parsing slot message: {e} -- raw: {line}")
        return None

# ========== BACKEND COMMUNICATION ==========
def authenticate_card(card_data):
    """Send card to backend for authentication"""
    try:
        log_info(f"Authenticating card: {card_data['cardId']}")
        
        response = requests.post(
            RFID_AUTH_ENDPOINT,
            json=card_data,
            timeout=5
        )
        
        result = response.json()
        log_debug(f"Auth response: {result}")
        # If the backend explicitly says card not registered, also publish a gate event
        # so frontend receives immediate feedback even if backend DB update is delayed.
        try:
            decision = result.get('decision') or ('ALLOW' if result.get('success') else 'DENY')
            reason = result.get('reason', '')
            if decision == 'DENY' and 'not registered' in (reason or '').lower():
                publish_gate_event(
                    'auth_result',
                    'Access denied: card not registered',
                    card_id=card_data.get('cardId'),
                    reader_id=card_data.get('readerId'),
                    gate_id=card_data.get('gateId'),
                    parking_name=PARKING_NAME
                )
        except Exception as _:
            pass
        
        if result.get('success') or result.get('decision') == 'ALLOW':
            log_success(f"✓ ACCESS ALLOWED - User: {result.get('userName', 'N/A')}")
            return 'ALLOW'
        else:
            log_error(f"✗ ACCESS DENIED - Reason: {result.get('reason', 'Unknown')}")
            return 'DENY'
            
    except requests.exceptions.Timeout:
        log_error("Backend authentication timeout")
        return 'DENY'
    except requests.exceptions.ConnectionError:
        log_error("Backend connection failed")
        return 'DENY'
    except Exception as e:
        log_error(f"Authentication error: {e}")
        return 'DENY'

def record_exit(card_data):
    """Record vehicle exit"""
    try:
        log_info(f"Recording exit for card: {card_data['cardId']}")
        
        response = requests.post(
            RFID_EXIT_ENDPOINT,
            json=card_data,
            timeout=5
        )
        
        result = response.json()
        if result.get('success'):
            log_success("Exit recorded")
            return True
        else:
            log_error(f"Exit recording failed: {result.get('reason', 'Unknown')}")
            return False
            
    except Exception as e:
        log_error(f"Exit recording error: {e}")
        return False

def publish_slot_update(slot_data):
    """Send slot occupancy data to the backend for realtime website updates."""
    try:
        response = requests.post(
            SLOT_HARDWARE_ENDPOINT,
            json=slot_data,
            timeout=5
        )
        result = response.json()
        if result.get('success'):
            log_success(
                f"✓ Slot {slot_data['slotNumber']} => {'OCCUPIED' if slot_data['isOccupied'] else 'FREE'} (saved to DB & emitted via Socket.IO)"
            )
            return True
        log_error(f"Slot update failed: {result.get('message', 'Unknown')}")
        return False
    except requests.exceptions.Timeout:
        log_error(f"Slot update timeout for slot {slot_data['slotNumber']}")
        return False
    except requests.exceptions.ConnectionError:
        log_error(f"Slot update connection error for slot {slot_data['slotNumber']}")
        return False
    except Exception as e:
        log_error(f"Slot publish error: {e}")
        return False

def publish_gate_event(event_type, message, card_id=None, reader_id=None, gate_id=None, parking_name=None, slot_number=None):
    """Send gate open/close events to the backend for realtime website updates."""
    try:
        payload = {
            'eventType': event_type,
            'message': message,
            'cardId': card_id,
            'readerId': reader_id,
            'gateId': gate_id,
            'parkingName': parking_name,
            'slotNumber': slot_number,
        }
        response = requests.post(
            RFID_GATE_EVENTS_ENDPOINT,
            json=payload,
            timeout=5
        )
        result = response.json()
        if result.get('success'):
            log_debug(f"Gate event published: {event_type}")
            return True
        log_error(f"Gate event publish failed: {result.get('message', 'Unknown')}")
        return False
    except Exception as e:
        log_error(f"Gate event publish error: {e}")
        return False

# ========== MAIN BRIDGE LOOP ==========
def main():
    """Main bridge loop"""
    log_info("=" * 50)
    log_info("RFID Gate Arduino-Backend Bridge")
    log_info("=" * 50)
    log_info(f"Backend URL: {BACKEND_URL}")
    log_info(f"Arduino Port: {ARDUINO_PORT}")
    log_info("Waiting for Arduino connection...")
    
    arduino = None
    consecutive_errors = 0
    max_consecutive_errors = 5
    # track last publish times and last known state per slot to avoid
    # re-posting identical snapshot data too frequently
    last_slot_publish = {}
    last_slot_state = {}
    
    while True:
        try:
            # Connect to Arduino if not connected
            if arduino is None:
                arduino = connect_arduino()
                if arduino is None:
                    log_error(f"Retrying in {RETRY_INTERVAL} seconds...")
                    time.sleep(RETRY_INTERVAL)
                    consecutive_errors += 1
                    if consecutive_errors > max_consecutive_errors:
                        log_error("Too many connection errors, exiting")
                        sys.exit(1)
                    continue
                consecutive_errors = 0
            
            # Read from Arduino using readline to avoid in_waiting race
            try:
                raw = arduino.readline()
            except serial.SerialException as e:
                raise

            if not raw:
                # no data this cycle
                time.sleep(0.05)
                continue

            try:
                line = raw.decode('utf-8', errors='ignore').strip()
            except Exception:
                line = ''

            if not line:
                continue

            # Log all Arduino output
            if line.startswith('['):
                # Status message from Arduino
                log_debug(f"Arduino: {line}")
                continue

            # Handle card messages
            if 'CARD:' in line:
                log_info(f"Raw message: {line}")

                # Parse card data
                card_data = parse_rfid_message(line)
                if not card_data:
                    # send DENY to avoid Arduino waiting
                    try:
                        arduino.write(b'DENY\n')
                        log_debug("Sent DENY due to parse failure")
                    except Exception:
                        pass
                    continue

                # Authenticate with backend
                decision = authenticate_card(card_data)

                # Send decision back to Arduino
                try:
                    if decision == 'ALLOW':
                        arduino.write(b'ALLOW\n')
                    else:
                        arduino.write(b'DENY\n')
                except Exception as e:
                    log_error(f"Failed to write to Arduino: {e}")

                log_debug(f"Decision sent to Arduino: {decision}")
                continue

            if 'SLOT:' in line:
                slot_data = parse_slot_message(line)
                if not slot_data:
                    continue

                slot_num = slot_data['slotNumber']
                now_ts = time.time()
                last_ts = last_slot_publish.get(slot_num, 0)
                last_state = last_slot_state.get(slot_num, None)

                # If the same state was published recently, skip to avoid DB/socket spam
                if (now_ts - last_ts) < SLOT_THROTTLE_SECONDS and last_state == slot_data['isOccupied']:
                    log_debug(f"Skipping frequent snapshot for slot {slot_num}")
                    continue

                # update tracking info and publish
                last_slot_publish[slot_num] = now_ts
                last_slot_state[slot_num] = slot_data['isOccupied']

                log_info(
                    f"Slot {slot_num} is {'occupied' if slot_data['isOccupied'] else 'free'}"
                )
                publish_slot_update(slot_data)
                continue

            if '[GATE]' in line:
                if 'Opening gate' in line:
                    log_info('Gate opening')
                    publish_gate_event(
                        'gate_open',
                        'Gate opening',
                        parking_name=PARKING_NAME,
                        gate_id='gate-a'
                    )
                    continue

                if 'Gate closed' in line:
                    log_info('Gate closed')
                    publish_gate_event(
                        'gate_close',
                        'Gate closed',
                        parking_name=PARKING_NAME,
                        gate_id='gate-a'
                    )
                    continue
        
        except serial.SerialException as e:
            log_error(f"Serial connection lost: {e}")
            if arduino:
                arduino.close()
            arduino = None
            consecutive_errors += 1
            time.sleep(RETRY_INTERVAL)
            
        except KeyboardInterrupt:
            log_info("Shutting down...")
            if arduino:
                arduino.close()
            sys.exit(0)
            
        except Exception as e:
            log_error(f"Unexpected error: {e}")
            consecutive_errors += 1
            if consecutive_errors > max_consecutive_errors:
                log_error("Too many errors, exiting")
                if arduino:
                    arduino.close()
                sys.exit(1)

if __name__ == '__main__':
    main()
