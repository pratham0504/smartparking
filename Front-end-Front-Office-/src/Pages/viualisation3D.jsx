import React, { useState } from "react";

const ParkingPlan = () => {
  const rows = 5; // Nombre de lignes
  const cols = 10; // Nombre de colonnes

  // Initialisation des places (true = disponible, false = occupée)
  const [parkingSpots, setParkingSpots] = useState(
    Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(true))
  );

  // Fonction pour changer l'état d'une place
  const toggleSpot = (row, col) => {
    const updatedSpots = parkingSpots.map((r, i) =>
      r.map((spot, j) => (i === row && j === col ? !spot : spot))
    );
    setParkingSpots(updatedSpots);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h2>Plan du Parking</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 40px)`,
          gap: "5px",
          justifyContent: "center",
          marginTop: "20px",
        }}
      >
        {parkingSpots.flat().map((spot, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          return (
            <div
              key={index}
              onClick={() => toggleSpot(row, col)}
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: spot ? "#4CAF50" : "#D32F2F",
                border: "1px solid #ccc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
                fontWeight: "bold",
                userSelect: "none",
              }}
            >
              {spot ? "✔" : "✖"}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParkingPlan;
