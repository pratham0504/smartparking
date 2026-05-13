/**
 * Mobile Camera Car Tracking Component
 * Uses device camera + GPS to track car location in real-time
 * Works on both Android and iOS via React Native / Web
 */

import React, { useEffect, useState, useRef } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import io from 'socket.io-client';
import './MobileCameraTracking.css';

const MobileCameraTracking = ({ reservationId, parkingId, onSpotArrived }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [gpsSatellites, setGpsSatellites] = useState(0);
  const [accuracy, setAccuracy] = useState(null);
  const [route, setRoute] = useState([]);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { user } = useContext(AuthContext);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  // ========== START CAMERA ==========
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',  // Back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        console.log('[Camera] ✓ Camera started');
      }
    } catch (err) {
      console.error('[Camera] Error:', err);
      setError(`Camera access denied: ${err.message}`);
    }
  };

  // ========== STOP CAMERA ==========
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setCameraActive(false);
      console.log('[Camera] Camera stopped');
    }
  };

  // ========== GET GPS LOCATION ==========
  const startGPS = () => {
    if (!navigator.geolocation) {
      setError('GPS not available on this device');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        
        setGpsLocation({
          latitude,
          longitude,
          timestamp: new Date()
        });
        setAccuracy(Math.round(acc));
        
        console.log(`[GPS] 📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (±${Math.round(acc)}m)`);
        
        // Send to backend
        sendLocationToBackend(latitude, longitude, acc);
      },
      (err) => {
        console.error('[GPS] Error:', err);
        setError(`GPS Error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,  // Update every second
        timeout: 5000
      }
    );

    return watchId;
  };

  // ========== SEND LOCATION TO BACKEND ==========
  const sendLocationToBackend = async (latitude, longitude, accuracy) => {
    try {
      const response = await fetch(`${API_URL}/api/car-tracking/location-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          cardId: user?.rfidCard || 'mobile-driver',
          reservationId,
          parkingId,
          zone: 'GPS_TRACKING',
          distance: 0,
          signalStrength: -accuracy,  // Use accuracy as pseudo signal strength
          arrived: 0,
          latitude,
          longitude,
          accuracy
        })
      });

      if (!response.ok) {
        console.error('[Backend] Location update failed');
      }
    } catch (err) {
      console.error('[Backend] Error:', err);
    }
  };

  // ========== CAPTURE SNAPSHOT ==========
  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0);

    // Send snapshot to backend for license plate recognition
    canvas.toBlob((blob) => {
      sendSnapshotToBackend(blob);
    }, 'image/jpeg', 0.8);
  };

  // ========== SEND SNAPSHOT TO BACKEND ==========
  const sendSnapshotToBackend = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'car-location.jpg');
    formData.append('reservationId', reservationId);
    formData.append('parkingId', parkingId);

    try {
      const response = await fetch(`${API_URL}/api/car-tracking/snapshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Snapshot] Uploaded:', data);
      }
    } catch (err) {
      console.error('[Snapshot] Upload error:', err);
    }
  };

  // ========== START TRACKING ==========
  const handleStartTracking = () => {
    setIsTracking(true);
    startCamera();
    startGPS();
    console.log('[Tracking] ▶ Started');
  };

  // ========== STOP TRACKING ==========
  const handleStopTracking = () => {
    setIsTracking(false);
    stopCamera();
    console.log('[Tracking] ⏹ Stopped');
  };

  // ========== AUTO START ON MOUNT ==========
  useEffect(() => {
    if (reservationId) {
      handleStartTracking();
    }

    return () => {
      handleStopTracking();
    };
  }, [reservationId]);

  // ========== RENDER ==========
  return (
    <div className="mobile-tracking-container">
      {/* Status Bar */}
      <div className={`status-bar ${isTracking ? 'active' : 'inactive'}`}>
        <div className="status-indicator">
          {isTracking ? '🔴 LIVE' : '⚫ IDLE'}
        </div>
        <div className="status-info">
          <span>{isTracking ? 'Tracking Active' : 'Ready to Track'}</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Video Feed */}
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`camera-feed ${cameraActive ? 'active' : 'inactive'}`}
        />
        <canvas
          ref={canvasRef}
          className="hidden-canvas"
          style={{ display: 'none' }}
        />

        {!cameraActive && (
          <div className="camera-placeholder">
            <div className="placeholder-icon">📷</div>
            <p>Camera not active</p>
          </div>
        )}

        {/* Real-time Data Overlay */}
        <div className="data-overlay">
          {/* GPS Data */}
          {gpsLocation && (
            <div className="gps-display">
              <div className="gps-item">
                <span className="label">📍 Latitude:</span>
                <span className="value">{gpsLocation.latitude.toFixed(6)}</span>
              </div>
              <div className="gps-item">
                <span className="label">📍 Longitude:</span>
                <span className="value">{gpsLocation.longitude.toFixed(6)}</span>
              </div>
              <div className="gps-item">
                <span className="label">🎯 Accuracy:</span>
                <span className="value">{accuracy}m</span>
              </div>
              <div className="gps-item">
                <span className="label">⏱ Update:</span>
                <span className="value">{gpsLocation.timestamp.toLocaleTimeString()}</span>
              </div>
            </div>
          )}

          {/* Tracking Status */}
          <div className="tracking-status">
            <div className="status-item">
              <span className="icon">{cameraActive ? '📹' : '❌'}</span>
              <span>Camera {cameraActive ? 'ON' : 'OFF'}</span>
            </div>
            <div className="status-item">
              <span className="icon">{gpsLocation ? '📡' : '❌'}</span>
              <span>GPS {gpsLocation ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="control-panel">
        <button
          className={`btn btn-primary ${isTracking ? 'stop' : 'start'}`}
          onClick={isTracking ? handleStopTracking : handleStartTracking}
        >
          {isTracking ? '⏹ Stop Tracking' : '▶ Start Tracking'}
        </button>

        <button
          className="btn btn-secondary"
          onClick={captureSnapshot}
          disabled={!cameraActive}
        >
          📷 Capture
        </button>
      </div>

      {/* Route Info */}
      {route.length > 0 && (
        <div className="route-info">
          <h3>📍 Route History</h3>
          <div className="waypoints">
            {route.slice(-5).map((point, idx) => (
              <div key={idx} className="waypoint">
                <span className="number">{idx + 1}</span>
                <span className="coords">{point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileCameraTracking;
