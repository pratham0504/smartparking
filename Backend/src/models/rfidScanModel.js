const mongoose = require('mongoose');

const rfidScanSchema = new mongoose.Schema({
  cardId: { type: String, required: true, index: true },
  readerId: { type: String },
  gateId: { type: String },
  timestamp: { type: Date, default: Date.now },
  decision: { type: String, enum: ['ALLOW', 'DENY', 'UNKNOWN'], default: 'UNKNOWN' },
  reason: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  processed: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('RfidScan', rfidScanSchema);
