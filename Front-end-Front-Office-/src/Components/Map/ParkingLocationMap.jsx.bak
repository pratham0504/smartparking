import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, StandaloneSearchBox } from "@react-google-maps/api";
import { Spinner } from "react-bootstrap";
import { useGoogleMaps } from "../../context/GoogleMapsContext";
const defaultCenter = { lat: 19.076, lng: 72.8777 }; // Mumbai fallback
const mapContainerStyle = { width: "100%", height: "400px", borderRadius: "12px" };

const ParkingLocationMap = ({ position, address, onPositionChange, onAddressChange }) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  const searchBoxRef = useRef(null);
  const mapRef = useRef(null);
  const [isGeocodePending, setIsGeocodePending] = useState(false);

  const { isLoaded, loadError } = useGoogleMaps();

  const mapCenter = useMemo(() => {
    if (position?.lat !== undefined && position?.lng !== undefined) {
      return {
        lat: Number(position.lat),
        lng: Number(position.lng),
      };
    }
    return defaultCenter;
  }, [position?.lat, position?.lng]);

  const handleReverseGeocode = useCallback(async ({ lat, lng }) => {
    if (!apiKey) {
      console.warn("Missing Google Maps API key. Skipping reverse geocoding.");
      return;
    }

    try {
      setIsGeocodePending(true);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        onAddressChange?.(data.results[0].formatted_address);
      }
    } catch (error) {
      console.error("Reverse geocoding failed", error);
    } finally {
      setIsGeocodePending(false);
    }
  }, [apiKey, onAddressChange]);

  const updateLocation = useCallback((coords, skipGeocode = false) => {
    const rawLat = Number(coords.lat);
    const rawLng = Number(coords.lng);
    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) return;

    onPositionChange?.({ lat: rawLat, lng: rawLng });
    if (!skipGeocode) {
      handleReverseGeocode({ lat: rawLat, lng: rawLng });
    }
  }, [handleReverseGeocode, onPositionChange]);

  const handleMapClick = useCallback((event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    updateLocation({ lat, lng });
  }, [updateLocation]);

  const handleMarkerDragEnd = useCallback((event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    updateLocation({ lat, lng });
  }, [updateLocation]);

  const handlePlacesChanged = useCallback(() => {
    const places = searchBoxRef.current?.getPlaces();
    if (!places || places.length === 0) {
      return;
    }

    const place = places[0];
    if (!place.geometry?.location) {
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    updateLocation({ lat, lng }, true);
    onAddressChange?.(place.formatted_address || place.name || "");

    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(16);
    }
  }, [onAddressChange, updateLocation]);

  const handleMapLoad = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
  }, []);

  useEffect(() => {
    if (mapRef.current && position?.lat !== undefined && position?.lng !== undefined) {
      mapRef.current.panTo({ lat: Number(position.lat), lng: Number(position.lng) });
    }
  }, [position?.lat, position?.lng]);

  useEffect(() => {
    if (!address && position?.lat !== undefined && position?.lng !== undefined) {
      handleReverseGeocode({ lat: Number(position.lat), lng: Number(position.lng) });
    }
  }, [address, handleReverseGeocode, position?.lat, position?.lng]);

  if (loadError) {
    return <div className="p-4 bg-red-50 rounded-md text-red-600">Failed to load Google Maps.</div>;
  }

  if (!isLoaded) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={mapContainerStyle}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StandaloneSearchBox onLoad={(ref) => (searchBoxRef.current = ref)} onPlacesChanged={handlePlacesChanged}>
        <input
          type="text"
          placeholder="Search for a location in India"
          className="w-100 form-control shadow-sm"
          style={{ borderRadius: "12px" }}
        />
      </StandaloneSearchBox>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
  zoom={position?.lat !== undefined && position?.lng !== undefined ? 16 : 12}
        onClick={handleMapClick}
        onLoad={handleMapLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        }}
      >
        <Marker
          position={{ lat: Number(mapCenter.lat), lng: Number(mapCenter.lng) }}
          draggable
          onDragEnd={handleMarkerDragEnd}
        />
      </GoogleMap>

      {(address || isGeocodePending) && (
        <div className="text-muted text-sm">
          {isGeocodePending ? "Fetching address…" : `Selected address: ${address}`}
        </div>
      )}
    </div>
  );
};

export default ParkingLocationMap;
