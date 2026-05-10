import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaTrash, FaToggleOn, FaToggleOff, FaCheck } from "react-icons/fa";

const RFIDManagement = () => {
  const navigate = useNavigate();
  const [rfidCards, setRfidCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [defaultCardId, setDefaultCardId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState({ cardId: "", cardName: "" });
  const [autoScanActive, setAutoScanActive] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [unlinkedScans, setUnlinkedScans] = useState([]);
  const [autoProcessing, setAutoProcessing] = useState(false);

  const fetchUnlinkedScans = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:3001/api/rfid/unlinked-scans");
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.scans) setUnlinkedScans(data.scans);
    } catch (err) {
      // ignore polling errors
    }
  }, []);

  const fetchRFIDCards = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      
      const response = await fetch("http://localhost:3001/User/rfid-cards", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch RFID cards");
      
      const data = await response.json();
      setRfidCards(data.rfidCards || []);
      
      // Get default card from user profile
      const profileResponse = await fetch(
        "http://localhost:3001/User/userProfile",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setDefaultCardId(profileData.rfidCard);
      }
    } catch (err) {
      setError(err.message || "Failed to load RFID cards");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchRFIDCards();
    fetchUnlinkedScans();
    const timer = setInterval(() => fetchUnlinkedScans(), 3000);
    return () => clearInterval(timer);
  }, [fetchRFIDCards, fetchUnlinkedScans]);

  const handleAddCard = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newCard.cardId.trim()) {
      setError("Card ID is required");
      return;
    }

    if (newCard.cardId.trim().length < 5) {
      setError("Card ID must be at least 5 characters");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/User/rfid-cards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId: newCard.cardId.trim(),
          cardName: newCard.cardName.trim() || "My RFID Card",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to register card");
        return;
      }

      setSuccess("RFID card registered successfully!");
      setRfidCards(data.rfidCards);
      setNewCard({ cardId: "", cardName: "" });
      setShowAddForm(false);

      // Set as default if first card
      if (data.rfidCards.length === 1) {
        setDefaultCardId(newCard.cardId.trim());
      }
    } catch (err) {
      setError(err.message || "Failed to register card");
    }
  };

  const handleToggleCard = async (cardId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/User/rfid-cards/${cardId}/toggle`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to toggle card");
        return;
      }

      setSuccess(data.message);
      setRfidCards(data.rfidCards);
    } catch (err) {
      setError(err.message || "Failed to toggle card");
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Are you sure you want to delete this card?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/User/rfid-cards/${cardId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to delete card");
        return;
      }

      setSuccess(data.message);
      setRfidCards(data.rfidCards);

      // Update default if deleted card was default
      if (defaultCardId === cardId) {
        setDefaultCardId(data.rfidCards[0]?.cardId || null);
      }
    } catch (err) {
      setError(err.message || "Failed to delete card");
    }
  };

  const handleSetDefault = async (cardId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/User/rfid-cards/${cardId}/set-default`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to set default card");
        return;
      }

      setSuccess(data.message);
      setDefaultCardId(cardId);
      setRfidCards(data.rfidCards);
    } catch (err) {
      setError(err.message || "Failed to set default card");
    }
  };

  const clearMessages = () => {
    setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000);
  };

  useEffect(() => {
    if (error || success) {
      clearMessages();
    }
  }, [error, success]);

  // When auto scan is active and an unlinked scan appears, prefill the add form
  useEffect(() => {
    if (!autoScanActive) return;
    if (autoProcessing) return;
    if (unlinkedScans && unlinkedScans.length > 0) {
      // Auto-register each unlinked scan
      const process = async () => {
        setAutoProcessing(true);
        try {
          const token = localStorage.getItem("token");
          for (const scan of unlinkedScans) {
            try {
              // Register card to current user
              const resp = await fetch("http://localhost:3001/User/rfid-cards", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ cardId: scan.cardId, cardName: "Scanned Card" }),
              });
              const d = await resp.json().catch(() => ({}));
              if (!resp.ok) {
                setError(d.message || `Failed to auto-register ${scan.cardId}`);
                continue;
              }
              setSuccess(`Auto-registered card ${scan.cardId}`);
              if (d.rfidCards) setRfidCards(d.rfidCards);

              // mark scan processed
              await fetch("http://localhost:3001/api/rfid/mark-scan-processed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scanId: scan._id }),
              }).catch(() => {});
              // small pause to avoid rapid-fire
              await new Promise((res) => setTimeout(res, 200));
            } catch (err) {
              // per-scan error — continue with others
            }
          }
        } finally {
          setAutoProcessing(false);
          fetchUnlinkedScans();
        }
      };
      process();
    }
  }, [unlinkedScans, autoScanActive, autoProcessing, fetchUnlinkedScans]);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-black">RFID Card Management</h1>
          <button
            onClick={() => navigate("/profile")}
            className="px-4 py-2 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Back to Profile
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-black rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-black rounded-lg">
            {success}
          </div>
        )}

        {/* Add Card Form */}
        <div className="mb-6 flex gap-3">
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex-1 px-4 py-3 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2 font-semibold"
            >
              <FaPlus /> Register New RFID Card
            </button>
          )}

          <button
            onClick={() => setAutoScanActive(!autoScanActive)}
            className={`px-4 py-3 rounded-lg font-semibold border border-gray-300 ${autoScanActive ? 'bg-red-100 text-black hover:bg-red-200' : 'bg-green-100 text-black hover:bg-green-200'}`}
          >
            {autoScanActive ? 'Stop Auto-Scan' : 'Start Auto-Scan'}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-black">
              Register New RFID Card
            </h2>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-black font-medium mb-2">
                  Card ID (12-16 digits) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCard.cardId}
                  onChange={(e) =>
                    setNewCard({ ...newCard, cardId: e.target.value })
                  }
                  placeholder="e.g., 58215A1B2C3D"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-black mt-1">
                  Scan your RFID card or enter its ID
                </p>
              </div>

              <div>
                <label className="block text-black font-medium mb-2">
                  Card Name (Optional)
                </label>
                <input
                  type="text"
                  value={newCard.cardName}
                  onChange={(e) =>
                    setNewCard({ ...newCard, cardName: e.target.value })
                  }
                  placeholder="e.g., My Parking Card"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-100 text-black border border-gray-300 rounded-lg hover:bg-green-200 font-semibold"
                >
                  Register Card
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCard({ cardId: "", cardName: "" });
                  }}
                  className="flex-1 px-4 py-2 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Cards List */}
        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading RFID cards...</div>
        ) : rfidCards.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <p className="text-black mb-4">No RFID cards registered yet</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-2 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Register Your First Card
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rfidCards.map((card) => (
              <div
                key={card.cardId}
                className={`bg-white p-6 rounded-lg shadow-lg border-2 ${
                  card.cardId === defaultCardId
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-black">
                        {card.cardName}
                      </h3>
                      {card.cardId === defaultCardId && (
                        <span className="px-3 py-1 bg-green-100 text-black border border-gray-300 text-xs font-bold rounded-full flex items-center gap-1">
                          <FaCheck /> Default
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full ${
                          card.active
                            ? "bg-blue-100 text-black"
                            : "bg-red-100 text-black"
                        }`}
                      >
                        {card.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-black mt-1">
                      ID: <code className="font-mono font-bold">{card.cardId}</code>
                    </p>
                    <p className="text-xs text-black mt-2">
                      Registered: {new Date(card.registeredAt).toLocaleDateString()}
                      {card.lastUsed && (
                        <>
                          {" "}
                          | Last Used:{" "}
                          {new Date(card.lastUsed).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap mt-4">
                  {card.cardId !== defaultCardId && (
                    <button
                      onClick={() => handleSetDefault(card.cardId)}
                      className="flex-1 px-4 py-2 bg-green-100 text-black border border-gray-300 rounded-lg hover:bg-green-200 font-semibold text-sm"
                    >
                      Set as Default
                    </button>
                  )}

                  <button
                    onClick={() => handleToggleCard(card.cardId)}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 ${
                      card.active
                        ? "bg-orange-100 text-black border border-gray-300 hover:bg-orange-200"
                        : "bg-gray-100 text-black border border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {card.active ? <FaToggleOn /> : <FaToggleOff />}
                    {card.active ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    onClick={() => handleDeleteCard(card.cardId)}
                    className="flex-1 px-4 py-2 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        {/* Recently scanned (unregistered) cards - automatic linking */}
        {unlinkedScans.length > 0 && (
          <div className="mt-6 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-bold text-black mb-3">⚠️ Recently scanned unregistered cards</h3>
            <p className="text-sm text-black mb-3">Detected at entry gates — you can register a scanned card to your account with one click.</p>
            <div className="space-y-3">
              {unlinkedScans.map((scan) => (
                <div key={scan._id} className="bg-white p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-black">Card ID: <span className="font-mono">{scan.cardId}</span></div>
                    <div className="text-xs text-black">Reader: {scan.readerId || 'unknown'} • Gate: {scan.gateId || 'unknown'} • {new Date(scan.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          if (!token) {
                            setError('Please sign in to link this card');
                            return;
                          }

                          const resp = await fetch('http://localhost:3001/User/rfid-cards', {
                            method: 'POST',
                            headers: {
                              Authorization: `Bearer ${token}`,
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ cardId: scan.cardId, cardName: 'Scanned Card' }),
                          });

                          // Handle common failure statuses with helpful messages
                          if (resp.status === 401 || resp.status === 403) {
                            setError('Session expired or unauthorized. Please log in again.');
                            return;
                          }

                          const d = await resp.json().catch(() => ({}));
                          if (!resp.ok) {
                            // Backend may return 'User not found' when token is invalid
                            if (d && d.message && d.message.toLowerCase().includes('user not found')) {
                              setError('Account not found. Please log in again.');
                            } else {
                              setError(d.message || 'Failed to register scanned card');
                            }
                            return;
                          }

                          setSuccess('Scanned card registered to your account');
                          if (d.rfidCards) setRfidCards(d.rfidCards || []);

                          // mark scan processed
                          await fetch('http://localhost:3001/api/rfid/mark-scan-processed', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ scanId: scan._id }),
                          }).catch(() => {});

                          // refresh unlinked scans
                          fetchUnlinkedScans();
                        } catch (err) {
                          setError(err.message || 'Failed to register scanned card');
                        }
                      }}
                      className="px-4 py-2 bg-white text-black font-semibold rounded-lg border border-gray-300 hover:bg-gray-100"
                    >
                      Link to my account
                    </button>
                    <button
                      onClick={async () => {
                        // dismiss scan
                        try {
                          await fetch('http://localhost:3001/api/rfid/mark-scan-processed', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ scanId: scan._id })
                          });
                          fetchUnlinkedScans();
                        } catch (err) {
                          // ignore
                        }
                      }}
                      className="px-4 py-2 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-bold text-black mb-3">ℹ️ How to Use</h3>
          <ul className="text-sm text-black space-y-2 list-disc list-inside">
            <li>Register your RFID card to enable automatic gate access</li>
            <li>Set one card as default for parking entry</li>
            <li>Activate or deactivate cards as needed</li>
            <li>The gate will check your card against active reservations</li>
            <li>Make sure you have an active reservation before scanning</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RFIDManagement;
