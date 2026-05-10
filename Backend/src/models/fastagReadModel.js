const mongoose = require('mongoose');

const fastagReadSchema = new mongoose.Schema({
  readerId: { type: String, required: true, index: true },
  gateId: { type: String, index: true },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', index: true },
  parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', index: true },
  spotId: { type: String, index: true },
  // UPDATED: Added trim and uppercase to match User model normalization
  tagId: { 
    type: String, 
    required: true, 
    index: true,
    trim: true,
    uppercase: true 
  },
  vehiclePlate: { type: String, index: true, trim: true, uppercase: true },
  vehicleType: { type: String, index: true },
  matricule: { type: String, index: true },
  direction: { type: String, enum: ['ENTRY', 'EXIT'], default: 'ENTRY', index: true },
  source: { type: String, enum: ['MQTT', 'RFID'], default: 'RFID', index: true },
  timestampUtc: { type: Date, default: Date.now, index: true },
  rawTopic: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Pre-save middleware to ensure tagId is always normalized to 10 digits
fastagReadSchema.pre('save', function(next) {
  if (this.tagId && this.tagId.length > 10) {
    this.tagId = this.tagId.substring(this.tagId.length - 10);
  }
  next();
});

module.exports = mongoose.model('FastagRead', fastagReadSchema);