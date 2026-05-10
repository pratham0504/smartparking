const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { client: mqttClientModule, initMqtt } = require('../services/mqttIngest');
const CameraEvent = require('../models/cameraEventModel');
const passageService = require('../services/passageService');
// multer storage to Backend/uploads/plates
const uploadsDir = path.join(__dirname, '../../uploads/plates');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`);
  }
});

const upload = multer({ storage: storage });

// POST /api/camera/event
// Accepts multipart/form-data: snapshot file (optional) and fields: cameraId, gateId, timestampUtc, plateText, confidence
router.post('/event', upload.single('snapshot'), async (req, res) => {
  try {
    const { cameraId, gateId, timestampUtc, plateText, confidence } = req.body;
    const snapshotFile = req.file ? `/uploads/plates/${req.file.filename}` : null;

    const event = {
      cameraId: cameraId || 'unknown',
      gateId: gateId || null,
      timestampUtc: timestampUtc || new Date().toISOString(),
      plateText: plateText || null,
      confidence: confidence ? parseFloat(confidence) : null,
      snapshot: snapshotFile,
    };

    // Publish to MQTT if client available, otherwise emit via io if present
    const mqttPrefix = process.env.MQTT_PREFIX || 'parkEz';
    try {
      const mqttIngest = require('../services/mqttIngest');
      const mqttClient = mqttIngest.client || mqttIngest.initMqtt && null;
      if (mqttIngest && mqttIngest.client) {
        const topic = `${mqttPrefix}/camera/${event.cameraId}/events`;
        mqttIngest.client.publish(topic, JSON.stringify(event));
      }
    } catch (err) {
      console.warn('MQTT publish failed (camera event):', err.message);
    }

    // Also emit via Socket.IO if available on app
    try {
      const io = req.app.get('io');
      if (io) io.emit('camera_event', event);
    } catch (err) {}

    // If MQTT ingest is available, publish and let the MQTT consumer persist to avoid duplicates.
    // Otherwise, persist locally and attempt matching.
    try {
      const mqttIngest = require('../services/mqttIngest');
      if (mqttIngest && mqttIngest.client) {
        // already published above; MQTT consumer will persist and match
      } else {
        const doc = new CameraEvent({
          cameraId: event.cameraId,
          gateId: event.gateId,
          timestampUtc: event.timestampUtc ? new Date(event.timestampUtc) : new Date(),
          plateText: event.plateText,
          confidence: event.confidence,
          snapshot: event.snapshot,
          rawTopic: null,
          meta: {}
        });
        const saved = await doc.save();
        // Attempt background matching with FASTag reads
        (async () => {
          try { await passageService.tryMatchCameraEvent(saved); } catch (e) {}
        })();
      }
    } catch (saveErr) {
      console.warn('Failed to persist camera event from HTTP upload:', saveErr && saveErr.message);
    }

    res.json({ ok: true, event });
  } catch (err) {
    console.error('camera event error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
