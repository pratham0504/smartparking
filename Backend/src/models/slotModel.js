const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  slotNumber: { type: Number, required: true, unique: true },
  isOccupied: { type: Boolean, default: false },
  reservedAt: { type: Date, default: null },
  reservedBy: { type: String, default: null },
  parkingName: { type: String, default: null },
  parkingId: { type: String, default: null },
  sensorLastSeen: { type: Date, default: null },
  meta: { type: Object, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Slot', SlotSchema);
