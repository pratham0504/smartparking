/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ParkingSpot from "../ParkingSpot";
import Arrow from "./Arrow";
import Street from "./Street";
import ParkingArea from "./ParkingArea";
import axios from "axios";
import { useParams } from "react-router-dom";

const ParkingPlan = ({ parkingId: propParkingId }) => {
  const { id: urlParkingId } = useParams();
  const parkingId = propParkingId || urlParkingId;
  const gridSize = 50;
  const [arrows, setArrows] = useState([]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const parkingAreaRef = useRef(null);

  useEffect(() => {
    console.log("Offset mis à jour:", offset);
    // Vous pourriez éventuellement sauvegarder automatiquement ici après un délai
  }, [offset]);

  const zoomIn = () => {
    setScale((prevScale) => Math.min(prevScale * 1.2, 3));
  };

  const zoomOut = () => {
    setScale((prevScale) => Math.max(prevScale / 1.2, 0.3));
  };

  const handlePan = (e) => {
    if (e.buttons === 1) {
      // Left mouse button
      setOffset((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  };

  // Reset zoom and pan
  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // État pour les places de parking
  const [parkingSpots, setParkingSpots] = useState([]);

  // État pour les rues
  const [streets, setStreets] = useState([
    {
      id: "street-1",
      position: { left: gridSize * 5, top: gridSize * 5 },
      rotation: 0,
      width: 80,
      length: 300,
      hasEntrance: false,
      hasExit: false,
    },
  ]);

  // États pour la sauvegarde
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    console.log("ParkingPlan received parkingId:", parkingId);
  }, [parkingId]);

  // Chargement du parking existant si parkingId est fourni
  useEffect(() => {
    if (parkingId) {
      loadParkingData();
    }
  }, [parkingId]);

  const updateArrowPosition = (id, position) => {
    setArrows(
      arrows.map((arrow) => (arrow.id === id ? { ...arrow, position } : arrow))
    );
  };

  const updateArrowRotation = (id, rotation) => {
    setArrows(
      arrows.map((arrow) => (arrow.id === id ? { ...arrow, rotation } : arrow))
    );
  };

  const removeArrow = (id) => {
    setArrows(arrows.filter((arrow) => arrow.id !== id));
  };

  const addNewArrow = () => {
    const id = `arrow-${arrows.length + 1}`;
    const newArrow = {
      id,
      position: { left: gridSize * 3, top: gridSize * 3 },
      rotation: 0,
      size: { width: 30, length: 80 },
    };

    setArrows([...arrows, newArrow]);
  };
  // Fonction pour charger les données du parking existant
  const loadParkingData = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3001/parkings/parkings/${parkingId}`
      );
      const parkingData = response.data;
      console.log("parkiiing data ", parkingData);

      // Charger les places avec vérification de disponibilité
      const spotsWithAvailability = await Promise.all(
        parkingData.spots.map(async (spot) => {
          const availability = await checkSpotAvailability(spot);
          return {
            id: spot.id,
            position: { left: spot.x, top: spot.y },
            rotation: spot.rotation,
            size: { width: spot.width, height: spot.height },
            isOccupied: availability.isOccupied,
            status: availability.isReserved ? 'reserved' : (availability.isOccupied ? 'occupied' : 'available')
          };
        })
      );

      setParkingSpots(spotsWithAvailability);

      // Reste du code inchangé...
      if (parkingData.layout?.streets) {
        setStreets(
          parkingData.layout.streets.map((street) => ({
            id: street.id,
            position: { left: street.x, top: street.y },
            rotation: street.rotation,
            width: street.width,
            length: street.length,
            hasEntrance: street.hasEntrance,
            hasExit: street.hasExit,
          }))
        );
      }
      if (parkingData.layout?.arrows) {
        setArrows(
          parkingData.layout.arrows.map((arrow) => ({
            id: arrow.id,
            position: { left: arrow.x, top: arrow.y },
            rotation: arrow.rotation,
            size: { width: arrow.width, length: arrow.length },
          }))
        );
      }
      if (parkingData.layout?.viewSettings) {
        if (parkingData.layout.viewSettings.scale) {
          setScale(parkingData.layout.viewSettings.scale);
        }
        if (
          parkingData.layout.viewSettings.offsetX !== undefined &&
          parkingData.layout.viewSettings.offsetY !== undefined
        ) {
          setOffset({
            x: parkingData.layout.viewSettings.offsetX,
            y: parkingData.layout.viewSettings.offsetY,
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du parking:", error);
    }
  };

  // Fonction pour convertir les données de l'éditeur au format MongoDB
  const convertToMongoDBFormat = () => {
    // Conversion des places de parking
    const spots = parkingSpots.map((spot) => ({
      id: spot.id,
      x: spot.position.left,
      y: spot.position.top,
      width: spot.size.width,
      height: spot.size.height,
      rotation: spot.rotation,
      type: "standard",
      status: spot.status
    }));

    // Conversion des flèches pour le layout
    const arrowData = arrows.map((arrow) => ({
      id: arrow.id,
      x: arrow.position.left,
      y: arrow.position.top,
      width: arrow.size.width,
      length: arrow.size.length,
      rotation: arrow.rotation,
    }));

    // Conversion des rues pour le layout
    const streetData = streets.map((street) => ({
      id: street.id,
      x: street.position.left,
      y: street.position.top,
      width: street.width,
      length: street.length,
      rotation: street.rotation,
      hasEntrance: street.hasEntrance,
      hasExit: street.hasExit,
    }));

    return {
      spots,
      layout: {
        width: 1000, // Taille par défaut
        height: 800,
        backgroundColor: "#222",
        streets: streetData,
        arrows: arrowData,
        viewSettings: {
          scale: scale,
          offsetX: offset.x,
          offsetY: offset.y,
        },
      },
      totalSpots: parkingSpots.length,
      availableSpots: parkingSpots.filter((spot) => !spot.isOccupied).length,
    };
  };

  // Fonction pour sauvegarder le parking
  const saveParkingPlan = async () => {
    if (!parkingId) {
      console.error("ID du parking non fourni");
      setSaveStatus("error");
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      // Utiliser une fonction de callback pour accéder aux valeurs les plus récentes
      const parkingData = convertToMongoDBFormat();

      // S'assurer que viewSettings existe
      if (!parkingData.layout.viewSettings) {
        parkingData.layout.viewSettings = {};
      }

      // Définir explicitement les valeurs actuelles d'échelle et d'offset
      parkingData.layout.viewSettings.scale = scale;
      parkingData.layout.viewSettings.offsetX = offset.x;
      parkingData.layout.viewSettings.offsetY = offset.y;

      console.log("Sauvegarde des paramètres:", {
        scale: scale,
        offsetX: offset.x,
        offsetY: offset.y,
      });

      const response = await axios.patch(
        `http://localhost:3001/parkings/${parkingId}`,
        parkingData
      );
      console.log("Parking sauvegardé:", response.data);
      setSaveStatus("success");

      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error(
        "Erreur lors de la sauvegarde du parking:",
        error.response?.data || error.message
      );
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  // Mettez à jour la position d'une place de parking
  const updateParkingSpotPosition = (id, position) => {
    setParkingSpots(
      parkingSpots.map((spot) =>
        spot.id === id ? { ...spot, position } : spot
      )
    );
  };

  // Mettez à jour la rotation d'une place de parking
  const updateParkingSpotRotation = (id, rotation) => {
    setParkingSpots(
      parkingSpots.map((spot) =>
        spot.id === id ? { ...spot, rotation } : spot
      )
    );
  };

  // Mettez à jour l'état d'occupation
  const toggleOccupancy = (id) => {
    setParkingSpots(
      parkingSpots.map((spot) => {
        if (spot.id === id) {
          // Toggle between available and occupied but preserve reserved
          if (spot.status === 'reserved') {
            // Don't change reserved spots when clicked
            return spot;
          } else if (spot.status === 'available') {
            return { ...spot, status: 'occupied' };
          } else {
            return { ...spot, status: 'available' };
          }
        }
        return spot;
      })
    );
  };

  // Supprimez une place de parking
  const removeParkingSpot = (id) => {
    setParkingSpots(parkingSpots.filter((spot) => spot.id !== id));
  };

  // Ajoutez une nouvelle place de parking
  const addNewParkingSpot = () => {
    const newId = `parking-spot-${parkingSpots.length}`;
    const newSpot = {
      id: newId,
      position: { left: gridSize * 2, top: gridSize * 2 },
      rotation: 0,
      size: { width: 60, height: 120 },
      isOccupied: false,
    };

    setParkingSpots([...parkingSpots, newSpot]);
  };

  // Mettez à jour la position d'une rue
  const updateStreetPosition = (id, position) => {
    setStreets(
      streets.map((street) =>
        street.id === id ? { ...street, position } : street
      )
    );
  };

  // Mettez à jour la rotation d'une rue
  const updateStreetRotation = (id, rotation) => {
    setStreets(
      streets.map((street) =>
        street.id === id ? { ...street, rotation } : street
      )
    );
  };

  // Mettez à jour les dimensions d'une rue
  const updateStreetDimensions = (id, width, length) => {
    setStreets(
      streets.map((street) =>
        street.id === id ? { ...street, width, length } : street
      )
    );
  };

  // Activer/désactiver la porte d'entrée pour une rue
  const toggleEntrance = (id) => {
    setStreets(
      streets.map((street) =>
        street.id === id
          ? { ...street, hasEntrance: !street.hasEntrance }
          : street
      )
    );
  };

  // Activer/désactiver la porte de sortie pour une rue
  const toggleExit = (id) => {
    setStreets(
      streets.map((street) =>
        street.id === id ? { ...street, hasExit: !street.hasExit } : street
      )
    );
  };

  // Ajouter une nouvelle rue
  const addNewStreet = () => {
    const id = `street-${streets.length + 1}`;
    const newStreet = {
      id,
      position: { left: gridSize * 3, top: gridSize * 3 },
      rotation: 0,
      width: 80,
      length: 300,
      hasEntrance: false,
      hasExit: false,
    };

    setStreets([...streets, newStreet]);
  };

  // Supprimer une rue
  const removeStreet = (id) => {
    setStreets(streets.filter((street) => street.id !== id));
  };

  // Gestionnaires pour le drag and drop depuis la sidebar
  const handleDragStart = (e, itemType) => {
    e.dataTransfer.setData("itemType", itemType);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Gestionnaire de drop pour la zone de travail
  const handleDrop = (e) => {
    const itemType = e.dataTransfer.getData("itemType");
    const rect = e.currentTarget.getBoundingClientRect();
    const left = (e.clientX - rect.left) / scale - offset.x;
    const top = (e.clientY - rect.top) / scale - offset.y;

    // Aligner sur la grille
    const gridAlignedLeft = Math.round(left / gridSize) * gridSize;
    const gridAlignedTop = Math.round(top / gridSize) * gridSize;

    if (itemType === "street") {
      // Ajouter une nouvelle rue à la position de drop
      const id = `street-${streets.length + 1}`;
      const newStreet = {
        id,
        position: { left: gridAlignedLeft, top: gridAlignedTop },
        rotation: 0,
        width: 80,
        length: 300,
        hasEntrance: false,
        hasExit: false,
      };
      setStreets([...streets, newStreet]);
    } else if (itemType === "parkingSpot") {
      // Ajouter une nouvelle place à la position de drop
      const newId = `parking-spot-${parkingSpots.length}`;
      const newSpot = {
        id: newId,
        position: { left: gridAlignedLeft, top: gridAlignedTop },
        rotation: 0,
        size: { width: 60, height: 120 },
        isOccupied: false,
      };
      setParkingSpots([...parkingSpots, newSpot]);
    } else if (itemType === "arrow") {
      // Ajouter une nouvelle flèche à la position de drop
      const id = `arrow-${arrows.length + 1}`;
      const newArrow = {
        id,
        position: { left: gridAlignedLeft, top: gridAlignedTop },
        rotation: 0,
        size: { width: 30, length: 80 },
      };
      setArrows([...arrows, newArrow]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Nécessaire pour permettre le drop
  };

  // Composants pour la sidebar
  const streetModel = (
    <div className="bg-gray-200 h-16 rounded-md flex items-center justify-center">
      <div
        style={{
          width: "100px",
          height: "60px",
          backgroundColor: "#333",
          position: "relative",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "90%",
            height: "0px",
            borderBottom: "2px dashed #fff",
          }}
        ></div>
      </div>
    </div>
  );

  const parkingSpotModel = (
    <div className="bg-gray-100 h-16 rounded-md flex items-center justify-center border border-gray-300">
      <div
        style={{
          width: "50px",
          height: "60px",
          border: "2px dashed #fff",
          backgroundColor: "#333",
          opacity: 0.6,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#fff",
          fontWeight: "bold",
          borderRadius: "3px",
        }}
      >
        P
      </div>
    </div>
  );

  <div
    style={{
      padding: "15px",
      borderBottom: "1px solid #ddd",
      backgroundColor: "#f8f8f8",
    }}
  >
    <h2
      style={{
        fontSize: "18px",
        margin: 0,
        color: "#333",
        fontWeight: "600",
      }}
    >
      Éléments
    </h2>
  </div>;

  const updateSize = (id, newSize) => {
    setArrows((prevArrows) =>
      prevArrows.map((arrow) =>
        arrow.id === id ? { ...arrow, size: newSize } : arrow
      )
    );
  };

  const checkSpotAvailability = async (spot) => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/reservations/by-spot?parkingId=${parkingId}&spotId=${spot.id}`
      );

      const reservations = response.data;
      const currentTime = new Date().getTime();

      // Si le statut de la place est déjà "occupied" dans la base de données
      if (spot.status === 'occupied') {
        return {
          isAvailable: false,
          isOccupied: true,
          isReserved: false
        };
      }

      // Vérifier les réservations existantes
      const hasActiveReservation = reservations.some((reservation) => {
        if (reservation.status !== "accepted") return false;

        const startTime = new Date(reservation.startTime).getTime();
        const endTime = new Date(reservation.endTime).getTime();

        // Si la réservation est dépassée, on ne la compte pas
        if (endTime < currentTime) {
          return false;
        }

        // Si la réservation est en cours ou à venir
        return (currentTime >= startTime && currentTime <= endTime) || startTime > currentTime;
      });

      // Si une réservation est active pour maintenant ou future
      if (hasActiveReservation) {
        return {
          isAvailable: false,
          isOccupied: false,
          isReserved: true
        };
      }

      // Si aucune réservation active n'existe et la place n'est pas occupée
      return {
        isAvailable: true,
        isOccupied: false,
        isReserved: false
      };
    } catch (error) {
      console.error("Error checking spot availability:", error);
      return {
        isAvailable: false,
        isOccupied: false,
        isReserved: false
      };
    }
  };

  return (
    <div
      style={{
        marginTop: "-75px",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingBottom: "24px",
        marginLeft: "40px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "700",
            color: "#1a1a1a",
            margin: 0,
          }}
        >
          Interactive Parking Map
        </h1>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={zoomOut}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <span>🔍</span> Zoom Out
          </button>

          <div
            style={{
              padding: "8px 16px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              minWidth: "80px",
              textAlign: "center",
            }}
          >
            {Math.round(scale * 100)}%
          </div>

          <button
            onClick={zoomIn}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <span>🔍</span> Zoom In
          </button>

          <button
            onClick={resetView}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <span>🔄</span> Reset
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "24px",
          height: "calc(100vh - 180px)",
        }}
      >
        {/* Sidebar modernisée */}
        <div
          style={{
            width: "300px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid #f0f0f0",
              backgroundColor: "#f9fafb",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "600",
                margin: 0,
                color: "#111827",
              }}
            >
              Parking Elements
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              Drag and drop elements to create your map
            </p>
          </div>

          {/* Sidebar content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
            }}
          >
            {/* Streets section */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "4px",
                    height: "16px",
                    backgroundColor: "#3b82f6",
                    borderRadius: "2px",
                    marginRight: "8px",
                  }}
                ></div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Streets
                </h3>
              </div>

              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "16px",
                  cursor: "grab",
                  transition: "all 0.2s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, "street")}
                onDragEnd={handleDragEnd}
                onClick={addNewStreet}
              >
                {streetModel}
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    textAlign: "center",
                    marginTop: "8px",
                    fontWeight: "500",
                  }}
                >
                  Drag to add street
                </p>
              </div>
            </div>

            {/* Parking spots section */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "4px",
                    height: "16px",
                    backgroundColor: "#3b82f6",
                    borderRadius: "2px",
                    marginRight: "8px",
                  }}
                ></div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Parking Spots
                </h3>
              </div>

              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "16px",
                  cursor: "grab",
                  transition: "all 0.2s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, "parkingSpot")}
                onDragEnd={handleDragEnd}
                onClick={addNewParkingSpot}
              >
                {parkingSpotModel}
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    textAlign: "center",
                    marginTop: "8px",
                    fontWeight: "500",
                  }}
                >
                  Drag to add parking spot
                </p>
              </div>
            </div>

            {/* Arrows section */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "4px",
                    height: "16px",
                    backgroundColor: "#3b82f6",
                    borderRadius: "2px",
                    marginRight: "8px",
                  }}
                ></div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Directional Arrows
                </h3>
              </div>

              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "16px",
                  cursor: "grab",
                  transition: "all 0.2s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, "arrow")}
                onDragEnd={handleDragEnd}
                onClick={addNewArrow}
              >
                <div
                  style={{
                    position: "relative",
                    width: "80px",
                    height: "20px",
                    margin: "0 auto",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "0",
                      top: "5px",
                      width: "60px",
                      height: "10px",
                      backgroundColor: "#3b82f6",
                      borderRadius: "2px",
                    }}
                  ></div>
                  <div
                    style={{
                      position: "absolute",
                      right: "0",
                      width: "0",
                      height: "0",
                      borderTop: "10px solid transparent",
                      borderBottom: "10px solid transparent",
                      borderLeft: "20px solid #3b82f6",
                    }}
                  ></div>
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    textAlign: "center",
                    marginTop: "8px",
                    fontWeight: "500",
                  }}
                >
                  Drag to add arrow
                </p>
              </div>
            </div>

            {/* Statistics card */}
            <div
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                padding: "16px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "4px",
                    height: "16px",
                    backgroundColor: "#3b82f6",
                    borderRadius: "2px",
                    marginRight: "8px",
                  }}
                ></div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Statistics
                </h3>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <p style={{ margin: "8px 0", color: "#6b7280" }}>Spots:</p>
                  <p style={{ margin: "8px 0", color: "#6b7280" }}>Streets:</p>
                  <p style={{ margin: "8px 0", color: "#6b7280" }}>Arrows:</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{
                      margin: "8px 0",
                      color: "#111827",
                      fontWeight: "500",
                    }}
                  >
                    {parkingSpots.length}
                  </p>
                  <p
                    style={{
                      margin: "8px 0",
                      color: "#111827",
                      fontWeight: "500",
                    }}
                  >
                    {streets.length}
                  </p>
                  <p
                    style={{
                      margin: "8px 0",
                      color: "#111827",
                      fontWeight: "500",
                    }}
                  >
                    {arrows.length}
                  </p>
                </div>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px dashed #e5e7eb",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                <div>
                  <p style={{ margin: "8px 0", color: "#6b7280" }}>
                    Entrances:
                  </p>
                  <p style={{ margin: "8px 0", color: "#6b7280" }}>Exits:</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{
                      margin: "8px 0",
                      color: "#111827",
                      fontWeight: "500",
                    }}
                  >
                    {streets.filter((s) => s.hasEntrance).length}
                  </p>
                  <p
                    style={{
                      margin: "8px 0",
                      color: "#111827",
                      fontWeight: "500",
                    }}
                  >
                    {streets.filter((s) => s.hasExit).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div
            style={{
              padding: "16px",
              borderTop: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
            }}
          >
            <button
              onClick={saveParkingPlan}
              disabled={isSaving}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: isSaving ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isSaving ? (
                <>
                  <span>⏳</span> Saving...
                </>
              ) : (
                <>
                  <span>💾</span> Save Parking Plan
                </>
              )}
            </button>

            {saveStatus === "success" && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  backgroundColor: "#10b981",
                  color: "white",
                  borderRadius: "6px",
                  fontSize: "13px",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span>✓</span> Plan saved successfully!
              </div>
            )}

            {saveStatus === "error" && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  borderRadius: "6px",
                  fontSize: "13px",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span>✕</span> Error saving plan
              </div>
            )}
          </div>
        </div>

        {/* Main canvas area */}
        <div
          style={{
            flex: 1,
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <DndProvider backend={HTML5Backend}>
            <ParkingArea
              ref={parkingAreaRef}
              offset={offset}
              setOffset={setOffset}
              onDropParkingSpot={updateParkingSpotPosition}
              onDropStreet={updateStreetPosition}
              onDropArrow={updateArrowPosition}
              style={{
                width: "100%",
                height: "800px",
                backgroundColor: "#222",
                border: "2px solid #444",
                overflow: "hidden",
                position: "relative",
                cursor: "grab",
              }}
              onMouseMove={handlePan}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div
                style={{
                  transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
                  transformOrigin: "top left",
                  transition: "transform 0.1s ease",
                }}
              >
                {/* Rendu des rues */}
                {streets.map((street) => (
                  <Street
                    key={street.id}
                    id={street.id}
                    position={street.position}
                    rotation={street.rotation}
                    width={street.width}
                    length={street.length}
                    hasEntrance={street.hasEntrance}
                    hasExit={street.hasExit}
                    updatePosition={updateStreetPosition}
                    updateRotation={updateStreetRotation}
                    updateDimensions={updateStreetDimensions}
                    toggleEntrance={toggleEntrance}
                    toggleExit={toggleExit}
                    onRemove={removeStreet}
                  />
                ))}

                {/* Rendu des places de parking */}
                {parkingSpots.map((spot) => (
                  <ParkingSpot
                    key={spot.id}
                    id={spot.id}
                    position={spot.position}
                    rotation={spot.rotation}
                    size={spot.size}
                    status={spot.status}
                    updatePosition={updateParkingSpotPosition}
                    updateRotation={updateParkingSpotRotation}
                    toggleOccupancy={toggleOccupancy}
                    onRemove={removeParkingSpot}
                    parkingId={parkingId}
                  />
                ))}
                {arrows.map((arrow) => (
                  <Arrow
                    key={arrow.id}
                    id={arrow.id}
                    position={arrow.position}
                    rotation={arrow.rotation}
                    size={arrow.size}
                    updatePosition={updateArrowPosition}
                    updateRotation={updateArrowRotation}
                    updateSize={updateSize}
                    onRemove={removeArrow}
                  />
                ))}
              </div>
            </ParkingArea>
          </DndProvider>
        </div>
      </div>
    </div>
  );
};

export default ParkingPlan;
