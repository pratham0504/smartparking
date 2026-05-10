import serial
import requests

# 1. Setup - Change 'COM3' to your Arduino's port
arduino = serial.Serial('COM3', 9600, timeout=1)

# 2. Backend endpoint that matches Backend/src/routes/fastagRoutes.js
API_URL = "http://localhost:3000/api/fastag/scan?format=text"

# 3. Paste your ACTUAL JWT Token here (from your browser's inspect/localstorage)
TOKEN = "401c330812f01e85fbc76852ad48ccbf536033132aa4101df6673226a406f387854258ae1e34515aec9522c4ea448cd7d11656652e0cd27128f874e1310f1b2"

print("Bridge Active. Scan your card...")


def parse_card_line(line: str):
    """Parse Arduino line format:
    CARD:HEX:<hex>:DEC:<dec>:READER:<readerId>:GATE:<gateId>

    Returns dict with: tagId, readerId, gateId (gateId can be None)
    """
    if not line:
        return None

    if not line.startswith("CARD:"):
        return None

    parts = line.split(":")
    # Expected minimum: CARD, HEX, <hex>, DEC, <dec>, READER, <readerId>, GATE, <gateId>
    if len(parts) < 9:
        return None

    # Index mapping based on Arduino sketch
    # 0=CARD,1=HEX,2=<hex>,3=DEC,4=<dec>,5=READER,6=<readerId>,7=GATE,8=<gateId>
    hex12 = parts[2].strip() if len(parts) > 2 else ""
    dec10 = parts[4].strip() if len(parts) > 4 else ""
    reader_id = parts[6].strip() if len(parts) > 6 else ""
    gate_id = parts[8].strip() if len(parts) > 8 else ""

    tag_id = dec10 if dec10 and dec10.upper() != "NA" else hex12
    if not tag_id or not reader_id:
        return None

    return {"tagId": tag_id, "readerId": reader_id, "gateId": gate_id or None}


while True:
    if arduino.in_waiting > 0:
        line = arduino.readline().decode('utf-8', errors='ignore').strip()

        parsed = parse_card_line(line)
        if not parsed:
            continue

        tag_id = parsed["tagId"]
        reader_id = parsed["readerId"]
        gate_id = parsed["gateId"]

        print(f"Found Card: {tag_id}. Sending to backend...")

        payload = {
            "tagId": tag_id,
            "readerId": reader_id,
            "gateId": gate_id,
            # direction can be omitted; backend defaults ENTRY
        }

        try:
            headers = {"Authorization": f"Bearer {TOKEN}"}
            response = requests.post(API_URL, json=payload, headers=headers, timeout=5)

            text = (response.text or "").strip()
            print(f"Server Response Text: {text}")

            # Arduino expects a plain decision line containing ALLOW or DENY
            if text:
                arduino.write((text + "\n").encode('utf-8'))
            else:
                arduino.write(("DENY|NO_RESPONSE\n").encode('utf-8'))
        except Exception as e:
            print(f"Bridge error: {e}")
            arduino.write(("DENY|BRIDGE_ERROR\n").encode('utf-8'))

