const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const Reservation = require('../models/reservationModel');
const User = require('../models/userModel');
const Parking = require('../models/parkingModel');
const RfidScan = require('../models/rfidScanModel');
const FastagPairingSession = require('../models/fastagPairingSessionModel');

// Prestart window (minutes) within which reservation start allows gate access
const PRESTART_WINDOW_MINUTES = 30;

function buildCardIdCandidates(rawCardId) {
  const normalized = String(rawCardId || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!normalized) return [];

  const candidates = new Set([normalized]);
  if (normalized.length > 4) candidates.add(normalized.slice(-4));
  if (normalized.length > 8) candidates.add(normalized.slice(-8));
  if (normalized.length > 10) candidates.add(normalized.slice(-10));
  if (normalized.startsWith('54') && normalized.length > 2) candidates.add(normalized.slice(2));

  return Array.from(candidates);
}

function emitGateLive(req, payload) {
  const io = req.app.get('io');
  if (!io) return;
  io.emit('gate:live', {
    timestamp: new Date(),
    ...payload,
  });
}

/**
 * RFID Gate Authentication Routes
 * Handles card scanning and gate access control
 */

// POST /api/rfid/authenticate - Authenticate card at gate
router.post('/authenticate', async (req, res) => {
  try {
    const { cardId, readerId, gateId } = req.body;

    // Validate input
    if (!cardId || !readerId) {
      return res.status(400).json({
        success: false,
        decision: 'DENY',
        reason: 'Missing cardId or readerId'
      });
    }

    const cardIdCandidates = buildCardIdCandidates(cardId);

    console.log(`[RFID] Card scan: ${cardId} at Reader: ${readerId}, Gate: ${gateId}`);
    console.log(`[RFID] Card candidates: ${cardIdCandidates.join(', ')}`);

    emitGateLive(req, {
      eventType: 'card_scan',
      cardId,
      readerId,
      gateId,
      message: `Card scanned at ${gateId}`,
    });

    // record scan (will be updated later with decision/user)
    let scanDoc = new RfidScan({
      cardId: cardId,
      readerId,
      gateId,
      timestamp: new Date(),
      decision: 'UNKNOWN'
    });
    await scanDoc.save();

    // Find user with this card/tag ID
    // Support both FASTag and RFID card formats
    let user = await User.findOne({
      $or: [
        { 'fastags.tagId': { $in: cardIdCandidates } },
        { 'rfidCards.cardId': { $in: cardIdCandidates } },
        { 'rfidCard': { $in: cardIdCandidates } },
        { 'vehicleRFID': { $in: cardIdCandidates } }
      ]
    });

    if (!user) {
      // Check for an active pairing session to automatically link the card
      try {
        const activeSession = await FastagPairingSession.findOne({
          status: 'pending',
          expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (activeSession) {
          const sessionUser = await User.findById(activeSession.userId);
          if (sessionUser) {
            console.log(`[RFID] Auto-pairing card ${cardId} to user ${sessionUser.email}`);
            
            // Add to rfidCards array (used by UI for management)
            sessionUser.rfidCards = sessionUser.rfidCards || [];
            if (!sessionUser.rfidCards.find(c => c.cardId === cardId.toUpperCase())) {
              sessionUser.rfidCards.push({
                cardId: cardId.toUpperCase(),
                cardName: 'Auto-Paired Card',
                active: true,
                registeredAt: new Date()
              });
            }
            
            // Add to fastags array (used for cross-compatibility)
            sessionUser.fastags = sessionUser.fastags || [];
            if (!sessionUser.fastags.find(f => f.tagId === cardId.toUpperCase())) {
              sessionUser.fastags.push({
                tagId: cardId.toUpperCase(),
                active: true,
                linkedAt: new Date()
              });
            }
            
            await sessionUser.save();

            // Consume the pairing session
            activeSession.status = 'consumed';
            activeSession.linkedTagId = cardId.toUpperCase();
            activeSession.linkedAt = new Date();
            await activeSession.save();

            // Update scan document
            scanDoc.decision = 'ALLOW';
            scanDoc.reason = 'Card paired successfully';
            scanDoc.userId = sessionUser._id;
            await scanDoc.save();

            emitGateLive(req, {
              eventType: 'auth_result',
              decision: 'ALLOW',
              userId: sessionUser._id,
              userName: sessionUser.name,
              cardId,
              readerId,
              gateId,
              reason: 'Card paired successfully',
              message: 'Card successfully linked to your account!',
            });

            // Return ALLOW so the hardware gets a positive confirmation (green light)
            return res.status(200).json({
              success: true,
              decision: 'ALLOW',
              reason: 'Card paired successfully',
              userId: sessionUser._id,
              cardId: cardId
            });
          }
        }
      } catch (pairingErr) {
        console.error('[RFID] Error during auto-pairing:', pairingErr);
      }

      console.log(`[RFID] Card not found in database: ${cardId}`);
      // update scan
      scanDoc.decision = 'DENY';
      scanDoc.reason = 'Card not registered';
      await scanDoc.save();

      emitGateLive(req, {
        eventType: 'auth_result',
        decision: 'DENY',
        cardId,
        readerId,
        gateId,
        reason: 'Card not registered',
        message: 'Access denied: card not registered',
      });

      return res.status(200).json({
        success: false,
        decision: 'DENY',
        reason: 'Card not registered',
        cardId: cardId
      });
    }

    console.log(`[RFID] User found: ${user.email}`);

    // Check for active/valid reservation (gate rule):
    // ALLOW only when the reservation start is within next 30 minutes (including already-started => negative/zero remaining)
    const now = new Date();

    const preStartWindowMs = PRESTART_WINDOW_MINUTES * 60 * 1000; // minutes window
    const allowedStartCutoff = new Date(now.getTime() + preStartWindowMs);

    // Find the soonest matching reservation window for this user.
    // We keep the existing "endTime >= now" guard, but compute remaining from startTime.
    const activeReservation = await Reservation.findOne({
      userId: user._id,
      $or: [
        { status: { $in: ['accepted', 'confirmed', 'active', 'in-progress'] } },
        // Razorpay flow uses paymentStatus='paid', while other flows may use 'completed'
        { status: 'pending', paymentStatus: { $in: ['completed', 'paid'] } }
      ],
      startTime: { $lte: allowedStartCutoff },
      endTime: { $gte: now }
    }).populate('parkingId');

    if (!activeReservation) {
      console.log(`[RFID] No reservation for user: ${user.email}`);

      scanDoc.decision = 'DENY';
      scanDoc.userId = user._id;
      scanDoc.reason = 'No active reservation';
      await scanDoc.save();

      emitGateLive(req, {
        eventType: 'auth_result',
        decision: 'DENY',
        userId: user._id,
        cardId,
        readerId,
        gateId,
        reason: 'No active reservation',
        message: 'Access denied: no active reservation',
        minutesRemaining: null,
      });

      return res.status(200).json({
        success: false,
        decision: 'DENY',
        reason: 'No active reservation',
        userId: user._id,
        cardId
      });
    }

    const startTime = activeReservation.startTime instanceof Date
      ? activeReservation.startTime
      : new Date(activeReservation.startTime);

    const minutesRemainingFloat = (startTime.getTime() - now.getTime()) / (60 * 1000);
    // If already started, remaining can be negative. Clamp for UI.
    const minutesRemaining = Math.max(0, Math.floor(minutesRemainingFloat));

    if (minutesRemaining > PRESTART_WINDOW_MINUTES) {
      console.log(`[RFID] Reservation not within ${PRESTART_WINDOW_MINUTES} minutes. remaining=${minutesRemaining} user=${user.email}`);

      scanDoc.decision = 'DENY';
      scanDoc.userId = user._id;
      scanDoc.reason = `Access allowed only within next ${PRESTART_WINDOW_MINUTES} minutes. Remaining: ${minutesRemaining} min`;
      await scanDoc.save();

      emitGateLive(req, {
        eventType: 'auth_result',
        decision: 'DENY',
        userId: user._id,
        cardId,
        readerId,
        gateId,
        reason: 'No time has been done yet',
        message: `Access denied: no time has been done yet. Remaining: ${minutesRemaining} min`,
        minutesRemaining,
        reservationId: activeReservation._id,
      });

      return res.status(200).json({
        success: false,
        decision: 'DENY',
        reason: 'No time has been done yet',
        userId: user._id,
        cardId,
        reservationId: activeReservation._id,
        minutesRemaining
      });
    }

    console.log(`[RFID] Reservation within window. reservation=${activeReservation._id} minutesRemaining=${minutesRemaining}`);

    // Update reservation status to 'in-progress'
    activeReservation.status = 'in-progress';
    activeReservation.entryTime = now;
    await activeReservation.save();

    // Compute parking slot availability (best-effort)
    let parkingTotal = null;
    let parkingAvailable = null;
    try {
      if (activeReservation.parkingId) {
        const parking = await Parking.findById(activeReservation.parkingId._id || activeReservation.parkingId).lean();
        if (parking) {
          parkingTotal = parking.totalSpots || (parking.spots && parking.spots.length) || null;
          parkingAvailable = parking.availableSpots != null ? parking.availableSpots : null;
        }
      }
    } catch (err) {
      console.error('[RFID] Error fetching parking availability:', err);
    }

    // update and save scan with decision and user
    scanDoc.decision = 'ALLOW';
    scanDoc.userId = user._id;
    scanDoc.reason = `Allowed - reservation ${activeReservation._id} (paymentMethod=${activeReservation.paymentMethod || 'unknown'}, paymentStatus=${activeReservation.paymentStatus || 'unknown'})`;
    await scanDoc.save();

    emitGateLive(req, {
      eventType: 'auth_result',
      decision: 'ALLOW',
      userId: user._id,
      userName: user.name,
      cardId,
      readerId,
      gateId,
      reservationId: activeReservation._id,
      spotId: activeReservation.spotId,
      minutesRemaining,
      parkingName: activeReservation.parkingId?.name || 'Unknown',
      parkingTotalSpots: parkingTotal,
      parkingAvailableSpots: parkingAvailable,
      paymentMethod: activeReservation.paymentMethod || null,
      paymentStatus: activeReservation.paymentStatus || null,
      message: 'Access allowed',
    });

    return res.status(200).json({
      success: true,
      decision: 'ALLOW',
      userId: user._id,
      userName: user.name,
      email: user.email,
      reservationId: activeReservation._id,
      minutesRemaining,
      parkingName: activeReservation.parkingId?.name || 'Unknown',
      vehicleType: activeReservation.vehicleType,
      paymentMethod: activeReservation.paymentMethod || null,
      paymentStatus: activeReservation.paymentStatus || null,
      parkingTotalSpots: parkingTotal,
      parkingAvailableSpots: parkingAvailable,
      spotId: activeReservation.spotId,
      cardId: cardId,
      gateId: gateId,
      readerId: readerId,
      timestamp: now
    });
  } catch (error) {
    console.error('[RFID] Authentication error:', error);
    return res.status(500).json({
      success: false,
      decision: 'DENY',
      reason: 'Server error',
      error: error.message
    });
  }
});

// POST /api/rfid/gate-events - bridge publishes gate open/close events here
router.post('/gate-events', async (req, res) => {
  try {
    const { eventType, message, cardId, readerId, gateId, parkingName, slotNumber } = req.body || {};

    if (!eventType) {
      return res.status(400).json({ success: false, message: 'eventType required' });
    }

    emitGateLive(req, {
      eventType,
      message: message || eventType,
      cardId: cardId || null,
      readerId: readerId || null,
      gateId: gateId || null,
      parkingName: parkingName || null,
      slotNumber: typeof slotNumber === 'number' ? slotNumber : null,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[RFID] Error publishing gate event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/rfid/unlinked-scans - return recent scans where card not registered and not processed
router.get('/unlinked-scans', async (req, res) => {
  try {
    const scans = await RfidScan.find({ processed: false, decision: 'DENY', reason: /Card not registered/i })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    res.status(200).json({ success: true, scans });
  } catch (error) {
    console.error('[RFID] Error fetching unlinked scans:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rfid/mark-scan-processed - mark a scan processed
router.post('/mark-scan-processed', async (req, res) => {
  try {
    const { scanId } = req.body;
    if (!scanId) return res.status(400).json({ success: false, message: 'scanId required' });
    const scan = await RfidScan.findById(scanId);
    if (!scan) return res.status(404).json({ success: false, message: 'Scan not found' });
    scan.processed = true;
    await scan.save();
    res.status(200).json({ success: true, scan });
  } catch (error) {
    console.error('[RFID] Error marking scan processed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/rfid/status - Health check
router.get('/status', (req, res) => {
  res.status(200).json({
    status: 'RFID Gate Service Active',
    timestamp: new Date(),
    gates: ['gate-a', 'gate-b', 'gate-c']
  });
});

// POST /api/rfid/exit - Record vehicle exit
router.post('/exit', async (req, res) => {
  try {
    const { cardId, readerId, gateId } = req.body;
    const cardIdCandidates = buildCardIdCandidates(cardId);

    if (!cardId) {
      return res.status(400).json({
        success: false,
        reason: 'Missing cardId'
      });
    }

    // Find user
    let user = await User.findOne({
      $or: [
        { 'fastags.tagId': { $in: cardIdCandidates } },
        { 'rfidCards.cardId': { $in: cardIdCandidates } },
        { 'rfidCard': { $in: cardIdCandidates } },
        { 'vehicleRFID': { $in: cardIdCandidates } }
      ]
    });

    if (!user) {
      return res.status(200).json({
        success: false,
        reason: 'Card not found'
      });
    }

    // Find in-progress reservation
    const reservation = await Reservation.findOne({
      userId: user._id,
      status: 'in-progress'
    });

    if (reservation) {
      reservation.status = 'completed';
      const now = new Date();
      reservation.exitTime = now;

      // Check for overstay penalty
      if (now > reservation.endTime) {
        const overstayMs = now.getTime() - reservation.endTime.getTime();
        const overstayHours = Math.ceil(overstayMs / (1000 * 60 * 60));
        
        const parking = await Parking.findById(reservation.parkingId);
        const hourlyRate = parking?.pricing?.hourly || 50; 
        const penaltyAmount = overstayHours * hourlyRate * 2; // Penalty: 2x hourly rate
        
        reservation.penalty = penaltyAmount;
        reservation.totalPrice = (reservation.totalPrice || 0) + penaltyAmount;
        
        if (user && user.walletBalance >= penaltyAmount) {
          user.walletBalance -= penaltyAmount;
          await user.save();
          console.log(`[RFID] Auto-deducted overstay penalty of ${penaltyAmount} INR from wallet.`);
        } else {
          reservation.paymentStatus = 'pending'; // Requires further payment
          console.log(`[RFID] Wallet insufficient for penalty ${penaltyAmount} INR.`);
        }
      }
      await reservation.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Exit recorded',
      reservationId: reservation?._id
    });
  } catch (error) {
    console.error('[RFID] Exit error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/rfid/cards - List all registered RFID cards (admin only)
router.get('/cards', verifyToken, async (req, res) => {
  try {
    const users = await User.find(
      { 'rfidCard': { $exists: true, $ne: null } },
      'name email rfidCard vehicleRFID'
    );

    res.status(200).json({
      success: true,
      count: users.length,
      cards: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/rfid/start-pairing - Initiate card pairing for a user
// This creates a pending FastagPairingSession, so the next scanned card auto-registers
router.post('/start-pairing', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId required'
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create a pending pairing session (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const session = new FastagPairingSession({
      userId,
      status: 'pending',
      expiresAt
    });
    await session.save();

    console.log(`[RFID] Pairing session created for user ${user.email}. Scan card now!`);

    res.status(200).json({
      success: true,
      message: `Pairing session started for ${user.name || user.email}. Scan your card now (expires in 5 minutes)`,
      sessionId: session._id,
      expiresAt
    });
  } catch (error) {
    console.error('[RFID] Pairing session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
