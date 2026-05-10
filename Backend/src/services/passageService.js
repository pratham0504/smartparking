const Passage = require('../models/passageModel');
const CameraEvent = require('../models/cameraEventModel');
const FastagRead = require('../models/fastagReadModel');
const Payment = require('../models/paymentModel');
const DEFAULT_FEE = parseFloat(process.env.DEFAULT_PARKING_FEE || '50');

// Matching configuration (seconds)
const MATCH_WINDOW_SECONDS = parseInt(process.env.PASSAGE_MATCH_WINDOW_SEC || '10', 10);

function withinWindow(aDate, bDate, seconds) {
  if (!aDate || !bDate) return false;
  const diff = Math.abs(new Date(aDate).getTime() - new Date(bDate).getTime());
  return diff <= seconds * 1000;
}

async function tryMatchCameraEvent(cameraDoc) {
  try {
    if (!cameraDoc || !cameraDoc._id) return null;

    // Avoid duplicate passage for same camera event
    let existing = await Passage.findOne({ cameraEvent: cameraDoc._id });
    if (existing) return existing;

    // Try find fastag reads that match plate or are within time window
    const candidates = await FastagRead.find({
      $or: [
        { vehiclePlate: cameraDoc.plateText },
        { tagId: cameraDoc.tagId }
      ]
    }).sort({ timestampUtc: 1 }).limit(10);

    for (const f of candidates) {
      if (withinWindow(cameraDoc.timestampUtc, f.timestampUtc, MATCH_WINDOW_SECONDS)) {
        // If there is already a passage for this fastagRead, update it if unmatched
        let existingPassage = await Passage.findOne({ fastagRead: f._id });
        if (existingPassage) {
          if (!existingPassage.matched) {
            existingPassage.cameraEvent = cameraDoc._id;
            existingPassage.plateText = cameraDoc.plateText || existingPassage.plateText;
            existingPassage.cameraId = cameraDoc.cameraId || existingPassage.cameraId;
            existingPassage.timestamp = cameraDoc.timestampUtc || existingPassage.timestamp;
            existingPassage.matched = true;
            await existingPassage.save();
            // create payment
            (async () => {
              try {
                const payment = new Payment({
                  reservationId: null,
                  amount: DEFAULT_FEE,
                  currency: process.env.DEFAULT_CURRENCY || 'INR',
                  status: 'completed',
                  paymentMethod: 'fastag',
                  paymentDetails: { fastagId: f.tagId || null, operator: f.meta && f.meta.operator || null },
                  transactionId: `FTX-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                  paidAt: new Date()
                });
                await payment.save();
              } catch (payErr) {
                console.warn('Failed to create fastag payment', payErr && payErr.message);
              }
            })();
            return existingPassage;
          }
          // already matched, skip
          continue;
        }

        // No existing passage for the fastag read — create a new matched passage
        const p = new Passage({
          cameraEvent: cameraDoc._id,
          fastagRead: f._id,
          plateText: cameraDoc.plateText || f.vehiclePlate,
          tagId: f.tagId || null,
          cameraId: cameraDoc.cameraId || null,
          readerId: f.readerId || null,
          timestamp: cameraDoc.timestampUtc || f.timestampUtc || new Date(),
          matched: true
        });
        const savedP = await p.save();
        // Create a fastag payment (simulated) if appropriate
        (async () => {
          try {
            const payment = new Payment({
              reservationId: null,
              amount: DEFAULT_FEE,
              currency: process.env.DEFAULT_CURRENCY || 'INR',
              status: 'completed',
              paymentMethod: 'fastag',
              paymentDetails: { fastagId: f.tagId || null, operator: f.meta && f.meta.operator || null },
              transactionId: `FTX-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              paidAt: new Date()
            });
            await payment.save();
          } catch (payErr) {
            console.warn('Failed to create fastag payment', payErr && payErr.message);
          }
        })();
        return savedP;
      }
    }

    // No match found — create unmatched passage for camera event
    // Attempt to reconcile with any existing unmatched fastag-only passage
    try {
      const nearby = await Passage.findOne({ fastagRead: { $ne: null }, matched: false, plateText: cameraDoc.plateText });
      if (nearby && withinWindow(nearby.timestamp || nearby.createdAt, cameraDoc.timestampUtc, MATCH_WINDOW_SECONDS)) {
        nearby.cameraEvent = cameraDoc._id;
        nearby.cameraId = cameraDoc.cameraId || nearby.cameraId;
        nearby.timestamp = cameraDoc.timestampUtc || nearby.timestamp;
        nearby.matched = true;
        await nearby.save();
        return nearby;
      }
    } catch (e) {
      // ignore
    }

    const p = new Passage({
      cameraEvent: cameraDoc._id,
      plateText: cameraDoc.plateText || null,
      cameraId: cameraDoc.cameraId || null,
      timestamp: cameraDoc.timestampUtc || new Date(),
      matched: false
    });
    await p.save();
    return p;
  } catch (err) {
    console.warn('passageService.tryMatchCameraEvent error', err && err.message);
    return null;
  }
}

async function tryMatchFastagRead(fastagDoc) {
  try {
    if (!fastagDoc || !fastagDoc._id) return null;

    let existing = await Passage.findOne({ fastagRead: fastagDoc._id });
    if (existing) return existing;

    // Try find camera events matching plate or time window
    const candidates = await CameraEvent.find({
      $or: [
        { plateText: fastagDoc.vehiclePlate },
      ]
    }).sort({ timestampUtc: 1 }).limit(10);

    for (const c of candidates) {
      if (withinWindow(c.timestampUtc, fastagDoc.timestampUtc, MATCH_WINDOW_SECONDS)) {
        const linked = await Passage.findOne({ cameraEvent: c._id });
        if (linked) continue;

        const p = new Passage({
          cameraEvent: c._id,
          fastagRead: fastagDoc._id,
          plateText: c.plateText || fastagDoc.vehiclePlate,
          tagId: fastagDoc.tagId || null,
          cameraId: c.cameraId || null,
          readerId: fastagDoc.readerId || null,
          timestamp: c.timestampUtc || fastagDoc.timestampUtc || new Date(),
          matched: true
        });
        const savedP = await p.save();
        // create a fastag payment record (simulated)
        (async () => {
          try {
            const payment = new Payment({
              reservationId: null,
              amount: DEFAULT_FEE,
              currency: process.env.DEFAULT_CURRENCY || 'INR',
              status: 'completed',
              paymentMethod: 'fastag',
              paymentDetails: { fastagId: fastagDoc.tagId || null, operator: fastagDoc.meta && fastagDoc.meta.operator || null },
              transactionId: `FTX-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              paidAt: new Date()
            });
            await payment.save();
          } catch (payErr) {
            console.warn('Failed to create fastag payment', payErr && payErr.message);
          }
        })();
        return savedP;
      }
    }

    // No match — create unmatched passage for fastag
    // Attempt to reconcile with any existing unmatched camera-only passage
    try {
      const nearby = await Passage.findOne({ cameraEvent: { $ne: null }, matched: false, plateText: fastagDoc.vehiclePlate });
      if (nearby && withinWindow(nearby.timestamp || nearby.createdAt, fastagDoc.timestampUtc, MATCH_WINDOW_SECONDS)) {
        nearby.fastagRead = fastagDoc._id;
        nearby.tagId = fastagDoc.tagId || nearby.tagId;
        nearby.readerId = fastagDoc.readerId || nearby.readerId;
        nearby.matched = true;
        nearby.timestamp = nearby.timestamp || fastagDoc.timestampUtc || new Date();
        await nearby.save();
        // create payment for the matched passage
        (async () => {
          try {
            const payment = new Payment({
              reservationId: null,
              amount: DEFAULT_FEE,
              currency: process.env.DEFAULT_CURRENCY || 'INR',
              status: 'completed',
              paymentMethod: 'fastag',
              paymentDetails: { fastagId: fastagDoc.tagId || null, operator: fastagDoc.meta && fastagDoc.meta.operator || null },
              transactionId: `FTX-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              paidAt: new Date()
            });
            await payment.save();
          } catch (payErr) {
            console.warn('Failed to create fastag payment', payErr && payErr.message);
          }
        })();
        return nearby;
      }
    } catch (e) {}

    const p = new Passage({
      fastagRead: fastagDoc._id,
      plateText: fastagDoc.vehiclePlate || null,
      tagId: fastagDoc.tagId || null,
      readerId: fastagDoc.readerId || null,
      timestamp: fastagDoc.timestampUtc || new Date(),
      matched: false
    });
    await p.save();
    return p;
  } catch (err) {
    console.warn('passageService.tryMatchFastagRead error', err && err.message);
    return null;
  }
}

module.exports = { tryMatchCameraEvent, tryMatchFastagRead };
