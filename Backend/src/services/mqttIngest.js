const mqtt = require('mqtt');
const CameraEvent = require('../models/cameraEventModel');
const FastagRead = require('../models/fastagReadModel');
const passageService = require('./passageService');

/**
 * Simple MQTT ingest service.
 * Subscribes to camera and fastag topics and emits socket events.
 */
let mqttClient = null;

function initMqtt({ io }) {
  const mqttUrl = process.env.MQTT_URL || 'mqtt://localhost:1883';
  const mqttPrefix = process.env.MQTT_PREFIX || 'parkEz';

  const client = mqtt.connect(mqttUrl);
  mqttClient = client;
  module.exports.client = mqttClient;

  client.on('connect', () => {
    console.log('MQTT connected to', mqttUrl);
    // Subscribe to camera events and fastag reads
    client.subscribe(`${mqttPrefix}/camera/+/events`, { qos: 0 }, (err) => {
      if (err) console.error('Failed to subscribe to camera events', err);
    });
    client.subscribe(`${mqttPrefix}/fastag/+/reads`, { qos: 0 }, (err) => {
      if (err) console.error('Failed to subscribe to fastag reads', err);
    });
  });

  client.on('error', (err) => {
    console.error('MQTT error', err);
  });

  client.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      // Emit different socket events based on topic
      if (topic.includes('/camera/')) {
        // Normalize event
        const event = Object.assign({ rawTopic: topic }, payload);
        io.emit('camera_event', event);
        // Persist to MongoDB (best-effort) and trigger passage matching
        (async () => {
          try {
            const doc = new CameraEvent({
              cameraId: event.cameraId || 'unknown',
              gateId: event.gateId || null,
              timestampUtc: event.timestampUtc ? new Date(event.timestampUtc) : new Date(),
              plateText: event.plateText || null,
              confidence: typeof event.confidence === 'number' ? event.confidence : (event.confidence ? parseFloat(event.confidence) : null),
              snapshot: event.snapshot || null,
              rawTopic: event.rawTopic,
              meta: event.meta || {}
            });
            const saved = await doc.save();
            // Attempt to match with fastag reads
            try { await passageService.tryMatchCameraEvent(saved); } catch (e) {}
          } catch (saveErr) {
            console.warn('Failed to save CameraEvent', saveErr && saveErr.message);
          }
        })();
      } else if (topic.includes('/fastag/')) {
        const event = Object.assign({ rawTopic: topic }, payload);
        io.emit('fastag_event', event);
        // Persist fastag read and trigger passage matching
        (async () => {
          try {
            const doc = new FastagRead({
              readerId: event.readerId || event.reader || 'unknown',
              gateId: event.gateId || null,
              tagId: event.tagId || event.fastagId || null,
              vehiclePlate: event.vehiclePlate || event.plateText || null,
              direction: String(event.direction || 'ENTRY').toUpperCase() === 'EXIT' ? 'EXIT' : 'ENTRY',
              source: 'MQTT',
              timestampUtc: event.timestampUtc ? new Date(event.timestampUtc) : new Date(),
              rawTopic: event.rawTopic,
              meta: event.meta || {}
            });
            const saved = await doc.save();
            try { await passageService.tryMatchFastagRead(saved); } catch (e) {}
          } catch (saveErr) {
            console.warn('Failed to save FastagRead', saveErr && saveErr.message);
          }
        })();
      } else {
        io.emit('mqtt_event', { topic, payload });
      }
    } catch (err) {
      console.error('Failed to handle MQTT message', err, topic, message.toString());
    }
  });

  return client;
}

module.exports = { initMqtt, client: mqttClient };
