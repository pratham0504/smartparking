/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import enIN from "date-fns/locale/en-IN";
import { io } from "socket.io-client";
import "react-datepicker/dist/react-datepicker.css";

// Register English (India) locale
registerLocale("en-IN", enIN);

const ReservationDetails = ({ reservation }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!reservation) return null;

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ 
          color: "#334155", 
          fontSize: "1.875rem",
          fontWeight: "700",
          marginBottom: "1rem",
          background: "linear-gradient(45deg, #3b82f6, #2563eb)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          Reservation Details
        </h3>
      </div>

      <div style={{
        backgroundColor: "rgba(248, 250, 252, 0.8)",
        backdropFilter: "blur(10px)",
        borderRadius: "16px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        border: "1px solid rgba(226, 232, 240, 0.6)",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
      }}>
        <h4 style={{ 
          color: "#1e293b", 
          fontSize: "1.25rem", 
          fontWeight: "600",
          marginBottom: "1rem"
        }}>
          Customer Information
        </h4>
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ 
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2"/>
              <circle cx="12" cy="7" r="4" strokeWidth="2"/>
            </svg>
            <span style={{ color: "#64748b" }}>Name:</span>
            <span style={{ marginLeft: "0.5rem", fontWeight: "500" }}>{reservation.client?.name}</span>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeWidth="2"/>
            </svg>
            <span style={{ color: "#64748b" }}>Phone:</span>
            <span style={{ marginLeft: "0.5rem", fontWeight: "500" }}>{reservation.client?.phone}</span>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: "rgba(248, 250, 252, 0.8)",
        backdropFilter: "blur(10px)",
        borderRadius: "16px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        border: "1px solid rgba(226, 232, 240, 0.6)",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
      }}>
        <h4 style={{ 
          color: "#1e293b", 
          fontSize: "1.25rem", 
          fontWeight: "600",
          marginBottom: "1rem"
        }}>
          Spot Details
        </h4>
        <div style={{ 
          marginBottom: "0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
            <path d="M7 7h10v10H7z" strokeWidth="2"/>
          </svg>
          <span style={{ color: "#64748b" }}>Spot Number:</span>
          <span style={{ marginLeft: "0.5rem", fontWeight: "500" }}>{reservation.spotId.replace('parking-spot-', '')}</span>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b">
            <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M3 12h12" strokeWidth="2"/>
          </svg>
          <span style={{ color: "#64748b" }}>Vehicle Type:</span>
          <span style={{ marginLeft: "0.5rem", fontWeight: "500" }}>{reservation.vehicleType}</span>
        </div>
      </div>

      <div style={{
        backgroundColor: "rgba(248, 250, 252, 0.8)",
        backdropFilter: "blur(10px)",
        borderRadius: "16px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        border: "1px solid rgba(226, 232, 240, 0.6)",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
      }}>
        <h4 style={{ 
          color: "#1e293b", 
          fontSize: "1.25rem", 
          fontWeight: "600",
          marginBottom: "1rem"
        }}>
          Schedule & Payment
        </h4>
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ 
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path d="M12 6v6l4 2" strokeWidth="2"/>
            </svg>
            <span style={{ color: "#64748b" }}>Start:</span>
            <span style={{ marginLeft: "0.5rem", fontWeight: "500" }}>{formatDate(reservation.startTime)}</span>
          </div>
          <div style={{ 
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path d="M12 6v6l-4 2" strokeWidth="2"/>
            </svg>
            <span style={{ color: "#64748b" }}>End:</span>
            <span style={{ marginLeft: "0.5rem", fontWeight: "500" }}>{formatDate(reservation.endTime)}</span>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b">
              <path d="M2 8h20M4 8v10a2 2 0 002 2h12a2 2 0 002-2V8m-4-4v4H8V4" strokeWidth="2"/>
            </svg>
            <span style={{ color: "#64748b" }}>Payment Method:</span>
            <span style={{ 
              marginLeft: "0.5rem", 
              fontWeight: "500",
              textTransform: "capitalize" 
            }}>
              {reservation.paymentMethod === 'cash' ? 'Cash' : 'Online'}
            </span>
          </div>
        </div>
        <div style={{ 
          marginTop: "1rem",
          padding: "1rem",
          background: "linear-gradient(145deg, #eef2ff, #e0e7ff)",
          borderRadius: "12px",
          border: "1px solid rgba(99, 102, 241, 0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#4f46e5", fontWeight: "600" }}>Total:</span>
            <span style={{ 
              color: "#4f46e5", 
              fontSize: "1.5rem", 
              fontWeight: "700",
              textShadow: "1px 1px 2px rgba(79, 70, 229, 0.1)"
            }}>
              INR {reservation.totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: "rgba(248, 250, 252, 0.8)",
        backdropFilter: "blur(10px)",
        borderRadius: "16px",
        padding: "1.5rem",
        border: "1px solid rgba(226, 232, 240, 0.6)",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
      }}>
        <h4 style={{ 
          color: "#1e293b", 
          fontSize: "1.25rem", 
          fontWeight: "600",
          marginBottom: "1rem"
        }}>
          Status
        </h4>
        <div style={{ 
          display: "flex", 
          gap: "1rem",
          alignItems: "center" 
        }}>
          <div style={{
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            backgroundColor: reservation.status === 'accepted' ? '#dcfce7' : '#fee2e2',
            color: reservation.status === 'accepted' ? '#15803d' : '#991b1b',
            fontWeight: "500",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {reservation.status === 'accepted' ? (
                <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round"/>
              ) : (
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/>
              )}
            </svg>
            {reservation.status === 'accepted' ? 'Confirmed' : 'Pending'}
          </div>
          <div style={{
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            backgroundColor: reservation.paymentStatus === 'completed' ? '#dcfce7' : '#fef9c3',
            color: reservation.paymentStatus === 'completed' ? '#15803d' : '#854d0e',
            fontWeight: "500",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {reservation.paymentStatus === 'completed' ? (
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/>
              ) : (
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/>
              )}
            </svg>
            {reservation.paymentStatus === 'completed' ? 'Paid' : 'Payment Pending'}
          </div>
        </div>
      </div>
    </div>
  );
};

const ParkingLiveView = ({ parkingId: propParkingId }) => {
  const { id: urlParkingId } = useParams(); // Si utilisation de React Router
  const parkingId = propParkingId || urlParkingId;
  const [parkingSpots, setParkingSpots] = useState([]);
  const [streets, setStreets] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [parkingInfo, setParkingInfo] = useState({
    name: "Parking",
    totalSpots: 0,
    availableSpots: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [parkingDimensions, setParkingDimensions] = useState({
    width: 0,
    height: 0,
    boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [tempDateTime, setTempDateTime] = useState(new Date());
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedSpotForToggle, setSelectedSpotForToggle] = useState(null);
  const socketRef = useRef(null);

  const styles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      padding: "1rem",
    },
    parkingContainer: {
      backgroundColor: "#1e293b",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow:
        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      width: "100%",
      maxWidth: "800px",
      height: "500px",
      position: "relative",
    },
    parkingGrid: {
      position: "absolute",
      width: "100%",
      height: "100%",
      backgroundColor: "#1e293b",
      backgroundImage: "radial-gradient(#334155 1px, transparent 1px)",
      backgroundSize: "20px 20px",
      zIndex: 0,
    },
    zoomControls: {
      position: "absolute",
      bottom: "20px",
      left: "20px",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "rgba(30, 41, 59, 0.8)",
      borderRadius: "12px",
      padding: "8px",
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      zIndex: 10,
    },
    controlButton: {
      width: "36px",
      height: "36px",
      backgroundColor: "#3b82f6",
      color: "white",
      border: "none",
      borderRadius: "8px",
      margin: "4px",
      fontSize: "16px",
      cursor: "pointer",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      transition: "all 0.2s ease",
      ":hover": {
        backgroundColor: "#2563eb",
      },
    },
    legend: {
      position: "absolute",
      top: "20px",
      left: "20px",
      backgroundColor: "rgba(30, 41, 59, 0.9)",
      color: "white",
      padding: "12px",
      borderRadius: "12px",
      fontSize: "14px",
      zIndex: 10,
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      backdropFilter: "blur(4px)",
    },
    statusIndicator: {
      display: "flex",
      alignItems: "center",
      marginBottom: "8px",
      ":last-child": {
        marginBottom: 0,
      },
    },
    statusDot: {
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      marginRight: "8px",
    },
    notification: {
      position: "absolute",
      top: "20px",
      right: "20px",
      padding: "12px 16px",
      borderRadius: "8px",
      fontWeight: "500",
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      zIndex: 20,
      display: "flex",
      alignItems: "center",
    },
    loadingScreen: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(30, 41, 59, 0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 30,
      borderRadius: "16px",
    },
    loadingSpinner: {
      border: "4px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "50%",
      borderTop: "4px solid #3b82f6",
      width: "40px",
      height: "40px",
      animation: "spin 1s linear infinite",
    },
  };

  const fetchReservationDetails = async (id) => {
    const currentSpot = parkingSpots.find((spot) => spot.id === id);
    if (!currentSpot.isReserved) {
      setSelectedReservation(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:3001/api/reservations/by-spot?parkingId=${parkingId}&spotId=${id}`
      );

      if (response.data?.length > 0) {
        // Utiliser la première réservation active trouvée avec les infos client
        let selectedReservation = response.data[0];
        // Vérifier si la réservation est active à la date sélectionnée
        const selectedTime = selectedDateTime.getTime();
        const reservation = response.data.find(res => {
          const startTime = new Date(res.startTime).getTime();
          const endTime = new Date(res.endTime).getTime();
          return selectedTime >= startTime && selectedTime <= endTime;
        });

        if (reservation) {
          setSelectedReservation(reservation);
        } else {
          setSelectedReservation(null);
        }
      } else {
        setSelectedReservation(null);
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Unable to fetch reservation details");
      setSelectedReservation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateParkingDimensions = (spots, streets) => {
    // Make sure to include arrows in the calculation
    const allElements = [...spots, ...streets];

    if (allElements.length === 0)
      return {
        width: 0,
        height: 0,
        boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      };

    const boundingBox = allElements.reduce(
      (acc, el) => {
        const left = el.position?.left || 0;
        const top = el.position?.top || 0;
        const width = el.size?.width || el.width || 60;
        const height = el.size?.height || el.length || 30;

        return {
          minX: Math.min(acc.minX, left),
          minY: Math.min(acc.minY, top),
          maxX: Math.max(acc.maxX, left + width),
          maxY: Math.max(acc.maxY, top + height),
        };
      },
      {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      }
    );

    return {
      width: boundingBox.maxX - boundingBox.minX,
      height: boundingBox.maxY - boundingBox.minY,
      boundingBox,
    };
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      // Bouton gauche de la souris
      setIsDragging(true);
      setStartPos({
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const dx = (e.clientX - startPos.x) / zoom;
    const dy = (e.clientY - startPos.y) / zoom;

    setOffset((prevOffset) => {
      const newX = prevOffset.x + dx;
      const newY = prevOffset.y + dy;
      
      // Get container dimensions
      const container = containerRef.current;
      if (!container) return prevOffset;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Calculate content bounds (approximate parking area size)
      const contentWidth = 800 * zoom; // Adjust based on your parking layout
      const contentHeight = 600 * zoom;
      
      // Define max/min boundaries
      const maxOffsetX = containerWidth * 0.3;
      const minOffsetX = -(contentWidth - containerWidth * 0.7);
      const maxOffsetY = containerHeight * 0.3;
      const minOffsetY = -(contentHeight - containerHeight * 0.7);
      
      // Clamp the offset within boundaries
      const clampedX = Math.max(minOffsetX, Math.min(maxOffsetX, newX));
      const clampedY = Math.max(minOffsetY, Math.min(maxOffsetY, newY));
      
      return {
        x: clampedX,
        y: clampedY,
      };
    });

    setStartPos({
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Fin du drag
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Gestion du zoom avec la molette de la souris
  const handleWheel = (e) => {
    // Vérifier explicitement si le curseur est au-dessus du conteneur de visualisation
    const isMouseOverContainer =
      e.target === containerRef.current ||
      containerRef.current.contains(e.target);

    // Si le curseur n'est pas sur le conteneur, ne pas gérer le zoom
    if (!isMouseOverContainer) {
      return;
    }

    // Stopper complètement la propagation et le comportement par défaut
    e.preventDefault();
    e.stopPropagation();

    // Désactiver le scroll par défaut sur le conteneur
    containerRef.current.style.overflow = "hidden";

    // Pinch-to-zoom style zooming
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * zoomFactor));

    // Position of the mouse relative to the container
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    // Calculate new offset to zoom towards mouse position
    setOffset((prevOffset) => ({
      x: prevOffset.x - mouseX * (newZoom - zoom),
      y: prevOffset.y - mouseY * (newZoom - zoom),
    }));

    setZoom(newZoom);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      // Désactiver l'option de scroll passif pour cet élément
      container.addEventListener("wheel", handleWheel, { passive: false });

      return () => {
        container.removeEventListener("wheel", handleWheel, { passive: false });
      };
    }
  }, [zoom, offset]);

  // Chargement des données du parking
  useEffect(() => {
    if (parkingId) {
      loadParkingData();
    }
  }, [parkingId]);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "http://localhost:3001");
    socketRef.current = socket;

    const token = localStorage.getItem("token");
    if (token) {
      socket.emit("authenticate", token);
    }

    const handleParkingUpdate = (payload) => {
      if (!payload || String(payload.parkingId) !== String(parkingId)) {
        return;
      }

      setUpdateStatus("success");
      setTimeout(() => setUpdateStatus(null), 2000);

      loadParkingData(tempDateTime);
    };

    socket.on("parking_state_updated", handleParkingUpdate);
    socket.on("reservation_payment_completed", handleParkingUpdate);

    return () => {
      socket.off("parking_state_updated", handleParkingUpdate);
      socket.off("reservation_payment_completed", handleParkingUpdate);
      socket.disconnect();
    };
  }, [parkingId, tempDateTime]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      calculateInitialView();
    }
  }, [loading, parkingSpots, streets, containerRef.current]);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Multi-touch for pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const initialDistance = Math.hypot(
        touch1.pageX - touch2.pageX,
        touch1.pageY - touch2.pageY
      );
      e.currentTarget.initialDistance = initialDistance;
    } else if (e.touches.length === 1) {
      // Single touch for panning
      const touch = e.touches[0];
      setIsDragging(true);
      setStartPos({
        x: touch.clientX,
        y: touch.clientY,
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      // Vérifier explicitement si le curseur est au-dessus du conteneur de visualisation
      const isMultiTouchOverContainer =
        e.currentTarget === containerRef.current ||
        containerRef.current.contains(e.currentTarget);

      // Si le multi-touch n'est pas sur le conteneur, ne pas gérer le zoom
      if (!isMultiTouchOverContainer) {
        return;
      }

      // Pinch zoom (code précédent reste identique)
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch1.pageX - touch2.pageX,
        touch1.pageY - touch2.pageY
      );

      const zoomFactor = currentDistance / e.currentTarget.initialDistance;
      const newZoom = Math.max(0.5, Math.min(3, zoom * zoomFactor));

      // Calculate center point of pinch
      const centerX = (touch1.pageX + touch2.pageX) / 2;
      const centerY = (touch1.pageY + touch2.pageY) / 2;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = (centerX - rect.left) / zoom;
      const mouseY = (centerY - rect.top) / zoom;

      setOffset((prevOffset) => ({
        x: prevOffset.x - mouseX * (newZoom - zoom),
        y: prevOffset.y - mouseY * (newZoom - zoom),
      }));

      setZoom(newZoom);
      e.currentTarget.initialDistance = currentDistance;
    } else if (e.touches.length === 1 && isDragging) {
      // Panning
      const touch = e.touches[0];
      const dx = (touch.clientX - startPos.x) / zoom;
      const dy = (touch.clientY - startPos.y) / zoom;

      setOffset((prevOffset) => {
        const newX = prevOffset.x + dx;
        const newY = prevOffset.y + dy;

        const container = containerRef.current;
        if (!container) return prevOffset;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const contentWidth = 800 * zoom;
        const contentHeight = 600 * zoom;
        const maxOffsetX = containerWidth * 0.3;
        const minOffsetX = -(contentWidth - containerWidth * 0.7);
        const maxOffsetY = containerHeight * 0.3;
        const minOffsetY = -(contentHeight - containerHeight * 0.7);

        return {
          x: Math.max(minOffsetX, Math.min(maxOffsetX, newX)),
          y: Math.max(minOffsetY, Math.min(maxOffsetY, newY)),
        };
      });

      setStartPos({
        x: touch.clientX,
        y: touch.clientY,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Fonction pour charger les données du parking
  const loadParkingData = async (dateTime = new Date()) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3001/parkings/parkings/${parkingId}`
      );
      const parkingData = response.data;

      const formattedSpots = await Promise.all(parkingData.spots.map(async (spot) => {
        // Pour chaque spot, vérifier les réservations actives à la date sélectionnée
        const reservationResponse = await axios.get(
          `http://localhost:3001/api/reservations/by-spot?parkingId=${parkingId}&spotId=${spot.id}`
        );
        
        // Convertir la date sélectionnée en timestamp pour comparaison
        const selectedTimestamp = dateTime.getTime();
        
        const activeReservation = reservationResponse.data.find(reservation => {
          const startTime = new Date(reservation.startTime).getTime();
          const endTime = new Date(reservation.endTime).getTime();
          return (
            selectedTimestamp >= startTime && 
            selectedTimestamp <= endTime && 
            reservation.status === 'accepted'
          );
        });

        return {
          id: spot.id,
          position: { left: spot.x, top: spot.y },
          rotation: spot.rotation,
          size: { width: spot.width, height: spot.height },
          isOccupied: spot.status === "occupied",
          isReserved: !!activeReservation,
          reservationId: activeReservation?._id // Stocker l'ID de la réservation si elle existe
        };
      }));

      // Reste de la fonction inchangé...
      const formattedStreets =
        parkingData.layout?.streets?.map((street) => ({
          id: street.id,
          position: { left: street.x, top: street.y },
          rotation: street.rotation,
          width: street.width,
          length: street.length,
          hasEntrance: street.hasEntrance,
          hasExit: street.hasExit,
        })) || [];

      setParkingSpots(formattedSpots);
      setStreets(formattedStreets);

      const dimensions = calculateParkingDimensions(
        formattedSpots,
        formattedStreets
      );
      setParkingDimensions(dimensions);

      // Mettre à jour les informations du parking avec le nouveau compte des places disponibles
      const availableCount = formattedSpots.filter(
        spot => !spot.isOccupied && !spot.isReserved
      ).length;

      setParkingInfo({
        name: parkingData.name || "Parking",
        totalSpots: parkingData.totalSpots || parkingData.spots.length,
        availableSpots: availableCount
      });

      setLoading(false);
    } catch (error) {
      console.error("Error loading parking data:", error);
      setError("Unable to load parking data");
      setLoading(false);
    }
  };

  // Méthode pour calculer la vue initiale
  const calculateInitialView = () => {
    if (!containerRef.current || parkingSpots.length === 0) return;

    const containerWidth = 800;
    const containerHeight = 600;

    // Utiliser les dimensions précalculées du parking
    const {
      width: parkingWidth,
      height: parkingHeight,
      boundingBox,
    } = parkingDimensions;

    // Calculer le zoom optimal
    const zoomX = containerWidth / parkingWidth;
    const zoomY = containerHeight / parkingHeight;
    const initialZoom = Math.min(zoomX, zoomY) * 0.9; // 90% pour une marge

    // Calculer le décalage exact pour centrer
    const centeringOffsetX =
      (containerWidth / initialZoom - parkingWidth) / 2 - boundingBox.minX;
    const centeringOffsetY =
      (containerHeight / initialZoom - parkingHeight) / 2 - boundingBox.minY;

    setZoom(initialZoom);
    setOffset({
      x: centeringOffsetX,
      y: centeringOffsetY,
    });
  };

  const toggleOccupancy = async (id) => {
    // Find the current spot to check its status
    const currentSpot = parkingSpots.find((spot) => spot.id === id);

    // Don't allow toggling if already reserved
    if (currentSpot.isReserved) {
      return;
    }

    // Prepare the new status (toggle between available and occupied)
    const newStatus = currentSpot.isOccupied ? "available" : "occupied";

    // Optimistically update the UI
    const updatedSpots = parkingSpots.map((spot) => {
      if (spot.id === id) {
        return {
          ...spot,
          isOccupied: newStatus === "occupied",
          isReserved: newStatus === "reserved",
        };
      }
      return spot;
    });

    setParkingSpots(updatedSpots);

    // Update the available spots count
    const availableCount = updatedSpots.filter(
      (spot) => !spot.isOccupied && !spot.isReserved
    ).length;

    setParkingInfo({
      ...parkingInfo,
      availableSpots: availableCount,
    });

    // Prepare the data to send to the API
    const spotData = {
      status: newStatus,
    };

    try {
      setUpdateStatus("updating");
      const token = localStorage.getItem("token");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      // Send the PATCH request to update the spot status in the database
      await axios.patch(
        `http://localhost:3001/parkings/${parkingId}/spots/${id}`,
        spotData,
        config
      );

      setUpdateStatus("success");
      setTimeout(() => setUpdateStatus(null), 2000);
    } catch (error) {
      console.error("Error updating spot status:", error);
      setUpdateStatus("error");

      // Revert changes on error
      setParkingSpots(parkingSpots);
      setParkingInfo({
        ...parkingInfo,
        availableSpots: parkingSpots.filter(
          (spot) => !spot.isOccupied && !spot.isReserved
        ).length,
      });

      setTimeout(() => setUpdateStatus(null), 3000);
    }
  };

  // Ajouter cette fonction pour gérer l'application de la nouvelle date
  const applyDateTimeChange = () => {
    setSelectedDateTime(tempDateTime);
    loadParkingData(tempDateTime);
  };

  const handleSpotClick = (spot) => {
    if (spot.isReserved) {
      fetchReservationDetails(spot.id);
    } else {
      setSelectedSpotForToggle(spot);
      setShowConfirmation(true);
    }
  };

  const handleConfirmToggle = async () => {
    if (selectedSpotForToggle) {
      await toggleOccupancy(selectedSpotForToggle.id);
    }
    setShowConfirmation(false);
    setSelectedSpotForToggle(null);
  };

  const renderConfirmationModal = () => {
    if (!showConfirmation) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.75rem',
          width: '90%',
          maxWidth: '400px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '1rem'
          }}>
            Confirmation
          </h2>
          <p style={{ 
            color: '#475569',
            marginBottom: '1.5rem'
          }}>
            Are you sure you want to {selectedSpotForToggle?.isOccupied ? 'release' : 'occupy'} spot {selectedSpotForToggle?.id.replace('parking-spot-', '')}?
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setShowConfirmation(false)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#e2e8f0',
                color: '#475569',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmToggle}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Fonction pour dessiner une place de parking
  const renderParkingSpot = (spot) => {
    const spotWidth = spot.size?.width || 60;
    const spotHeight = spot.size?.height || 30;

    // Déterminer la couleur en fonction du statut
    let spotStyle = {
      available: {
        fillColor: "#10b981",
        borderColor: "#059669",
        opacity: 0.9,
      },
      reserved: {
        fillColor: "#f59e0b",
        borderColor: "#d97706",
        opacity: 0.9,
      },
      occupied: {
        fillColor: "#ef4444",
        borderColor: "#dc2626",
        opacity: 0.9,
      },
    };
    const status = spot.isOccupied
      ? "occupied"
      : spot.isReserved
      ? "reserved"
      : "available";
    const { fillColor, borderColor, opacity } = spotStyle[status];

    // Extraire l'ID numérique du spotId (enlever 'parking-spot-')
    const spotNumber = spot.id.replace('parking-spot-', '');

    const spotTitle = `Spot ${spotNumber} - ${
      status === "available"
        ? "Available"
        : status === "reserved"
        ? "Reserved"
        : "Occupied"
    }`;

    return (
      <div
        key={spot.id}
        style={{
          position: "absolute",
          left: spot.position.left,
          top: spot.position.top,
          width: `${spotWidth}px`,
          height: `${spotHeight}px`,
          transform: `rotate(${spot.rotation}rad)`,
          transformOrigin: "center center",
          cursor: "pointer",
          transition: "all 0.3s ease",
          filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
        }}
        onClick={() => handleSpotClick(spot)}
        title={spotTitle}
      >
        <svg
          width={spotWidth}
          height={spotHeight}
          viewBox={`0 0 ${spotWidth} ${spotHeight}`}
        >
          {/* Fond avec effet de profondeur */}
          <rect
            x="0"
            y="0"
            width={spotWidth}
            height={spotHeight}
            rx="4"
            fill="#334155"
          />

          {/* Place de parking */}
          <rect
            x="2"
            y="2"
            width={spotWidth - 4}
            height={spotHeight - 4}
            rx="3"
            stroke={borderColor}
            strokeWidth="2"
            fill={fillColor}
            fillOpacity={opacity}
          >
            <animate
              attributeName="fillOpacity"
              values={updateStatus === "updating" ? "0.9;0.5;0.9" : "0.9"}
              dur="1s"
              repeatCount="1"
            />
          </rect>

          {/* Marquage au sol moderne */}
          <rect
            x={spotWidth * 0.15}
            y={spotHeight * 0.15}
            width={spotWidth * 0.7}
            height={spotHeight * 0.7}
            rx="2"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1"
            strokeDasharray="4,2"
            fill="none"
          />

          {/* Numéro de la place avec effet de profondeur */}
          <text
            x={spotWidth / 2}
            y={spotHeight / 2}
            fontSize="14"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
            dominantBaseline="middle"
            filter="url(#text-shadow)"
          >
            {spotNumber}
          </text>
          
          <defs>
            <filter
              id="text-shadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="1"
                dy="1"
                stdDeviation="1"
                floodColor="rgba(0,0,0,0.5)"
              />
            </filter>
          </defs>
        </svg>
      </div>
    );
  };

  // Dessin d'une rue
  const renderStreet = (street) => {
    return (
      <div
        key={street.id}
        style={{
          position: "absolute",
          left: street.position.left,
          top: street.position.top,
          width: `${street.width}px`,
          height: `${street.length}px`,
          transform: `rotate(${street.rotation}rad)`,
          transformOrigin: "center center",
          backgroundColor: "#334155",
          borderRadius: "6px",
          pointerEvents: "none",
          zIndex: 0,
          boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Marquage central moderne */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "4px",
            height: "100%",
            background:
              "linear-gradient(to bottom, transparent, #f8fafc, transparent)",
            opacity: 0.8,
            zIndex: 1,
          }}
        />

        {/* Entrée moderne */}
        {street.hasEntrance && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                backgroundColor: "#3b82f6",
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              }}
            >
              <span
                style={{ color: "white", fontSize: "12px", fontWeight: "bold" }}
              >
                E
              </span>
            </div>
          </div>
        )}

        {/* Sortie moderne */}
        {street.hasExit && (
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                backgroundColor: "#ef4444",
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              }}
            >
              <span
                style={{ color: "white", fontSize: "12px", fontWeight: "bold" }}
              >
                S
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLegend = () => (
    <div style={styles.legend}>
      <div style={{ marginBottom: "8px", fontWeight: "600", fontSize: "16px" }}>
        {parkingInfo.name}
      </div>
      <div style={{ marginBottom: "12px", color: "#94a3b8", fontSize: "12px" }}>
        {parkingInfo.availableSpots}/{parkingInfo.totalSpots} spots available
      </div>

      <div style={styles.statusIndicator}>
        <div style={{ ...styles.statusDot, backgroundColor: "#10b981" }}></div>
        <span>Available</span>
      </div>
      <div style={styles.statusIndicator}>
        <div style={{ ...styles.statusDot, backgroundColor: "#f59e0b" }}></div>
        <span>Reserved</span>
      </div>
      <div style={styles.statusIndicator}>
        <div style={{ ...styles.statusDot, backgroundColor: "#ef4444" }}></div>
        <span>Occupied</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const renderZoomControls = () => (
    <div style={styles.zoomControls}>
      <button
        onClick={() => setZoom((prev) => Math.min(3, prev * 1.2))}
        style={styles.controlButton}
        title="Zoom in"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button
        onClick={() => setZoom((prev) => Math.max(0.5, prev / 1.2))}
        style={styles.controlButton}
        title="Zoom out"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M5 12h14" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button
        onClick={calculateInitialView}
        style={styles.controlButton}
        title="Reset view"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
            strokeWidth="2"
          />
          <path d="M3 3v5h5" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );

  const renderNotification = () => {
    if (!updateStatus) return null;

    const notificationStyles = {
      updating: {
        backgroundColor: "#fef3c7",
        color: "#92400e",
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            style={{ marginRight: "8px" }}
          >
            <path
              d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      success: {
        backgroundColor: "#d1fae5",
        color: "#065f46",
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            style={{ marginRight: "8px" }}
          >
            <path
              d="M20 6L9 17l-5-5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      error: {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            style={{ marginRight: "8px" }}
          >
            <path
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
    };

    const { backgroundColor, color, icon } = notificationStyles[updateStatus];

    const notificationText = updateStatus === "updating"
      ? "Updating spot status..."
      : updateStatus === "success"
      ? "Spot status updated successfully!"
      : "Failed to update spot status";

    return (
      <div style={{ ...styles.notification, backgroundColor, color }}>
        {icon}
        {notificationText}
      </div>
    );
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div
          style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "12px",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#ef4444",
              fontSize: "1.5rem",
              marginBottom: "1rem",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 style={{ color: "#1e293b", marginBottom: "0.5rem" }}>
            Loading Error
          </h2>
          <p style={{ color: "#64748b" }}>Unable to load parking data. Please try again.</p>
          <button
            onClick={loadParkingData}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "background-color 0.2s",
              ":hover": {
                backgroundColor: "#2563eb",
              },
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "-100px",
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        padding: "1rem",
        gap: "1rem",
        flexDirection: "column",
      }}
    >
      {/* Titre et en-tête */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "0 40px 20px 40px",
          paddingBottom: "15px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3b82f6"
          >
            <path
              d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z"
              strokeWidth="2"
            />
            <path d="M3 10h18M8 15h8M8 18h5M10 6h4v4h-4z" strokeWidth="2" />
          </svg>
          <h1 style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#1e293b",
            margin: 0,
          }}>
            Parking Management System
          </h1>
        </div>
        <div
          style={{
            backgroundColor: "#e0f2fe",
            color: "#0369a1",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0369a1"
          >
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              strokeWidth="2"
            />
          </svg>
          <span>Owner Mode</span>
        </div>
      </div>

      {/* Sélecteur de date/heure avec bouton Appliquer */}
      <div style={{ 
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1rem",
        padding: "0 40px"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          backgroundColor: "#f8fafc",
          padding: "0.5rem 1rem",
          borderRadius: "0.5rem",
          border: "1px solid #e2e8f0",
          flex: "1"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
          </svg>
          <DatePicker
            selected={tempDateTime}
            onChange={(date) => setTempDateTime(date)}
            showTimeSelect
            timeFormat="HH:mm"
            dateFormat="dd/MM/yyyy HH:mm"
            locale="en-IN"
            aria-label="Select date and time"
            style={{
              border: "none",
              backgroundColor: "transparent",
              color: "#1e293b",
              fontSize: "0.875rem",
              cursor: "pointer",
              flex: "1"
            }}
            className="date-picker-input"
          />
        </div>

        <button
          onClick={applyDateTimeChange}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1.5rem",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
            transition: "background-color 0.2s"
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Apply
        </button>

        <button
          onClick={() => {
            const now = new Date();
            setTempDateTime(now);
            setSelectedDateTime(now);
            loadParkingData(now);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#e2e8f0",
            color: "#475569",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
            transition: "background-color 0.2s"
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeWidth="2"/>
            <path d="M3 3v5h5" strokeWidth="2"/>
          </svg>
          Now
        </button>
      </div>

      {/* Contenu principal */}
      <div style={{ display: "flex", flex: 1, gap: "1rem" }}>
        {/* Partie gauche - Parking */}
        <div style={{ flex: 2, marginLeft: "40px" }}>
          {renderNotification()}
          {renderConfirmationModal()}
          <div
            ref={containerRef}
            style={{
              ...styles.parkingContainer,
              width: "100%",
              height: "600px",
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {loading && (
              <div style={styles.loadingScreen}>
                <div style={styles.loadingSpinner}></div>
                <div style={{ color: "#fff", marginTop: "1rem" }}>Loading parking data...</div>
              </div>
            )}

            <div style={styles.parkingGrid} />

            <div
              style={{
                transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
                transformOrigin: "top left",
                position: "absolute",
                transition: "transform 0.1s ease-out",
              }}
            >
              {streets.map(renderStreet)}
              {parkingSpots.map(renderParkingSpot)}
            </div>

            {renderLegend()}
            {renderZoomControls()}
          </div>
        </div>

        {/* Partie droite - Détails de réservation */}
        <div
          style={{
            flex: 1,
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            height: "600px",
            overflow: "auto",
            marginRight: "40px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedReservation ? (
            <ReservationDetails reservation={selectedReservation} />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                color: "#64748b",
                textAlign: "center",
                gap: "20px",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "50%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                >
                  <path
                    d="M8 17l4 4 4-4m-4-5v9"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <h3 style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: "#334155",
                  marginBottom: "8px",
                }}>
                  No Spot Selected
                </h3>
                <p style={{ margin: 0 }}>
                  Click on a reserved spot to view<br />
                  reservation details
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  padding: "15px",
                  width: "100%",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      backgroundColor: "#e0f2fe",
                      borderRadius: "6px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0ea5e9"
                    >
                      <path
                        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <span style={{ fontWeight: "500" }}>
                    Current parking status
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span>Total spots:</span>
                  <span style={{ fontWeight: "600" }}>
                    {parkingInfo.totalSpots}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span>Available spots:</span>
                  <span style={{ fontWeight: "600", color: "#10b981" }}>
                    {parkingInfo.availableSpots}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span>Reserved spots:</span>
                  <span style={{ fontWeight: "600", color: "#f59e0b" }}>
                    {parkingSpots.filter((spot) => spot.isReserved).length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParkingLiveView;