#!/bin/bash
# RFID Gate Backend + Bridge Quick Start Script
# Starts the Node.js backend and Python bridge

echo "=========================================="
echo "ParkEz RFID Gate System - Quick Start"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python3 not found. Please install Python 3.7+${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 14+${NC}"
    exit 1
fi

# Install Python dependencies
echo -e "${YELLOW}→ Installing Python dependencies...${NC}"
pip install pyserial requests >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install Python dependencies${NC}"
    exit 1
fi

# Start Backend
echo -e "${YELLOW}→ Starting Backend Node.js server...${NC}"
cd Backend
npm install >/dev/null 2>&1
npm start &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend to start
sleep 3

# Start Python Bridge
echo -e "${YELLOW}→ Starting Python RFID Bridge...${NC}"
cd ../Backend
python3 src/rfidGateBridge.py &
BRIDGE_PID=$!
echo -e "${GREEN}✓ Bridge started (PID: $BRIDGE_PID)${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "System Started Successfully!"
echo "==========================================${NC}"
echo ""
echo "Backend: http://localhost:3001"
echo "RFID API: http://localhost:3001/api/rfid"
echo ""
echo "To stop:"
echo "  kill $BACKEND_PID  # Stop backend"
echo "  kill $BRIDGE_PID   # Stop bridge"
echo ""
echo -e "${YELLOW}Waiting for card scans...${NC}"
echo ""

# Keep scripts running
wait
