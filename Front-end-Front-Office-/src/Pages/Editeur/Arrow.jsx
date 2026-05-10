/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./ItemType"; 

const Arrow = ({
  id,
  position,
  rotation,
  size = { width: 30, length: 80 },
  color = "#F5F5F5",
  updatePosition,
  updateRotation,
  updateSize,
  onRemove,
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const [arrowSize, setArrowSize] = useState(size);
  const [arrowPosition, setArrowPosition] = useState(position);

  const arrowRef = useRef(null);
  const isResizingRef = useRef(false);
  const resizeDirectionRef = useRef(null);
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ARROW,
    item: {
      id,
      type: ItemTypes.ARROW,
      left: position.left,
      top: position.top,
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  // Configurer la référence combinée pour DnD et le focus
  const setRefs = (el) => {
    arrowRef.current = el;
    drag(el);
  };

  const handleRotate = (increment = 45) => {
    // Rotation par incréments de degrés (par défaut 45)
    const newRotation = (rotation + increment) % 360;
    updateRotation(id, newRotation);
  };

  // Gestionnaire d'événements clavier
  const handleKeyDown = (e) => {
    if (!isSelected) return;

    // Empêcher le défilement de la page avec les flèches
    e.preventDefault();

    const moveStep = e.shiftKey ? 10 : 1; // Déplacement plus rapide avec Shift

    switch (e.key) {
      case "ArrowUp":
        updatePosition(id, {
          left: position.left,
          top: position.top - moveStep,
        });
        break;
      case "ArrowDown":
        updatePosition(id, {
          left: position.left,
          top: position.top + moveStep,
        });
        break;
      case "ArrowLeft":
        updatePosition(id, {
          left: position.left - moveStep,
          top: position.top,
        });
        break;
      case "ArrowRight":
        updatePosition(id, {
          left: position.left + moveStep,
          top: position.top,
        });
        break;
      case "r":
        handleRotate(45); // Rotation dans le sens horaire
        break;
      case "R":
        handleRotate(-45); // Rotation dans le sens anti-horaire avec Shift+R
        break;
      case "Delete":
      case "Backspace":
        onRemove(id);
        break;
      default:
        break;
    }
  };

  // Ajouter et supprimer les écouteurs d'événements
  useEffect(() => {
    if (isSelected) {
      // Focus sur l'élément pour capter les événements clavier
      if (arrowRef.current) {
        arrowRef.current.focus();
      }

      // Ajouter l'écouteur au niveau document pour s'assurer de capturer les touches
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      // Nettoyage de l'écouteur
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSelected, position]); // Dépendances mises à jour

  // Commencer le redimensionnement
  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    isResizingRef.current = true;
    resizeDirectionRef.current = direction;

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  };

  const handleResizeMove = (e) => {
    if (!isResizingRef.current) return;

    setArrowSize((prevSize) => {
      let newSize = { ...prevSize };
      let newPosition = { ...arrowPosition };

      if (resizeDirectionRef.current === "end") {
        newSize.length = Math.max(30, prevSize.length + e.movementX);
      } else if (resizeDirectionRef.current === "start") {
        const delta = Math.min(prevSize.length - 30, e.movementX);
        newSize.length = prevSize.length - delta;
        newPosition.left += delta;
      }

      setArrowPosition(newPosition);
      updatePosition(id, newPosition);
      updateSize(id, newSize);
      return newSize;
    });
  };

  const handleResizeEnd = () => {
    isResizingRef.current = false;
    resizeDirectionRef.current = null;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  };

  return (
    <div
      ref={setRefs}
      style={{
        position: "absolute",
        left: position.left,
        top: position.top,
        width: size.length,
        height: size.width,
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: isSelected ? 100 : 10,
        transformOrigin: "center center",
        transform: `rotate(${rotation}deg)`,
        opacity: isDragging ? 0.5 : 1,
      }}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        setIsSelected(!isSelected);
      }}
      data-handler="true"
    >
      {/* Corps de la flèche */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          width: size.length - 20,
          height: 5,
          backgroundColor: color,
          borderRadius: "3px 0 0 3px",
          transform: "translateY(-50%)",
        }}
      />

      {/* Pointe de la flèche */}
      <div
        style={{
          position: "absolute",
          left: size.length - 20,
          top: "50%",
          width: 0,
          height: 0,
          borderTop: "10px solid transparent",
          borderBottom: "10px solid transparent",
          borderLeft: `15px solid ${color}`,
          transform: "translateY(-50%)",
        }}
      />

      {/* Contrôles qui suivent la rotation */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "calc(100% + 10px)",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "10px",
            zIndex: 200,
          }}
          onClick={(e) => e.stopPropagation()} // Empêcher la désélection lors du clic sur les contrôles
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRotate();
            }}
            style={{
              padding: "5px",
              backgroundColor: "#2196F3",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "12px",
            }}
            title="Rotation (ou touche R)"
          >
             <img
              src="https://res.cloudinary.com/dpcyppzpw/image/upload/v1743309966/rejouer_pk3fxo.png"
              alt="Supprimer"
              style={{ width: "16px", height: "16px" }}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
            style={{
              padding: "5px",
              backgroundColor: "#F44336",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "12px",
            }}
            title="Supprimer (ou touche Delete)"
          >
            <img
              src="https://res.cloudinary.com/dpcyppzpw/image/upload/v1743309873/effacer-le-fichier_t4t0mu.png"
              alt="Supprimer"
              style={{ width: "16px", height: "16px" }}
            />
          </button>
        </div>
      )}
      {isSelected && (
        <>
          {/* Fin de la flèche */}
          <div
            onMouseDown={(e) => handleResizeStart(e, "end")}
            style={{
              position: "absolute",
              left: `${size.length - 10}px`,
              top: "50%",
              width: "10px",
              height: "10px",
              backgroundColor: "#00F",
              borderRadius: "50%",
              cursor: "ew-resize",
              transform: "translateY(-50%)",
            }}
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, "end")}
            style={{
              position: "absolute",
              left: `${arrowSize.length - 10}px`,
              top: "50%",
              width: "10px",
              height: "10px",
              backgroundColor: "#00F",
              borderRadius: "50%",
              cursor: "ew-resize",
              transform: "translateY(-50%)",
            }}
          />
        </>
      )}
    </div>
  );
};

export default Arrow;
