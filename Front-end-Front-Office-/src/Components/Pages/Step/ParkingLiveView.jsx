/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";

// Animations
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Styled Components
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  font-size: 18px;
  color: #2c3e50;
`;

const Spinner = styled.div`
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
`;

const ErrorContainer = styled.div`
  padding: 20px;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  font-size: 18px;
  color: #e74c3c;
`;

const ErrorIcon = styled.div`
  font-size: 40px;
  margin-bottom: 20px;
`;

const RetryButton = styled.button`
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2980b9;
  }
`;

const ParkingContainer = styled.div`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
`;

const ParkingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  width: 100%;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const ParkingTitle = styled.h1`
  margin: 0;
  color: #2c3e50;
  font-size: 24px;
`;

const ParkingStats = styled.div`
  margin-top: 8px;
  color: #7f8c8d;
  display: flex;
  gap: 15px;
`;

const ParkingControls = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const ControlButton = styled.button`
  padding: 8px 12px;
  background-color: #34495e;
  color: white;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2c3e50;
  }
`;

const ZoomLevel = styled.div`
  padding: 8px 12px;
  background-color: #ecf0f1;
  color: #2c3e50;
  border-radius: 4px;
  font-weight: bold;
  min-width: 60px;
  text-align: center;
`;

const SpotFinder = styled.div`
  width: 100%;
  margin-bottom: 20px;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const SpotFinderInput = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const SpotLabel = styled.label`
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
`;

const SpotInput = styled.input`
  padding: 10px 15px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 16px;
  flex-grow: 1;
  max-width: 200px;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const LocateButton = styled.button`
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2980b9;
  }
`;

const SearchMessage = styled.div`
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  font-weight: 500;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ErrorMessage = styled(SearchMessage)`
  background-color: #ffebee;
  color: #c62828;
`;

const SuccessMessage = styled(SearchMessage)`
  background-color: #e8f5e9;
  color: #2e7d32;
`;

const ReserveButton = styled.button`
  padding: 12px 20px;
  width: 100%;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

  &.active {
    background-color: #2ecc71;
    color: white;

    &:hover {
      background-color: #27ae60;
    }
  }

  &.disabled {
    background-color: #95a5a6;
    color: white;
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const ParkingArea = styled.div`
  width: 95%;
  height: 500px;
  background-color: #1c1c24;
  border: 1px solid #16213e;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  cursor: ${(props) => (props.isDragging ? "grabbing" : "grab")};
`;

const ParkingContent = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  transform-origin: top left;
  transform: ${(props) =>
    `scale(${props.scale}) translate(${props.offsetX}px, ${props.offsetY}px)`};
  transition: ${(props) => (props.isDragging ? "none" : "transform 0.1s ease")};
`;

const CoordinatesIndicator = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
`;

const NavigationPathSvg = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
`;

const Legend = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap;
  width: 100%;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const LegendIcon = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 2px;

  &.available {
    border: 2px dashed rgba(100, 100, 100, 1);
  }

  &.occupied {
    background-color: #e74c3c;
  }

  &.reserved {
    background-color: #f39c12;
  }

  &.street {
    background-color: #3a3a3a;
  }

  &.entrance {
    background-color: #3498db;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 10px;
    color: white;
  }

  &.exit {
    background-color: #e74c3c;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 10px;
    color: white;
  }
`;

const Instructions = styled.div`
  margin-top: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  width: 100%;
`;

const Tip = styled.p`
  margin-top: 15px;
  padding: 10px;
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
  color: #0d47a1;
  font-style: italic;
`;

const ParkingPlan2D = ({
  parkingId: propParkingId,
  onSpotSelected,
  selectedDates,
}) => {
  const { id: urlParkingId } = useParams();
  const parkingId = propParkingId || urlParkingId;
  const navigate = useNavigate();
  const gridSize = 50;
  const [arrows, setArrows] = useState([]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const parkingAreaRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parkingInfo, setParkingInfo] = useState({
    name: "Parking",
    totalSpots: 0,
    availableSpots: 0,
  });

  const [parkingSpots, setParkingSpots] = useState([]);
  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [highlightedSpot, setHighlightedSpot] = useState(null);
  const [streets, setStreets] = useState([]);
  const [showLogo, setShowLogo] = useState(true);
  const [searchError, setSearchError] = useState(null);
  const [searchSuccess, setSearchSuccess] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [navigationPath, setNavigationPath] = useState([]);

  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!parkingId) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (parkingId) {
      loadParkingData();
    }
  }, [parkingId]);

  const checkSpotAvailability = async (spot, startDate, endDate) => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/reservations/by-spot?parkingId=${parkingId}&spotId=${spot.id}`
      );

      const reservations = response.data;
      const requestedStartTime = new Date(startDate).getTime();
      const requestedEndTime = new Date(endDate).getTime();
      const currentTime = new Date().getTime();

      // Si le statut de la place est déjà "occupied" dans la base de données
      if (spot.status === "occupied") {
        return {
          isAvailable: false,
          isOccupied: true,
          isReserved: false,
        };
      }

      // Vérifier les réservations existantes
      const hasReservation = reservations.some((reservation) => {
        if (reservation.status !== "accepted") return false;

        const existingStartTime = new Date(reservation.startTime).getTime();
        const existingEndTime = new Date(reservation.endTime).getTime();

        // Vérifier si la période demandée chevauche une réservation future
        return (
          (requestedStartTime >= existingStartTime &&
            requestedStartTime < existingEndTime) ||
          (requestedEndTime > existingStartTime &&
            requestedEndTime <= existingEndTime) ||
          (requestedStartTime <= existingStartTime &&
            requestedEndTime >= existingEndTime)
        );
      });

      // Si une réservation existe pour cette période
      if (hasReservation) {
        return {
          isAvailable: false,
          isOccupied: false,
          isReserved: true,
        };
      }

      // Si aucune réservation n'existe et la place n'est pas occupée
      return {
        isAvailable: true,
        isOccupied: false,
        isReserved: false,
      };
    } catch (error) {
      console.error("Error checking spot availability:", error);
      return {
        isAvailable: false,
        isOccupied: false,
        isReserved: false,
      };
    }
  };

  const loadParkingData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3001/parkings/parkings/${parkingId}`
      );
      const parkingData = response.data;

      const formattedSpots = await Promise.all(
        parkingData.spots.map(async (spot) => {
          const availability =
            selectedDates?.startDate && selectedDates?.endDate
              ? await checkSpotAvailability(
                  spot,
                  selectedDates.startDate,
                  selectedDates.endDate
                )
              : { isAvailable: true, isOccupied: false, isReserved: false };

          return {
            id: spot.id,
            position: { left: spot.x, top: spot.y },
            rotation: spot.rotation || 0,
            size: { width: spot.width || 60, height: spot.height || 120 },
            isOccupied: availability.isOccupied,
            isReserved: availability.isReserved,
          };
        })
      );

      if (parkingData.layout?.viewSettings) {
        const {
          scale: dbScale,
          offsetX,
          offsetY,
        } = parkingData.layout.viewSettings;
        if (dbScale) setScale(dbScale - 0.15);
        if (offsetX !== undefined && offsetY !== undefined) {
          setOffset({ x: offsetX, y: offsetY });
        }
      }

      if (
        parkingData.layout?.streets &&
        parkingData.layout.streets.length > 0
      ) {
        const formattedStreets = parkingData.layout.streets.map((street) => ({
          id: street.id,
          position: { left: street.x, top: street.y },
          rotation: street.rotation || 0,
          width: street.width || 80,
          length: street.length || 300,
          hasEntrance: street.hasEntrance || false,
          hasExit: street.hasExit || false,
          isDashed: true,
        }));
        setStreets(formattedStreets);
      } else {
        setStreets([]);
      }

      if (parkingData.layout?.arrows && parkingData.layout.arrows.length > 0) {
        const formattedArrows = parkingData.layout.arrows.map((arrow) => ({
          id: arrow.id,
          position: { left: arrow.x, top: arrow.y },
          rotation: arrow.rotation || 0,
          size: { width: arrow.width || 20, height: arrow.length || 60 },
          color: arrow.color || "#FFFFFF",
        }));
        setArrows(formattedArrows);
      } else {
        setArrows([]);
      }

      setParkingInfo({
        name: parkingData.name || "Parking",
        totalSpots: parkingData.totalSpots || parkingData.spots.length,
        availableSpots:
          parkingData.availableSpots ||
          formattedSpots.filter((spot) => !spot.isOccupied && !spot.isReserved)
            .length,
      });

      setParkingSpots(formattedSpots);
      setLoading(false);
    } catch (error) {
      console.error("Error loading parking data:", error);
      setError("Failed to load parking data. Please try again later.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDates?.startDate && selectedDates?.endDate) {
      setIsRefreshing(true);
      loadParkingData().then(() => {
        setRefreshKey((prev) => prev + 1);
        setTimeout(() => {
          setIsRefreshing(false);
        }, 500);
      });
    }
  }, [selectedDates?.startDate, selectedDates?.endDate]);

  const zoomIn = () => {
    setScale((prevScale) => Math.min(prevScale * 1.2, 3));
  };

  const zoomOut = () => {
    setScale((prevScale) => Math.max(prevScale / 1.2, 0.3));
  };

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleDrop = (e) => {
    const itemType = e.dataTransfer.getData("itemType");
    const rect = e.currentTarget.getBoundingClientRect();
    const left = (e.clientX - rect.left) / scale - offset.x;
    const top = (e.clientY - rect.top) / scale - offset.y;
    const gridAlignedLeft = Math.round(left / gridSize) * gridSize;
    const gridAlignedTop = Math.round(top / gridSize) * gridSize;

    if (itemType === "street") {
      const id = `street-${streets.length + 1}`;
      setStreets([
        ...streets,
        {
          id,
          position: { left: gridAlignedLeft, top: gridAlignedTop },
          rotation: 0,
          width: 80,
          length: 300,
          hasEntrance: false,
          hasExit: false,
          isDashed: true,
        },
      ]);
    } else if (itemType === "parkingSpot") {
      const newId = `parking-spot-${parkingSpots.length}`;
      setParkingSpots([
        ...parkingSpots,
        {
          id: newId,
          position: { left: gridAlignedLeft, top: gridAlignedTop },
          rotation: 0,
          size: { width: 60, height: 120 },
          isOccupied: false,
          isReserved: false,
        },
      ]);
    } else if (itemType === "arrow") {
      const id = `arrow-${arrows.length + 1}`;
      setArrows([
        ...arrows,
        {
          id,
          position: { left: gridAlignedLeft, top: gridAlignedTop },
          rotation: 0,
          size: { width: 20, height: 60 },
          color: "#FFFFFF",
        },
      ]);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setStartPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - startPosition.x;
      const dy = e.clientY - startPosition.y;
      setOffset((prev) => ({
        x: prev.x + dx / scale,
        y: prev.y + dy / scale,
      }));
      setStartPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const renderGrid = () => {
    const gridLines = [];
    const gridCount = 30;

    for (let i = 0; i <= gridCount; i++) {
      gridLines.push(
        <line
          key={`h-${i}`}
          x1={0}
          y1={i * gridSize}
          x2={gridCount * gridSize}
          y2={i * gridSize}
          stroke="#333"
          strokeWidth={0.5}
        />
      );
      gridLines.push(
        <line
          key={`v-${i}`}
          x1={i * gridSize}
          y1={0}
          x2={i * gridSize}
          y2={gridCount * gridSize}
          stroke="#333"
          strokeWidth={0.5}
        />
      );
    }

    return (
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        {gridLines}
      </svg>
    );
  };

  const locateParkingSpot = async () => {
    setSearchError(null);
    setSearchSuccess(null);

    if (!selectedSpotId.trim()) {
      setHighlightedSpot(null);
      setSearchError("Please enter a parking spot number");
      return;
    }

    const fullId = selectedSpotId.startsWith("parking-spot-")
      ? selectedSpotId
      : `parking-spot-${selectedSpotId}`;

    const spot = parkingSpots.find((spot) => spot.id === fullId);

    if (spot) {
      if (spot.isReserved || spot.isOccupied) {
        setSearchError(
          `Spot ${selectedSpotId} is currently ${
            spot.isReserved ? "reserved" : "occupied"
          }`
        );
        setHighlightedSpot(null);
        setNavigationPath([]);
        return;
      }

      setHighlightedSpot(fullId);
      setSearchSuccess(`Spot ${selectedSpotId} is available!`);

      setOffset({
        x: -spot.position.left + 400 / scale - 30,
        y: -spot.position.top + 200 / scale - 60,
      });

      const route = calculateNavigationPath(spot);
      setNavigationPath(route);
      onSpotSelected(fullId);
    } else {
      setSearchError(`Parking spot ${selectedSpotId} not found`);
      setHighlightedSpot(null);
      setNavigationPath([]);
    }
  };

  const getSpotCenter = (spot) => ({
    x: spot.position.left + (spot.size?.width || 60) / 2,
    y: spot.position.top + (spot.size?.height || 120) / 2,
  });

  const worldToStreetLocal = (point, street) => {
    const width = street.width || 80;
    const length = street.length || 300;
    const rotation = street.rotation || 0;
    const centerX = street.position.left + width / 2;
    const centerY = street.position.top + length / 2;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    };
  };

  const streetLocalToWorld = (local, street) => {
    const width = street.width || 80;
    const length = street.length || 300;
    const rotation = street.rotation || 0;
    const centerX = street.position.left + width / 2;
    const centerY = street.position.top + length / 2;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    return {
      x: centerX + local.x * cos - local.y * sin,
      y: centerY + local.x * sin + local.y * cos,
    };
  };

  const isPointOnStreet = (point, street, margin = 3) => {
    const width = street.width || 80;
    const length = street.length || 300;
    const local = worldToStreetLocal(point, street);

    return (
      Math.abs(local.x) <= width / 2 + margin &&
      Math.abs(local.y) <= length / 2 + margin
    );
  };

  const getEntryPoint = () => {
    if (!streets.length) return null;

    const entranceStreet = streets.find((street) => street.hasEntrance) || streets[0];
    const length = entranceStreet.length || 300;

    return streetLocalToWorld({ x: 0, y: -length / 2 + 12 }, entranceStreet);
  };

  const buildWalkableGrid = (targetSpot, cellSize = 20) => {
    if (!streets.length) return null;

    const minX = Math.min(...streets.map((street) => street.position.left)) - 80;
    const minY = Math.min(...streets.map((street) => street.position.top)) - 80;
    const maxX = Math.max(
      ...streets.map((street) => street.position.left + (street.width || 80))
    ) + 80;
    const maxY = Math.max(
      ...streets.map((street) => street.position.top + (street.length || 300))
    ) + 80;

    const cols = Math.max(10, Math.ceil((maxX - minX) / cellSize));
    const rows = Math.max(10, Math.ceil((maxY - minY) / cellSize));
    const walkable = Array.from({ length: rows }, () => Array(cols).fill(false));

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const point = {
          x: minX + col * cellSize + cellSize / 2,
          y: minY + row * cellSize + cellSize / 2,
        };

        walkable[row][col] = streets.some((street) => isPointOnStreet(point, street, 8));
      }
    }

    const toCell = (point) => ({
      col: Math.max(0, Math.min(cols - 1, Math.floor((point.x - minX) / cellSize))),
      row: Math.max(0, Math.min(rows - 1, Math.floor((point.y - minY) / cellSize))),
    });

    const toWorld = ({ row, col }) => ({
      x: minX + col * cellSize + cellSize / 2,
      y: minY + row * cellSize + cellSize / 2,
    });

    const findNearestWalkable = (point, maxRadius = 14) => {
      const base = toCell(point);
      if (walkable[base.row][base.col]) return base;

      for (let radius = 1; radius <= maxRadius; radius++) {
        for (let dRow = -radius; dRow <= radius; dRow++) {
          for (let dCol = -radius; dCol <= radius; dCol++) {
            if (Math.abs(dRow) !== radius && Math.abs(dCol) !== radius) continue;

            const row = base.row + dRow;
            const col = base.col + dCol;
            if (row < 0 || row >= rows || col < 0 || col >= cols) continue;
            if (walkable[row][col]) return { row, col };
          }
        }
      }

      return null;
    };

    const entryPoint = getEntryPoint();
    const targetPoint = getSpotCenter(targetSpot);
    const startCell = entryPoint ? findNearestWalkable(entryPoint) : null;
    const endCell = findNearestWalkable(targetPoint);

    if (!startCell || !endCell) return null;

    return {
      walkable,
      rows,
      cols,
      toWorld,
      startCell,
      endCell,
      targetPoint,
    };
  };

  const findPathAStar = (grid) => {
    const { walkable, rows, cols, startCell, endCell } = grid;
    const key = (node) => `${node.row},${node.col}`;
    const heuristic = (a, b) => Math.hypot(a.row - b.row, a.col - b.col);

    const open = [startCell];
    const cameFrom = new Map();
    const gScore = new Map([[key(startCell), 0]]);
    const fScore = new Map([[key(startCell), heuristic(startCell, endCell)]]);

    const neighbors = [
      { row: -1, col: 0, cost: 1 },
      { row: 1, col: 0, cost: 1 },
      { row: 0, col: -1, cost: 1 },
      { row: 0, col: 1, cost: 1 },
      { row: -1, col: -1, cost: Math.SQRT2 },
      { row: -1, col: 1, cost: Math.SQRT2 },
      { row: 1, col: -1, cost: Math.SQRT2 },
      { row: 1, col: 1, cost: Math.SQRT2 },
    ];

    while (open.length > 0) {
      open.sort((a, b) => (fScore.get(key(a)) || Infinity) - (fScore.get(key(b)) || Infinity));
      const current = open.shift();
      if (!current) break;

      if (current.row === endCell.row && current.col === endCell.col) {
        const path = [current];
        let currentKey = key(current);

        while (cameFrom.has(currentKey)) {
          const prev = cameFrom.get(currentKey);
          path.push(prev);
          currentKey = key(prev);
        }

        return path.reverse();
      }

      for (const neighbor of neighbors) {
        const row = current.row + neighbor.row;
        const col = current.col + neighbor.col;
        if (row < 0 || row >= rows || col < 0 || col >= cols) continue;
        if (!walkable[row][col]) continue;

        const next = { row, col };
        const nextKey = key(next);
        const tentativeG = (gScore.get(key(current)) || Infinity) + neighbor.cost;

        if (tentativeG < (gScore.get(nextKey) || Infinity)) {
          cameFrom.set(nextKey, current);
          gScore.set(nextKey, tentativeG);
          fScore.set(nextKey, tentativeG + heuristic(next, endCell));

          if (!open.some((node) => node.row === next.row && node.col === next.col)) {
            open.push(next);
          }
        }
      }
    }

    return [];
  };

  const simplifyPath = (points) => {
    if (points.length <= 2) return points;

    const simplified = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const curr = points[i];
      const next = points[i + 1];

      const d1x = curr.x - prev.x;
      const d1y = curr.y - prev.y;
      const d2x = next.x - curr.x;
      const d2y = next.y - curr.y;
      const collinear = Math.abs(d1x * d2y - d1y * d2x) < 1e-6;

      if (!collinear) simplified.push(curr);
    }

    simplified.push(points[points.length - 1]);
    return simplified;
  };

  const calculateNavigationPath = (spot) => {
    const grid = buildWalkableGrid(spot, 20);
    if (!grid) return [];

    const cellPath = findPathAStar(grid);
    if (!cellPath.length) return [];

    const worldPath = cellPath.map(grid.toWorld);
    worldPath.push(getSpotCenter(spot));

    return simplifyPath(worldPath);
  };

  const ParkingSpotRender = ({
    id,
    position,
    rotation,
    size,
    isOccupied,
    isReserved,
  }) => {
    // Add null check and provide default value if id is undefined
    const spotNumber = id ? id.replace("parking-spot-", "") || id : "";
    const isHighlighted = highlightedSpot === id;

    const handleSpotClick = () => {
      if (!isOccupied && !isReserved) {
        setSelectedSpotId(spotNumber);
        setHighlightedSpot(id);
        const matchedSpot = parkingSpots.find((parkingSpot) => parkingSpot.id === id);
        if (matchedSpot) {
          setNavigationPath(calculateNavigationPath(matchedSpot));
        }
        onSpotSelected(id);
      }
    };

    let bgColor, borderStyle, statusText, statusEmoji;

    if (isHighlighted) {
      bgColor = "#3498db";
      borderStyle = "3px solid #2980b9";
      statusText = "Selected";
      statusEmoji = "🔍";
    } else if (isOccupied) {
      bgColor = "#e74c3c";
      borderStyle = "2px solid #c0392b";
      statusText = "Occupied";
      statusEmoji = "⛔";
    } else if (isReserved) {
      bgColor = "#f39c12";
      borderStyle = "2px solid #d35400";
      statusText = "Reserved";
      statusEmoji = "🕒";
    } else {
      bgColor = "transparent";
      borderStyle = "2px dashed rgba(255, 255, 255, 0.7)";
      statusText = "Available";
      statusEmoji = "✅";
    }

    return (
      <div
        style={{
          position: "absolute",
          left: position.left,
          top: position.top,
          width: size.width,
          height: size.height,
          transform: `rotate(${rotation}deg)`,
          backgroundColor: bgColor,
          border: borderStyle,
          borderRadius: 4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          color: isHighlighted || isOccupied || isReserved ? "white" : "#8cf",
          fontWeight: "bold",
          boxShadow: isHighlighted
            ? "0 0 15px 5px rgba(52,152,219,0.7)"
            : isOccupied
            ? "0 2px 5px rgba(231,76,60,0.4)"
            : isReserved
            ? "0 2px 5px rgba(243,156,18,0.4)"
            : "none",
          transition: "all 0.3s ease",
          zIndex: isHighlighted ? 10 : 1,
          cursor: isOccupied || isReserved ? "not-allowed" : "pointer",
        }}
        onClick={handleSpotClick}
        title={`Spot ${spotNumber} - ${statusText}`}
      >
        <span style={{ fontSize: "12px", marginBottom: "4px" }}>
          {statusEmoji}
        </span>
        <span
          style={{
            fontSize: "14px",
            backgroundColor: isHighlighted
              ? "rgba(0, 0, 0, 0.3)"
              : isOccupied || isReserved
              ? "transparent"
              : "rgba(0, 0, 0, 0.5)",
            padding: "2px 5px",
            borderRadius: "3px",
          }}
        >
          {spotNumber}
        </span>
      </div>
    );
  };

  const StreetRender = (street) => {
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
          backgroundColor: "#444",
          borderRadius: "4px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "4px",
            height: "100%",
            backgroundColor: "#fff",
            opacity: 0.6,
            borderRadius: "2px",
            zIndex: 1,
          }}
        />
        {street.hasEntrance && (
          <div
            style={{
              position: "absolute",
              top: "5px",
              left: "0",
              width: "100%",
              height: "30px",
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: "26px",
                height: "26px",
                backgroundColor: "#3498db",
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: "5px",
              }}
            >
              <span
                style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}
              >
                E
              </span>
            </div>
            <div
              style={{
                position: "relative",
                width: "60%",
                height: "8px",
                backgroundColor: "#f1c40f",
                marginLeft: "10px",
                borderRadius: "4px",
                transform: "rotate(0deg)",
                transformOrigin: "left center",
                animation: "barrierEntrance 8s infinite",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background:
                    "repeating-linear-gradient(45deg, #f1c40f, #f1c40f 5px, #e74c3c 5px, #e74c3c 10px)",
                  borderRadius: "4px",
                }}
              />
            </div>
          </div>
        )}
        {street.hasExit && (
          <div
            style={{
              position: "absolute",
              bottom: "5px",
              right: "0",
              width: "100%",
              height: "30px",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              zIndex: 2,
            }}
          >
            <div
              style={{
                position: "relative",
                width: "60%",
                height: "8px",
                backgroundColor: "#f1c40f",
                marginRight: "10px",
                borderRadius: "4px",
                transform: "rotate(0deg)",
                transformOrigin: "right center",
                animation: "barrierExit 8s infinite",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background:
                    "repeating-linear-gradient(45deg, #f1c40f, #f1c40f 5px, #e74c3c 5px, #e74c3c 10px)",
                  borderRadius: "4px",
                }}
              />
            </div>
            <div
              style={{
                width: "26px",
                height: "26px",
                backgroundColor: "#e74c3c",
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginRight: "5px",
              }}
            >
              <span
                style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}
              >
                S
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ArrowRender = ({ id, position, rotation, size, color }) => {
    const arrowWidth = size.width || 20;
    const arrowHeight = size.height || 60;
    const arrowColor = color || "#FFFFFF";
    return (
      <div
        style={{
          position: "absolute",
          left: position.left,
          top: position.top,
          width: arrowHeight,
          height: arrowWidth,
          transform: `rotate(${rotation}deg)`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transformOrigin: "center center",
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <svg
          width={arrowHeight}
          height={arrowWidth}
          viewBox={`0 0 ${arrowHeight} ${arrowWidth}`}
        >
          <rect
            x="0"
            y={arrowWidth / 2 - 1.5}
            width={arrowHeight - 10}
            height="3"
            fill={arrowColor}
          />
          <polygon
            points={`${arrowHeight - 10},${arrowWidth / 2 - 8} ${arrowHeight},${
              arrowWidth / 2
            } ${arrowHeight - 10},${arrowWidth / 2 + 8}`}
            fill={arrowColor}
          />
        </svg>
      </div>
    );
  };

  const ParkingLogo = () => {
    return (
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 20,
          zIndex: 10,
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
          opacity: 0.85,
          transition: "opacity 0.3s ease",
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: "4px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
      >
        <img
          src="https://res.cloudinary.com/dpcyppzpw/image/upload/v1743138127/Parking_Sign_Flat_Style_laycjb.jpg"
          alt="Parking Logo"
          style={{
            width: "35px",
            height: "35px",
            borderRadius: "4px",
            objectFit: "cover",
          }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
        <p>Loading parking plan...</p>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <ErrorIcon>⚠️</ErrorIcon>
        <p>{error}</p>
        <RetryButton onClick={loadParkingData}>Retry</RetryButton>
      </ErrorContainer>
    );
  }

  return (
    <ParkingContainer>
      <ParkingHeader>
        <div>
          <ParkingTitle>{parkingInfo.name}</ParkingTitle>
          <ParkingStats>
            <span>
              <strong>Total:</strong> {parkingInfo.totalSpots} spots
            </span>
            <span>
              <strong>Available:</strong> {parkingInfo.availableSpots} spots
            </span>
          </ParkingStats>
        </div>

        <ParkingControls>
          <ControlButton onClick={zoomOut} title="Zoom Out">
            <span>🔍</span>
            <span>−</span>
          </ControlButton>
          <ZoomLevel>{Math.round(scale * 100)}%</ZoomLevel>
          <ControlButton onClick={zoomIn} title="Zoom In">
            <span>🔍</span>
            <span>+</span>
          </ControlButton>
          <ControlButton onClick={resetView} title="Reset View">
            <span>🔄</span>
            <span>Reset</span>
          </ControlButton>
        </ParkingControls>
      </ParkingHeader>
      <SpotFinder>
        <SpotFinderInput>
          <SpotLabel htmlFor="spotLocator">Find your parking spot:</SpotLabel>
          <SpotInput
            id="spotLocator"
            type="text"
            value={selectedSpotId}
            onChange={(e) => setSelectedSpotId(e.target.value)}
            placeholder="Enter spot number (e.g. 42)"
            ref={inputRef}
            onKeyPress={(e) => e.key === "Enter" && locateParkingSpot()}
          />
          <LocateButton
            onClick={() => {
              locateParkingSpot();
            }}
          >
            Locate & Reserve
          </LocateButton>
        </SpotFinderInput>

        {searchError && <ErrorMessage>{searchError}</ErrorMessage>}

        {searchSuccess && <SuccessMessage>{searchSuccess}</SuccessMessage>}
      </SpotFinder>
      <DndProvider backend={HTML5Backend}>
        <ParkingArea
          ref={parkingAreaRef}
          isDragging={isDragging}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{
            transition: "opacity 0.3s ease",
            opacity: isRefreshing ? 0.5 : 1,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1000,
              display: isRefreshing ? "block" : "none",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
          <ParkingContent
            scale={scale}
            offsetX={offset.x}
            offsetY={offset.y}
            isDragging={isDragging}
          >
            {renderGrid()}
            {streets.map((street) => (
              <StreetRender
                key={street.id}
                id={street.id}
                position={street.position}
                rotation={street.rotation}
                width={street.width}
                length={street.length}
                hasEntrance={street.hasEntrance}
                hasExit={street.hasExit}
                isDashed={street.isDashed}
              />
            ))}
            {navigationPath.length > 1 && (
              <NavigationPathSvg>
                <polyline
                  points={navigationPath.map((point) => `${point.x},${point.y}`).join(" ")}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.28"
                />
                <polyline
                  points={navigationPath.map((point) => `${point.x},${point.y}`).join(" ")}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="10 8"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-36"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                </polyline>
              </NavigationPathSvg>
            )}
            {arrows.map((arrow) => (
              <ArrowRender
                key={arrow.id}
                id={arrow.id}
                position={arrow.position}
                rotation={arrow.rotation}
                size={arrow.size}
                color={arrow.color}
              />
            ))}
            {parkingSpots.map((spot) => (
              <ParkingSpotRender
                key={spot.id}
                id={spot.id}
                position={spot.position}
                rotation={spot.rotation}
                size={spot.size}
                isOccupied={spot.isOccupied}
                isReserved={spot.isReserved}
              />
            ))}
          </ParkingContent>

          {showLogo && <ParkingLogo />}

          <CoordinatesIndicator>
            Zoom: {scale.toFixed(2)}x | Position: {Math.round(offset.x)},{" "}
            {Math.round(offset.y)}
          </CoordinatesIndicator>
        </ParkingArea>
      </DndProvider>

      <Legend>
        <LegendItem>
          <LegendIcon className="available" />
          <span>Available</span>
        </LegendItem>
        <LegendItem>
          <LegendIcon className="occupied" />
          <span>Occupied</span>
        </LegendItem>
        <LegendItem>
          <LegendIcon className="reserved" />
          <span>Reserved</span>
        </LegendItem>
        <LegendItem>
          <LegendIcon className="street" />
          <span>Street</span>
        </LegendItem>
        <LegendItem>
          <LegendIcon className="entrance">E</LegendIcon>
          <span>Entrance</span>
        </LegendItem>
        <LegendItem>
          <LegendIcon className="exit">S</LegendIcon>
          <span>Exit</span>
        </LegendItem>
      </Legend>

      <Instructions>
        <h3>How to reserve your spot:</h3>
        <ol>
          <li>Enter your preferred parking spot number in the search box</li>
          <li>Click "Locate & Reserve" to find and reserve it on the map</li>
          <li>Follow the animated blue path from entry to your selected slot</li>
        </ol>
        <Tip>
          💡 Tip: You can zoom in/out with the buttons or by scrolling, and drag
          to pan the map
        </Tip>
      </Instructions>
    </ParkingContainer>
  );
};

const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default ParkingPlan2D;
