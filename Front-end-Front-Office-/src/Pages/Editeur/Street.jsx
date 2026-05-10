/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./ItemType";

const Street = ({ id, position, rotation, width, length, updatePosition, updateRotation, updateDimensions, onRemove, hasEntrance, hasExit, toggleEntrance, toggleExit }) => {
  const [showControls, setShowControls] = useState(false);
  const [resizing, setResizing] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [isSelected, setIsSelected] = useState(false);
  const streetRef = useRef(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.STREET,
    item: {
      id,
      type: ItemTypes.STREET,
      left: position.left,
      top: position.top,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(streetRef);

  const rotate = (clockwise) => {
    const degreeStep = 15;
    const newRotation = rotation + (clockwise ? degreeStep : -degreeStep) * (Math.PI / 180);
    updateRotation(id, newRotation);
  };

  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    setResizing(direction);
    setResizeStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeMove = (e) => {
    if (!resizing) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    // Conversion des deltas en fonction de la rotation actuelle
    const rotationRadians = rotation % (2 * Math.PI);
    const cosTheta = Math.cos(rotationRadians);
    const sinTheta = Math.sin(rotationRadians);
    
    // Transformation des coordonnées selon la rotation
    const adjustedDeltaX = deltaX * cosTheta + deltaY * sinTheta;
    const adjustedDeltaY = -deltaX * sinTheta + deltaY * cosTheta;

    let newWidth = width;
    let newLength = length;

    if (resizing === "width") {
      // La largeur est affectée par adjustedDeltaX
      newWidth = Math.max(50, width + adjustedDeltaX);
    } else if (resizing === "length") {
      // La longueur est affectée par adjustedDeltaY
      newLength = Math.max(100, length + adjustedDeltaY);
    }

    updateDimensions(id, newWidth, newLength);
    setResizeStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeEnd = () => {
    setResizing(null);
  };

  const handleKeyDown = (e) => {
    if (!isSelected) return;
    
    const step = 10;
    const { left, top } = position;
    
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        updatePosition(id, { left, top: top - step });
        break;
      case "ArrowDown":
        e.preventDefault();
        updatePosition(id, { left, top: top + step });
        break;
      case "ArrowLeft":
        e.preventDefault();
        updatePosition(id, { left: left - step, top });
        break;
      case "ArrowRight":
        e.preventDefault();
        updatePosition(id, { left: left + step, top });
        break;
      case "r":
        e.preventDefault();
        rotate(true);
        break;
      case "R":
        e.preventDefault();
        rotate(false);
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        onRemove(id);
        break;
      default:
        break;
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    setIsSelected(true);
    setShowControls(true);
  };

  const handleFocus = () => {
    setIsSelected(true);
    setShowControls(true);
  };

  const handleBlur = (e) => {
    if (streetRef.current && streetRef.current.contains(e.relatedTarget)) {
      return;
    }
    setIsSelected(false);
    setShowControls(false);
  };

  useEffect(() => {
    if (isSelected) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isSelected, position]);

  useEffect(() => {
    if (resizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [resizing, rotation]); // Ajouté rotation comme dépendance

  // Calcul des positions des poignées de redimensionnement en fonction de la rotation
  const getResizeHandlePositions = () => {
    // Convertir radians en degrés pour une meilleure lisibilité
    const degrees = (rotation * 180 / Math.PI) % 360;
    
    // Ajuster en fonction de la rotation
    // Pour une meilleure expérience utilisateur, simplifions en 4 orientations principales
    if ((degrees >= 315 || degrees < 45) || (degrees >= 135 && degrees < 225)) {
      // Orientation principalement verticale (0° ou 180°)
      return {
        width: { right: "-10px", top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" },
        length: { bottom: "-10px", left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" }
      };
    } else {
      // Orientation principalement horizontale (90° ou 270°)
      return {
        width: { bottom: "50%", right: "50%", transform: "translate(50%, 50%)", cursor: "ns-resize" },
        length: { top: "50%", right: "-10px", transform: "translateY(-50%)", cursor: "ew-resize" }
      };
    }
  };

  // Calcul des positions des boutons de contrôle
  const getControlButtonsPosition = () => {
    // Calculer le centre de la rue
    const centerX = width / 2;
    const centerY = length / 2;
    
    return {
      top: `-40px`,
      left: `${centerX - 120}px`,
    };
  };

  const handlePositions = getResizeHandlePositions();
  const controlButtonsPosition = getControlButtonsPosition();

  return (
    <div
      ref={streetRef}
      style={{
        position: "absolute",
        left: position.left,
        top: position.top,
        opacity: isDragging ? 0.5 : 1,
        cursor: "move",
        zIndex: isSelected ? 1000 : 0,
        userSelect: "none",
        transformOrigin: "center center",
        outline: "none",
        border: "none"
      }}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isSelected && !resizing && setShowControls(false)}
      data-handler="true"
      tabIndex="0"
    >
      <div
        style={{
          width: `${width}px`,
          height: `${length}px`,
          transform: `rotate(${rotation}rad)`,
          position: "relative",
          outline: "none",
          border: "none"
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${length}`}
          style={{ 
            pointerEvents: "none",
            outline: "none",
            border: "none"
          }}
        >
          <rect
            x="0"
            y="0"
            width={width}
            height={length}
            fill="#555"
            stroke="none"
          />
          <line
            x1={width / 2}
            y1="0"
            x2={width / 2}
            y2={length}
            stroke="#fff"
            strokeWidth="2"
            strokeDasharray="10,10"
          />
          
          {hasEntrance && (
            <g>
              <rect
                x={width / 2 - 15}
                y="0"
                width="30"
                height="20"
                fill="#4CAF50"
                stroke="#FFF"
                strokeWidth="2"
              />
              <polygon
                points={`${width / 2},5 ${width / 2 - 10},15 ${width / 2 + 10},15`}
                fill="#FFF"
              />
              <text
                x={width / 2}
                y="35"
                textAnchor="middle"
                fill="#FFF"
                fontSize="12"
                fontWeight="bold"
              >
                ENTRÉE
              </text>
            </g>
          )}
          
          {hasExit && (
            <g>
              <rect
                x={width / 2 - 15}
                y={length - 20}
                width="30"
                height="20"
                fill="#F44336"
                stroke="#FFF"
                strokeWidth="2"
              />
              <polygon
                points={`${width / 2},${length - 5} ${width / 2 - 10},${length - 15} ${width / 2 + 10},${length - 15}`}
                fill="#FFF"
              />
              <text
                x={width / 2}
                y={length - 30}
                textAnchor="middle"
                fill="#FFF"
                fontSize="12"
                fontWeight="bold"
              >
                SORTIE
              </text>
            </g>
          )}
        </svg>

        {showControls && (
          <>
            <div
              style={{
                position: "absolute",
                ...handlePositions.width,
                width: "20px",
                height: "20px",
                backgroundColor: "#fff",
                border: "1px solid #000",
                borderRadius: "50%",
                zIndex: 100,
              }}
              onMouseDown={(e) => handleResizeStart(e, "width")}
            />

            <div
              style={{
                position: "absolute",
                ...handlePositions.length,
                width: "20px",
                height: "20px",
                backgroundColor: "#fff",
                border: "1px solid #000",
                borderRadius: "50%",
                zIndex: 100,
              }}
              onMouseDown={(e) => handleResizeStart(e, "length")}
            />
          </>
        )}
      </div>

      {/* Boutons de contrôle qui ne tournent pas avec la rue */}
      {showControls && (
        <div style={{
          position: "absolute",
          top: `-40px`,
          left: `50%`, 
          display: "flex",
          gap: "10px",
          zIndex: 1001,
          transform: `translate(-50%, 0)`, // Ne pas inclure la rotation ici
          width: "240px",
          justifyContent: "center"
        }}>
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
          
          <button
            style={buttonStyle}
            onClick={(e) => {
              e.stopPropagation();
              rotate(false);
            }}
          >
            ↺
          </button>
          
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
              backgroundColor: hasEntrance ? "#4CAF50" : "#ddd",
              color: hasEntrance ? "white" : "black",
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleEntrance(id);
            }}
          >
            E
          </button>
          
          <button
            style={{
              ...buttonStyle,
              backgroundColor: hasExit ? "#F44336" : "#ddd",
              color: hasExit ? "white" : "black",
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleExit(id);
            }}
          >
            S
          </button>
        </div>
      )}
    </div>
  );
};

const buttonStyle = {
  cursor: "pointer",
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  border: "1px solid #ccc",
  backgroundColor: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: "bold",
};

export default Street;