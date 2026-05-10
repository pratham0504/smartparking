import React, { createContext, useContext, useState, useEffect } from "react";
import mapboxgl from 'mapbox-gl';

const MapboxContext = createContext({
  isLoaded: false,
  selectedLocation: null,
  setSelectedLocation: () => {},
  userLocation: null,
  setUserLocation: () => {},
  locationError: null,
  searchRadius: null,
  setSearchRadius: () => {},
  nearbyParkings: [],
  calculateDistance: () => {},
  updateNearbyParkings: () => {},
});

export const MapboxProvider = ({ children }) => {
  const getMapboxToken = () => {
    // Try process.env first (Create React App)
    if (process.env.REACT_APP_MAPBOX_TOKEN) {
      return process.env.REACT_APP_MAPBOX_TOKEN;
    }
    
    if (process.env.VITE_MAPBOX_TOKEN) {
      return process.env.VITE_MAPBOX_TOKEN;
    }
    
    // Check window properties
    try {
      if (window && window.REACT_APP_MAPBOX_TOKEN) {
        return window.REACT_APP_MAPBOX_TOKEN;
      }
      
      if (window && window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.MAPBOX_TOKEN) {
        return window.RUNTIME_CONFIG.MAPBOX_TOKEN;
      }
    } catch (e) {
      console.log("Error accessing window properties:", e);
    }

    return "";
  };

  const token = getMapboxToken();
  
  console.log("Using Mapbox token:", token.substring(0, 8) + "...");

  mapboxgl.accessToken = token;

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [searchRadius, setSearchRadius] = useState(1000); // default 1km
  const [nearbyParkings, setNearbyParkings] = useState([]);

  const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return Infinity;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI/180;
    const φ2 = point2.lat * Math.PI/180;
    const Δφ = (point2.lat-point1.lat) * Math.PI/180;
    const Δλ = (point2.lng-point1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // distance in meters
  };

  const updateNearbyParkings = (location, parkings) => {
    if (!location || !parkings) return;
    
    const nearby = parkings.filter(parking => {
      const distance = calculateDistance(location, {
        lat: parking.latitude,
        lng: parking.longitude
      });
      return distance <= searchRadius;
    });
    
    setNearbyParkings(nearby);
  };

  useEffect(() => {
    // Check if Mapbox is properly initialized
    if (mapboxgl.accessToken) {
      setIsLoaded(true);
      
      if (navigator.geolocation) {
        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000
        };

        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            setLocationError(null);
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };
            setUserLocation(newLocation);
          },
          (error) => {
            let errorMessage;
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = "User denied the request for geolocation.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = "Location information is unavailable.";
                break;
              case error.TIMEOUT:
                errorMessage = "The request to get user location timed out.";
                break;
              default:
                errorMessage = "An unknown error occurred.";
            }
            setLocationError(errorMessage);
            console.error("Error getting user location:", errorMessage);
          },
          options
        );

        return () => {
          navigator.geolocation.clearWatch(watchId);
        };
      }
    }
  }, []);

  const value = {
    isLoaded,
    selectedLocation,
    setSelectedLocation,
    userLocation,
    setUserLocation,
    locationError,
    searchRadius,
    setSearchRadius,
    nearbyParkings,
    calculateDistance,
    updateNearbyParkings
  };

  return (
    <MapboxContext.Provider value={value}>
      {children}
    </MapboxContext.Provider>
  );
};

export const useMapbox = () => {
  const context = useContext(MapboxContext);
  if (context === undefined) {
    throw new Error('useMapbox must be used within a MapboxProvider');
  }
  return context;
};
