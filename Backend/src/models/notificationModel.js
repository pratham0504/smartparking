const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', default: null },
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', default: null },
    type: { 
        type: String, 
        enum: ['reservation', 'claim_against_vehicle', 'claim_status_update', 'general'], 
        default: 'general' 
    },
    status: { type: String, enum: ['en_attente', 'acceptée', 'refusée'], default: 'en_attente' },
    isRead: { type: Boolean, default: false },
    messageRequested: { type: String },
    title: { type: String },
    message: { type: String },
    plateNumber: { type: String },
    evidenceUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);  