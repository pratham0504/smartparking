/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import axios from "axios";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { getBackendUrl } from '../../utils/backend';

const Visualize3d = ({ parkingId: propParkingId }) => {
  const { id: urlParkingId } = useParams();
  const parkingId = propParkingId || urlParkingId;

  const mountRef = useRef(null);
  const [parkingData, setParkingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch parking data
  useEffect(() => {
    const loadParkingData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${getBackendUrl()}/parkings/parkings/${parkingId}`
        );
        setParkingData(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading parking data:", err);
        setError("Failed to load parking data");
        setLoading(false);
      }
    };

    if (parkingId) {
      loadParkingData();
    }
  }, [parkingId]);

  useEffect(() => {
    if (!parkingData || !mountRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    // Configuration
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const layoutWidth = parkingData.layout?.width || 1000;
    const layoutHeight = parkingData.layout?.height || 800;

    // Initialize the renderer first
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Fonction pour calculer le centre réel du parking basé sur les éléments
    function calculateParkingBounds() {
      // Créer un objet pour stocker les limites du parking
      const bounds = {
        minX: Infinity,
        maxX: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity,
      };

      // Vérifier les places de parking
      if (parkingData.spots && parkingData.spots.length > 0) {
        parkingData.spots.forEach((spot) => {
          const angleRad = spot.rotation;
          const halfWidth = spot.width / 2;
          const halfHeight = spot.height / 2;

          const corners = [
            {
              x:
                spot.x +
                Math.cos(angleRad) * halfWidth +
                Math.sin(angleRad) * halfHeight,
              z:
                spot.y +
                Math.sin(angleRad) * halfWidth +
                Math.cos(angleRad) * halfHeight,
            },
            {
              x:
                spot.x +
                Math.cos(angleRad) * halfWidth -
                Math.sin(angleRad) * halfHeight,
              z:
                spot.y +
                Math.sin(angleRad) * halfWidth -
                Math.cos(angleRad) * halfHeight,
            },
            {
              x:
                spot.x -
                Math.cos(angleRad) * halfWidth +
                Math.sin(angleRad) * halfHeight,
              z:
                spot.y -
                Math.sin(angleRad) * halfWidth +
                Math.cos(angleRad) * halfHeight,
            },
            {
              x:
                spot.x -
                Math.cos(angleRad) * halfWidth -
                Math.sin(angleRad) * halfHeight,
              z:
                spot.y -
                Math.sin(angleRad) * halfWidth -
                Math.cos(angleRad) * halfHeight,
            },
          ];

          // Mettre à jour les limites
          corners.forEach((corner) => {
            bounds.minX = Math.min(bounds.minX, corner.x);
            bounds.maxX = Math.max(bounds.maxX, corner.x);
            bounds.minZ = Math.min(bounds.minZ, corner.z);
            bounds.maxZ = Math.max(bounds.maxZ, corner.z);
          });
        });
      }

      // Si aucun élément n'a été trouvé, utiliser les dimensions du layout
      if (bounds.minX === Infinity) {
        bounds.minX = 0;
        bounds.maxX = layoutWidth;
        bounds.minZ = 0;
        bounds.maxZ = layoutHeight;
      }

      // Ajouter une marge
      const margin = 50;
      bounds.minX -= margin;
      bounds.maxX += margin;
      bounds.minZ -= margin;
      bounds.maxZ += margin;

      return bounds;
    }

    // Calculer les limites réelles du parking
    const parkingBounds = calculateParkingBounds();

    // Calculer le centre et la taille du parking
    const parkingCenter = new THREE.Vector3(
      (parkingBounds.minX + parkingBounds.maxX) / 2,
      0,
      (parkingBounds.minZ + parkingBounds.maxZ) / 2
    );

    const parkingWidth = parkingBounds.maxX - parkingBounds.minX;
    const parkingDepth = parkingBounds.maxZ - parkingBounds.minZ;
    const parkingSize = Math.max(parkingWidth, parkingDepth);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 5000);

    // Calculer la distance caméra en fonction de la taille du parking et du champ de vision
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = parkingSize / 2 / Math.tan(fov / 2);

    // Positionner la caméra pour voir tout le parking
    camera.position.set(
      parkingCenter.x,
      cameraDistance * 0.8,
      parkingCenter.z + cameraDistance * 0.5
    );
    camera.lookAt(parkingCenter);

    // Controls - configuration spéciale pour le glissement
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 3000;
    controls.maxPolarAngle = Math.PI / 2; // Limite la rotation pour ne pas passer sous le sol

    // Configuration critique pour le glissement
    controls.enablePan = true;
    controls.panSpeed = 1.0;
    controls.screenSpacePanning = true; // Rend le glissement plus intuitif

    // Définir la cible au centre du parking
    controls.target.copy(parkingCenter);
    controls.update();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(parkingCenter.x, 300, parkingCenter.z);
    directionalLight.castShadow = true;

    // Ajuster la caméra d'ombre pour couvrir tout le parking
    const shadowSize = parkingSize * 1.2;
    directionalLight.shadow.camera.left = -shadowSize / 2;
    directionalLight.shadow.camera.right = shadowSize / 2;
    directionalLight.shadow.camera.top = shadowSize / 2;
    directionalLight.shadow.camera.bottom = -shadowSize / 2;
    scene.add(directionalLight);

    // Ground - créer un sol plus grand que le parking
    const groundSize = parkingSize * 2;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(parkingCenter.x, 0, parkingCenter.z);
    ground.receiveShadow = true;
    scene.add(ground);

    // Add grid lines centered on the parking
    const gridHelper = new THREE.GridHelper(groundSize, 30, 0x555555, 0x333333);
    gridHelper.position.set(parkingCenter.x, 0.1, parkingCenter.z);
    scene.add(gridHelper);

    function createStreetMesh(
      street,
      parkingCenter,
      layoutWidth,
      layoutHeight
    ) {
      const streetGeometry = new THREE.BoxGeometry(
        street.width, // Width of street
        5, // Height of street
        street.length // Length of street
      );

      const streetMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        opacity: 0.7,
        transparent: true,
      });

      const streetMesh = new THREE.Mesh(streetGeometry, streetMaterial);
      
      // Attach data to mesh to be used for pathfinding
      streetMesh.userData = { 
        type: 'street', 
        isEntrance: street.hasEntrance || false 
      };

      // Precise positioning calculation
      // Adjust coordinates relative to parking center
      const adjustedX = street.x - layoutWidth / 2;
      const adjustedZ = -(street.y - layoutHeight / 2);

      streetMesh.position.set(
        parkingCenter.x + adjustedX, // Adjusted X
        2, // Slight elevation
        parkingCenter.z + adjustedZ // Adjusted Z (negated)
      );

      // Rotation remains the same
      streetMesh.rotation.y = street.rotation;

      streetMesh.receiveShadow = true;
      streetMesh.castShadow = true;

      return streetMesh;
    }

    // In your main rendering logic
    parkingData.layout.streets.forEach((street) => {
      const streetMesh = createStreetMesh(
        street,
        parkingCenter,
        layoutWidth,
        layoutHeight
      );
      scene.add(streetMesh);

      // Optional: Center line for street
      const centerLineGeometry = new THREE.BoxGeometry(
        2,
        3,
        street.length - 20
      );
      const centerLineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
      });
      const centerLineMesh = new THREE.Mesh(
        centerLineGeometry,
        centerLineMaterial
      );

      centerLineMesh.position.set(
        streetMesh.position.x, // Use same X as street
        3, // Slightly above street
        streetMesh.position.z // Use same Z as street
      );
      centerLineMesh.rotation.y = street.rotation;
      scene.add(centerLineMesh);

      // Debug: Console log street positions
      console.log(`Street ${street.id} position:`, {
        originalX: street.x,
        originalY: street.y,
        adjustedX: streetMesh.position.x,
        adjustedZ: streetMesh.position.z,
      });
    });

    // Create parking spots
    if (parkingData.spots && parkingData.spots.length > 0) {
      parkingData.spots.forEach((spot) => {
        // Determine color based on status
        let spotColor;
        switch (spot.status) {
          case "available":
            spotColor = 0x2ecc71; // Green
            break;
          case "occupied":
            spotColor = 0xe74c3c; // Red
            break;
          case "reserved":
            spotColor = 0xf39c12; // Orange
            break;
          default:
            spotColor = 0x95a5a6; // Grey
        }

        // Create spot - swap height/width for correct orientation
        // Convert 2D coordinates to 3D coordinates (y -> z)
        const spotGeometry = new THREE.BoxGeometry(spot.width, 3, spot.height);
        const spotMaterial = new THREE.MeshStandardMaterial({
          color: spotColor,
          transparent: true,
          opacity: 0.8,
          roughness: 0.5,
        });
        const spotMesh = new THREE.Mesh(spotGeometry, spotMaterial);

        // Position with correct z-coordinate (from y in 2D)
        spotMesh.position.set(spot.x, 1.5, spot.y);
        spotMesh.rotation.y = spot.rotation;
        spotMesh.receiveShadow = true;
        spotMesh.castShadow = true;

        // Add spot ID to userData for interaction
        spotMesh.userData = {
          id: spot.id,
          status: spot.status,
          type: "parkingSpot",
          originalColor: spotColor,
        };

        scene.add(spotMesh);

        // Add spot borders
        const borderGeometry = new THREE.BoxGeometry(
          spot.width + 2,
          1,
          spot.height + 2
        );
        const borderMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true,
        });
        const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
        borderMesh.position.set(spot.x, 1, spot.y);
        borderMesh.rotation.y = spot.rotation;
        scene.add(borderMesh);
      });
    }

    // Highlight on hover and click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredObject = null;

    const onMouseMove = (event) => {
      // Calculate mouse position in normalized device coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update the raycaster with the
      //  mouse position and camera
      raycaster.setFromCamera(mouse, camera);

      // Find intersected objects
      const intersects = raycaster.intersectObjects(scene.children);

      // Reset previously hovered object if exists
      if (hoveredObject) {
        if (hoveredObject.userData.originalColor) {
          hoveredObject.material.color.set(
            hoveredObject.userData.originalColor
          );
        }
        hoveredObject = null;
      }

      // Check if we're hovering over a parking spot
      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData && object.userData.type === "parkingSpot") {
          // Highlight the spot
          object.material.color.set(0xffff00); // Yellow highlight
          hoveredObject = object;
        }
      }
    };

    const onClick = () => {
      if (hoveredObject && hoveredObject.userData.type === "parkingSpot") {
        if (hoveredObject.userData.status === "available") {
          console.log(
            `Spot ${hoveredObject.userData.id} clicked for reservation`
          );

          // Here you could implement the API call to reserve the spot
          // Similar to your toggleOccupancy function in ParkingLiveView

          alert(
            `Reservation for spot ${hoveredObject.userData.id} would be processed here`
          );
        } else {
          alert(
            `Spot ${hoveredObject.userData.id} is already ${hoveredObject.userData.status}`
          );
        }
      }
    };

    // --- SMART NAVIGATION & REAL-TIME SOCKET.IO INTEGRATION ---
    let navigationMesh = null;
    let time = 0;

    function drawNavigationPath(targetSpotId) {
      // Remove old path if it exists
      if (navigationMesh) {
        scene.remove(navigationMesh);
        if (navigationMesh.geometry) navigationMesh.geometry.dispose();
        if (navigationMesh.material) navigationMesh.material.dispose();
        navigationMesh = null;
      }

      let targetMesh = null;
      let entranceMesh = null;

      // Identify the starting point (entrance) and destination (spot)
      scene.traverse((child) => {
        if (child.userData && child.userData.id === targetSpotId) targetMesh = child;
        if (child.userData && child.userData.type === 'street') {
          if (child.userData.isEntrance || !entranceMesh) entranceMesh = child;
        }
      });

      if (!targetMesh || !entranceMesh) return;

      const startPos = entranceMesh.position.clone();
      startPos.y = 2.5; // Float slightly above the street

      const endPos = targetMesh.position.clone();
      endPos.y = 2.5;

      // Generate L-Shaped routing from street to spot
      const points = [
        new THREE.Vector3(startPos.x, 2.5, startPos.z - 40), // Entry vector
        startPos
      ];

      if (Math.abs(startPos.x - endPos.x) > Math.abs(startPos.z - endPos.z)) {
        points.push(new THREE.Vector3(endPos.x, 2.5, startPos.z));
      } else {
        points.push(new THREE.Vector3(startPos.x, 2.5, endPos.z));
      }
      points.push(endPos);

      // Create glowing neon tube along the generated path
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1);
      const tubeGeom = new THREE.TubeGeometry(curve, 64, 1.5, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff, // Cyan Neon Glow
        transparent: true,
        opacity: 0.8
      });

      navigationMesh = new THREE.Mesh(tubeGeom, tubeMat);
      scene.add(navigationMesh);

      // Center camera to overview the path
      controls.target.copy(parkingCenter);
      camera.position.set(parkingCenter.x, cameraDistance * 0.9, parkingCenter.z + cameraDistance * 0.4);
      controls.update();
    }

    const socketUrl = getBackendUrl();
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('slots:update', (liveSlots) => {
      if (!Array.isArray(liveSlots)) return;
      
      scene.traverse((child) => {
        if (child.userData && child.userData.type === "parkingSpot") {
          const spotIdNum = child.userData.id.replace('parking-spot-', '');
          const liveData = liveSlots.find(s => String(s.slotNumber) === spotIdNum || s.spotId === child.userData.id);

          if (liveData) {
            const newColor = liveData.isOccupied ? 0xe74c3c : (child.userData.status === 'reserved' ? 0xf39c12 : 0x2ecc71);
            child.material.color.setHex(newColor);
            child.userData.originalColor = newColor;
          }
        }
      });
    });

    socket.on('gate:live', (data) => {
      // Trigger the path creation if entry is authorized and we have a target spot
      if (data.decision === 'ALLOW' && data.spotId && data.direction !== 'EXIT') {
        drawNavigationPath(data.spotId);
        
        // Automatically remove the navigation path after 60 seconds
        setTimeout(() => {
          if (navigationMesh) {
            scene.remove(navigationMesh);
            navigationMesh = null;
          }
        }, 60000);
      }
    });
    // -----------------------------------------------------------

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);

    // Helper function to get entrance/exit positions
    function getPositionAtStreetEnd(street, isStart) {
      const angleRad = street.rotation;
      const length = street.length;
      const offset = isStart ? -length / 2 + 10 : length / 2 - 10;

      return {
        x: street.x + Math.sin(angleRad) * offset,
        z: street.y + Math.cos(angleRad) * offset, // Converting y to z
      };
    }

    // Add axis helper for debugging
    const axisHelper = new THREE.AxesHelper(100);
    axisHelper.position.set(parkingCenter.x, 0, parkingCenter.z);
    scene.add(axisHelper);

    // Debug visualization of the parking bounds
    const debugBounds = false; // Mettre à true pour visualiser les limites
    if (debugBounds) {
      const boundingBoxGeometry = new THREE.BoxGeometry(
        parkingBounds.maxX - parkingBounds.minX,
        10,
        parkingBounds.maxZ - parkingBounds.minZ
      );
      const boundingBoxMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        wireframe: true,
      });
      const boundingBoxMesh = new THREE.Mesh(
        boundingBoxGeometry,
        boundingBoxMaterial
      );
      boundingBoxMesh.position.set(parkingCenter.x, 5, parkingCenter.z);
      scene.add(boundingBoxMesh);
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Add pulsing animation to the navigation line
      time += 0.05;
      if (navigationMesh) {
        navigationMesh.material.opacity = 0.4 + Math.sin(time) * 0.5;
      }

      controls.update(); // Important pour le damping
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      socket.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [parkingData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading 3D Visualization...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Left sidebar - 1/3 width */}
      <div className="w-1/3 bg-gray-100 p-4 overflow-auto">
        <h2 className="text-xl font-bold mb-4">Parking Information</h2>
        {parkingData && (
          <div>
            <p className="font-semibold">
              Name:{" "}
              <span className="font-normal">{parkingData.name || "N/A"}</span>
            </p>
            <p className="font-semibold">
              Location:{" "}
              <span className="font-normal">
                {parkingData.location || "N/A"}
              </span>
            </p>
            <p className="font-semibold mt-2">Legend:</p>
            <div className="flex items-center mt-1">
              <div className="w-4 h-4 bg-green-500 mr-2"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center mt-1">
              <div className="w-4 h-4 bg-red-500 mr-2"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center mt-1">
              <div className="w-4 h-4 bg-yellow-500 mr-2"></div>
              <span>Reserved</span>
            </div>
            <div className="flex items-center mt-1">
              <div className="w-4 h-4 bg-blue-500 mr-2"></div>
              <span>Entrance</span>
            </div>
            <div className="flex items-center mt-1">
              <div className="w-4 h-4 bg-red-600 mr-2"></div>
              <span>Exit</span>
            </div>
            <div className="mt-4">
              <p className="font-semibold">Navigation Instructions:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Rotate: Left click and drag</li>
                <li>
                  Pan/Glide: <strong>Middle mouse button</strong> ou{" "}
                  <strong>right click and drag</strong>
                </li>
                <li>Zoom: Scroll wheel</li>
                <li>Click on an available spot to reserve it</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Right visualization area - 2/3 width */}
      <div className="w-2/3 flex flex-col">
        <div className="bg-gray-800 text-white p-4">
          <h1 className="text-2xl font-bold">3D Parking Visualization</h1>
        </div>

        <div className="flex-1 relative">
          <div
            ref={mountRef}
            style={{
              width: "calc(100% - 30px)",
              height: "70%",
              marginRight: "30px",
              marginTop: "20px",
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Visualize3d;
