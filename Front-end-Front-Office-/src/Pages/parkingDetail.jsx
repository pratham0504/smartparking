import React, { useEffect, useState } from "react";
import axios from "axios";
import { getBackendUrl } from '../utils/backend';
import { useParams, useNavigate } from "react-router-dom";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";



const mapContainerStyle = { width: "100%", height: "300px" };
const defaultCenter = { lat: 19.0760, lng: 72.8777 }; // Default: Mumbai, India

const vehiculeOptions = [
    { value: "Moto", label: "Motorcycle", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765730/moto_xdypx2.png" },
    { value: "Citadine", label: "City Car", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-ville_ocwbob.png" },
    { value: "Berline / Petit SUV", label: "Sedan / Small SUV", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/wagon-salon_bj2j1s.png" },
    { value: "Familiale / Grand SUV", label: "Family / Large SUV", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-familiale_rmgclg.png" },
    { value: "Utilitaire", label: "Utility vehicle", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-livraison_nodnzh.png" }
];

const ParkingDetails = () => {
    const { id } = useParams();
    const [parking, setParking] = useState(null);
    const [mapRef, setMapRef] = useState(null);
    const [activeParking, setActiveParking] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [show3D, setShow3D] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    

    useEffect(() => {
        axios.get(`${getBackendUrl()}/parkings/parkings/${id}`)
            .then(response => {
                setParking(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Erreur lors de la récupération du parking :", error);
                setError("Impossible de charger les détails du parking.");
                setLoading(false);
            });
    }, [id]);
    const mapCenter = parking?.lat && parking?.lng ? { lat: parking.lat, lng: parking.lng } : defaultCenter;


    const TitleBox = ({ children }) => {
        return (
          <div className="py-3 px-5 bg-gray-100 rounded-t-lg">
            <h2 className="text-black font-extrabold text-xl text-center uppercase tracking-wide">
              {children}
            </h2>
          </div>
        );
      };
    const closeModal = () => {
        setSelectedImage(null);
    };

    if (loading) return <p className="text-center text-lg">🔄 Chargement des détails du parking...</p>;
    if (error) return <p className="text-center text-red-500 text-lg">⚠️ {error}</p>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Ligne 1 : Nom & Localisation */}
          <div className="bg-white rounded-xl shadow-md p-6 border text-center">
            <h1 className="text-3xl font-bold text-gray-800">{parking.nameP}</h1>
            <p className="text-gray-600 text-lg">{parking.location}</p>
          </div>
      
          {/* Ligne 2 : Carte & Véhicules acceptés */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 2: Carte Google */}
            <div className="bg-white rounded-xl shadow-md p-5 border">
              <TitleBox>📍 Localisation</TitleBox>
              <div className="mt-3 rounded-lg overflow-hidden">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  zoom={15}
                  center={mapCenter}
                  options={{ streetViewControl: false, mapTypeControl: false }}
                >
                  {parking?.lat && parking?.lng && <Marker position={mapCenter} />}
                </GoogleMap>
              </div>
            </div>
      
            {/* Box Véhicules acceptés */}
            <div className="bg-white rounded-xl shadow-md p-5 border flex-1 min-w-[300px]">
              <TitleBox>🚗 Véhicules acceptés</TitleBox>
              <div className="mt-4 flex gap-4 flex-wrap justify-center">
                {parking.vehicleTypes.length > 0 ? (
                  parking.vehicleTypes.map((type) => {
                    const vehicle = vehiculeOptions.find((v) => v.value === type);
                    return vehicle ? (
                      <div key={type} className="flex flex-col items-center text-center">
                        <img src={vehicle.image} alt={vehicle.label} className="w-14 h-14" />
                        <span className="text-sm text-gray-600">{vehicle.label}</span>
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="text-gray-500 text-sm text-center">Aucun véhicule spécifié</p>
                )}
              </div>
            </div>
          </div>
      
          {/* Ligne 3 : Tarification & Disponibilité */}
          <div className="flex flex-wrap gap-6">
            {/* Box Tarification */}
            <div className="bg-white rounded-xl shadow-md p-5 border flex-1 min-w-[300px]">
              <TitleBox>💰 Tarification</TitleBox>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-600 flex items-center"><span className="mr-2">⏱️</span> Per Hour</span>
                  <span className="text-xl font-bold text-blue-600">{parking.pricing?.perHour ?? "N/A"} INR</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-600 flex items-center"><span className="mr-2">📅</span> Per Day</span>
                  <span className="text-xl font-bold text-blue-600">{parking.pricing?.perDay ?? "N/A"} INR</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center"><span className="mr-2">🗓️</span> Per Week</span>
                  <span className="text-xl font-bold text-blue-600">{parking.pricing?.perWeek ?? "N/A"} INR</span>
                </div>
              </div>
            </div>
      
            {/* Box Disponibilité */}
            <div className="bg-white rounded-xl shadow-md p-5 border flex-1 min-w-[300px]">
              <TitleBox>🅿️ Disponibilité</TitleBox>
              <div className="p-5">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Places totales</span>
                  <span className="font-bold">{parking.totalSpots}</span>
                </div>
      
                {/* Barre de progression */}
                <div className="relative pt-1">
                  <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-gray-200">
                    <div
                      style={{ width: `${(parking.availableSpots / parking.totalSpots) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                    ></div>
                  </div>
                </div>
      
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Places disponibles</span>
                  <span className="text-2xl font-bold text-green-600">{parking.availableSpots}</span>
                </div>
              </div>
            </div>
          </div>
      
          {/* Ligne 4 : Images */}
          <div className="bg-white rounded-xl shadow-md p-5 border">
            <TitleBox>📸 Vue du Parking</TitleBox>
            <div className="mt-3">
              {parking.images?.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {parking.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Parking ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setSelectedImage(image)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center">Aucune image disponible</p>
              )}
            </div>
          </div>
      
        
        </div>
      );
  };
export default ParkingDetails;