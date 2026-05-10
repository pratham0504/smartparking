/* eslint-disable no-unused-vars */
import React from 'react';
import { Marker, Popup } from 'mapbox-gl';
import { formatCurrency } from '../../../utils/formatters';

const ParkingMarker = ({ parking, onClick }) => {
  const getPriceRangeText = (category) => {
    switch(category) {
      case 'A': return 'Premium Rate';
      case 'B': return 'Standard Rate';
      case 'C': return 'Economy Rate';
      default: return 'Rate information unavailable';
    }
  };

  const getCapacityText = (capacity) => {
    const parts = [];
    if (capacity.twoWheeler === "ALLOWED" || capacity.twoWheeler > 0) {
      parts.push("2W: Available");
    }
    if (capacity.fourWheeler > 0) {
      parts.push(`4W: ${capacity.fourWheeler} spots`);
    }
    if (capacity.lcv === "ALLOWED" || capacity.lcv > 0) {
      parts.push("LCV: Available");
    }
    if (capacity.hmv > 0) {
      parts.push(`HMV: ${capacity.hmv} spots`);
    }
    return parts.join(' | ');
  };

  return (
    <Marker
      longitude={parking.coordinates[0]}
      latitude={parking.coordinates[1]}
      anchor="bottom"
    >
      <div 
        onClick={() => onClick(parking)}
        className="cursor-pointer"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg transform hover:scale-110 transition-transform">
          P
        </div>
      </div>
      <Popup
        longitude={parking.coordinates[0]}
        latitude={parking.coordinates[1]}
        anchor="top"
        closeButton={true}
        closeOnClick={false}
      >
        <div className="p-2 max-w-sm">
          <h3 className="font-bold text-lg mb-1">{parking.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{parking.address}</p>
          <div className="mb-2">
            <span className="font-semibold">Type:</span> {parking.type}
            <br />
            <span className="font-semibold">Access:</span> {parking.access}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Capacity:</span>
            <br />
            {getCapacityText(parking.capacity)}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Pricing:</span> {getPriceRangeText(parking.pricing)}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Hours:</span> {parking.timing.start} - {parking.timing.end}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Payment:</span> {parking.paymentMode}
          </div>
          {parking.freeParking && (
            <div className="text-green-600 font-semibold">Free Parking Available</div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

export default ParkingMarker;