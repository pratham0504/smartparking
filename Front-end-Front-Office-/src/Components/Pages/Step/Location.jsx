/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  InfoWindow,
  StandaloneSearchBox,
} from "@react-google-maps/api";
import "../../../styles/parkingMarkers.css";
import { useGoogleMaps } from "../../../context/GoogleMapsContext";
import { useSearch } from "../../../context/SearchContext";
import { useFavorites } from "../../../context/FavoritesContext";
import axios from "axios";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import ParkingDetails from "../../../Pages/ParkingDetails";
import { MUMBAI_CENTER } from "../../../utils/parkingLocations";
import { getBackendUrl } from '../../../utils/backend';

const defaultCenter = { lat: MUMBAI_CENTER[1], lng: MUMBAI_CENTER[0] };

const sortParkings = (items, method) => {
  const list = [...items];
  if (method === "distance") {
    return list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  if (method === "price") {
    return list.sort((a, b) => (a.pricingValue ?? Number.MAX_VALUE) - (b.pricingValue ?? Number.MAX_VALUE));
  }
  return list;
};

// Add this StatusIndicator component definition
const StatusIndicator = ({ availability }) => {
  const getStatusInfo = () => {
    if (availability >= 0.5) {
      return {
        text: "Available",
        color: "text-black",
        bgColor: "bg-green-500",
        icon: "✓",
      };
    } else if (availability > 0.2) {
      return {
        text: "Limited",
        color: "text-black",
        bgColor: "bg-yellow-500",
        icon: "⚠",
      };
    } else {
      return {
        text: "Almost Full",
        color: "text-black",
        bgColor: "bg-red-500",
        icon: "!",
      };
    }
  };

  const status = getStatusInfo();
  return (
    <div
      className={`${status.bgColor} ${status.color} px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center`}
    >
      <span className="mr-1 text-xs">{status.icon}</span>
      {status.text}
    </div>
  );
};

// Popup component for parking details
// Popup component for parking details
const ParkingDetailsPopup = ({ parking, onClose }) => {
  if (!parking) return null;

  // Close when clicking on the background overlay, but not when clicking on the content
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackgroundClick} // Add click handler to the background
    >
      <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-3 flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Use the ParkingDetails component */}
        <ParkingDetails parkingData={parking} isPopup={true} />
      </div>
    </div>
  );
};

// Login Reminder Popup component - Updated with better button visibility
const LoginReminderPopup = ({ onClose }) => {
  const navigate = useNavigate();

  // Close when clicking on the background overlay
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Sign in Required</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4 text-base">
            You need to be signed in to save favorite parkings. Would you like
            to sign in or create an account?
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            {/* Updated Sign In button with better contrast */}
            <button
              onClick={() => navigate("/login")}
              className="flex-1 bg-blue-600 text-black font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              Sign In
            </button>

            {/* Updated Create Account button with better visibility */}
            <button
              onClick={() => navigate("/sign-up")}
              className="flex-1 bg-green-600 text-black font-medium py-3 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="text-center text-gray-600 text-sm">
          <p>Your favorites will be synced across devices when you sign in.</p>
        </div>
      </div>
    </div>
  );
};

// Ajouter ces constantes pour les marqueurs personnalisés
const createCustomMarker = (color) => {
  return `
        <svg width="30" height="45" viewBox="0 0 30 45">
            <path fill="${color}" d="M15 0C6.7 0 0 6.7 0 15c0 8.3 15 30 15 30s15-21.7 15-30c0-8.3-6.7-15-15-15z"/>
            <circle fill="white" cx="15" cy="15" r="7"/>
        </svg>
    `;
};

const SecLocation = () => {
  const { isLoaded } = useGoogleMaps();
  const { searchData, updateSearchData } = useSearch();
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const [mapRef, setMapRef] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [activeParking, setActiveParking] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [filteredParkings, setFilteredParkings] = useState([]);
  const [hoveredParking, setHoveredParking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showLoginReminder, setShowLoginReminder] = useState(false);
  const [directions, setDirections] = useState(null);
  const searchBoxRef = useRef(null);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({
    parkingMarkers: [],
    routeMarkers: [],
    userMarker: null,
  });
  const routerLocation = useRouterLocation();

  // Set today as minimum date for date pickers
  const today = new Date();

  // Date validation error state
  const [dateError, setDateError] = useState("");

  // Search form states - initialize from context with validation
  const [toogleTab] = useState(searchData.toogleTab || "On time");
  const [vehicleType, setVehicleType] = useState(searchData.vehicleType);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Initialize date states with validation
  const [startDate, setStartDate] = useState(() => {
    const contextStartDate = searchData.startDate;
    // If date from context exists and is not in the past, use it
    if (contextStartDate && new Date(contextStartDate) >= today) {
      return new Date(contextStartDate);
    }
    // Otherwise use today as default
    return today;
  });

  const [endDate, setEndDate] = useState(() => {
    const contextEndDate = searchData.endDate;
    // If date from context exists and is valid, use it
    if (contextEndDate && new Date(contextEndDate) >= (startDate || today)) {
      return new Date(contextEndDate);
    }
    // Otherwise set to day after start date
    const nextDay = new Date(startDate || today);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  });

  const [startTime, setStartTime] = useState(searchData.startTime || "14:41");
  const [endTime, setEndTime] = useState(searchData.endTime || "15:41");
  const [autocomplete, setAutocomplete] = useState(null);
  const [address, setAddress] = useState(searchData.address || "");
  const [location, setLocation] = useState(
    searchData.location || defaultCenter
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5);
  const [tabActiveId, setTabActiveId] = useState(1);

  // Add state for popup visibility
  const [showPopup, setShowPopup] = useState(false);
  const [selectedParking, setSelectedParking] = useState(null);

  // Fix 1: Add a ref to track if this is the first render
  const initialRenderRef = useRef(true);

  // Fix 2: Add a ref to track if we should auto-search
  const shouldAutoSearchRef = useRef(false);

  // Add new state for filters
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 50]); // Default price range INR 0-50
  const [maxDistance, setMaxDistance] = useState(searchRadius); // Use searchRadius as initial value
  const [filtersApplied, setFiltersApplied] = useState(false);
  const filterPanelRef = useRef(null);
  const MUMBAI_BOUNDS = {
    north: 19.2834, // North Mumbai
    south: 18.8928, // South Mumbai
    west: 72.7754,  // Western Mumbai
    east: 72.9757   // Eastern Mumbai
  };

  // Replace complex filter states with simple sort state
  const [sortBy, setSortBy] = useState("distance"); // "distance" or "price"
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Function to calculate distance between two points using the Haversine formula
  // Fonction de calcul de distance plus précise
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance en km
    return parseFloat(distance.toFixed(1));
  };

  // Get user's current location

  // Updated getUserLocation function
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };

    const MUMBAI_BOUNDS = {
      north: 19.2813,
      south: 18.8750,
      west: 72.7750,
      east: 72.9861
    };

    const validateCoordinates = (lat, lng) => {
      return (
        lat >= MUMBAI_BOUNDS.south &&
        lat <= MUMBAI_BOUNDS.north &&
        lng >= MUMBAI_BOUNDS.west &&
        lng >= MUMBAI_BOUNDS.east
      );
    };

    const handleSuccess = (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Validate if coordinates are within India
      if (!validateCoordinates(lat, lng)) {
        alert("Location detected is outside Mumbai. Using default location.");
        setLocation(defaultCenter);
        setUserLocation(defaultCenter);
        return;
      }

      const userPos = {
        lat: lat,
        lng: lng,
        accuracy: position.coords.accuracy,
      };

      // Only update if accuracy is reasonable (less than 100 meters)
      if (position.coords.accuracy > 100) {
        alert(
          "Low accuracy location detected. Please check your GPS settings."
        );
        return;
      }

      setUserLocation(userPos);
      setLocation(userPos);

      // Update map view
      if (map.current) {
        map.current.flyTo({
          center: [userPos.lng, userPos.lat],
          zoom: 15,
          duration: 1000,
        });

        // Update user marker
        if (markersRef.current.userMarker) {
          markersRef.current.userMarker.setLngLat([userPos.lng, userPos.lat]);
        } else {
          const el = document.createElement("div");
          el.className = "user-location-marker";
          el.innerHTML = createCustomMarker("#4A90E2");

          markersRef.current.userMarker = new mapboxgl.Marker(el)
            .setLngLat([userPos.lng, userPos.lat])
            .addTo(map.current);
        }
      }

      // Reverse geocoding with error handling
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${userPos.lng},${userPos.lat}.json?access_token=${mapboxgl.accessToken}`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.features && data.features.length > 0) {
            const address = data.features[0].place_name;
            setAddress(address);
            updateSearchData({
              address: address,
              location: userPos,
            });
          }
        })
        .catch((error) => {
          console.error("Error during reverse geocoding:", error);
          alert("Could not fetch address for your location");
        });
    };

    const handleError = (error) => {
      console.error("Error getting user location:", error);
      let message = "Unable to get your location. ";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          message += "Please enable location services.";
          break;
        case error.POSITION_UNAVAILABLE:
          message += "Location information unavailable.";
          break;
        case error.TIMEOUT:
          message += "Location request timed out.";
          break;
        default:
          message += "An unknown error occurred.";
      }

      alert(message);
      setLocation(defaultCenter);
      setUserLocation(defaultCenter);
    };

    // Try to get user location
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      options
    );
  };
  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const step = parseInt(params.get("step")) || 1;
    setTabActiveId(step);
  }, [routerLocation.search]);
  const handleBooking = async (parking, e) => {
    if (e) {
      e.stopPropagation();
    }

    try {
      // Récupération des données complètes du parking
      const response = await axios.get(
        `${getBackendUrl()}/api/parkings/${parking.id}`
      );
      const fullParkingData = response.data;

      // Vérifier les données avant de naviguer
      console.log("Selected Parking for Booking:", fullParkingData);

      // Naviguer vers la page de réservation avec les données complètes
      navigate("/booking?step=2", {
        state: { selectedParking: fullParkingData },
      });
    } catch (error) {
      console.error("Error fetching parking details for booking:", error);

      // Si erreur, utiliser les données limitées disponibles
      navigate("/booking?step=2", { state: { selectedParking: parking } });
    }
  };

  // Fetch parkings from API

  useEffect(() => {
    // Only run once on component mount
    const fetchParkings = async () => {
      try {
        setLoading(true);
        console.log("Fetching parkings from API (nearby)...");
        // Use the public nearby endpoint which doesn't require auth and accepts lat/lng
        const response = await axios.get(
          `${getBackendUrl()}/api/parkings/nearby`,
          { params: { lat: location.lat, lng: location.lng } }
        );
        console.log("API response:", response.data);

        // Transform the API data format to match our needs based on the updated model
        const formattedParkings = response.data.map((parking) => ({
          id: parking._id,
          name: parking.name,
          description: parking.description,
          lat: parking.position.lat,
          lng: parking.position.lng,
          price: `₹${parking.pricing.hourly}/hr`,
          pricingValue: parking.pricing.hourly,
          dailyRate: parking.pricing.daily,
          weeklyRate: parking.pricing.weekly,
          monthlyRate: parking.pricing.monthly,
          totalSpots: parking.totalSpots,
          availableSpots: parking.availableSpots || 0,
          features: parking.features,
          // Corriger l'accès au propriétaire (Owner au lieu de id_owner)
          owner: parking.Owner
            ? {
                id: parking.Owner._id,
                name: parking.Owner.name || "Unknown Owner",
                email: parking.Owner.email,
              }
            : null,
          createdAt: parking.createdAt,
          availabilityPercentage: parking.availableSpots
            ? Math.floor((parking.availableSpots / parking.totalSpots) * 100)
            : 0,
          // Ajout du formattage des données météo
          weather: parking.weather
            ? {
                temperature: Math.round(parking.weather.temperature),
                description: parking.weather.description,
                humidity: parking.weather.humidity,
                windSpeed: parking.weather.windSpeed,
                icon: parking.weather.icon,
              }
            : null,
        }));

        console.log("Formatted parkings with weather:", formattedParkings);
        setParkings(formattedParkings);

        // Only auto-search if we have initial context location data
        if (
          searchData.location &&
          searchData.address &&
          shouldAutoSearchRef.current
        ) {
          setTimeout(() => {
            handleSearch(searchData.location);
          }, 300);
          shouldAutoSearchRef.current = false;
        } else {
          setFilteredParkings([]);
        }

        setLoading(false);
      } catch (err) {
        setError("Failed to fetch parking data");
        console.error("Error fetching parking data:", err);
        setLoading(false);
      }
    };

    fetchParkings();
  }, []);
  /*useEffect(() => {
        // Only run once on component mount
        const fetchParkings = async () => {
            try {
                setLoading(true);
                console.log("Fetching parkings from API...");
                const response = await axios.get(`${getBackendUrl()}/api/parkings`);
                console.log("API response:", response.data);
                
                // Transform the API data format to match our needs
                const formattedParkings = response.data.map(parking => ({
                    id: parking._id,
                    name: parking.nameP,
                    location: parking.location,
                    lat: parking.position.lat,
                    lng: parking.position.lon,
                    price: `₹${parking.pricing}/hr`,
                    pricingValue: parking.pricing,
                    totalSpots: parking.totalSpots,
                    availableSpots: parking.availableSpots,
                    parkingId: parking.parkingId,
                    availabilityPercentage: Math.floor((parking.availableSpots / parking.totalSpots) * 100)
                }));
                
                console.log("Formatted parkings:", formattedParkings);
                setParkings(formattedParkings);
                
                // Only auto-search if we have initial context location data
                if (searchData.location && searchData.address && shouldAutoSearchRef.current) {
                    setTimeout(() => {
                        handleSearch(searchData.location);
                    }, 300);
                    shouldAutoSearchRef.current = false;
                } else {
                    setFilteredParkings([]); // Start with empty list until user searches
                }
                
                setLoading(false);
            } catch (err) {
                setError("Failed to fetch parking data");
                console.error("Error fetching parking data:", err);
                setLoading(false);
            }
        };

        fetchParkings();
    }, []); // Remove dependencies to run only once on mount
    */
  // Fix 4: Add a separate effect to track when to perform an auto-search
  useEffect(() => {
    // Skip first render
    if (initialRenderRef.current) {
      initialRenderRef.current = false;

      // If we have location data on first render, mark that we should auto-search
      if (searchData.location && searchData.address) {
        shouldAutoSearchRef.current = true;
      }
      return;
    }

    // Don't auto-search after first render - let the user trigger searches explicitly
  }, [searchData.location, searchData.address]);

  // Find name-based matches (as an alternative search method)
  const findNameMatches = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === "") return [];

    const normalizedSearch = searchTerm.toLowerCase().trim();
    return parkings.filter((parking) => {
      // Vérifier que parking est défini
      if (!parking) return false;

      // Vérifier que name est défini avant d'appeler toLowerCase()
      const nameMatches =
        parking.name && typeof parking.name === "string"
          ? parking.name.toLowerCase().includes(normalizedSearch)
          : false;

      // Vérifier que location est défini avant d'appeler toLowerCase()
      const locationMatches =
        parking.location && typeof parking.location === "string"
          ? parking.location.toLowerCase().includes(normalizedSearch)
          : false;

      return nameMatches || locationMatches;
    });
  };
  // Fonction pour naviguer vers l'étape de réservation
  const handleBookNow = (parking, e) => {
    e.stopPropagation();
    // Stocker les données du parking dans localStorage pour les récupérer dans le composant Booking
    localStorage.setItem("selectedParking", JSON.stringify(parking));
    navigate("/booking"); // Naviguer vers le processus de réservation
  };

  // Google Maps Autocomplete handlers
  const onLoadAutocomplete = (autoC) => {
    setAutocomplete(autoC);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const newLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        setLocation(newLocation);
        setAddress(place.formatted_address);

        // Update context when location changes
        updateSearchData({
          address: place.formatted_address,
          location: newLocation,
        });

        // Pan map to new location
        if (mapRef) {
          mapRef.panTo(newLocation);
          mapRef.setZoom(15);
        }

        // Automatically search for parking near this location
        setHasSearched(true);
        handleSearch(newLocation);
      } else {
        console.log("Selected place has no geometry");
      }
    } else {
      console.log("Autocomplete is not loaded yet!");
    }
  };

  // Handle address input change (manual typing)
  const handleAddressChange = (e) => {
    const value = e.target.value;
    setAddress(value);
    updateSearchData({ address: value });

    if (value.trim() === "") {
      setFilteredParkings([]); // Reset to empty list instead of showing all
      setHasSearched(false);
    }
  };

  // Update context when form values change
  useEffect(() => {
    // Only update if values have actually changed
    const contextStartDate = searchData.startDate
      ? new Date(searchData.startDate).getTime()
      : null;
    const currentStartDate = startDate ? startDate.getTime() : null;

    const contextEndDate = searchData.endDate
      ? new Date(searchData.endDate).getTime()
      : null;
    const currentEndDate = endDate ? endDate.getTime() : null;

    if (
      searchData.startTime !== startTime ||
      searchData.endTime !== endTime ||
      contextStartDate !== currentStartDate ||
      contextEndDate !== currentEndDate ||
      searchData.toogleTab !== toogleTab
    ) {
      updateSearchData({
        startDate,
        endDate,
        startTime,
        endTime,
        toogleTab,
      });
    }
  }, [startDate, endDate, startTime, endTime, toogleTab, updateSearchData]);

  // Handle start date change with validation
  const handleStartDateChange = (date) => {
    if (date) {
      // Always enforce today as minimum date
      if (date < today) {
        setDateError("Start date cannot be in the past");
        return;
      }

      setStartDate(date);
      setDateError("");

      // Update context with validated date
      updateSearchData({ startDate: date });

      // If end date is now before start date, adjust it
      if (endDate && date > endDate) {
        // Set end date to day after new start date
        const newEndDate = new Date(date);
        newEndDate.setDate(date.getDate() + 1);
        setEndDate(newEndDate);
        updateSearchData({ endDate: newEndDate });
      }
    }
  };

  // Handle end date change with validation
  const handleEndDateChange = (date) => {
    if (date) {
      // End date must be >= start date
      if (startDate && date < startDate) {
        setDateError("End date must be after start date");
        return;
      }

      setEndDate(date);
      setDateError("");

      // Update context with validated date
      updateSearchData({ endDate: date });
    }
  };

  // Update time handlers with context updates
  const handleStartTimeChange = (e) => {
    const value = e.target.value;
    setStartTime(value);
    updateSearchData({ startTime: value });
  };

  const handleEndTimeChange = (e) => {
    const value = e.target.value;
    setEndTime(value);
    updateSearchData({ endTime: value });
  };

  // Expanded handle search function with validation
  const handleSearch = () => {
    if (!location) {
      alert("Please enter a destination");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Filter parkings based on current search radius
      const results = parkings.filter((parking) => {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          parking.lat,
          parking.lng
        );

        // Add distance information to parking
        parking.distance = `${distance.toFixed(1)} km`;
        parking.distanceValue = distance;

        // Return true if within radius
        return distance <= searchRadius;
      });

      // Sort results based on current sort method
      const sortedResults = sortParkings(results, sortBy);

      // Update filtered parkings
      setFilteredParkings(sortedResults);

      // Update map view
      if (map.current && results.length > 0) {
        const bounds = new mapboxgl.LngLatBounds().extend([
          location.lng,
          location.lat,
        ]);

        results.forEach((parking) => {
          bounds.extend([parking.lng, parking.lat]);
        });

        map.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000,
        });
      }

      // Update search context
      updateSearchData({
        toogleTab,
        vehicleType,
        startDate,
        endDate,
        startTime,
        endTime,
        location: location,
        address,
        radius: searchRadius,
      });
    } catch (error) {
      console.error("Error during search:", error);
      setError("Failed to search parkings");
    } finally {
      setIsSearching(false);
    }
  };

  // Modify filterParkingsByLocation function
  const filterParkingsByLocation = (
    targetLat,
    targetLng,
    maxDistance = searchRadius
  ) => {
    if (!targetLat || !targetLng) return [];

    const results = parkings.filter((parking) => {
      const distance = calculateDistance(
        targetLat,
        targetLng,
        parking.lat,
        parking.lng
      );

      parking.distance = distance.toFixed(1) + " km";
      parking.distanceValue = distance;

      return distance <= maxDistance;
    });

    return results.sort((a, b) => a.distanceValue - b.distanceValue);
  };

  // Set map center based on context location or default
  useEffect(() => {
    if (location && mapRef) {
      mapRef.panTo(location);
      mapRef.setZoom(15);
    }
  }, [mapRef, location]);

  // Handle vehicle selection
  const handleVehicleSelect = (id) => {
    setVehicleType(id);
    setShowVehicleDropdown(false);

    // Update context when vehicle type changes
    updateSearchData({ vehicleType: id });
  };

  // Get selected vehicle name
  const getSelectedVehicleName = () => {
    const selected = vehicleTypes.find((type) => type.id === vehicleType);
    return selected ? selected.name : "Select vehicle type";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        showVehicleDropdown &&
        !event.target.closest(".vehicle-dropdown-toggle")
      ) {
        setShowVehicleDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showVehicleDropdown]);

  // Get marker icon based on parking availability and price
  const getParkingMarkerIcon = (parking) => {
    // Extract just the numeric part from the price string for the marker
    const priceForMarker = parking.price.replace("/hr", "");

    // If parking is almost full (less than 20% spots available), use orange icon
    const isLimited = parking.availabilityPercentage < 20;

    return createPriceMarker(priceForMarker, isLimited);
  };

  // Vehicle types for dropdown
  const vehicleTypes = [
    { id: "2wheels", name: "2 wheels", description: "Motorcycle, scooter, …" },
    {
      id: "little",
      name: "Little",
      description: "Clio, 208, Twingo, Polo, Corsa, …",
    },
    {
      id: "average",
      name: "AVERAGE",
      description: "Megane, 308, Scenic, C3 Picasso, Kangoo, Juke, …",
    },
    {
      id: "big",
      name: "Big",
      description: "C4 Picasso, 508, BMW 3 Series, X-Trail, RAV4, Tiguan, …",
    },
    {
      id: "high",
      name: "High",
      description: "Mercedes Vito, Renault Trafic, …",
    },
    {
      id: "very-high",
      name: "Very high",
      description: "Mercedes Sprinter, Renault Master, …",
    },
  ];

  //  handleShowAllParkings function
  const handleShowAllParkings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${getBackendUrl()}/api/parkings`
      );
      const allParkings = response.data;

      const formattedParkings = allParkings.map((parking) => ({
        id: parking._id,
        name: parking.name,
        description: parking.description,
        lat: parking.position.lat,
        lng: parking.position.lng,
        price: `₹${parking.pricing.hourly}/hr`,
        pricingValue: parking.pricing.hourly,
        totalSpots: parking.totalSpots,
        availableSpots: parking.availableSpots,
        location: parking.location || "",
        weather: parking.weather,
        distance: "0 km",
      }));

      // Reset search-related states
      setAddress("");
      setHasSearched(true);
      setSearchRadius(30);
      setFilteredParkings(formattedParkings);

      // Update map bounds to show all parkings
      if (map.current && formattedParkings.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();

        // Clear existing markers
        if (markersRef.current.parkingMarkers) {
          markersRef.current.parkingMarkers.forEach((marker) =>
            marker.remove()
          );
          markersRef.current.parkingMarkers = [];
        }

        // Add new markers
        formattedParkings.forEach((parking) => {
          bounds.extend([parking.lng, parking.lat]);

          const el = document.createElement("div");
          el.className = "parking-marker";
          el.innerHTML = createParkingMarkerSVG(
            parking.pricingValue,
            parking.availableSpots / parking.totalSpots < 0.2
          );

          const marker = new mapboxgl.Marker(el)
            .setLngLat([parking.lng, parking.lat])
            .addTo(map.current);

          markersRef.current.parkingMarkers.push(marker);
        });

        // Fit map to show all markers
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 13,
          duration: 1000,
        });
      }

      // Clear any active routes
      if (map.current && map.current.getSource("route")) {
        map.current.removeLayer("route");
        map.current.removeSource("route");
      }

      // Reset states
      setHoveredParking(null);
      setActiveParking(null);
      setLocation(null);
    } catch (error) {
      console.error("Error fetching all parkings:", error);
      setError("Failed to load parkings");
    } finally {
      setLoading(false);
    }
  };
  //  handleRadiusChange function
  const handleRadiusChange = (value) => {
    setSearchRadius(value);
    setMaxDistance(value);

    if (!location) return;

    // Filter parkings based on new radius
    const results = parkings.filter((parking) => {
      const distance = calculateDistance(
        location.lat,
        location.lng,
        parking.lat,
        parking.lng
      );

      parking.distance = `${distance.toFixed(1)} km`;
      parking.distanceValue = distance;
      return distance <= value;
    });

    // Sort results based on current sort method
    const sortedResults = sortParkings(results, sortBy);
    setFilteredParkings(sortedResults);

    // Update map bounds
    if (map.current && results.length > 0) {
      const bounds = new mapboxgl.LngLatBounds().extend([
        location.lng,
        location.lat,
      ]);

      results.forEach((parking) => {
        bounds.extend([parking.lng, parking.lat]);
      });

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
        duration: 1000,
      });
    }
  };
  const handleShowDetails = async (parking, e) => {
    if (e) {
      e.stopPropagation();
    }

    try {
      // Fetch complete parking data from API
      const response = await axios.get(
        `${getBackendUrl()}/api/parkings/${parking.id}`
      );
      setSelectedParking(response.data);
      setShowPopup(true);
    } catch (error) {
      console.error("Error fetching parking details:", error);
      // Fallback to using the limited data we have
      setSelectedParking(parking);
      setShowPopup(true);
    }
  };
  // Function to close popup
  const handleClosePopup = () => {
    setShowPopup(false);
  };

  // New sort function for parkings
  const sortParkings = (parkings, sortMethod) => {
    if (sortMethod === "distance") {
      // Sort by distance (ascending)
      return [...parkings].sort(
        (a, b) => parseFloat(a.distance) - parseFloat(b.distance)
      );
    } else if (sortMethod === "price") {
      // Sort by price (ascending)
      return [...parkings].sort((a, b) => {
        const priceA = parseFloat(
          a.price.replace("₹", "").replace("/hr", "")
        );
        const priceB = parseFloat(
          b.price.replace("₹", "").replace("/hr", "")
        );
        return priceA - priceB;
      });
    }
    return parkings; // Default case
  };

  // Handle sort selection
  const handleSort = (method) => {
    setSortBy(method);

    if (filteredParkings.length > 0) {
      const sortedParkings = sortParkings(filteredParkings, method);
      setFilteredParkings(sortedParkings);
    }
  };

  // Handle favorite toggle
  const handleFavoriteToggle = async (parkingId, e) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering parent click events
    }

    const result = await toggleFavorite(parkingId);

    if (!result.success && result.requiresAuth) {
      setShowLoginReminder(true);
    } else if (result.success && result.usingFallback) {
      // If we're using localStorage fallback, show a message
      console.log(
        "Using local storage for favorites. Server API not available."
      );
    } else if (!result.success) {
      console.error(
        "Failed to toggle favorite:",
        result.details || result.error
      );
    }
  };

  // Get user location on component mount
  useEffect(() => {
    if (isLoaded && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(userPos);
          setUserLocation(userPos);

          // Reverse geocoding using Google Maps Geocoding API
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: userPos }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const address = results[0].formatted_address;
              setAddress(address);
              updateSearchData({
                address: address,
                location: userPos,
              });
            }
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
          const defaultPos = { lat: 19.0760, lng: 72.8777 }; // Mumbai center
          setLocation(defaultPos);
          setUserLocation(defaultPos);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    }
  }, [isLoaded]);

  // Calculate map center based on parkings or user location
  const mapCenter = React.useMemo(() => {
    if (userLocation) {
      return userLocation;
    }
    return defaultCenter;
  }, [userLocation]);

  // Open Google Maps in new tab with directions
  const openGoogleMapsDirections = (parking) => {
    console.log("🔵 Button clicked! Parking data:", parking);
    
    if (!parking) {
      console.error("❌ No parking data");
      alert("Error: No parking selected");
      return;
    }

    // Validate and parse coordinates
    let parkingLat = parking.latitude;
    let parkingLng = parking.longitude;
    
    // Try to convert to numbers if they're strings
    if (typeof parkingLat === 'string') parkingLat = parseFloat(parkingLat);
    if (typeof parkingLng === 'string') parkingLng = parseFloat(parkingLng);
    
    console.log("🔵 Coordinates:", { lat: parkingLat, lng: parkingLng });
    
    if (!parkingLat || !parkingLng || isNaN(parkingLat) || isNaN(parkingLng)) {
      console.error("❌ Invalid coordinates");
      alert(`Invalid parking coordinates!\nLat: ${parking.latitude}\nLng: ${parking.longitude}`);
      return;
    }

    // Build Google Maps URL
    let url;
    if (userLocation && userLocation.lat && userLocation.lng) {
      const origin = `${userLocation.lat},${userLocation.lng}`;
      const destination = `${parkingLat},${parkingLng}`;
      url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
      console.log("🟢 Opening directions from your location to parking");
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${parkingLat},${parkingLng}`;
      console.log("🟢 Opening parking location (no user location available)");
    }
    
    console.log("🔵 URL:", url);
    
    // Try to open the window
    try {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        console.error("❌ Popup blocked!");
        alert("⚠️ Popup was blocked!\n\nPlease allow popups for this site.\n\nClick OK to copy the URL to clipboard.");
        // Try to copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
          alert("✅ URL copied to clipboard! Paste it in a new tab.");
        }).catch(() => {
          prompt("Copy this URL manually:", url);
        });
      } else {
        console.log("✅ Google Maps opened successfully!");
      }
    } catch (error) {
      console.error("❌ Error opening window:", error);
      alert("Error opening Google Maps. URL: " + url);
    }
  };

  // Handle marker click
  const handleMarkerClick = (parking) => {
    setActiveParking(parking);
    if (mapRef && parking) {
      const lat = parseFloat(parking.latitude);
      const lng = parseFloat(parking.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        mapRef.panTo({ lat, lng });
        mapRef.setZoom(16);
      }
    }
  };

  // Ajouter les styles CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
            /* Marqueurs de parking */
            .parking-marker {
                width: 40px;
                height: 55px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
            }
            
            .parking-marker:hover {
                transform: scale(1.15);
                filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15));
            }
    
            .parking-marker.selected {
                transform: scale(1.2);
                filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.2));
            }
    
            /* Marqueur de position utilisateur */
            .user-location-marker {
                width: 24px;
                height: 24px;
            }
    
            .user-dot {
                background: rgba(59, 130, 246, 0.15);
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: pulse 2s infinite;
            }
    
            .user-dot-inner {
                background: rgb(59, 130, 246);
                border-radius: 50%;
                width: 12px;
                height: 12px;
                border: 2px solid white;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
            }
    
            /* Marqueurs d'itinéraire */
            .route-marker {
                width: 36px;
                height: 50px;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
            }
    
            .start-marker {
                filter: hue-rotate(200deg);
            }
    
            .end-marker {
                filter: hue-rotate(100deg);
            }
    
            /* Popups */
            .custom-popup .mapboxgl-popup-content {
                padding: 0;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
                            0 2px 4px -1px rgba(0, 0, 0, 0.06);
                overflow: hidden;
                border: 1px solid rgba(229, 231, 235, 1);
            }
            
            .custom-popup .mapboxgl-popup-close-button {
                right: 12px;
                top: 12px;
                color: #4B5563;
                font-size: 18px;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                backdrop-filter: blur(4px);
                transition: all 0.2s;
            }
    
            .custom-popup .mapboxgl-popup-close-button:hover {
                background: rgba(255, 255, 255, 0.95);
                color: #1F2937;
            }
            
            .custom-popup .mapboxgl-popup-tip {
                border-top-color: white;
                filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.05));
            }
    
            /* Prix tags */
            .price-tag {
                background: linear-gradient(135deg, #22C55E, #16A34A);
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                letter-spacing: 0.5px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .price-tag.limited {
                background: linear-gradient(135deg, #F59E0B, #D97706);
            }
    
            /* Animations */
            @keyframes pulse {
                0% {
                    transform: scale(0.95);
                    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
                }
                70% {
                    transform: scale(1);
                    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
                }
                100% {
                    transform: scale(0.95);
                    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
                }
            }
    
            /* Carte */
            .mapboxgl-ctrl-group {
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
    
            .mapboxgl-ctrl-group button {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                background: white;
            }
    
            .mapboxgl-ctrl-group button:hover {
                background: #F3F4F6;
            }
    
            /* Route */
            .route-line {
                opacity: 0.8;
                stroke: #3B82F6;
                stroke-width: 4;
                stroke-linecap: round;
                stroke-linejoin: round;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
            }
        `;

    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  // Ajouter cette fonction en haut du fichier, avec les autres constantes
  const createParkingMarkerSVG = (price, isLimited) => `
<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(25,25)">
        <!-- Outer circle with shadow -->
        <circle r="20" fill="white" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"/>
        
        <!-- Background circle with gradient -->
        <circle r="18" fill="${
          isLimited ? "url(#gradientLimited)" : "url(#gradientNormal)"
        }"/>
        
        <!-- P symbol -->
        <text 
            x="0" 
            y="2" 
            text-anchor="middle" 
            font-family="Arial" 
            font-size="14"
            font-weight="bold" 
            fill="white"
        >P</text>
        
        <!-- Price tag -->
        <g transform="translate(0,8)">
            <rect 
                x="-16" 
                y="-6" 
                width="32" 
                height="12" 
                rx="6"
                fill="white"
                opacity="0.9"
            />
            <text 
                x="0" 
                y="2" 
                text-anchor="middle" 
                font-family="Arial" 
                font-size="9"
                font-weight="bold" 
                fill="${isLimited ? "#D97706" : "#16A34A"}"
            >${price}</text>
        </g>
    </g>
    
    <!-- Définitions des gradients -->
    <defs>
        <linearGradient id="gradientNormal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#22C55E"/>
            <stop offset="100%" style="stop-color:#16A34A"/>
        </linearGradient>
        <linearGradient id="gradientLimited" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#F59E0B"/>
            <stop offset="100%" style="stop-color:#D97706"/>
        </linearGradient>
    </defs>
</svg>
`;

  // Mise à jour de la création des marqueurs
  // 1. D'abord, mettons à jour la fonction de création des marqueurs
  const createParkingMarker = (parking) => {
    const markerElement = document.createElement("div");
    markerElement.className = "parking-marker";

    const isLimited = parking.availableSpots / parking.totalSpots < 0.2;
    const price = parking.price.replace("₹", "").replace("/hr", "");

    markerElement.innerHTML = `
        <div class="marker-container">
            <div class="marker-pin ${isLimited ? "limited" : ""}">
                <div class="pin-head"></div>
                <div class="pin-price">₹${price}</div>
            </div>
            <div class="marker-shadow"></div>
        </div>
    `;

    return markerElement;
  };

  // 2. Mettons à jour les styles CSS des marqueurs
  const markerStyles = `
    .marker-container {
        position: relative;
        width: 30px;
        height: 40px;
        cursor: pointer;
        transform-origin: bottom center;
        transition: all 0.3s;
    }

    .marker-pin {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 30px;
        height: 40px;
        background: #22C55E;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .marker-pin.limited {
        background: #F59E0B;
    }

    .pin-head {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(45deg);
        width: 14px;
        height: 14px;
        background: white;
        border-radius: 50%;
    }

    .pin-price {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(45deg);
        font-size: 10px;
        font-weight: bold;
        color: #22C55E;
        white-space: nowrap;
    }

    .marker-pin.limited .pin-price {
        color: #F59E0B;
    }

    .marker-shadow {
        position: absolute;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 6px;
        background: rgba(0,0,0,0.2);
        border-radius: 50%;
    }

    .marker-container:hover {
        transform: scale(1.1);
    }

    .marker-container.active {
        transform: scale(1.2);
        z-index: 2;
    }
`;

  // 3. Mettons à jour la fonction de gestion des marqueurs
  useEffect(() => {
    if (!map.current) return;

    // Supprimer les anciens marqueurs
    markersRef.current.parkingMarkers.forEach((marker) => marker.remove());
    markersRef.current.parkingMarkers = [];

    // Ajouter les styles des marqueurs si pas déjà présents
    if (!document.getElementById("marker-styles")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "marker-styles";
      styleSheet.textContent = markerStyles;
      document.head.appendChild(styleSheet);
    }

    // Créer et ajouter les nouveaux marqueurs
    filteredParkings.forEach((parking) => {
      const markerElement = createParkingMarker(parking);

      // Créer le popup
      const popup = new mapboxgl.Popup({
        offset: [0, -20],
        closeButton: false,
        closeOnClick: false,
        className: "custom-popup",
      }).setHTML(`
            <div class="p-3 min-w-[200px]">
                <h3 class="font-semibold text-gray-900">${parking.name}</h3>
                <div class="flex justify-between items-center mt-1">
                    <span class="text-blue-600 font-medium">${
                      parking.price
                    }</span>
                    <span class="text-gray-500 text-sm">${
                      parking.distance
                    }</span>
                </div>
                <div class="mt-2">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-600">${parking.availableSpots}/${
        parking.totalSpots
      } spots</span>
                        <span class="${
                          parking.availableSpots / parking.totalSpots >= 0.5
                            ? "text-green-600"
                            : parking.availableSpots / parking.totalSpots >= 0.2
                            ? "text-yellow-600"
                            : "text-red-600"
                        }">${Math.round(
        (parking.availableSpots / parking.totalSpots) * 100
      )}% available</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 rounded-full mt-1">
                        <div class="h-full rounded-full transition-all duration-300"
                            style="width: ${
                              (parking.availableSpots / parking.totalSpots) *
                              100
                            }%; 
                            background-color: ${
                              parking.availableSpots / parking.totalSpots >= 0.5
                                ? "#22c55e"
                                : parking.availableSpots / parking.totalSpots >=
                                  0.2
                                ? "#eab308"
                                : "#dc2626"
                            }">
                        </div>
                    </div>
                </div>
            </div>
        `);

      // Créer le marqueur
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: "bottom",
      })
        .setLngLat([parking.lng, parking.lat])
        .setPopup(popup)
        .addTo(map.current);

      // Gérer les événements
      markerElement.addEventListener("mouseenter", () => {
        markerElement.classList.add("active");
        popup.addTo(map.current);
        setHoveredParking(parking.id);
      });

      markerElement.addEventListener("mouseleave", () => {
        markerElement.classList.remove("active");
        popup.remove();
        setHoveredParking(null);
      });

      markerElement.addEventListener("click", () => {
        handleMarkerClick(parking);
      });

      markersRef.current.parkingMarkers.push(marker);
    });

    // Nettoyer les marqueurs au démontage
    return () => {
      markersRef.current.parkingMarkers.forEach((marker) => marker.remove());
      markersRef.current.parkingMarkers = [];
    };
  }, [filteredParkings]);

  // Mise à jour du contenu du popup
  const createPopupContent = (parking) => {
    // Calculate availability percentage
    const availabilityPercentage = Math.round(
      (parking.availableSpots / parking.totalSpots) * 100
    );

    // Determine status color and text
    const getStatusInfo = () => {
      if (availabilityPercentage >= 50) {
        return { color: "#22c55e", text: "Available", icon: "✓" };
      } else if (availabilityPercentage >= 20) {
        return { color: "#eab308", text: "Limited", icon: "⚠" };
      } else {
        return { color: "#dc2626", text: "Almost Full", icon: "!" };
      }
    };

    const status = getStatusInfo();

    return `
        <div class="popup-content p-4 min-w-[280px]">
            <!-- Header with name and status -->
            <div class="flex items-start justify-between mb-3">
                <h3 class="text-lg font-bold text-gray-900">${parking.name}</h3>
                <span class="px-2 py-1 text-xs font-medium rounded-full" 
                      style="background-color: ${status.color}20; color: ${
      status.color
    }">
                    ${status.icon} ${status.text}
                </span>
            </div>

            <!-- Price and Distance -->
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl font-bold text-blue-600">${
                      parking.price
                    }</span>
                    <span class="text-sm text-gray-500"></span>
                </div>
                <div class="flex items-center gap-1 text-gray-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span class="text-sm">${parking.distance}</span>
                </div>
            </div>

            <!-- Availability Section -->
            <div class="bg-gray-50 p-3 rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-medium text-gray-700">
                        Availability
                    </span>
                    <span class="text-sm text-gray-600">
                        ${parking.availableSpots}/${parking.totalSpots} spots
                    </span>
                </div>
                
                <!-- Enhanced Progress Bar -->
                <div class="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div class="absolute top-0 left-0 h-full transition-all duration-300 rounded-full"
                         style="width: ${availabilityPercentage}%; 
                                background-color: ${status.color};
                                box-shadow: 0 0 8px ${status.color}80">
                    </div>
                </div>
                
                <!-- Percentage indicator -->
                <div class="mt-1 text-right">
                    <span class="text-xs font-medium" style="color: ${
                      status.color
                    }">
                        ${availabilityPercentage}% available
                    </span>
                </div>
            </div>

            <!-- Weather Info (if available) -->
            ${
              parking.weather
                ? `
            <div class="mt-3 flex items-center gap-3 bg-blue-50 p-2 rounded-lg">
                <img src="${parking.weather.icon}" 
                     alt="Weather" 
                     class="w-8 h-8 object-contain"
                />
                <div>
                    <div class="text-sm font-medium text-gray-900">
                        ${parking.weather.temperature}°C
                    </div>
                    <div class="text-xs text-gray-600">
                        ${parking.weather.description}
                    </div>
                </div>
            </div>
            `
                : ""
            }

       
            </div>
        </div>
    `;
  };

  // Mise à jour de l'effet pour les marqueurs
  // Modifier l'effet des marqueurs pour ajouter la gestion du clic sur le fond
  useEffect(() => {
    if (!map.current) return;

    // Gestionnaire de clic sur le fond de la carte
    const handleMapClick = (e) => {
      // Vérifier si le clic est sur un marqueur
      const target = e.originalEvent.target;
      const isMarkerClick = target.closest(".parking-marker");

      // Si le clic n'est pas sur un marqueur, réinitialiser la carte
      if (!isMarkerClick) {
        // Supprimer l'itinéraire
        if (map.current.getSource("route")) {
          map.current.removeLayer("route");
          map.current.removeSource("route");
        }

        // Supprimer les marqueurs de route
        markersRef.current.routeMarkers.forEach((marker) => marker.remove());
        markersRef.current.routeMarkers = [];

        // Réafficher tous les parkings
        markersRef.current.parkingMarkers.forEach((marker) => {
          if (!marker.getElement().isVisible) {
            marker.addTo(map.current);
            marker.getElement().isVisible = true;
          }
        });

        // Réinitialiser l'état actif
        setActiveParking(null);

        // Recentrer sur la position de l'utilisateur
        if (userLocation) {
          map.current.flyTo({
            center: [userLocation.lng, userLocation.lat],
            zoom: 15,
            duration: 1000,
          });
        }
      }
    };

    // Ajouter l'écouteur d'événement
    map.current.on("click", handleMapClick);

    // Nettoyage
    return () => {
      if (map.current) {
        map.current.off("click", handleMapClick);
      }
    };
  }, [userLocation]);

  // Mise à jour du gestionnaire de hover
  // Update the handleHover function
  const handleHover = (parking) => {
    if (!parking || !parking.id) {
      console.warn("Invalid parking data in handleHover");
      return;
    }

    setHoveredParking(parking.id);

    // Find the marker corresponding to this parking
    const marker = markersRef.current.parkingMarkers.find(
      (m) => m.getElement().parking && m.getElement().parking.id === parking.id
    );

    if (!marker) {
      console.warn("Marker not found for parking:", parking.id);
      return;
    }

    // Remove existing popups
    markersRef.current.parkingMarkers.forEach((m) => {
      if (m.getPopup()) m.getPopup().remove();
    });

    // Create and show new popup
    const popup = new mapboxgl.Popup({
      offset: [0, -15],
      closeButton: false,
      closeOnClick: false,
      className: "custom-popup",
    }).setHTML(createPopupContent(parking));

    marker.setPopup(popup);
    popup.addTo(map.current);

    // Pan to the parking location
    if (map.current) {
      map.current.panTo([parking.lng, parking.lat], {
        duration: 500,
      });
    }
  };

  // Update the parking markers creation in useEffect
  useEffect(() => {
    if (!map.current) return;

    // Supprimer les anciens marqueurs
    markersRef.current.parkingMarkers.forEach((marker) => marker.remove());
    markersRef.current.parkingMarkers = [];

    filteredParkings.forEach((parking) => {
      if (!parking || !parking.id) {
        console.warn("Invalid parking data:", parking);
        return;
      }

      // Créer l'élément du marqueur avec le nouveau design SVG
      const el = document.createElement("div");
      el.className = "parking-marker";

      const isLimited = parking.availableSpots / parking.totalSpots < 0.2;
      const price = parking.price.replace("₹", "").replace("/hr", "");
      el.innerHTML = createParkingMarkerSVG(price, isLimited);

      // Stocker les données du parking
      el.parking = parking;

      // Créer et ajouter le marqueur
      const marker = new mapboxgl.Marker(el)
        .setLngLat([parking.lng, parking.lat])
        .addTo(map.current);

      markersRef.current.parkingMarkers.push(marker);

      // Ajouter uniquement l'événement de clic sur le marqueur
      el.addEventListener("click", () => {
        handleMarkerClick(parking);
      });
    });
  }, [filteredParkings]);

  // Mise à jour du gestionnaire pour quitter le hover
  const handleMouseLeave = () => {
    setHoveredParking(null);

    // Ne pas réinitialiser la carte si un parking est activement sélectionné
    if (!activeParking && map.current) {
      // Supprimer tous les marqueurs de parking existants
      markersRef.current.parkingMarkers.forEach((marker) => marker.remove());
      markersRef.current.parkingMarkers = [];

      // Supprimer l'itinéraire s'il existe
      if (map.current.getSource("route")) {
        map.current.removeLayer("route");
        map.current.removeSource("route");
      }

      // Supprimer les marqueurs de route
      markersRef.current.routeMarkers.forEach((marker) => marker.remove());
      markersRef.current.routeMarkers = [];

      // Recentrer sur la position de l'utilisateur
      if (userLocation) {
        map.current.flyTo({
          center: [userLocation.lng, userLocation.lat],
          zoom: 15,
          duration: 1000,
        });
      }

      // Réafficher tous les parkings avec le nouveau design SVG
      filteredParkings.forEach((parking) => {
        const el = document.createElement("div");
        el.className = "parking-marker";

        // Utiliser le nouveau design SVG
        const isLimited = parking.availableSpots / parking.totalSpots < 0.2;
        const price = parking.price.replace("₹", "").replace("/hr", "");
        el.innerHTML = createParkingMarkerSVG(price, isLimited);

        // Stocker les données du parking dans l'élément
        el.parking = parking;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([parking.lng, parking.lat])
          .addTo(map.current);

        markersRef.current.parkingMarkers.push(marker);

        // Réattacher les événements
        el.addEventListener("mouseenter", () => {
          handleHover(parking);
        });

        el.addEventListener("mouseleave", handleMouseLeave);

        el.addEventListener("click", () => {
          handleMarkerClick(parking);
        });
      });
    }
  };

  // Ajouter les styles CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
        .parking-marker {
       width: 40px;
            height: 55px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
     
    }
             .mapboxgl-popup {
            max-width: 320px !important;
            border-radius: 8px;
            overflow: hidden;
        }
             .mapboxgl-popup-content {
            padding: 0 !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
                        0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
            border: 1px solid rgba(229, 231, 235, 1) !important;
        }

        .mapboxgl-popup-close-button {
            right: 8px !important;
            top: 8px !important;
            color: #4B5563 !important;
            font-size: 18px !important;
            width: 24px !important;
            height: 24px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(255, 255, 255, 0.8) !important;
            border-radius: 50% !important;
            backdrop-filter: blur(4px) !important;
            transition: all 0.2s !important;
        }
            .mapboxgl-popup-close-button:hover {
            background: rgba(255, 255, 255, 0.95) !important;
            color: #1F2937 !important;
        }

        .mapboxgl-popup-tip {
            border-top-color: white !important;
            filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.05)) !important;
        }

        .popup-content button {
            transition: all 0.2s;
        }

        .popup-content button:hover {
            transform: translateY(-1px);
        }

        
      .parking-marker:hover {
        transform: scale(1.1);
        filter: brightness(1.1);
    }
    
    .parking-marker.selected {
        transform: scale(1.2);
        filter: brightness(1.2);
    }
        .marker-content {
            position: relative;
            width: 70px;
            height: 40px;
        }
        
        .price-tag {
            background: #22C55E;
            color: white;
            padding: 4px 8px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .price-tag.limited {
            background: #F59E0B;
        }
        
        .parking-popup .mapboxgl-popup-content {
            padding: 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .parking-popup .mapboxgl-popup-tip {
            border-top-color: white;
        }
        
        .popup-content {
            min-width: 200px;
        }
    `;
    document.head.appendChild(style);

    return () => document.head.removeChild(style);
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (isLoaded && searchBoxRef.current && window.google) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        searchBoxRef.current,
        {
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'in' }, // India
        }
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.geometry || !place.geometry.location) {
          console.log("No location data available for this place");
          return;
        }

        const newLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        
        setLocation(newLocation);
        setAddress(place.formatted_address || place.name);
        updateSearchData({
          address: place.formatted_address || place.name,
          location: newLocation,
        });

        // Pan map to new location
        if (mapRef) {
          mapRef.panTo(newLocation);
          mapRef.setZoom(15);
        }

        // Automatically search for parking near this location
        setHasSearched(true);
        handleSearch(newLocation);
      });
    }
  }, [isLoaded]);

  // Button styles
  const buttonStyles = `
    .action-button {
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
    }

    .action-button::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(39, 28, 28, 0.18);
        transform: translateX(-100%);
        transition: transform 0.3s ease;
    }

    .action-button:hover::after {
        transform: translateX(0);
    }
`;
  // Ajoutez cette balise style dans votre composant
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = buttonStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Add parking markers effect
  useEffect(() => {
    if (map.current && filteredParkings.length > 0) {
      // Remove existing markers
      if (markersRef.current.parkingMarkers) {
        markersRef.current.parkingMarkers.forEach(marker => marker.remove());
      }
      markersRef.current.parkingMarkers = [];

      // Add markers for filtered parking locations
      filteredParkings.forEach(parking => {
        const el = document.createElement('div');
        el.className = 'parking-marker';
        el.innerHTML = `
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg transform hover:scale-110 transition-transform">
            P
          </div>
        `;

        // Create and store marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat(parking.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div class="p-2 max-w-sm">
                  <h3 class="font-bold text-lg">${parking.name}</h3>
                  <p class="text-sm text-gray-600 mb-2">${parking.address}</p>
                  <div class="mb-2">
                    <span class="font-semibold">Type:</span> ${parking.type}
                  </div>
                  <div class="mb-2">
                    <span class="font-semibold">Capacity:</span>
                    <br />
                    2W: ${parking.capacity.twoWheeler}
                    <br />
                    4W: ${parking.capacity.fourWheeler}
                    ${parking.capacity.lcv !== '0' ? `<br />LCV: ${parking.capacity.lcv}` : ''}
                    ${parking.capacity.hmv !== '0' ? `<br />HMV: ${parking.capacity.hmv}` : ''}
                  </div>
                  <div class="text-sm text-gray-600">
                    ${parking.freeParking ? 
                      '<span class="text-green-600 font-semibold">Free Parking Available</span>' : 
                      `Price Category: ${parking.pricing}`
                    }
                  </div>
                </div>
              `)
          )
          .addTo(map.current);

        // Add click handler
        el.addEventListener('click', () => {
          setActiveParking(parking);
        });

        // Store marker reference
        markersRef.current.parkingMarkers.push(marker);
      });
    }
  }, [filteredParkings, map.current]);
  // Par :
  const renderSearchInput = () => (
    <div className="flex-1">
      {isLoaded ? (
        <div ref={searchBoxRef} className="w-full">
          {/* Mapbox Geocoder will be injected here */}
        </div>
      ) : (
        <input
          type="text"
          className="bg-transparent outline-none border-none shadow-none..."
          placeholder="Loading..."
          disabled
        />
      )}
    </div>
  );

  if (!isLoaded)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Google Maps...</p>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col h-full">
      {/* Show login reminder popup if needed */}
      {showLoginReminder && (
        <LoginReminderPopup onClose={() => setShowLoginReminder(false)} />
      )}

      {/* Show popup if visible */}
      {showPopup && selectedParking && (
        <ParkingDetailsPopup
          parking={selectedParking}
          onClose={handleClosePopup}
        />
      )}

      {/* Horizontal Search Form */}
      <div className="bg-gray-100 py-3 mb-4 rounded-lg shadow-md">
        {/* Display validation error message if present */}
        {dateError && (
          <div className="mx-4 mb-3 text-red-500 bg-red-100 border border-red-400 rounded px-3 py-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 inline mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {dateError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end px-4">
          {/* Destination Input - Update this part */}
          {/* Destination Input */}
          <div className="md:col-span-3">
            <label className="text-gray-700 text-xs mb-1 block font-medium">
              Destination
            </label>
            <div className="flex items-center gap-2 bg-white px-3 rounded-lg border transition-all hover:border-blue-500 h-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="text-gray-500"
                viewBox="0 0 16 16"
              >
                <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
              </svg>
              {renderSearchInput()}
              <button
                onClick={getUserLocation}
                className="p-1 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Search Button */}
          <div className="md:col-span-1">
            <button
              onClick={() => handleSearch()}
              className="bg-blue-600 text-white rounded-lg py-2 px-4 w-full h-10 hover:bg-blue-700 transition-colors flex items-center justify-center"
              disabled={isSearching}
            >
              {isSearching ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Search radius slider only (remove sort buttons from here) */}
        {hasSearched && (
          <div className="mt-3 px-4 flex items-center">
            <div className="flex items-center">
              <div className="text-sm text-gray-600 mr-2">Search radius:</div>
              <input
                type="range"
                min="1"
                max="30"
                value={searchRadius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="w-40 mx-2"
              />
              <div className="text-sm font-medium text-blue-600">
                {searchRadius} km
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map and Parking List */}
      <div className="flex flex-1 bg-gray-100 overflow-hidden">
        {/* Sidebar with Modern Parking List */}
        <div className="w-1/3 bg-gradient-to-br from-gray-50 to-white p-4 overflow-y-auto shadow-lg rounded-l-lg">
          <h2 className="text-xl font-bold mb-4">🚗 Available Parkings</h2>

          {loading ? (
            <div className="flex justify-center items-center p-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">{error}</div>
          ) : hasSearched && filteredParkings.length === 0 ? (
            <div className="text-gray-500 p-6 text-center bg-gray-50 rounded-lg">
              <div className="mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  fill="currentColor"
                  className="mx-auto text-gray-400"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium">No parking spots found</h3>
              <p className="mt-2">
                We couldn't find any parking spots near "{address}".
                <br />
                Try increasing the search radius or trying a different location.
              </p>
              <div className="mt-4 flex gap-2 justify-center">
                <button
                  onClick={() => {
                    handleRadiusChange(Math.min(searchRadius + 5, 30));
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                >
                  Increase radius
                </button>
                <button
                  onClick={() => {
                    setAddress("");
                    setFilteredParkings(parkings);
                    updateSearchData({ address: "" });
                    setHasSearched(false);
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
                >
                  Show all parkings
                </button>
              </div>
            </div>
          ) : !hasSearched && filteredParkings.length === 0 ? (
            <div className="text-center p-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                No parking spots found
              </h3>
              <p className="mt-2 text-gray-500">
                Try adjusting your search criteria or explore a different area.
              </p>
              <div className="mt-6 flex gap-3 justify-center">
                <button
                  onClick={() =>
                    handleRadiusChange(Math.min(searchRadius + 5, 30))
                  }
                  className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l6 0M12 9l0 6"
                    />
                  </svg>
                  Increase radius
                </button>
                <button
                  onClick={handleShowAllParkings}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Show all parkings
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredParkings.map((parking) => (
                <div
                  key={parking.id}
                  className={`group relative overflow-hidden rounded-xl shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl
                        ${
                          hoveredParking === parking.id
                            ? "ring-2 ring-blue-500 scale-[1.02]"
                            : "bg-white"
                        }`}
                  onMouseEnter={() => handleHover(parking)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleMarkerClick(parking)}
                >
                  {/* Background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Content Container */}
                  <div className="p-4">
                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {parking.name}
                          </h3>
                          <StatusIndicator
                            availability={
                              parking.availableSpots / parking.totalSpots
                            }
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {parking.distance} away
                        </p>
                      </div>

                      {/* Favorite Button */}
                      <button
                        className="group-hover:scale-110 transition-transform duration-300"
                        onClick={(e) => handleFavoriteToggle(parking.id, e)}
                      >
                        {isFavorite(parking.id) ? (
                          <svg
                            className="w-6 h-6 text-red-500 filter drop-shadow-md"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-6 h-6 text-gray-400 hover:text-red-500 transition-colors"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Price and Availability Section */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-blue-600">
                          {parking.price}
                        </span>
                        <span className="text-sm text-gray-500"></span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {parking.availableSpots}/{parking.totalSpots}
                        </div>
                        <div className="text-xs text-gray-500">
                          spots available
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                      <div
                        className="absolute top-0 left-0 h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${
                            (parking.availableSpots / parking.totalSpots) * 100
                          }%`,
                          backgroundColor: `${
                            parking.availableSpots / parking.totalSpots >= 0.5
                              ? "#22c55e"
                              : parking.availableSpots / parking.totalSpots >=
                                0.2
                              ? "#eab308"
                              : "#dc2626"
                          }`,
                          boxShadow: `0 0 10px ${
                            parking.availableSpots / parking.totalSpots >= 0.5
                              ? "#22c55e50"
                              : parking.availableSpots / parking.totalSpots >=
                                0.2
                              ? "#eab30850"
                              : "#dc262650"
                          }`,
                        }}
                      ></div>
                    </div>

                    {/* Weather Information */}
                    {parking.weather && (
                      <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg mb-4">
                        <img
                          src={parking.weather.icon}
                          alt="Weather"
                          className="w-10 h-10 object-contain"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold text-gray-900">
                              {parking.weather.temperature}°C
                            </span>
                            <span className="text-sm text-gray-600">
                              {parking.weather.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>💧 {parking.weather.humidity}%</span>
                            <span>💨 {parking.weather.windSpeed} m/s</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 relative z-10">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleShowDetails(parking, e);
                          }}
                          className="flex-1 bg-white border border-blue-500 text-blue-500 py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBooking(parking, e);
                          }}
                          className="flex-1 bg-white border border-blue-500 text-blue-500 py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium cursor-pointer"
                        >
                          Book Now
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openGoogleMapsDirections(parking);
                        }}
                        className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
                          />
                        </svg>
                        Get Directions in Google Maps
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map container */}
        <div className="flex-1" style={{ position: 'relative' }}>
          {!isLoaded ? (
            <div className="flex justify-center items-center h-full bg-gray-200">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Google Maps...</p>
              </div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "calc(100vh - 90px)" }}
              center={mapCenter}
              zoom={userLocation ? 14 : 12}
              onLoad={(map) => {
                setMapRef(map);
                console.log("Google Map loaded successfully");
              }}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
              }}
            >
              {/* User location marker */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: "#4A90E2",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                  }}
                  title="Your Location"
                />
              )}

              {/* Parking markers */}
              {filteredParkings
                .filter(parking => {
                  // Validate coordinates
                  const lat = parseFloat(parking.latitude);
                  const lng = parseFloat(parking.longitude);
                  return !isNaN(lat) && !isNaN(lng) && 
                         lat >= -90 && lat <= 90 && 
                         lng >= -180 && lng <= 180;
                })
                .map((parking) => {
                  const lat = parseFloat(parking.latitude);
                  const lng = parseFloat(parking.longitude);
                  
                  return (
                    <Marker
                      key={parking.id}
                      position={{ lat, lng }}
                      onClick={() => handleMarkerClick(parking)}
                      icon={{
                        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(createCustomMarker("#22C55E")),
                        scaledSize: new window.google.maps.Size(40, 55),
                      }}
                      title={parking.name}
                    />
                  );
                })}

              {/* Active parking info window */}
              {activeParking && 
               !isNaN(parseFloat(activeParking.latitude)) && 
               !isNaN(parseFloat(activeParking.longitude)) && (
                <InfoWindow
                  position={{ 
                    lat: parseFloat(activeParking.latitude), 
                    lng: parseFloat(activeParking.longitude) 
                  }}
                  onCloseClick={() => setActiveParking(null)}
                >
                  <div className="p-3" style={{ maxWidth: "280px" }}>
                    <h3 className="font-bold text-lg mb-2">{activeParking.name}</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-600 font-semibold">₹{activeParking.price}</span>
                      <span className="text-gray-500 text-sm">{activeParking.distance}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {activeParking.availableSpots}/{activeParking.totalSpots} spots available
                    </div>
                    <button
                      onClick={() => openGoogleMapsDirections(activeParking)}
                      className="w-full bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      style={{ cursor: 'pointer' }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
                        />
                      </svg>
                      Get Directions
                    </button>
                  </div>
                </InfoWindow>
              )}

              {/* Directions */}
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: "#4A90E2",
                      strokeWeight: 4,
                      strokeOpacity: 0.8,
                    },
                  }}
                />
              )}
            </GoogleMap>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecLocation;