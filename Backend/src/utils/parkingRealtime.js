const buildParkingStatePayload = (parking, extra = {}) => {
  if (!parking) {
    return null;
  }

  const parkingObject = typeof parking.toObject === 'function' ? parking.toObject() : parking;

  return {
    parkingId: String(parkingObject._id),
    name: parkingObject.name,
    availableSpots: parkingObject.availableSpots,
    totalSpots: parkingObject.totalSpots,
    spots: Array.isArray(parkingObject.spots)
      ? parkingObject.spots.map((spot) => ({
          id: spot.id,
          status: spot.status,
          reservedBy: spot.reservedBy || null,
          reservationTime: spot.reservationTime || null,
        }))
      : [],
    updatedAt: new Date().toISOString(),
    ...extra,
  };
};

const emitParkingUpdate = (io, parking, extra = {}) => {
  if (!io || !parking) {
    return null;
  }

  const payload = buildParkingStatePayload(parking, extra);
  io.emit('parking_state_updated', payload);
  return payload;
};

const emitReservationPaymentUpdate = (io, reservation, extra = {}) => {
  if (!io || !reservation) {
    return null;
  }

  const payload = {
    reservationId: String(reservation._id),
    parkingId: String(reservation.parkingId),
    spotId: reservation.spotId,
    paymentStatus: reservation.paymentStatus,
    paymentMethod: reservation.paymentMethod,
    status: reservation.status,
    userId: reservation.userId ? String(reservation.userId) : null,
    ...extra,
  };

  if (payload.userId) {
    io.to(`user_${payload.userId}`).emit('reservation_payment_completed', payload);
  }
  io.emit('reservation_payment_completed', payload);
  return payload;
};

module.exports = {
  buildParkingStatePayload,
  emitParkingUpdate,
  emitReservationPaymentUpdate,
};