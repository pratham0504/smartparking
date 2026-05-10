import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Trash2, Plus, AlertCircle, CheckCircle, ScanLine } from 'lucide-react';
import './RFIDManagement.css';

const API_URL = "http://localhost:3001/api";

/**
 * HELPER: Converts raw EM-18 output to a standard format.
 * EM-18 usually sends 12 Hex characters (e.g., 05007AE367FB).
 * Websites usually expect the 10-digit decimal printed on the card.
 */
const formatTagId = (rawId) => {
  if (!rawId) return "";
  const cleanId = rawId.trim().toUpperCase();

  // If it's already a 10-digit numeric string, keep it as is
  if (cleanId.length === 10 && /^\d+$/.test(cleanId)) {
    return cleanId;
  }

  // If it's a 12-char Hex string from the EM-18
  if (cleanId.length === 12) {
    // The core ID is usually the middle 8 hex digits
    const hexPart = cleanId.substring(2, 10);
    const decimal = parseInt(hexPart, 16).toString();
    // Pad to 10 digits with leading zeros
    return decimal.padStart(10, '0');
  }

  return cleanId;
};

export default function RFIDManagement() {
  const [fastags, setFastags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ tagId: '', vehiclePlate: '' });
  const [pairingSession, setPairingSession] = useState(null);
  const [pairingActive, setPairingActive] = useState(false);

  const token = localStorage.getItem('token');
  const decodedToken = token ? jwtDecode(token) : null;
  const userId = decodedToken?.id || decodedToken?._id || localStorage.getItem('userId');

  const fetchUserFastags = useCallback(async () => {
    try {
      if (!userId) return;
      setLoading(true);
      let response;
      try {
        response = await axios.get(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // If requested user fetch fails (401/404), try token-based profile endpoint
        console.warn('GET /users/:id failed, trying /userProfile', e?.response?.status, e?.message);
        if (token) {
          response = await axios.get(`${API_URL}/userProfile`, { headers: { Authorization: `Bearer ${token}` } });
        } else {
          throw e;
        }
      }

      const data = response.data || {};
      // data may be user object or { fastags: [...] }
      const fastagsArray = Array.isArray(data.fastags) ? data.fastags : (Array.isArray(data.user?.fastags) ? data.user.fastags : []);
      setFastags(fastagsArray || []);
    } catch (err) {
      console.error('fetchUserFastags error', err && err.response ? err.response.data : err.message || err);
      if (err.response && err.response.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load RFID cards');
      }
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    fetchUserFastags();
  }, [fetchUserFastags]);

  // Polling for the pairing status
  useEffect(() => {
    if (!pairingSession || pairingSession.status !== 'pending') {
      return undefined;
    }

    const intervalId = setInterval(async () => {
      try {
        const response = await axios.get(
          `${API_URL}/fastag/pairing/status/${pairingSession._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const session = response.data.session;
        if (session?.status === 'consumed') {
          // Format the ID received from the hardware before displaying/confirming
          const finalId = formatTagId(session.linkedTagId);
          setSuccess(`RFID card ${finalId} linked successfully!`);
          setPairingActive(false);
          setPairingSession(null);
          await fetchUserFastags();
          setTimeout(() => setSuccess(null), 5000);
        }
      } catch (err) {
        console.error('Failed to poll pairing status', err);
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [pairingSession, token, fetchUserFastags]);

  const handleAddFastag = async (e) => {
    e.preventDefault();
    setError(null);

    // Apply the conversion/formatting logic to manual input
    const formattedId = formatTagId(formData.tagId);

    if (!formattedId) {
      setError('Please enter a valid RFID Tag ID');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/fastag/link`,
        {
          tagId: formattedId,
          vehiclePlate: formData.vehiclePlate.trim() || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // backend returns the updated fastags array in response.data.fastags
      if (response.status === 200) {
        setSuccess(`RFID card ${formattedId} linked successfully!`);
        if (response.data.fastags) {
          setFastags(response.data.fastags);
        }
        setFormData({ tagId: '', vehiclePlate: '' });
        setShowForm(false);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to link RFID card');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPairing = async () => {
    if (!userId) {
      setError('Please log in again to link your RFID card');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await axios.post(
        `${API_URL}/fastag/pairing/start`,
        { ttlMinutes: 5 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.ok) {
        setPairingSession(response.data.session);
        setPairingActive(true);
        setShowForm(false);
        setSuccess('Pairing started. Scan your RFID card on the reader now.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start RFID pairing');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFastag = async (tagId) => {
    if (!window.confirm('Are you sure you want to remove this RFID card?')) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/fastag/unlink`,
        { tagId, userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.ok) {
        setFastags(fastags.filter(f => f.tagId !== tagId));
        setSuccess('RFID card removed');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to remove RFID card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rfid-management">
      <div className="rfid-container">
        <div className="rfid-header">
          <h2>RFID Card Management</h2>
          <p>Link your cards for automatic gate entry and payment.</p>
        </div>

        <div className="pairing-banner">
          <div>
            <strong>Automatic RFID linking</strong>
            <p>Start pairing, then scan your card on the reader.</p>
          </div>
          <button 
            className={`btn-add-rfid ${pairingActive ? 'active' : ''}`} 
            onClick={handleStartPairing} 
            disabled={loading || pairingActive}
          >
            <ScanLine size={18} />
            {pairingActive ? 'Pairing Active...' : 'Start Reader Pairing'}
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        <div className="rfid-cards-list">
          {fastags.length === 0 ? (
            <div className="empty-state">
              <p>No RFID cards linked yet.</p>
            </div>
          ) : (
            fastags.map((tag, idx) => (
              <div key={idx} className="rfid-card">
                <div className="rfid-info">
                  <div className="rfid-tag-id">
                    <span className="label">Card ID:</span>
                    <span className="value">{tag.tagId}</span>
                  </div>
                  {tag.vehiclePlate && (
                    <div className="rfid-plate">
                      <span className="label">Vehicle:</span>
                      <span className="value">{tag.vehiclePlate}</span>
                    </div>
                  )}
                </div>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveFastag(tag.tagId)}
                  disabled={loading}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {!showForm ? (
          <button
            className="btn-add-rfid"
            onClick={() => setShowForm(true)}
            disabled={loading}
          >
            <Plus size={18} />
            Add RFID Card Manually
          </button>
        ) : (
          <form onSubmit={handleAddFastag} className="rfid-form">
            <div className="form-group">
              <label>RFID Card Number</label>
              <input
                type="text"
                placeholder="Enter 10 or 12 digit ID"
                value={formData.tagId}
                onChange={(e) => setFormData({ ...formData, tagId: e.target.value })}
                disabled={loading}
              />
              <span className="input-hint">Enter the number printed on the card or the Hex ID from the scanner.</span>
            </div>

            <div className="form-group">
              <label>Vehicle Plate (Optional)</label>
              <input
                type="text"
                placeholder="e.g., ABC-1234"
                value={formData.vehiclePlate}
                onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                disabled={loading}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Linking...' : 'Link Card'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}