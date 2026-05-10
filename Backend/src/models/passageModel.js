const mongoose = require('mongoose');

const passageSchema = new mongoose.Schema({
  cameraEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'CameraEvent', index: true },
  fastagRead: { type: mongoose.Schema.Types.ObjectId, ref: 'FastagRead', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', index: true },
  parkingId: { type: String, index: true },
  gateId: { type: String, index: true },
  spotId: { type: String, index: true },
  plateText: { type: String, index: true },
  tagId: { type: String, index: true },
  vehicleType: { type: String, index: true },
  matricule: { type: String, index: true },
  cameraId: { type: String, index: true },
  readerId: { type: String, index: true },
  source: { type: String, enum: ['CAMERA', 'RFID', 'MERGED'], default: 'RFID', index: true },
  direction: { type: String, enum: ['ENTRY', 'EXIT'], index: true },
  decision: { type: String, enum: ['ALLOW', 'DENY'], index: true },
  reason: { type: String },
  timestamp: { type: Date, index: true },
  matched: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('Passage', passageSchema);
