/**
 * Car Location Tracking API
 * Receives real-time car position updates from Arduino and broadcasts to frontend
 * Stores active car locations in memory cache for quick retrieval
 */

const express = require('express');
const router = express.Router();

// In-memory store for active car locations (real-time)
// Format: { reservationId: { cardId, zone, distance, signalStrength, arrived, timestamp, parkingId } }
const activeCarLocations = new Map();

/**
 * POST /api/car-tracking/location-update
 * Receive location update from Arduino/Bridge
 * Body: { cardId, reservationId, parkingId, zone, distance, signalStrength, arrived }
 */
router.post('/location-update', async (req, res) => {
  try {
    const { cardId, reservationId, parkingId, zone, distance, signalStrength, arrived } = req.body;
    
    if (!cardId || !reservationId || !parkingId) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    
    // Store/update car location
    activeCarLocations.set(reservationId, {
      cardId,
      reservationId,
      parkingId,
      zone,
      distance,
      signalStrength,
      arrived: arrived === 1 || arrived === true,
      timestamp: Date.now(),
      latitude: null,  // Will be calculated from zone mapping
      longitude: null
    });
    
    console.log(`📍 Car location updated: ${cardId} at ${zone} (distance: ${distance}cm)`);
    
    // Broadcast to connected clients via Socket.io
    if (global.io) {
      global.io.emit('car-location-update', {
        reservationId,
        zone,
        distance,
        signalStrength,
        arrived,
        timestamp: Date.now()
      });
      
      // Also notify the parking owner
      const owner = await getReservationOwner(reservationId);
      if (owner) {
        global.io.to(`user_${owner}`).emit('car-location-update', {
          reservationId,
          zone,
          distance,
          signalStrength,
          arrived,
          timestamp: Date.now()
        });
      }
    }
    
    res.json({ ok: true, message: 'Location updated' });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/car-tracking/active
 * Get all active car locations
 */
router.get('/active', (req, res) => {
  try {
    const locations = Array.from(activeCarLocations.values());
    res.json({ ok: true, locations, count: locations.length });
  } catch (error) {
    console.error('Get active locations error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/car-tracking/reservation/:reservationId
 * Get specific car location for a reservation
 */
router.get('/reservation/:reservationId', (req, res) => {
  try {
    const { reservationId } = req.params;
    const location = activeCarLocations.get(reservationId);
    
    if (!location) {
      return res.status(404).json({ ok: false, error: 'Car location not found' });
    }
    
    res.json({ ok: true, location });
  } catch (error) {
    console.error('Get reservation location error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/car-tracking/parking/:parkingId
 * Get all cars at a specific parking
 */
router.get('/parking/:parkingId', (req, res) => {
  try {
    const { parkingId } = req.params;
    const locations = Array.from(activeCarLocations.values())
      .filter(loc => loc.parkingId === parkingId);
    
    res.json({ ok: true, locations, count: locations.length });
  } catch (error) {
    console.error('Get parking locations error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /api/car-tracking/remove/:reservationId
 * Remove car from tracking (when it exits)
 */
router.delete('/remove/:reservationId', (req, res) => {
  try {
    const { reservationId } = req.params;
    const removed = activeCarLocations.delete(reservationId);
    
    if (!removed) {
      return res.status(404).json({ ok: false, error: 'Location not found' });
    }
    
    console.log(`🚗 Car removed from tracking: ${reservationId}`);
    
    // Broadcast removal to clients
    if (global.io) {
      global.io.emit('car-location-removed', { reservationId });
    }
    
    res.json({ ok: true, message: 'Location removed' });
  } catch (error) {
    console.error('Remove location error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/car-tracking/calculate-route
 * Calculate navigation from car current zone to reserved parking spot
 * Body: { reservationId, currentZone, spotCoordinates }
 */
router.post('/calculate-route', async (req, res) => {
  try {
    const { reservationId, currentZone, spotCoordinates } = req.body;
    
    if (!currentZone || !spotCoordinates) {
      return res.status(400).json({ ok: false, error: 'Missing zone or spot coordinates' });
    }
    
    // Zone mapping - customize based on your parking lot layout
    const zoneCoordinates = {
      'OUTSIDE': { lat: 0, lng: 0 },
      'ENTRANCE': { lat: 10, lng: 10 },
      'MIDDLE': { lat: 20, lng: 20 },
      'SPOT': { lat: 30, lng: 30 }
    };
    
    const currentCoords = zoneCoordinates[currentZone] || { lat: 0, lng: 0 };
    
    // Calculate simple direction (bearing)
    const bearing = calculateBearing(currentCoords, spotCoordinates);
    const direction = bearingToDirection(bearing);
    
    const route = {
      currentZone,
      currentCoordinates: currentCoords,
      targetSpot: spotCoordinates,
      bearing,
      direction,
      instructions: generateInstructions(currentZone, direction)
    };
    
    res.json({ ok: true, route });
  } catch (error) {
    console.error('Calculate route error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/car-tracking/zone-map
 * Get mapping of zones to coordinates (for frontend navigation)
 */
router.get('/zone-map', (req, res) => {
  const zoneMap = {
    'OUTSIDE': { name: 'Outside Parking', lat: 0, lng: 0, description: 'Vehicle outside lot' },
    'ENTRANCE': { name: 'Entrance Zone', lat: 10, lng: 10, description: 'Vehicle at entrance, proceed inside' },
    'MIDDLE': { name: 'Middle Zone', lat: 20, lng: 20, description: 'Vehicle in middle area' },
    'SPOT': { name: 'Spot Area', lat: 30, lng: 30, description: 'Vehicle approaching assigned spot' }
  };
  
  res.json({ ok: true, zoneMap });
});

// ========== HELPER FUNCTIONS ==========

/**
 * Calculate bearing between two coordinates
 * Returns degrees (0-360)
 */
function calculateBearing(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Convert bearing to cardinal direction
 */
function bearingToDirection(bearing) {
  const directions = ['↑ N', '↗ NE', '→ E', '↘ SE', '↓ S', '↙ SW', '← W', '↖ NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Generate human-readable instructions based on zone
 */
function generateInstructions(zone, direction) {
  const instructions = {
    'OUTSIDE': `Enter the parking lot towards the ${direction} direction`,
    'ENTRANCE': `Proceed ${direction} into the lot`,
    'MIDDLE': `Continue ${direction} to find your spot`,
    'SPOT': `Your parking spot is ${direction}, watch for the marker`
  };
  
  return instructions[zone] || 'Follow the navigation arrow';
}

/**
 * Get reservation owner for Socket.io notification
 */
async function getReservationOwner(reservationId) {
  try {
    const Reservation = require('../models/Reservation');
    const reservation = await Reservation.findById(reservationId).populate('parking');
    
    if (reservation && reservation.parking && reservation.parking.Owner) {
      return reservation.parking.Owner._id || reservation.parking.Owner;
    }
  } catch (error) {
    console.error('Error fetching reservation owner:', error);
  }
  return null;
}

module.exports = router;
