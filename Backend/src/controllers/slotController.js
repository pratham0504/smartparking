const Slot = require('../models/slotModel');

// Helper to emit latest slots via Socket.IO
async function emitSlotsUpdate(req) {
  try {
    const io = req.app.get('io');
    if (!io) {
      console.warn('[SLOTS] No Socket.IO instance available - cannot emit slots:update');
      return;
    }
    const slots = await Slot.find({}).sort({ slotNumber: 1 }).lean();
    console.log(`[SLOTS] Emitting slots:update to all clients with ${slots.length} slots`);
    io.emit('slots:update', slots);
  } catch (err) {
    console.error('[SLOTS] Emit slots update error:', err);
  }
}

exports.getAllSlots = async (req, res) => {
  try {
    const slots = await Slot.find({}).sort({ slotNumber: 1 });
    res.json(slots);
  } catch (err) {
    console.error('Get slots error:', err);
    res.status(500).json({ message: 'Error fetching slots' });
  }
};

exports.updateSlot = async (req, res) => {
  try {
    const slotNumber = Number(req.params.slotNumber);
    const data = req.body || {};

    let slot = await Slot.findOne({ slotNumber });
    if (!slot) {
      slot = new Slot({ slotNumber, ...data });
    } else {
      Object.assign(slot, data);
    }

    // Update sensorLastSeen when sensor data arrives
    if (data.sensorSeen) slot.sensorLastSeen = new Date();

    await slot.save();

    // Emit to connected clients
    await emitSlotsUpdate(req);

    res.json({ success: true, slot });
  } catch (err) {
    console.error('Update slot error:', err);
    res.status(500).json({ message: 'Error updating slot' });
  }
};

// Endpoint for hardware (Arduino/bridge) to POST updates without auth
exports.hardwareUpdate = async (req, res) => {
  try {
    const { slotNumber, isOccupied, reservedBy, parkingName, parkingId, meta } = req.body;
    if (typeof slotNumber === 'undefined') {
      console.warn('[SLOTS:HW] Missing slotNumber in request body');
      return res.status(400).json({ message: 'slotNumber required' });
    }

    console.log(`[SLOTS:HW] Received hardware update: Slot ${slotNumber} = ${isOccupied ? 'OCCUPIED' : 'FREE'}`);

    let slot = await Slot.findOne({ slotNumber });
    if (!slot) {
      console.log(`[SLOTS:HW] Creating new slot record: ${slotNumber}`);
      slot = new Slot({ slotNumber });
    }

    if (typeof isOccupied !== 'undefined') slot.isOccupied = Boolean(isOccupied);
    if (reservedBy) slot.reservedBy = reservedBy;
    if (parkingName) slot.parkingName = parkingName;
    if (parkingId) slot.parkingId = parkingId;
    if (meta) slot.meta = { ...(slot.meta || {}), ...meta };
    slot.sensorLastSeen = new Date();

    await slot.save();
    console.log(`[SLOTS:HW] Slot ${slotNumber} saved to database`);
    
    await emitSlotsUpdate(req);

    res.json({ success: true, slot });
  } catch (err) {
    console.error('[SLOTS:HW] Hardware update error:', err);
    res.status(500).json({ message: 'Error in hardware update' });
  }
};
