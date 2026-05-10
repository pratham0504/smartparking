#!/bin/bash
# RFID System Diagnostic Test

echo "==========================================="
echo "RFID Gate System - Diagnostic Test"
echo "==========================================="
echo ""

# Test 1: Check if Backend is running
echo "[1/4] Testing Backend API..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/rfid/status)

if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo "✓ Backend is running ✓"
    curl -s http://localhost:3001/api/rfid/status | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/rfid/status
else
    echo "✗ Backend NOT responding (Got HTTP $BACKEND_RESPONSE)"
    echo "  Start with: cd Backend && npm start"
fi

echo ""

# Test 2: Check if Python bridge is running
echo "[2/4] Checking Python bridge process..."
if pgrep -f "rfidGateBridge.py" > /dev/null; then
    echo "✓ Python bridge is running ✓"
else
    echo "✗ Python bridge NOT running"
    echo "  Start with: cd Backend && python3 src/rfidGateBridge.py"
fi

echo ""

# Test 3: Test authentication endpoint
echo "[3/4] Testing authentication endpoint..."
TEST_RESPONSE=$(curl -s -X POST http://localhost:3001/api/rfid/authenticate \
  -H "Content-Type: application/json" \
  -d '{"cardId":"TEST123456","readerId":"test-reader","gateId":"test-gate"}')

echo "Response: $TEST_RESPONSE" | jq '.' 2>/dev/null || echo "Response: $TEST_RESPONSE"

echo ""

# Test 4: List Arduino devices
echo "[4/4] Available Serial Devices..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    ls -la /dev/cu.* 2>/dev/null | grep -i usb || echo "No USB devices found"
    ls -la /dev/cu.* 2>/dev/null | grep -i usbserial || echo "No USBSERIAL devices found"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    ls -la /dev/ttyUSB* 2>/dev/null || echo "No /dev/ttyUSB devices found"
    ls -la /dev/ttyACM* 2>/dev/null || echo "No /dev/ttyACM devices found"
fi

echo ""
echo "==========================================="
echo "Diagnostics Complete"
echo "==========================================="
