/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapbox } from "../../../context/MapboxContext";
import { AuthContext } from '../../../AuthContext';
import { motion } from "framer-motion"; // Import framer-motion
import { getBackendUrl } from '../../../utils/backend';

const mapContainerStyle = { 
  width: "100%", 
  height: "400px",  // Increased height
  borderRadius: "12px",
  overflow: "hidden"
};

const defaultCenter = { lat: 36.8065, lng: 10.1815 };

const vehiculeOptions = [
  { value: "Moto", label: "Moto", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765730/moto_xdypx2.png" },
  { value: "Citadine", label: "City Car", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-ville_ocwbob.png" },
  { value: "Berline / Petit SUV", label: "Small SUV", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/wagon-salon_bj2j1s.png" },
  { value: "Familiale / Grand SUV", label: " Large SUV", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-familiale_rmgclg.png" },
  { value: "Utilitaire", label: "Utility vehicle", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-livraison_nodnzh.png" }
];

const featureIcons = {
  "Indoor Parking": "🏢",
  "Underground Parking": "🚇",
  "Unlimited Entrances & Exits": "🔄",
  "Extension Available": "⏱️"
};

const StatusIndicator = ({ availability }) => {
  const getStatusInfo = () => {
    if (availability >= 0.5) {
      return { 
        text: "Available", 
        color: "text-black",
        bgColor: "bg-gradient-to-r from-green-400 to-green-600",
        icon: "✓"
      };
    } else if (availability > 0.2) {
      return { 
        text: "Limited", 
        color: "text-black",
        bgColor: "bg-gradient-to-r from-yellow-400 to-yellow-600",
        icon: "⚠"
      };
    } else {
      return { 
        text: "Almost Full", 
        color: "text-black",
        bgColor: "bg-gradient-to-r from-red-400 to-red-600",
        icon: "!"
      };
    }
  };

  const status = getStatusInfo();
  return (
    <div className={`${status.bgColor} ${status.color} px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center shadow-lg transform hover:scale-105 transition-all duration-300`}>
      <span className="mr-2 text-lg">{status.icon}</span>
      {status.text}
    </div>
  );
};

const PricingCard = ({ icon, label, price }) => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 transition-all hover:shadow-xl hover:border-blue-100 transform hover:-translate-y-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <span className="text-2xl mr-3">{icon}</span>
        <span className="text-gray-700 font-medium">{label}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-2xl font-bold text-blue-600">₹{price}</span>
      </div>
    </div>
  </div>
);

const LoginPopup = ({ onClose }) => {
  const navigate = useNavigate();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Sign in Required</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            To proceed with your parking reservation, please sign in or create an account.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 text-black py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"            >
              <span className="mr-2">Sign In</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            
            <button
              onClick={() => navigate('/sign-up')}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 text-center">
          By signing in, you'll be able to manage your reservations and access exclusive features.
        </p>
      </div>
    </div>
  );
};

// Add this new component near the top with other component definitions
const TunisianPlate = ({ number, region = 'تونس' }) => {
  const formatNumber = (num) => {
    if (!num) return '';
    // Clean the number and pad with zeros if needed
    const cleaned = num.toString().replace(/\D/g, '');
    return cleaned.padStart(3, '0');
  };

  return (
    <div className="inline-flex items-center bg-white border-2 border-black rounded-lg px-4 py-2 font-bold">
      <span className="text-xl">{formatNumber(number)}</span>
      <span className="mx-2 text-gray-400">|</span>
      <span className="text-xl font-arabic">{region}</span>
    </div>
  );
};

// Add these utility functions
const formatPlateNumber = (value) => {
  if (!value) return '';
  // Remove any non-digit characters
  const cleaned = value.replace(/\D/g, '');
  // Limit to 4 digits
  return cleaned.slice(0, 4);
};

const validatePlateNumber = (number) => {
  const regex = /^\d{1,4}$/;
  return regex.test(number);
};

// Animated Card Component
const AnimatedCard = ({ children, className = "", delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${className}`}
  >
    {children}
  </motion.div>
);

// Section Header Component
const SectionHeader = ({ icon, title }) => (
  <div className="p-6 border-b border-gray-100">
    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
      <span className="text-3xl mr-3">{icon}</span>
      {title}
    </h2>
  </div>
);

const BookNow = ({ parkingData, onContinue }) => {
  const { id } = useParams();
  const [parking, setParking] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const { isAuthenticated } = useContext(AuthContext);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const { isLoaded } = useMapbox();
  const [plateNumber, setPlateNumber] = useState('');
  const [region] = useState('تونس'); // Default region

  // Add this helper function at the top with other constants
  const formatTunisianLicensePlate = (number, region) => {
    if (!number) return '';
    
    // Remove any non-digit characters
    const cleaned = number.toString().replace(/\D/g, '');
    
    // Format as Tunisian license plate (TUN XXXX)
    return `${cleaned} ${region}`;
  };
  
  const validateTunisianLicensePlate = (number) => {
    // Basic validation for Tunisian license plate format
    const regex = /^\d{1,4}$/;
    return regex.test(number.toString().replace(/\D/g, ''));
  };

  // Ajoutez cette fonction pour vérifier le token manuellement
  const checkAuthentication = () => {
    const token = localStorage.getItem('token');
    console.log("Token found:", token); // Debugging
    return !!token; // Retourne true si le token existe
  };

  useEffect(() => {
    if (parkingData) {
        console.log("📩 Données reçues via parkingData:", parkingData);

        const formattedData = {
            name: parkingData.name || parkingData.nameP,
            description: parkingData.description || "",
            position: {
                lat: parkingData.position?.lat || parkingData.lat,
                lng: parkingData.position?.lng || parkingData.lng
            },
            location: parkingData.location || "",
            pricing: {
                hourly: parseFloat(parkingData.pricing?.hourly || parkingData.pricing?.perHour || 0),
                daily: parseFloat(parkingData.pricing?.daily || parkingData.pricing?.perDay || 0),
                weekly: parseFloat(parkingData.pricing?.weekly || parkingData.pricing?.perWeek || 0),
                monthly: parseFloat(parkingData.pricing?.monthly || 0)
            },
            totalSpots: parkingData.totalSpots,
            availableSpots: parkingData.availableSpots,
            vehicleTypes: parkingData.vehicleTypes || ["Citadine", "Berline / Petit SUV"],
            features: parkingData.features || [],
            images: parkingData.images || []
        };

        console.log("📌 Données après formatage:", formattedData);

        setParking(formattedData);
        setLoading(false);
        return;
    }

    if (id) {
        axios.get(`${getBackendUrl()}/api/parkings/${id}`)
            .then(response => {
                console.log("📥 Données reçues depuis l'API:", response.data);

                const formattedData = {
                    name: response.data.name || response.data.nameP,
                    description: response.data.description || "",
                    position: {
                        lat: response.data.position?.lat || response.data.lat,
                        lng: response.data.position?.lng || response.data.lng
                    },
                    location: response.data.location || "",
                    pricing: {
                        hourly: parseFloat(response.data.pricing?.hourly || response.data.pricing?.perHour || 0),
                        daily: parseFloat(response.data.pricing?.daily || response.data.pricing?.perDay || 0),
                        weekly: parseFloat(response.data.pricing?.weekly || response.data.pricing?.perWeek || 0),
                        monthly: parseFloat(response.data.pricing?.monthly || 0)
                    },
                    totalSpots: response.data.totalSpots,
                    availableSpots: response.data.availableSpots,
                    vehicleTypes: response.data.vehicleTypes || ["Citadine", "Berline / Petit SUV"],
                    features: response.data.features || [],
                    images: response.data.images || []
                };

                console.log("📌 Données API après formatage:", formattedData);

                setParking(formattedData);
                setLoading(false);
            })
            .catch(error => {
                console.error("❌ Erreur lors de la récupération des détails:", error);
                setError("Impossible de charger les détails du parking.");
                setLoading(false);
            });
    }
}, [id, parkingData]);

useEffect(() => {
  if (isLoaded && mapContainer.current && parking) {
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [parking.position.lng, parking.position.lat],
      zoom: 15
    });

    // Ajouter le marqueur
    const el = document.createElement('div');
    el.className = 'parking-marker';
    el.innerHTML = `
      <svg width="30" height="45" viewBox="0 0 30 45">
      </svg>
    `;

    new mapboxgl.Marker(el)
      .setLngLat([parking.position.lng, parking.position.lat])
      .addTo(map.current);

    // Ajouter les contrôles de navigation
    map.current.addControl(new mapboxgl.NavigationControl());

    return () => map.current.remove();
  }
}, [isLoaded, parking]);

const TitleBox = ({ icon, children }) => (
  <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center space-x-2">
    <span className="text-xl">{icon}</span>
    <h2 className="font-semibold text-gray-800">{children}</h2>
  </div>
);

const ImageModal = () => {
  if (!selectedImage) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
      <div className="max-w-4xl max-h-screen overflow-auto" onClick={e => e.stopPropagation()}>
        <img src={selectedImage} alt="Parking view" className="max-w-full max-h-[90vh] object-contain" />
        <button 
          className="absolute top-4 right-4 bg-white rounded-full p-2 text-black hover:bg-gray-200"
          onClick={() => setSelectedImage(null)}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Function to handle reservation
const handleReservation = () => {
  const isUserAuthenticated = checkAuthentication();
  console.log("Manual auth check:", isUserAuthenticated); // Debugging
  
  if (!isUserAuthenticated) {
    console.log("User is not authenticated, showing login popup");
    setShowLoginPopup(true);
    return;
  }
  
  console.log("User is authenticated, proceeding with reservation");
  const parkingToUse = parkingData || parking;
  
  if (onContinue && parkingToUse) {
    onContinue(parkingToUse);
  } else {
    console.log("Selected parking data:", parkingData); // Utilisez parkingData au lieu de selectedParking
    navigate('/booking', { 
      state: { 
        parkingData: parkingToUse,
        step: 3 
      }
    });
  }
};

// Add this to your form handling or wherever you handle the plate number input
const handlePlateNumberChange = (e) => {
  const value = e.target.value;
  const formatted = formatPlateNumber(value);
  setPlateNumber(formatted);
};

if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;
if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">{error}</div>;

const availabilityPercentage = (parking.availableSpots / parking.totalSpots) * 100;

let availabilityColor = "bg-green-500";
if (availabilityPercentage < 20) {
  availabilityColor = "bg-red-500";
} else if (availabilityPercentage < 50) {
  availabilityColor = "bg-yellow-500";
}

// Display name with fallback
const parkingName = parking.name || parking.nameP || "Parking";
const parkingDescription = parking.description || "";
const parkingLocation = parking.location || "";



return (
  <div className="w-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 min-h-screen">
 {/* Header Section */}
 <motion.div 
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8 transform hover:shadow-3xl transition-all duration-300"
  >
    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 p-6 sm:p-12 relative">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl sm:text-5xl font-bold text-black mb-4 tracking-tight">{parkingName}</h1>
        {parkingLocation && (
          <p className="text-black/90 flex items-center justify-center text-lg sm:text-xl font-medium">
            <span className="mr-2">📍</span>
            {parkingLocation}
          </p>
        )}
      </div>
      
      {/* Status indicator positioned top-right */}
      <div className="absolute top-6 left-6 ">
        <StatusIndicator availability={parking.availableSpots / parking.totalSpots} />
      </div>
      
      {/* Reserve button positioned bottom-right */}
      <button 
        onClick={handleReservation}
        className="absolute bottom-6 right-6 bg-black text-white px-6 py-3 rounded-full font-semibold 
                  shadow-lg flex items-center space-x-2 hover:bg-blue-50 hover:text-black transition-all duration-300 
                  transform hover:scale-105"
      >
        <span>Reserve Now</span>
        <span className="text-xl">→</span>
      </button>
    </div>
  </motion.div>

  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8">
    {/* Main Content - 8/12 columns on desktop */}
    <div className="xl:col-span-8 space-y-6 sm:space-y-8">
      {/* Map Section - Takes priority */}
      <AnimatedCard delay={0.1}>
        <SectionHeader icon="🗺️" title="Location" />
        <div className="p-4 sm:p-6">
          <div ref={mapContainer} className="w-full h-[300px] sm:h-[400px] lg:h-[500px] rounded-lg overflow-hidden shadow-inner" />
        </div>
      </AnimatedCard>

 

      {/* Photos Section with enhanced grid */}
      <AnimatedCard delay={0.5}>
        <SectionHeader icon="📸" title="Parking Views" />
        <div className="p-4 sm:p-6">
          {parking?.images && parking.images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {parking.images.map((image, index) => (
                <motion.div 
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="group aspect-video overflow-hidden rounded-xl shadow-md cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image}
                    alt={`Parking view ${index + 1}`}
                    className="w-full h-full object-cover transform transition-transform group-hover:scale-110"
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <span className="text-4xl mb-4 block">📷</span>
              <p className="text-lg">No images available</p>
            </div>
          )}
        </div>
      </AnimatedCard>

      {/* Description Section */}
      {parkingDescription && (
        <AnimatedCard delay={0.6}>
          <SectionHeader icon="📝" title="Description" />
          <div className="p-6 sm:p-8">
            <p className="text-gray-700 leading-relaxed text-lg">{parkingDescription}</p>
          </div>
        </AnimatedCard>
      )}
    </div>

    {/* Sidebar - 4/12 columns on desktop */}
    <div className="xl:col-span-4 space-y-6 sm:space-y-8">
      {/* Availability Card */}
      <AnimatedCard delay={0.2}>
        <SectionHeader icon="🅿️" title="Availability" />
        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-700 text-lg">Current Capacity</span>
              <span className="text-2xl font-bold text-blue-600">{parking.availableSpots}/{parking.totalSpots}</span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(parking.availableSpots / parking.totalSpots) * 100}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full"
                style={{ 
                  background: availabilityPercentage >= 50 ? 'linear-gradient(to right, #22c55e, #16a34a)' : 
                            availabilityPercentage >= 20 ? 'linear-gradient(to right, #eab308, #ca8a04)' : 
                            'linear-gradient(to right, #dc2626, #b91c1c)'
                }}
              />
            </div>
          </div>
          
          {/* Vehicle types accepted */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Accepted Vehicle Types</h3>
            <div className="grid grid-cols-2 gap-3">
              {vehiculeOptions
                .filter(option => parking.vehicleTypes?.includes(option.value))
                .map((vehicle) => (
                  <div key={vehicle.value} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <img src={vehicle.image} alt={vehicle.label} className="w-8 h-8 mr-2" />
                    <span className="text-sm">{vehicle.label}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Pricing Card */}
      <AnimatedCard delay={0.4}>
        <SectionHeader icon="💰" title="Pricing" />
        <div className="p-4 sm:p-6 space-y-4">
          {/* Hourly Rate */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">⏱️</span>
                <span className="text-gray-700 font-medium">Per Hour</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-bold text-blue-600">{parking.pricing?.hourly || parking.pricing?.perHour || 0} INR</span>
              </div>
            </div>
          </motion.div>
          
          {/* Daily Rate */}
          {(parking.pricing?.daily > 0 || parking.pricing?.perDay > 0) && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📅</span>
                  <span className="text-gray-700 font-medium">Per Day</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-bold text-blue-600">{parking.pricing?.daily || parking.pricing?.perDay} INR</span>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Weekly Rate */}
          {(parking.pricing?.weekly > 0 || parking.pricing?.perWeek > 0) && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📆</span>
                  <span className="text-gray-700 font-medium">Per Week</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-bold text-blue-600">{parking.pricing?.weekly || parking.pricing?.perWeek} INR</span>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Monthly Rate */}
          {parking.pricing?.monthly > 0 && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📋</span>
                  <span className="text-gray-700 font-medium">Per Month</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-bold text-blue-600">{parking.pricing?.monthly} INR</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </AnimatedCard>

      {/* Features Card */}
      {parking.features && parking.features.length > 0 && (
        <AnimatedCard delay={0.5}>
          <SectionHeader icon="✨" title="Features" />
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parking.features.map((feature) => (
                <motion.div
                  key={feature}
                  whileHover={{ scale: 1.03 }}
                  className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100 transition-colors hover:bg-gray-100"
                >
                  <span className="mr-2 text-lg">{featureIcons[feature] || "✓"}</span>
                  <span className="text-sm text-gray-700">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedCard>
      )}
      
    
    </div>
  </div>

  {/* Image Modal */}
  {selectedImage && <ImageModal />}

  {/* Login Popup */}
  {showLoginPopup && (
    <LoginPopup onClose={() => setShowLoginPopup(false)} />
  )}
</div>
);
};
export default BookNow;