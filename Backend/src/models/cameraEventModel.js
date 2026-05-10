const mongoose = require('mongoose');

const cameraEventSchema = new mongoose.Schema({
  cameraId: { type: String, required: true, index: true },
  gateId: { type: String, index: true },
  timestampUtc: { type: Date, default: Date.now, index: true },
  plateText: { type: String, index: true },
  confidence: { type: Number },
  snapshot: { type: String }, // path to stored snapshot
  rawTopic: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('CameraEvent', cameraEventSchema);
