/**
 * Real-time Car Tracking Display Component
 * Shows reserved parking spot, real-time car position, and navigation directions
 */

import React, { useEffect, useState } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import io from 'socket.io-client';
import './CarTracking.css';

const CarTrackingDisplay = ({ reservationId, spotCoordinates, onCarArrived }) => {
  const [carLocation, setCarLocation] = useState(null);
  const [route, setRoute] = useState(null);
  const [carInfo, setCarInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  // Connect to Socket.io for real-time updates
  useEffect(() => {
    if (!user?._id || !reservationId) return;

    const socket = io(API_URL, {
      auth: { token: localStorage.getItem('token') },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[CarTracking] Connected to Socket.io');
      socket.emit('authenticate', localStorage.getItem('token'));
    });

    // Listen for real-time car location updates
    socket.on('car-location-update', (data) => {
      if (data.reservationId === reservationId) {
        console.log('[CarTracking] Location update:', data);
        setCarLocation(data);

        // Call parent callback if car arrived
        if (data.arrived && onCarArrived) {
          onCarArrived(data);
        }
      }
    });

    socket.on('car-location-removed', (data) => {
      if (data.reservationId === reservationId) {
        console.log('[CarTracking] Car removed from tracking');
        setCarLocation(null);
      }
    });

    socket.on('error', (error) => {
      console.error('[CarTracking] Socket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id, reservationId, API_URL, onCarArrived]);

  // Fetch initial car location
  useEffect(() => {
    const fetchCarLocation = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${API_URL}/api/car-tracking/reservation/${reservationId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCarLocation(data.location);
          setCarInfo(data.location);
        } else if (response.status === 404) {
          console.log('[CarTracking] No active tracking for this reservation');
        } else {
          throw new Error('Failed to fetch car location');
        }
      } catch (err) {
        console.error('[CarTracking] Error fetching location:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (reservationId) {
      fetchCarLocation();
    }
  }, [reservationId, API_URL]);

  // Calculate route when car location and spot coordinates are available
  useEffect(() => {
    const calculateRoute = async () => {
      if (!carLocation || !spotCoordinates) return;

      try {
        const response = await fetch(`${API_URL}/api/car-tracking/calculate-route`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            reservationId,
            currentZone: carLocation.zone,
            spotCoordinates
          })
        });

        if (response.ok) {
          const data = await response.json();
          setRoute(data.route);
        }
      } catch (err) {
        console.error('[CarTracking] Error calculating route:', err);
      }
    };

    calculateRoute();
  }, [carLocation, spotCoordinates, reservationId, API_URL]);

  if (isLoading) {
    return (
      <div className="car-tracking-container loading">
        <div className="spinner"></div>
        <p>Loading car tracking...</p>
      </div>
    );
  }

  if (error || !carLocation) {
    return (
      <div className="car-tracking-container no-tracking">
        <p className="info-text">
          🚗 Car tracking not active yet. Drive into the parking lot to begin tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="car-tracking-container">
      {/* Car Position Card */}
      <div className="tracking-card">
        <div className="card-header">
          <h3>🚗 Your Vehicle Location</h3>
        </div>

        <div className="location-info">
          <div className="zone-display">
            <div className="zone-badge" data-zone={carLocation.zone}>
              {getZoneEmoji(carLocation.zone)} {carLocation.zone}
            </div>
          </div>

          <div className="status-grid">
            <div className="status-item">
              <span className="label">Distance to Spot:</span>
              <span className="value">{carLocation.distance}cm</span>
            </div>

            <div className="status-item">
              <span className="label">Signal Strength:</span>
              <span className="value">{carLocation.signalStrength} dBm</span>
            </div>

            <div className="status-item">
              <span className="label">Status:</span>
              <span className={`value status-${carLocation.arrived ? 'arrived' : 'approaching'}`}>
                {carLocation.arrived ? '✓ ARRIVED' : '⏳ Approaching'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Card */}
      {route && (
        <div className="tracking-card navigation-card">
          <div className="card-header">
            <h3>📍 Navigation</h3>
          </div>

          <div className="navigation-info">
            <div className="direction-arrow">
              {route.direction}
            </div>

            <div className="instruction-text">
              {route.instructions}
            </div>

            <div className="bearing-info">
              <span className="bearing-label">Bearing:</span>
              <span className="bearing-value">{Math.round(route.bearing)}°</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-label">Progress to Spot</div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${Math.max(0, Math.min(100, (100 - (carLocation.distance / 100))))}%`
            }}
          ></div>
        </div>
        <div className="progress-text">
          {carLocation.arrived ? '🎯 Spot Located!' : `${Math.max(0, Math.min(100, (100 - (carLocation.distance / 100))))}% complete`}
        </div>
      </div>

      {/* Live Data Display */}
      <div className="live-data">
        <div className="data-item">
          <span className="data-label">Last Update:</span>
          <span className="data-value">{new Date(carLocation.timestamp).toLocaleTimeString()}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Reservation ID:</span>
          <span className="data-value">{reservationId.substring(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper function to get emoji for zone
 */
function getZoneEmoji(zone) {
  const zoneEmojis = {
    'OUTSIDE': '🚗',
    'ENTRANCE': '🚪',
    'MIDDLE': '🔄',
    'SPOT': '🅿️'
  };
  return zoneEmojis[zone] || '📍';
}

export default CarTrackingDisplay;
