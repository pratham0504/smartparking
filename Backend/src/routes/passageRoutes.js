const express = require('express');
const router = express.Router();
const Passage = require('../models/passageModel');

// GET /api/passages?limit=50&matched=true
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const matchedQ = req.query.matched;
    const q = {};
    if (matchedQ === 'true') q.matched = true;
    if (matchedQ === 'false') q.matched = false;
    const data = await Passage.find(q).sort({ timestamp: -1 }).limit(limit).populate('cameraEvent').populate('fastagRead');
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
