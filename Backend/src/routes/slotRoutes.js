const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Public hardware ingest endpoint (no auth) - Arduino/bridge can call this
router.post('/hardware', slotController.hardwareUpdate);

// Public snapshot endpoint so the website can show live parking occupancy
router.get('/', slotController.getAllSlots);
router.put('/:slotNumber', verifyToken, slotController.updateSlot);

module.exports = router;
