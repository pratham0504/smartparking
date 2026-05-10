const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const FastagRead = require('../models/fastagReadModel');
const Passage = require('../models/passageModel');
const Reservation = require('../models/reservationModel');
const Parking = require('../models/parkingModel');
const Payment = require('../models/paymentModel');
const Slot = require('../models/slotModel');
const FastagPairingSession = require('../models/fastagPairingSessionModel');
const { verifyToken } = require('../middlewares/authMiddleware');
const { emitParkingUpdate, emitReservationPaymentUpdate } = require('../utils/parkingRealtime');
const passageService = require('../services/passageService');

const normalizeTagId = (tagId) => String(tagId || '').trim().toUpperCase();

// Convert 12-char HEX UID (e.g. 05007AE367FB) to 10-digit decimal using middle 8 hex chars
const hex12ToDec10 = (hex) => {
  if (!hex) return null;
  const h = String(hex).trim().toUpperCase();
  if (!/^[0-9A-F]{12}$/.test(h)) return null;
  try {
    // take middle 8 hex chars (positions 2..9 zero-based)
    const mid = h.slice(2, 10);
    const dec = parseInt(mid, 16).toString(10);
    // pad to 10 digits if needed
    return dec.padStart(10, '0');
  } catch (e) {
    return null;
  }
};

const buildTagVariants = (tagId) => {
  const norm = normalizeTagId(tagId);
  const variants = [norm];
  const dec = hex12ToDec10(norm);
  if (dec && !variants.includes(dec)) variants.push(dec);
  return variants;
};

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findUserByTagId = async (tagId) => {
  const variants = buildTagVariants(tagId).filter(Boolean);
  if (!variants.length) return null;

  // build $or of regex matches for each variant
  const regexes = variants.map(v => ({ 'fastags.tagId': { $regex: `^${escapeRegExp(v)}$`, $options: 'i' } }));
  return User.findOne({ $or: regexes });
};

const findActivePairingSession = async ({ readerId, gateId, parkingId }) => {
  const now = new Date();
  const query = {
    status: 'pending',
    expiresAt: { $gt: now },
  };

  if (readerId) {
    query.readerId = readerId;
  }

  if (gateId) {
    query.gateId = gateId;
  }

  if (parkingId) {
    query.parkingId = parkingId;
  }

  const session = await FastagPairingSession.findOne(query).sort({ createdAt: -1 });
  if (session) {
    return session;
  }

  return FastagPairingSession.findOne({
    status: 'pending',
    expiresAt: { $gt: now },
  }).sort({ createdAt: -1 });
};

const buildCarDetails = (user, reservation, fastagTag) => ({
  vehicleType: reservation?.vehicleType || user?.vehicleType || null,
  matricule: reservation?.matricule || fastagTag?.vehiclePlate || null,
  reservationId: reservation ? String(reservation._id) : null,
  parkingId: reservation ? String(reservation.parkingId) : null,
  spotId: reservation?.spotId || null,
});

const toArduinoText = ({ allow, action, reason, tagId, direction, user }) => {
  const uid = user ? String(user._id) : 'NA';
  const userLabel = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'NA';
  return `${allow ? 'ALLOW' : 'DENY'}|${action}|${reason || 'NA'}|TAG:${tagId}|DIR:${direction}|USER:${uid}|NAME:${userLabel}`;
};

async function findBookedReservationForScan({ userId, parkingId, reservationId }) {
  const now = new Date();

  if (reservationId) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return { reservation: null, reason: 'RESERVATION_NOT_FOUND' };
    }

    if (String(reservation.userId) !== String(userId)) {
      return { reservation: null, reason: 'RESERVATION_USER_MISMATCH' };
    }

    if (parkingId && String(reservation.parkingId) !== String(parkingId)) {
      return { reservation: null, reason: 'RESERVATION_PARKING_MISMATCH' };
    }

    if (!['pending', 'accepted'].includes(reservation.status)) {
      return { reservation: null, reason: 'RESERVATION_NOT_ACTIVE' };
    }

    if (reservation.startTime > now || reservation.endTime < now) {
      return { reservation: null, reason: 'RESERVATION_OUTSIDE_TIME_WINDOW' };
    }

    return { reservation, reason: null };
  }

  const query = {
    userId,
    status: { $in: ['pending', 'accepted'] },
    startTime: { $lte: now },
    endTime: { $gte: now }
  };

  if (parkingId) {
    query.parkingId = parkingId;
  }

  const reservation = await Reservation.findOne(query).sort({ createdAt: -1 });
  if (!reservation) {
    return { reservation: null, reason: parkingId ? 'NO_ACTIVE_BOOKED_SLOT' : 'PARKING_ID_REQUIRED' };
  }

  return { reservation, reason: null };
}

async function checkAntiPassback(tagId, direction) {
  const lastAllowed = await Passage.findOne({
    tagId,
    source: 'RFID',
    decision: 'ALLOW'
  }).sort({ timestamp: -1 });

  if (direction === 'ENTRY' && lastAllowed && lastAllowed.direction === 'ENTRY') {
    return { ok: false, reason: 'ALREADY_INSIDE' };
  }

  if (direction === 'EXIT' && (!lastAllowed || lastAllowed.direction !== 'ENTRY')) {
    return { ok: false, reason: 'NOT_INSIDE' };
  }

  return { ok: true };
}

// GET /api/fastag/:tagId - get info about a FASTag (linked user)
router.get('/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;
    const user = await findUserByTagId(tagId);
    if (!user) return res.status(404).json({ ok: false, message: 'FASTag not linked' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/fastag/read - ingest a fastag read from hardware/bridge
router.post('/read', async (req, res) => {
  try {
    const { tagId, readerId, gateId, parkingId, direction, vehiclePlate, timestampUtc } = req.body || {};
    if (!tagId) return res.status(400).json({ ok: false, message: 'tagId required' });

    const doc = new FastagRead({
      tagId: normalizeTagId(tagId),
      readerId: readerId || null,
      gateId: gateId || null,
      parkingId: parkingId || null,
      direction: (direction || 'ENTRY').toUpperCase(),
      vehiclePlate: vehiclePlate || null,
      timestampUtc: timestampUtc ? new Date(timestampUtc) : new Date(),
      source: 'RFID'
    });

    const saved = await doc.save();

    // Try to match and process passage asynchronously
    (async () => {
      try {
        await passageService.tryMatchFastagRead(saved);
      } catch (e) {
        console.warn('Failed to match fastag read:', e && e.message);
      }
    })();

    // If there is an active pairing session for this reader/gate/parking, link the tag to that user
    try {
      const session = await findActivePairingSession({ readerId, gateId, parkingId });
      if (session) {
        console.log('Found active pairing session for tag', tagId, 'sessionId', session._id);
        if (session.userId) {
          const user = await User.findById(session.userId);
          if (user) {
            const variants = buildTagVariants(tagId);
            const preferred = variants.length > 1 ? variants[1] : variants[0]; // prefer DEC if available
            const already = user.fastags && user.fastags.some(f => normalizeTagId(f.tagId) === normalizeTagId(preferred));
            if (!already) {
              user.fastags.push({ tagId: preferred, linkedAt: new Date(), vehiclePlate: vehiclePlate || null });
              await user.save();
              // mark session as linked
              session.status = 'linked';
              session.linkedTagId = preferred;
              session.linkedAt = new Date();
              await session.save();
              console.log('Linked tag', preferred, 'to user', user._id);
            } else {
              console.log('Tag already linked to user', user._id);
            }
          }
        }
      }
    } catch (linkErr) {
      console.warn('Error while attempting auto-linking during /api/fastag/read:', linkErr && linkErr.message);
    }

    // Determine allow/deny: allow only if the tag is linked to a user AND there is at least one free slot
    const linkedUser = await findUserByTagId(tagId);
    let allow = false;
    let reason = 'TAG_NOT_LINKED';
    let freeSlot = null;

    if (linkedUser) {
      // find one free slot for this parking (if parkingId provided, prefer that)
      const slotQuery = { isOccupied: false };
      if (parkingId) slotQuery.parkingId = parkingId;
      freeSlot = await Slot.findOne(slotQuery).sort({ slotNumber: 1 }).lean();

      if (freeSlot) {
        allow = true;
        reason = 'TAG_LINKED_SLOT_AVAILABLE';
      } else {
        allow = false;
        reason = 'NO_SLOTS_AVAILABLE';
      }
    }

    return res.json({ ok: true, saved, allow, reason, user: linkedUser ? { _id: linkedUser._id, email: linkedUser.email } : null, slot: freeSlot ? { slotNumber: freeSlot.slotNumber, _id: freeSlot._id } : null });
  } catch (err) {
    console.error('Error in /api/fastag/read', err && err.message);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Link a fastag to a user
router.post('/link', verifyToken, async (req, res) => {
  console.log('--- Received /api/fastag/link request ---');
  console.log('Request Body:', req.body);
  console.log('Authenticated User (from token):', req.user);

  const { tagId: rawTagId, vehiclePlate } = req.body;
  const userId = req.user?._id; // Get user ID from the authenticated user object
  const tagId = normalizeTagId(rawTagId);
  const tagVariants = buildTagVariants(tagId);
  const preferredTag = tagVariants.length > 1 ? tagVariants[1] : tagVariants[0];

  if (!userId) {
    console.error('Error: User ID not found after authentication. req.user is missing or invalid.');
    return res.status(401).json({ message: 'Authentication failed: User ID could not be determined from token.' });
  }

  if (!tagId) {
    return res.status(400).json({ message: 'Tag ID is required.' });
  }

  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.error(`Error: User with ID ${userId} not found in database.`);
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if the tag is already linked to this user (check variants)
    const alreadyLinked = (user.fastags || []).some(f => buildTagVariants(f.tagId).some(v => tagVariants.includes(normalizeTagId(v))));
    if (alreadyLinked) {
      return res.status(409).json({ message: 'This RFID tag is already linked to your account.' });
    }

    // Add the new fastag using preferred variant (DEC if available)
    user.fastags.push({
      tagId: preferredTag,
      linkedAt: new Date(),
      vehiclePlate: vehiclePlate || null
    });

    await user.save();
    
    console.log(`Successfully linked tag ${tagId} to user ${userId}`);
    res.status(200).json({
      message: 'RFID tag linked successfully!',
      fastags: user.fastags
    });
  } catch (error) {
    console.error('Error linking RFID tag:', error);
    res.status(500).json({ message: 'Server error while linking tag.' });
  }
});

// Start a pairing session for a user to link a fastag via an external reader
router.post('/pairing/start', verifyToken, async (req, res) => {
  try {
    const { readerId, gateId, parkingId, ttlMinutes = 5 } = req.body;
    const uid = req.user && (req.user._id || req.user.id);

    if (!uid) {
      return res.status(401).json({ ok: false, message: 'Authentication required' });
    }

    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    await FastagPairingSession.updateMany(
      { userId: user._id, status: 'pending' },
      { $set: { status: 'cancelled' } }
    );

    const expiresAt = new Date(Date.now() + Math.max(1, Number(ttlMinutes) || 5) * 60 * 1000);
    const session = await FastagPairingSession.create({
      userId: user._id,
      readerId: readerId ? String(readerId).trim() : null,
      gateId: gateId ? String(gateId).trim() : null,
      parkingId: parkingId || null,
      expiresAt,
      status: 'pending',
    });

    return res.json({ ok: true, session });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/fastag/pairing/status/:sessionId - check pairing session status
router.get('/pairing/status/:sessionId', async (req, res) => {
  try {
    const session = await FastagPairingSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, message: 'Pairing session not found' });
    }

    return res.json({
      ok: true,
      session: {
        _id: session._id,
        status: session.status,
        linkedTagId: session.linkedTagId,
        linkedAt: session.linkedAt,
        expiresAt: session.expiresAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// POST /api/fastag/unlink - unlink a FASTag
// body: { tagId, userId? }
router.post('/unlink', async (req, res) => {
  try {
    const { tagId, userId } = req.body;
    const normalizedTagId = normalizeTagId(tagId);
    const uid = (req.user && req.user._id) || userId;
    if (!uid) return res.status(400).json({ ok: false, message: 'userId required (or authenticate)' });
    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    user.fastags = (user.fastags || []).filter(f => normalizeTagId(f.tagId) !== normalizedTagId);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/fastag/scan
// body: { tagId, readerId, gateId?, direction?: ENTRY|EXIT, parkingId?, meta? }
// Query: ?format=text to get Arduino-friendly plain text response
const processRfidScan = async (req, res) => {
  try {
    const tagId = normalizeTagId(req.body.tagId);
    const readerId = String(req.body.readerId || '').trim();
    const gateId = req.body.gateId ? String(req.body.gateId).trim() : null;
    const parkingId = req.body.parkingId ? String(req.body.parkingId).trim() : null;
    const reservationId = req.body.reservationId ? String(req.body.reservationId).trim() : null;
    const direction = String(req.body.direction || 'ENTRY').toUpperCase() === 'EXIT' ? 'EXIT' : 'ENTRY';
    const meta = req.body.meta || {};

    if (!tagId || !readerId) {
      return res.status(400).json({
        ok: false,
        allow: false,
        action: 'DENY',
        reason: 'TAG_OR_READER_REQUIRED'
      });
    }

    let allow = false;
    let reason = 'TAG_NOT_LINKED';
    let matchedUser = null;
    let matchedReservation = null;
    let fastagTag = null;

    const activePairingSession = await findActivePairingSession({ readerId, gateId, parkingId });

    if (activePairingSession) {
      const user = await User.findById(activePairingSession.userId);
      if (!user) {
        activePairingSession.status = 'cancelled';
        await activePairingSession.save();
      } else {
        const existingFastag = (user.fastags || []).find((f) => normalizeTagId(f.tagId) === tagId);
        if (!existingFastag) {
          user.fastags = user.fastags || [];
          user.fastags.push({ tagId, vehiclePlate: meta.vehiclePlate || null, active: true });
          await user.save();
        }

        activePairingSession.status = 'consumed';
        activePairingSession.linkedTagId = tagId;
        activePairingSession.linkedAt = new Date();
        await activePairingSession.save();

        const io = req.app.get('io');
        io?.emit('fastag_linked', {
          userId: String(user._id),
          tagId,
          sessionId: String(activePairingSession._id),
        });

        if (String(req.query.format || '').toLowerCase() === 'text') {
          return res.type('text/plain').send(`ALLOW|LINKED|PAIRING_SUCCESS|TAG:${tagId}|DIR:${direction}|USER:${String(user._id)}|NAME:${user.firstName || ''} ${user.lastName || ''}`);
        }

        return res.json({
          ok: true,
          allow: true,
          action: 'LINKED',
          reason: 'PAIRING_SUCCESS',
          tagId,
          readerId,
          gateId,
          direction,
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          },
          pairingSession: {
            _id: activePairingSession._id,
            status: activePairingSession.status,
          },
        });
      }
    }

    const user = await findUserByTagId(tagId);
    if (user) {
      const tag = (user.fastags || []).find((f) => normalizeTagId(f.tagId) === tagId);
      fastagTag = tag || null;
      if (!tag || !tag.active) {
        reason = 'TAG_INACTIVE';
      } else if (user.status === 'Blocked' || user.status === 'Pending_Verification') {
        reason = 'USER_BLOCKED';
      } else {
        const bookedReservationResult = await findBookedReservationForScan({
          userId: user._id,
          parkingId,
          reservationId,
        });

        if (!bookedReservationResult.reservation) {
          reason = bookedReservationResult.reason;
        } else {
          matchedReservation = bookedReservationResult.reservation;
          const antiPassback = await checkAntiPassback(tagId, direction);
          if (!antiPassback.ok) {
            reason = antiPassback.reason;
          } else {
            allow = true;
            reason = 'AUTHORIZED';
            matchedUser = user;
          }
        }
      }
    }

    if (allow) {
      if (matchedReservation) {
        if (direction === 'ENTRY') {
          const existingFastagPayment = await Payment.findOne({
            reservationId: matchedReservation._id,
            paymentMethod: 'fastag',
            status: 'completed',
          });

          if (!existingFastagPayment) {
            await Payment.create({
              reservationId: matchedReservation._id,
              amount: matchedReservation.totalPrice,
              currency: process.env.DEFAULT_CURRENCY || 'INR',
              status: 'completed',
              paymentMethod: 'fastag',
              paymentDetails: {
                fastagId: tagId,
                operator: meta.operator || null,
              },
              transactionId: `RFID-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              paidAt: new Date(),
            });
          }

          matchedReservation.paymentMethod = 'fastag';
          matchedReservation.paymentStatus = 'completed';
          if (matchedReservation.status === 'pending') {
            matchedReservation.status = 'accepted';
          }
          matchedReservation.entryTime = new Date();
          await matchedReservation.save();
        } else if (direction === 'EXIT') {
          matchedReservation.status = 'completed';
          const now = new Date();
          matchedReservation.exitTime = now;
          
          if (now > matchedReservation.endTime) {
            const overstayMs = now.getTime() - matchedReservation.endTime.getTime();
            const overstayHours = Math.ceil(overstayMs / (1000 * 60 * 60));
            const parking = await Parking.findById(matchedReservation.parkingId);
            const hourlyRate = parking?.pricing?.hourly || 50;
            const penaltyAmount = overstayHours * hourlyRate * 2;
            
            matchedReservation.penalty = penaltyAmount;
            matchedReservation.totalPrice = (matchedReservation.totalPrice || 0) + penaltyAmount;
            
            if (matchedUser && matchedUser.walletBalance >= penaltyAmount) {
              matchedUser.walletBalance -= penaltyAmount;
              await matchedUser.save();
            } else {
              matchedReservation.paymentStatus = 'pending';
            }
          }
          await matchedReservation.save();
        }
      }
    }

    const carDetails = buildCarDetails(matchedUser, matchedReservation, fastagTag);

    const readDoc = await FastagRead.create({
      readerId,
      gateId,
      reservationId: matchedReservation ? matchedReservation._id : null,
      parkingId: matchedReservation ? matchedReservation.parkingId : parkingId || null,
      spotId: matchedReservation ? matchedReservation.spotId : null,
      tagId,
      vehiclePlate: carDetails.matricule,
      vehicleType: carDetails.vehicleType,
      matricule: carDetails.matricule,
      direction,
      source: 'RFID',
      timestampUtc: new Date(),
      meta: {
        ...meta,
        carDetails,
      }
    });

    await Passage.create({
      fastagRead: readDoc._id,
      userId: matchedUser ? matchedUser._id : null,
      reservationId: matchedReservation ? matchedReservation._id : null,
      parkingId: matchedReservation ? String(matchedReservation.parkingId) : parkingId || null,
      gateId,
      spotId: matchedReservation ? matchedReservation.spotId : null,
      tagId,
      vehicleType: carDetails.vehicleType,
      matricule: carDetails.matricule,
      readerId,
      source: 'RFID',
      direction,
      decision: allow ? 'ALLOW' : 'DENY',
      reason,
      timestamp: new Date(),
      matched: allow,
      meta: {
        ...meta,
        carDetails,
      }
    });

    const io = req.app.get('io');
    if (matchedReservation) {
      emitReservationPaymentUpdate(io, matchedReservation, {
        tagId,
        readerId,
        gateId,
        parkingId,
      });

      const parking = parkingId ? await Parking.findById(parkingId) : null;
      emitParkingUpdate(io, parking, {
        reason: 'rfid_payment_completed',
        reservationId: String(matchedReservation._id),
        spotId: matchedReservation.spotId,
        paymentStatus: matchedReservation.paymentStatus,
      });

      // Emit gate:live to trigger 3D map navigation
      io?.emit('gate:live', {
        eventType: 'auth_result',
        decision: allow ? 'ALLOW' : 'DENY',
        spotId: matchedReservation.spotId,
        direction: direction
      });
    }

    const payload = {
      ok: true,
      allow,
      action: allow ? 'OPEN' : 'DENY',
      reason,
      tagId,
      readerId,
      gateId,
      direction,
      user: matchedUser
        ? {
            _id: matchedUser._id,
            firstName: matchedUser.firstName,
            lastName: matchedUser.lastName,
            email: matchedUser.email
          }
        : null,
      reservation: matchedReservation
        ? {
            _id: matchedReservation._id,
            parkingId: matchedReservation.parkingId,
            spotId: matchedReservation.spotId,
            status: matchedReservation.status,
            paymentStatus: matchedReservation.paymentStatus,
            paymentMethod: matchedReservation.paymentMethod,
          }
        : null,
    };

    if (String(req.query.format || '').toLowerCase() === 'text') {
      return res.type('text/plain').send(toArduinoText(payload));
    }

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ ok: false, allow: false, action: 'DENY', reason: 'SERVER_ERROR', error: err.message });
  }
};

router.post('/scan', processRfidScan);
router.post('/authorize', processRfidScan);

module.exports = router;
