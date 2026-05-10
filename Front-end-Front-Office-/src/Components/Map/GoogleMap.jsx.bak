import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '../../context/GoogleMapsContext';
import { parkingLocations as defaultParkingLocations } from '../../data/parkingLocations';

const MapComponent = ({ center, zoom = 13 }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const defaultCenter = { lat: 19.1663, lng: 72.9535 }; // Centered on Mulund
  const mapStyles = {
    height: "400px",
    width: "100%",
    borderRadius: "20px"
  };

  const customMapStyle = [
    {
      "featureType": "landscape",
      "stylers": [
        { "color": "#f5f5f5" }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [
        { "color": "#ffffff" }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [
        { "color": "#9ca5b3" }
      ]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [
        { "color": "#c9e9f0" }
      ]
    },
    {
      "featureType": "poi",
      "stylers": [
        { "visibility": "off" }
      ]
    },
    {
      "featureType": "transit",
      "stylers": [
        { "visibility": "off" }
      ]
    }
  ];

  const { isLoaded, userLocation } = useGoogleMaps();
  const [directions, setDirections] = useState(null); // Store directions
  const [distances, setDistances] = useState([]);

  // Function to calculate distance between two points using the Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  useEffect(() => {
    if (userLocation && markers.length > 0) {
      const results = markers.map(marker => ({
        ...marker,
        distance: calculateDistance(userLocation.lat, userLocation.lng, marker.position.lat, marker.position.lng).toFixed(1) + ' km',
      }));
      setDistances(results);
    }
  }, [userLocation, markers]);

  const handleMarkerClick = (marker) => {
    if (userLocation) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: userLocation,
          destination: marker.position,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.error(`error fetching directions ${result}`);
          }
        }
      );
    }
  };

  if (!isLoaded) {
    return <div style={mapStyles}>Loading...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={mapStyles}
      zoom={zoom}
      center={center || defaultCenter}
      options={{
        styles: customMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: true,
        backgroundColor: '#f5f5f5',
      }}
    >
      {defaultParkingLocations.map((location, index) => (
        <Marker
          key={index}
          position={location.position}
          title={location.name}
          onClick={() => setSelectedLocation(location)}
          icon={{
            url: location.availableSpots > 0 
              ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png" 
              : "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: new window.google.maps.Size(40, 40)
          }}
        />
      ))}
      
      {selectedLocation && (
        <InfoWindow
          position={selectedLocation.position}
          onCloseClick={() => setSelectedLocation(null)}
        >
          <div className="p-3">
            <h3 className="text-lg font-bold">{selectedLocation.name}</h3>
            <p className="text-sm text-gray-600">{selectedLocation.address}</p>
            <div className="mt-2">
              <p className="text-green-600">Available: {selectedLocation.availableSpots}/{selectedLocation.totalSpots} spots</p>
              <p className="text-blue-600">₹{selectedLocation.pricePerHour}/hour</p>
            </div>
            <button 
              onClick={() => handleMarkerClick(selectedLocation)}
              className="mt-2 bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600"
            >
              Get Directions
            </button>
          </div>
        </InfoWindow>
      )}

      {userLocation && (
        <Marker 
          position={userLocation}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            scaledSize: new window.google.maps.Size(40, 40)
          }}
        />
      )}

      {directions && <DirectionsRenderer directions={directions} />}
      {directions && (
        <DirectionsRenderer
          directions={directions}
        />
      )}
    </GoogleMap>
  );
};

export default MapComponent;
