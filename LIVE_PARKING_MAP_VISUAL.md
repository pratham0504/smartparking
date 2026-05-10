# Live Parking Map - Visual Reference Guide

## 📍 What You'll See on http://localhost:3000/booking?step=2

### Header Section
```
🔴 Realtime Arduino Sensors
Live Parking Status

        85%                  shah&anchor
      Occupied
```

### Legend
```
⬜ Available  |  🔴 Occupied  |  🟧 Reserved
```

### Parking Map (SVG Visualization)
```
┌───────────────────────────────────────────┐
│                                           │
│  🔵 E (Entrance)                          │
│  Entrance                                 │
│                                           │
│  ✅          ┌──────────────┐      ✅     │
│  Slot 1      │   Building   │    Slot 2   │
│  AVAILABLE   │   Structure  │   AVAILABLE │
│              │              │             │
│  ✅          │              │      🔴     │
│  Slot 3      │   (Middle)   │    Slot 4   │
│  AVAILABLE   │   Block      │   OCCUPIED  │
│              └──────────────┘             │
│                                           │
│                Street                     │
│              🔴 S (Exit)                  │
│                Exit                       │
│                                           │
└───────────────────────────────────────────┘

Time shown on hover: 10:32:15
```

### Statistics Box
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│    2     │  │    1     │  │    3     │
│ Available│  │ Occupied │  │  Total   │
└──────────┘  └──────────┘  └──────────┘
```

## 🎨 Color Coding

### Available Slot (Green)
```
┌─────────────────┐
│ ✅              │ ← Checkmark icon (green)
│ Slot 1          │ ← White text
│ AVAILABLE       │ ← Gray text
│ 10:32:15        │ ← Timestamp (on hover)
└─────────────────┘
  ↑ Green dashed border, semi-transparent green background
```

### Occupied Slot (Red)
```
┌─────────────────┐
│ 🔴              │ ← Red circle icon
│ Slot 2          │ ← White text
│ OCCUPIED        │ ← Gray text
│ 10:32:18        │ ← Timestamp (on hover)
└─────────────────┘
  ↑ Red solid border, semi-transparent red background
```

### Reserved Slot (Orange)
```
┌─────────────────┐
│ 🟧              │ ← Orange square icon
│ Slot 3          │ ← White text
│ RESERVED        │ ← Gray text
│ 10:32:22        │ ← Timestamp (on hover)
└─────────────────┘
  ↑ Orange solid border, semi-transparent orange background
```

## 📊 Status Indicator Meanings

| Icon | Status | Meaning | Arduino Detection |
|------|--------|---------|------------------|
| ✅ | AVAILABLE | Slot is free, ready to book | IR sensor: HIGH (no car) |
| 🔴 | OCCUPIED | Car is in this slot | IR sensor: LOW (car present) |
| 🟧 | RESERVED | Slot reserved by user | `reservedBy` field set |

## 🔄 Live Update Example

### Initial State (No Cars)
```
Time: 10:00:00

Slot 1: ✅ AVAILABLE
Slot 2: ✅ AVAILABLE
Slot 3: ✅ AVAILABLE
Slot 4: ✅ AVAILABLE

Occupancy: 0% (0 occupied, 4 available, 4 total)
```

### User Drives to Slot 1 (Arduino Detects)
```
Time: 10:01:30

Slot 1: 🔴 OCCUPIED        ← Updated instantly!
Slot 2: ✅ AVAILABLE
Slot 3: ✅ AVAILABLE
Slot 4: ✅ AVAILABLE

Occupancy: 25% (1 occupied, 3 available, 4 total)
           ↑ Percentage updates automatically
```

### Another Car Arrives
```
Time: 10:02:15

Slot 1: 🔴 OCCUPIED
Slot 2: 🔴 OCCUPIED        ← Updated!
Slot 3: ✅ AVAILABLE
Slot 4: ✅ AVAILABLE

Occupancy: 50% (2 occupied, 2 available, 4 total)
```

### Car Leaves Slot 1
```
Time: 10:05:00

Slot 1: ✅ AVAILABLE        ← Updated back to available
Slot 2: 🔴 OCCUPIED
Slot 3: ✅ AVAILABLE
Slot 4: ✅ AVAILABLE

Occupancy: 25% (1 occupied, 3 available, 4 total)
```

## 🎯 User Interactions

### Hover Over Slot (Desktop)
```
Before Hover:
┌─────────────────┐
│ ✅              │
│ Slot 1          │
│ AVAILABLE       │
└─────────────────┘

After Hover:
┌─────────────────────────────────────┐
│ ✅              │ ← Scales up       │
│ Slot 1          │ ← Brighter        │
│ AVAILABLE       │ ← Cursor: pointer │
│                 │                   │
│ 10:32:15        │ ← Timestamp shows │
└─────────────────────────────────────┘
```

### Click on Slot (Read-only Mode)
- Shows tooltip
- Cursor becomes pointer (if interactive)
- No action (read-only mode on booking page)

## 📱 Responsive Layout

### Desktop (1200px+)
```
┌─────────────────────────────────────┐
│ 🔴 Realtime Sensors  85% - parking  │
│                                     │
│ ✅ AVAILABLE | 🔴 OCCUPIED | 🟧 RES │
│                                     │
│              PARKING MAP            │
│        (Full width, SVG)            │
│      4:3 aspect ratio               │
│                                     │
│ Avail: 3  | Occupied: 1 | Total: 4 │
└─────────────────────────────────────┘
```

### Tablet (768px - 1200px)
```
┌───────────────────────┐
│ Sensors  85% - park   │
│                       │
│ ✅ AVAIL | 🔴 OCC     │
│                       │
│    PARKING MAP        │
│  (Scaled down)        │
│  3:2 aspect ratio     │
│                       │
│ Avail: 3  | Occ: 1    │
└───────────────────────┘
```

### Mobile (<768px)
```
┌──────────────┐
│ Sensors      │
│ 85% - park   │
│              │
│ ✅ 🔴        │
│              │
│  PARKING MAP │
│  (Compact)   │
│  3:2 ratio   │
│              │
│ A:3 O:1 T:4 │
└──────────────┘
```

## ⚡ Animation Effects

### Pulse Animation (Continuous)
```
Icon gently pulses to indicate live data:

Time: 0ms   - Icon 100%, Scale 1.0x
Time: 500ms - Icon 70%,  Scale 1.05x
Time: 1000ms- Icon 100%, Scale 1.0x (repeat)
```

### Updating Animation (On Change)
```
When slot status changes:

"Updating..." label appears above slot with blinking effect:

Time: 0ms    - Opacity 100%
Time: 250ms  - Opacity 50%
Time: 500ms  - Opacity 100% (repeat)

Then disappears after 2-3 seconds
```

### Hover Scale
```
Before: 1.0x
Hover:  1.1x (slightly larger)
```

## 🔄 Real-time Update Flow (Visual)

```
Arduino Detects Car
        ↓
Serial: SLOT:1:OCCUPIED:VAL:1:PIN:8
        ↓
Python Bridge Reads (time: 0ms)
        ↓
POST to Backend (time: 50ms)
        ↓
Backend Saves & Emits (time: 100ms)
        ↓
Socket.IO Broadcasts (time: 120ms)
        ↓
Browser Receives (time: 150ms)
        ↓
React Updates State (time: 180ms)
        ↓
Visual Change: Slot 1 → 🔴 (time: 200ms)
        ↓
Occupancy % Updates: 0% → 25% (time: 200ms)
        ↓
USER SEES LIVE UPDATE!
```

## 🧪 Testing Checklist

- [ ] Parking map displays without errors
- [ ] Legend shows all three status types
- [ ] Occupancy percentage displays in header
- [ ] Statistics box shows correct counts
- [ ] Slots display with correct icons
- [ ] Colors match legend (available=green, occupied=red, reserved=orange)
- [ ] Map has Entrance (E) and Exit (S) markers
- [ ] Hover over slot shows timestamp
- [ ] Slot icon pulses gently (continuous animation)
- [ ] Real-time updates reflect Arduino sensor changes
- [ ] Map is responsive on mobile/tablet/desktop
- [ ] No console errors in DevTools

## 📞 Support

For issues, check:
1. Browser console (F12 → Console) for errors
2. Backend console for Socket.IO emissions
3. Arduino serial monitor for SLOT messages
4. Bridge console for successful POSTs

See `LIVE_PARKING_MAP.md` for detailed documentation.

---

**Summary**: The parking map provides a **visual, real-time display** of all parking slots with their current status from Arduino sensors, updating automatically as cars arrive and depart! 🚗
