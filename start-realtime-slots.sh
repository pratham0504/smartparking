#!/bin/bash

# ParkEz Real-time Slot Updates - Quick Start Script
# This script starts all necessary services for live slot updates

set -e

PROJECT_ROOT="/Users/prathamved/Downloads/Parkini-main"

echo "=========================================="
echo "ParkEz Real-time Slot System - Quick Start"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Service Status Check:${NC}"
echo ""

# Check if ports are in use
check_port() {
    if lsof -i :$1 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Port $1 is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Port $1 is available${NC}"
        return 0
    fi
}

echo "Checking ports..."
check_port 3001 || echo "Backend might already be running"
check_port 3000 || echo "Frontend might already be running"

echo ""
echo -e "${BLUE}Starting services...${NC}"
echo ""

# Start Backend
echo -e "${GREEN}1. Starting Backend (port 3001)...${NC}"
cd "$PROJECT_ROOT/Backend"
npm start &
BACKEND_PID=$!
sleep 3
echo "   Backend PID: $BACKEND_PID"

# Start Python Bridge
echo ""
echo -e "${GREEN}2. Starting Python RFID Bridge...${NC}"
cd "$PROJECT_ROOT/Backend"
source "$PROJECT_ROOT/.venv/bin/activate" 2>/dev/null || echo "Virtual environment not found, skipping activation"
python3 src/rfidGateBridge.py &
BRIDGE_PID=$!
sleep 2
echo "   Bridge PID: $BRIDGE_PID"

# Start Frontend
echo ""
echo -e "${GREEN}3. Starting Frontend (port 3000)...${NC}"
cd "$PROJECT_ROOT/Front-end-Front-Office-"
npm start &
FRONTEND_PID=$!
sleep 3
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo -e "${GREEN}=========================================="
echo "✓ All services started!"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  • Frontend:  http://localhost:3000"
echo "  • Backend:   http://localhost:3001"
echo "  • Booking:   http://localhost:3000/booking?step=2"
echo ""
echo "Open browser DevTools (F12) and check Console for:"
echo "  [LIVE-PARKING] Socket.IO connected"
echo "  [LIVE-PARKING] Received slots:update event"
echo ""
echo "To stop all services, run:"
echo "  kill $BACKEND_PID $BRIDGE_PID $FRONTEND_PID"
echo ""
echo -e "Check $PROJECT_ROOT/DEBUGGING_REALTIME_SLOTS.md for troubleshooting"
echo -e "${NC}"

# Keep script running
wait
