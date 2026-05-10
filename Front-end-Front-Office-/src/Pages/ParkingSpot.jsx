import React, { useState, useEffect, useRef } from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./Editeur/ItemType";
import axios from "axios"; // Assurez-vous d'importer axios

const ReservationPopup = ({ reservation, onClose, position }) => {
  // Format dates (use Indian English locale)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Status configuration
  const statusConfig = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
    accepted: { label: "Confirmed", color: "bg-emerald-100 text-emerald-800" },
    rejected: { label: "Rejected", color: "bg-rose-100 text-rose-800" },
    completed: { label: "Completed", color: "bg-blue-100 text-blue-800" },
    canceled: { label: "Cancelled", color: "bg-gray-100 text-gray-800" }
  };

  // Payment configuration
  const paymentConfig = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
    completed: { label: "Paid", color: "bg-emerald-100 text-emerald-800" },
    failed: { label: "Failed", color: "bg-rose-100 text-rose-800" }
  };

  return (
    <div
      className="absolute z-50 bg-white rounded-lg shadow-xl p-5 w-[320px] border border-gray-200"
      style={{ left: position.left, top: position.top }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Reservation #{reservation.id.slice(0, 6)}</h3>
          <p className="text-sm text-gray-500">Vehicle Type: {reservation.vehicleType}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mt-1 -mr-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Timeline */}
      <div className="flex items-center mb-4">
        <div className="flex-1">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium">From: {formatDate(reservation.startTime)}</span>
          </div>
          <div className="h-4 border-l border-gray-300 ml-1 my-1"></div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium">To: {formatDate(reservation.endTime)}</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Statut:</span>
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${statusConfig[reservation.status]?.color}`}>
            {statusConfig[reservation.status]?.label}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Paiement:</span>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${paymentConfig[reservation.paymentStatus]?.color}`}>
              {paymentConfig[reservation.paymentStatus]?.label}
            </span>
            <span className="text-xs text-gray-500">({reservation.paymentMethod === 'online' ? 'En ligne' : 'Espèces'})</span>
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total Price:</span>
          <span className="text-sm font-medium">INR ₹{reservation.totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Client info if available */}
      {reservation.client && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Client</h4>
          <p className="text-sm">{reservation.client.name}</p>
          <p className="text-sm text-gray-500">{reservation.client.phone}</p>
        </div>
      )}
    </div>
  );
};

const ParkingSpot = ({
  id,
  position,
  rotation,
  size,
  status,
  updatePosition,
  updateRotation,
  toggleOccupancy,
  onRemove,
  parkingId, // Ajout du parkingId pour l'API
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [reservationData, setReservationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PARKING_SPOT,
    item: {
      id,
      type: ItemTypes.PARKING_SPOT,
      left: position.left,
      top: position.top,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const rotate = (clockwise) => {
    const degreeStep = 10;
    const newRotation =
      rotation + (clockwise ? degreeStep : -degreeStep) * (Math.PI / 180);
    updateRotation(id, newRotation);
  };

  const spotWidth = size?.width || 60;
  const spotHeight = size?.height || 30;


  const fetchReservationDetails = async () => {
    if (status !== "reserved") return;

    setIsLoading(true);
    setError(null);

    try {
      // Récupérer le token depuis le localStorage
      const token = localStorage.getItem("token");

      // Si pas de token, afficher un message d'erreur approprié
      if (!token) {
        setError(
          "Vous devez être connecté pour voir les détails de réservation"
        );
        setIsLoading(false);
        return;
      }

      // Requête avec le token dans les headers et URL corrigée
      const response = await axios.get(
        `http://localhost:3001/api/reservations/by-spot?parkingId=${parkingId}&spotId=${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data && response.data.length > 0) {
        // Prendre la réservation active (ou la plus récente si plusieurs)
        const activeReservation =
          response.data.find(
            (res) => res.status === "accepted" || res.status === "pending"
          ) || response.data[0];

        setReservationData(activeReservation);
        setShowPopup(true);
      } else {
        setError("Aucune réservation trouvée pour cette place");
      }
    } catch (err) {
      console.error(
        "Erreur lors de la récupération des détails de réservation:",
        err
      );

      // Message d'erreur plus précis selon le code HTTP
      if (err.response) {
        if (err.response.status === 401) {
          setError("Authentification requise. Veuillez vous reconnecter.");
        } else if (err.response.status === 403) {
          setError(
            "Vous n'avez pas les droits pour accéder à ces informations."
          );
        } else {
          setError(
            `Erreur (${err.response.status}): ${
              err.response.data.message || "Erreur inconnue"
            }`
          );
        }
      } else {
        setError("Erreur de connexion au serveur");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer le clic sur le parking spot
  const handleSpotClick = () => {
    if (status === "reserved") {
      fetchReservationDetails();
    } else {
      // Pour les autres statuts, utiliser le comportement de toggle normal
      if (typeof toggleOccupancy === "function") {
        toggleOccupancy(id);
      } else {
        console.error("toggleOccupancy n'est pas une fonction");
      }
    }
  };

  // Get the fill color based on status
  const getSpotColor = () => {
    switch (status) {
      case "occupied":
        return "#e74c3c"; // Rouge pour occupé
      case "reserved":
        return "#f39c12"; // Orange/Jaune pour réservé
      default:
        return "#444"; // Couleur par défaut pour disponible
    }
  };

  // Get the opacity based on status
  const getSpotOpacity = () => {
    switch (status) {
      case "occupied":
      case "reserved":
        return "0.7";
      default:
        return "0.3";
    }
  };

  // Get the text to display in the spot
  const getSpotText = () => {
    switch (status) {
      case "occupied":
        return "X";
      case "reserved":
        return "R";
      default:
        return "P";
    }
  };

  // Handle keyboard navigation if spot is selected
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isSelected) return;

      const step = 5;
      let newLeft = position.left;
      let newTop = position.top;

      switch (e.key) {
        case "ArrowUp":
          newTop -= step;
          break;
        case "ArrowDown":
          newTop += step;
          break;
        case "ArrowLeft":
          newLeft -= step;
          break;
        case "ArrowRight":
          newLeft += step;
          break;
        default:
          return;
      }

      updatePosition(id, { left: newLeft, top: newTop });
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, position, id, updatePosition]);

  // Handle automatic deselection when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsSelected(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div
        ref={(node) => {
          drag(node);
          ref.current = node;
        }}
        tabIndex={0}
        style={{
          position: "absolute",
          left: position.left,
          top: position.top,
          display: "flex",
          alignItems: "center",
          gap: "5px",
          zIndex: isDragging ? 1000 : 1,
          cursor: "move",
          outline: isSelected ? "2px solid" : "none",
        }}
        data-handler="true"
        onMouseEnter={() => {
          setShowControls(true);
          setShowMessage(true);
        }}
        onMouseLeave={() => {
          setShowControls(false);
          setShowMessage(false);
        }}
        onDoubleClick={() => {
          ref.current?.focus();
          setIsSelected(true);
        }}
      >
        {/* Message for user guidance */}
        {showMessage && (
          <div
            style={{
              position: "absolute",
              top: `${spotHeight + 10}px`,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#333",
              color: "#fff",
              padding: "5px 10px",
              borderRadius: "5px",
              fontSize: "12px",
              whiteSpace: "nowrap",
              opacity: showMessage ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          >
            Double click to select
          </div>
        )}

        {showControls && (
          <button
            style={buttonStyle}
            onClick={(e) => {
              e.stopPropagation();
              rotate(false);
            }}
          >
            ↺
          </button>
        )}

        <div
          style={{
            width: `${spotWidth}px`,
            height: `${spotHeight}px`,
            userSelect: "none",
            opacity: isDragging ? 0.5 : 1,
            transform: `rotate(${rotation}rad)`,
            transformOrigin: "center center",
          }}
          onClick={handleSpotClick}
        >
          <svg
            width={spotWidth}
            height={spotHeight}
            viewBox={`0 0 ${spotWidth} ${spotHeight}`}
            style={{ pointerEvents: "none" }}
          >
            <rect
              x="2"
              y="2"
              width={spotWidth - 4}
              height={spotHeight - 4}
              rx="2"
              stroke="#fff"
              strokeWidth="2"
              strokeDasharray="5,3"
              fill={getSpotColor()}
              fillOpacity={getSpotOpacity()}
            />
            <text
              x={spotWidth / 2}
              y={spotHeight / 2}
              fontSize="14"
              fontWeight="bold"
              fill="#fff"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {getSpotText()}
            </text>
          </svg>
        </div>

        {showControls && (
          <>
            <button
              style={buttonStyle}
              onClick={(e) => {
                e.stopPropagation();
                rotate(true);
              }}
            >
              ↻
            </button>

            <button
              style={{
                ...buttonStyle,
                backgroundColor: "#ff6b6b",
                color: "white",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
            >
              ✕
            </button>
          </>
        )}
      </div>

      {/* Popup pour afficher les détails de réservation */}
      {showPopup && reservationData && (
        <ReservationPopup
          reservation={reservationData}
          onClose={() => setShowPopup(false)}
          position={{
            left: position.left + spotWidth + 20,
            top: position.top,
          }}
        />
      )}

      {/* Indicateur de chargement */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            left: position.left + spotWidth + 10,
            top: position.top,
            backgroundColor: "#333",
            color: "#fff",
            padding: "5px 10px",
            borderRadius: "5px",
            fontSize: "12px",
          }}
        >
          Chargement...
        </div>
      )}

      {/* Message d'erreur */}
      {error && !isLoading && (
        <div
          style={{
            position: "absolute",
            left: position.left + spotWidth + 10,
            top: position.top,
            backgroundColor: "#e74c3c",
            color: "#fff",
            padding: "5px 10px",
            borderRadius: "5px",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}
    </>
  );
};

const buttonStyle = {
  cursor: "pointer",
  width: "18px",
  height: "18px",
  borderRadius: "50%",
  border: "1px solid #ccc",
  backgroundColor: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "auto",
  fontSize: "12px",
  zIndex: 10,
};

export default ParkingSpot;
