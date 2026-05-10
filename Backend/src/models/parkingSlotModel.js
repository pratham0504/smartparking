const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
  slotNumber: {
    type: Number,
    required: true,
    unique: true,
  },
  isOccupied: {
    type: Boolean,
    default: false,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to update the 'lastUpdated' field on save
parkingSlotSchema.pre('save', function (next) {
  this.lastUpdated = Date.now();
  next();
});

const ParkingSlot = mongoose.model('ParkingSlot', parkingSlotSchema);

module.exports = ParkingSlot;
