/* eslint-disable no-unused-vars */
import React, {
    Fragment,
    useState,
    useEffect,
    useRef,
    useCallback,
  } from "react";
  import { Col, Container, Form, Row } from "react-bootstrap";
  import HowItWorks from "../Components/Pages/HowItWorks";
  import GridInfo from "../Components/Pages/GridInfo";
  import { useNavigate } from "react-router-dom";
  import DatePicker from "react-datepicker";
  import "react-datepicker/dist/react-datepicker.css";
  import LoadingPopup from "../Components/LoadingPopup";
  import mapboxgl from "mapbox-gl";
  import "mapbox-gl/dist/mapbox-gl.css";
  import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
  import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
  import { useSearch } from "../context/SearchContext";
  import { useMapbox } from "../context/MapboxContext";
  import axios from "axios";
  
  const Homepage = () => {
    const navigate = useNavigate();
    const { searchData, updateSearchData } = useSearch();
    const { isLoaded } = useMapbox();
  
    // Loading popup state
    const [isSearching, setIsSearching] = useState(false);
  
    // Get values from context or use defaults
    const [toogleTab, settoogleTab] = useState(searchData.toogleTab);
    const [vehicleType, setVehicleType] = useState(searchData.vehicleType);
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
    const [focusedVehicleIndex, setFocusedVehicleIndex] = useState(-1);
    const dropdownRef = useRef(null);
  
    // Date and time states
    const [address, setAddress] = useState(searchData.address || "");
    const [location, setLocation] = useState(searchData.location);
    const [startDate, setStartDate] = useState(searchData.startDate);
    const [endDate, setEndDate] = useState(searchData.endDate);
    const [startTime, setStartTime] = useState(searchData.startTime || "14:41");
    const [endTime, setEndTime] = useState(searchData.endTime || "15:41");
    const [errors, setErrors] = useState({});
    // Add this inside your component
    const [nearbyParkings, setNearbyParkings] = useState([]);
    const [isLoadingParkings, setIsLoadingParkings] = useState(false);
    const [parkingError, setParkingError] = useState(null);
    const [currentParkingIndex, setCurrentParkingIndex] = useState(0);
    // Validate form fields
    const validateForm = () => {
      const newErrors = {};
      const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      if (!address) newErrors.address = "Address is required";
      if (!vehicleType) newErrors.vehicleType = "Vehicle type is required";
      if (!startDate) newErrors.startDate = "Start date is required";
      if (!endDate) newErrors.endDate = "End date is required";
      if (!startTime) newErrors.startTime = "Start time is required";
      if (!endTime) newErrors.endTime = "End time is required";
      if (startDate && startDate < now)
        newErrors.startDate = "Start date cannot be in the past";
      if (endDate && endDate < now)
        newErrors.endDate = "End date cannot be in the past";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };
    const goToPreviousParking = () => {
      setCurrentParkingIndex((prev) =>
        prev === 0 ? nearbyParkings.length - 1 : prev - 1
      );
    };
    const goToNextParking = () => {
      setCurrentParkingIndex((prev) =>
        prev === nearbyParkings.length - 1 ? 0 : prev + 1
      );
    };
    const fetchNearbyParkings = useCallback(async (lat, lng) => {
      setIsLoadingParkings(true);
      setParkingError(null);
      
      // Make sure we have valid coordinates
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.error("Invalid coordinates:", { lat, lng });
        setParkingError("Invalid location coordinates");
        setIsLoadingParkings(false);
        return;
      }
    
      // Convert to numbers to ensure proper format
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      console.log("Fetching with coords:", { latitude, longitude });
      
      try {
        // Make the API request with proper parameters
        const response = await axios.get(
          // Try the correct endpoint - remove /parkings if it's already in the base URL
          `http://localhost:3001/parkings/api/parkings/nearby`,
          {
            params: {
              lat: latitude,
              lng: longitude,
              limit: 10,
            },
            // Add timeout to prevent long hanging requests
            timeout: 10000
          }
        );
        
        if (response.data && Array.isArray(response.data)) {
          setNearbyParkings(response.data);
        } else {
          console.warn("Unexpected response format:", response.data);
          setNearbyParkings([]);
        }
      } catch (error) {
        console.error("Error fetching nearby parkings:", error);
        
        // Better error messaging based on the error type
        if (error.code === "ECONNABORTED") {
          setParkingError("Request timed out. Please try again.");
        } else if (error.response) {
          console.error("Error details:", {
            data: error.response.data,
            status: error.response.status
          });
          
          if (error.response.status === 500) {
            setParkingError("Server error. The system is currently unavailable.");
          } else {
            setParkingError(`Error: ${error.response.data.message || "Failed to load nearby parkings"}`);
          }
        } else if (error.request) {
          setParkingError("No response from server. Please check your connection.");
        } else {
          setParkingError("An unexpected error occurred.");
        }
      } finally {
        setIsLoadingParkings(false);
      }
    }, []);
    // Handle search form submission
    const handleSearch = () => {
      // Save all form data to the context without validation
      updateSearchData({
        toogleTab,
        address,
        location,
        vehicleType,
        startDate,
        endDate,
        startTime,
        endTime,
      });
  
      // Show loading popup
      setIsSearching(true);
  
      // Navigate to the booking page after delay
      setTimeout(() => {
        setIsSearching(false);
        navigate("/booking");
      }, 2000); // 2 seconds delay
    };
  
    const dataProfile = [
      {
        img: "./../images/Tunis.png",
        name: "5 parking lots available ",
        Detail: ["Centre Vill", "..", "...", "...", "..."],
      },
      {
        img: "./../images/Tunis.png",
        name: "5 parking lots available ",
        Detail: ["Centre Vill", "..", "...", "...", "..."],
      },
      {
        img: "./../images/Tunis.png",
        name: "5 parking lots available ",
        Detail: ["Centre Vill", "..", "...", "...", "..."],
      },
      {
        img: "./../images/Tunis.png",
        name: "5 parking lots available ",
        Detail: ["Centre Vill", "..", "...", "...", "..."],
      },
    ];
  
    const dataCars = [
      {
        img: "./../images/car (4).png",
        name: "Luxury Model Y",
        desc: "Stylish SUV - Smooth driving Comfortable and Spacious",
        detail: ["Up to 533km range", "Autopilot included", "AWD"],
      },
      {
        img: "./../images/car (5).png",
        name: "Luxury Model Z",
        desc: "Stylish SUV - Smooth driving Comfortable and Spacious",
        detail: ["Up to 533km range", "Autopilot included", "AWD"],
      },
      {
        img: "./../images/car (6).png",
        name: "Luxury Model M",
        desc: "Stylish SUV - Smooth driving Comfortable and Spacious",
        detail: ["Up to 533km range", "Autopilot included", "AWD"],
      },
      {
        img: "./../images/car (1).png",
        name: "Luxury Model Z",
        desc: "Stylish SUV - Smooth driving Comfortable and Spacious",
        detail: ["Up to 533km range", "Autopilot included", "AWD"],
      },
      {
        img: "./../images/car (2).png",
        name: "Luxury Model L",
        desc: "Stylish SUV - Smooth driving Comfortable and Spacious",
        detail: ["Up to 533km range", "Autopilot included", "AWD"],
      },
      {
        img: "./../images/car (3).png",
        name: "Luxury Model S",
        desc: "Stylish SUV - Smooth driving Comfortable and Spacious",
        detail: ["Up to 533km range", "Autopilot included", "AWD"],
      },
    ];
  
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
  
    // Function to handle vehicle selection and close dropdown
    const handleVehicleSelect = (id) => {
      setVehicleType(id);
      setShowVehicleDropdown(false);
      setFocusedVehicleIndex(-1);
    };
  
    // Get selected vehicle name
    const getSelectedVehicleName = () => {
      const selected = vehicleTypes.find((type) => type.id === vehicleType);
      return selected ? selected.name : "Select vehicle type";
    };
  
    // Handle keyboard navigation in dropdown
    const handleVehicleKeyDown = (e) => {
      if (!showVehicleDropdown) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          setShowVehicleDropdown(true);
          setFocusedVehicleIndex(0);
          e.preventDefault();
        }
        return;
      }
  
      switch (e.key) {
        case "Escape":
          setShowVehicleDropdown(false);
          setFocusedVehicleIndex(-1);
          break;
        case "ArrowDown":
          setFocusedVehicleIndex((prevIndex) =>
            prevIndex < vehicleTypes.length - 1 ? prevIndex + 1 : 0
          );
          e.preventDefault();
          break;
        case "ArrowUp":
          setFocusedVehicleIndex((prevIndex) =>
            prevIndex > 0 ? prevIndex - 1 : vehicleTypes.length - 1
          );
          e.preventDefault();
          break;
        case "Enter":
        case " ":
          if (focusedVehicleIndex >= 0) {
            handleVehicleSelect(vehicleTypes[focusedVehicleIndex].id);
          }
          e.preventDefault();
          break;
        default:
          break;
      }
    };
  
    // Scroll focused item into view
    useEffect(() => {
      if (dropdownRef.current && focusedVehicleIndex >= 0) {
        const focusedItem = dropdownRef.current.children[focusedVehicleIndex];
        if (focusedItem) {
          focusedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    }, [focusedVehicleIndex]);
  
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
          setFocusedVehicleIndex(-1);
        }
      };
  
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showVehicleDropdown]);
  
    // Référence pour le conteneur de recherche
    const searchBoxRef = useRef(null);
  
    // Mise à jour de l'effet pour initialiser l'autocomplete Mapbox
    useEffect(() => {
      if (isLoaded && searchBoxRef.current) {
        // Créer une carte temporaire masquée pour le geocoder
        const tempMap = new mapboxgl.Map({
          container: document.createElement("div"), // Conteneur temporaire
          style: "mapbox://styles/mapbox/streets-v11",
          center: [72.8777, 19.0760], // Mumbai coordinates
          zoom: 13,
        });
  
        const geocoder = new MapboxGeocoder({
          accessToken: mapboxgl.accessToken,
          mapboxgl: mapboxgl,
          placeholder: "Enter your destination",
          countries: "in", // Restrict to India
          language: "en", // English language
          marker: false,
          clearOnBlur: false,
          clearAndBlurOnEsc: false,
          flyTo: false,
          proximity: {
            longitude: 72.8777,
            latitude: 36.8,
          },
        });
  
        // Ajouter les styles personnalisés
        const style = document.createElement("style");
        style.textContent = `
                  .mapboxgl-ctrl-geocoder {
                      width: 100% !important;
                      max-width: none !important;
                      background: transparent !important;
                      box-shadow: none !important;
                      border: none !important;
                  }
                  .mapboxgl-ctrl-geocoder input {
                      background: transparent !important;
                      color:rgb(255, 255, 255) !important;
                      padding: 0 !important;
                      height: 54px !important;
                      font-size: 14px !important;
                  }
                  .mapboxgl-ctrl-geocoder input::placeholder {
                      color: #A3A3A3 !important;
                  }
                  .mapboxgl-ctrl-geocoder--icon {
                      display: none !important;
                  }
                  .mapboxgl-ctrl-geocoder--button {
                      display: none !important;
                  }
                  .mapboxgl-ctrl-geocoder--suggestion {
                      color: #333333;
                      padding: 8px 12px;
                  }
                  .mapboxgl-ctrl-geocoder--suggestion:hover {
                      background-color: #f0f0f0;
                  }
                  .mapboxgl-ctrl-geocoder--suggestion-title {
                      font-weight: bold;
                  }
              `;
        document.head.appendChild(style);
  
        // Gestionnaire de résultat
        geocoder.on("result", (e) => {
          const newLocation = {
            lat: e.result.center[1],
            lng: e.result.center[0],
          };
          setLocation(newLocation);
          setAddress(e.result.place_name);
          updateSearchData({
            address: e.result.place_name,
            location: newLocation,
          });
          
          // Force the geocoder input to keep the selected text
          const geocoderInput = searchBoxRef.current.querySelector("input");
          if (geocoderInput) {
            geocoderInput.value = e.result.place_name;
          }
        });
  
        // Remplacer l'input existant par le geocoder
        const searchContainer = searchBoxRef.current;
        searchContainer.innerHTML = "";
        searchContainer.appendChild(geocoder.onAdd(tempMap));
        
        // Set initial value if we have a saved address
        if (address) {
          const geocoderInput = searchContainer.querySelector("input");
          if (geocoderInput) {
            geocoderInput.value = address;
          }
        }
  
        return () => {
          geocoder.onRemove();
          tempMap.remove();
          document.head.removeChild(style);
        };
      }
    }, [isLoaded, updateSearchData, address]);

  
    // Dans le rendu, remplacer le Form.Control par notre nouvelle référence
   useEffect(() => {
    // Get user's current location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Fix: position.coords provides "longitude", not "lng"
          const { latitude, longitude } = position.coords;
          fetchNearbyParkings(latitude, longitude);
        },
        (error) => {
          console.error("Error getting user location:", error);
          // Fallback to default India location (Mumbai)
          fetchNearbyParkings(19.0760, 72.8777);
        }
      );
    } else {
      // Fallback to default India location (Mumbai) if geolocation not available
      fetchNearbyParkings(19.0760, 72.8777);
    }
  }, [fetchNearbyParkings]);

   const renderSearchInput = () => (
      <div
        className={`flex items-center gap-2 bg-[#ffffff1a] px-3 rounded-[16px] w-full transition-all hover:bg-[#ffffff26]`}
      >
        <img src="./../images/icon.svg" alt="" />
        <div
          ref={searchBoxRef}
          className="bg-transparent outline-none border-none shadow-none focus:shadow-none focus:bg-transparent focus:outline-none focus:border-none text__14 !text-Mwhite placeholder-[#A3A3A3] h-[54px] px-0 w-full"
        >
          <Form.Control
            type="text"
            className="bg-transparent outline-none border-none shadow-none focus:shadow-none focus:bg-transparent focus:outline-none focus:border-none text-white placeholder-[#A3A3A3] h-[54px] px-0 w-full"
            placeholder="Enter your destination"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
            }}
          />
        </div>
      </div>
    );
  
    return (
      <Fragment>
        {/* Enhanced Loading Popup */}
        <LoadingPopup
          isVisible={isSearching}
          message="We are looking for a place for you"
        />
  
        {/* start:hero */}
        <section className="relative overflow-hidden min-h-screen bg-[#010101] flex flex-wrap pb-0 mt-[-100px] pt-[65px]">
          <img
            src="./../images/img (1).png"
            className="absolute left-0 top-0 w-full h-full object-cover object-top hidden md:block"
            alt=""
          />
          <Container className="relative z-[2] w-full flex flex-col h-full">
            <Row className="flex-grow items-center">
              <Col md={6} lg={6} className="mt-8 md:mt-0 mb-6 md:mb-0">
                <p className="text__18 text-Mgreen mb-2">CAR PARKING</p>
                <h1 className="font-bold text__48 text-Mwhite mb-4">
                  Find Convenient and Affordable Parking
                </h1>
                <p className="text__18 text-[#A3A3A3] mb-4 md:mb-0">
                  Reserve your parking spot by the hour, day, or month with ease.
                  Book in advance or rent your space and enjoy seamless parking in
                  private residential, hotel, or business lots.
                </p>
                <p className="text__18 text-[#A3A3A3] hidden md:block">
                  Benefit from competitive rates in city centers, train stations,
                  and airports across India. Join our community and experience
                  stress-free parking with thousands of satisfied members.
                </p>
              </Col>
  
              <Col
                md={7}
                lg={6}
                className="bg-[#00000080] backdrop-blur-sm rounded-lg p-4 shadow-lg"
              >
                <div className="flex items-center text-center mb-4 border-b border-[#333]">
                  <div
                    onClick={() => settoogleTab("On time")}
                    className={
                      "py-3 cursor-pointer md:min-w-[140px] text__16 text-Mwhite w-full md:w-auto " +
                      (toogleTab === "On time"
                        ? "border-b-2 border-solid border-Mgreen -mb-px"
                        : "opacity-50")
                    }
                  >
                    On time
                  </div>
                </div>
  
                {toogleTab === "On time" ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap md:flex-nowrap gap-4">
                      <div className="flex flex-col w-full md:w-[50%]">
                        {renderSearchInput()}
                      </div>
                    </div>
  
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className={`font-medium text__16 text-Mwhite rounded-[24px] border-Mblack bg-Mblack hover:bg-Mblack/90 active:bg-Mblack/80 transition-all btnClass w-full md:w-auto px-8 ${
                        isSearching ? "opacity-75 cursor-not-allowed" : ""
                      }`}
                    >
                      {isSearching ? (
                        <>
                          <span className="inline-block mr-2 animate-spin">
                            ⟳
                          </span>
                          Searching...
                        </>
                      ) : (
                        "Search"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap md:flex-nowrap gap-4">
                      <div className="flex flex-col w-full md:w-[50%]">
                        {renderSearchInput()}
                      </div>
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className={`font-medium text__16 text-Mwhite rounded-[24px] border-Mblack bg-Mblack hover:bg-Mblack/90 active:bg-Mblack/80 transition-all btnClass w-full md:w-auto px-8 ${
                        isSearching ? "opacity-75 cursor-not-allowed" : ""
                      }`}
                    >
                      {isSearching ? (
                        <>
                          <span className="inline-block mr-2 animate-spin">
                            ⟳
                          </span>
                          Searching...
                        </>
                      ) : (
                        "Search"
                      )}
                    </button>
                  </div>
                )}
              </Col>
            </Row>
          </Container>
        </section>
        {/* end:hero */}
  
        <HowItWorks />
  
        <section className="bg-[#010101] py-12">
        <Container>
          <div className="text-center mb-8">
            <p className="text__18 mb-2 text-white">Find parking near </p>
            <h3 className="font-bold text__48 text-white mb-2">
              your destination
            </h3>
            {location && (
              <p className="text-[#A3A3A3] text__16">
                Showing nearest parking spots to {address || "your location"}
              </p>
            )}
          </div>

          {isLoadingParkings ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin text-white text-4xl mb-4">
                ⟳
              </div>
              <p className="text-white text__16">
                Loading nearby parking locations...
              </p>
            </div>
          ) : parkingError ? (
            <div className="text-center py-10">
              <p className="text-white text__16">{parkingError}</p>
            </div>
          ) : nearbyParkings.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white text__16">
                No parking spots found nearby. Try another location.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Navigation arrows */}
              <button
                onClick={goToPreviousParking}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-Mblack/80 text-white p-3 rounded-full hover:bg-Mblack transition-all"
                aria-label="Previous parking"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
                  />
                </svg>
              </button>

              <button
                onClick={goToNextParking}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-Mblack/80 text-white p-3 rounded-full hover:bg-Mblack transition-all"
                aria-label="Next parking"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
                  />
                </svg>
              </button>

              <Row className="gap-y-4 justify-center">
                {/* Display 4 parkings at a time or all if less than 4 */}
                {nearbyParkings
                  .slice(currentParkingIndex, currentParkingIndex + 4)
                  .map((parking, index) => (
                    <Col key={parking._id} className="col-6" lg={3}>
                      <div className="w-full border border-solid border-[#E5E5E5] p-2 sm:p-4 h-full bg-[#111]">
                        <div className="w-full h-[150px] sm:h-[200px] bg-[#FAFAFA] mb-3">
                          <img
                            src={
                              parking.images && parking.images.length > 0
                                ? parking.images[0]
                                : "./../images/Tunis.png"
                            }
                            className="w-full h-full object-cover"
                            alt={parking.name}
                          />
                        </div>
                        <div className="text-center">
                          <h5 className="font-bold text__20 mb-2 text-white">
                            {parking.name}
                          </h5>
                          <div className="text__16 text-[#A3A3A3] mb-2">
                            <p>{parking.address}</p>
                            <p>
                              {Math.round((parking.distance / 1000) * 10) / 10}{" "}
                              km away
                            </p>
                          </div>
                          <div className="bg-Mgreen/20 text-Mgreen px-3 py-1 rounded-full inline-block">
                            {parking.availableSpots} spots available
                          </div>
                          <button
                            onClick={() => {
                              setAddress(parking.address);
                              setLocation({
                                lat: parking.location.coordinates[1],
                                lng: parking.location.coordinates[0],
                              });
                              setErrors((prev) => ({ ...prev, address: "" }));
                            }}
                            className="w-full mt-3 font-medium text__14 text-Mwhite rounded-[24px] border-Mblack bg-Mblack hover:bg-Mblack/90 active:bg-Mblack/80 transition-all btnClass py-2"
                          >
                            Select this parking
                          </button>
                        </div>
                      </div>
                    </Col>
                  ))}
              </Row>

              {/* Pagination indicators */}
              <div className="flex justify-center mt-6 gap-2">
                {nearbyParkings.length > 4 &&
                  Array.from({
                    length: Math.ceil(nearbyParkings.length / 4),
                  }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentParkingIndex(index * 4)}
                      className={`w-3 h-3 rounded-full ${
                        Math.floor(currentParkingIndex / 4) === index
                          ? "bg-Mgreen"
                          : "bg-[#555]"
                      }`}
                      aria-label={`Go to page ${index + 1}`}
                    />
                  ))}
              </div>
            </div>
          )}
        </Container>
      </section>

      <section>
        <Container>
          <p className="text__18 mb-2">SMART PARKING, HASSLE-FREE</p>
          <h3 className="font-bold text__48 mb-8">
            The Future of Parking
            <br className="hidden sm:block" /> Is Here
          </h3>
          <GridInfo />
        </Container>
      </section>

      <section className="bg-Mgreen pb-0 relative overflow-hidden">
        <img
          src="./../images/patern.svg"
          className="absolute left-0 top-0 w-full h-full object-cover"
          alt=""
        />
        <Container className="text-center relative z-2">
          <p className="text__18 mb-2">NEWSLETTER</p>
          <h2 className="font-bold text__48 mb-8">
            Stay up to date on the <br /> latest news
          </h2>

          <div className="flex items-center gap-2 justify-center mb-10">
            <div className="flex items-center gap-2 px-3 w-full sm:w-auto sm:min-w-[335px] border border-solid !border-Mblack rounded-[24px]">
              <img src="./../images/sms.svg" alt="" />
              <Form.Control
                type="text"
                className="h-[52px] px-0 text__14 !text-Mblack placeholder:text-[#525252] outline-none bg-transparent border-none shadow-none focus:outline-none focus:bg-transparent focus:border-none focus:shadow-none"
                placeholder="Enter your email address"
              />
            </div>
            <div className="inline-block cursor-pointer font-medium text__16 text-Mwhite !rounded-[24px] !border-Mblack bg-Mblack btnClass !py-[14px]">
              Subscribe
            </div>
          </div>
        </Container>
      </section>
    </Fragment>
  );
};
export default Homepage;