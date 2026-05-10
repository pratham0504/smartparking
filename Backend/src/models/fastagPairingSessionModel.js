const mongoose = require('mongoose');

const fastagPairingSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'consumed', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    linkedTagId: {
      type: String,
      default: null,
      index: true,
    },
    linkedAt: {
      type: Date,
      default: null,
    },
    readerId: {
      type: String,
      default: null,
      index: true,
    },
    gateId: {
      type: String,
      default: null,
      index: true,
    },
    parkingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parking',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

fastagPairingSessionSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('FastagPairingSession', fastagPairingSessionSchema);