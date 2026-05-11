/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { useMapbox } from "../../context/MapboxContext";
import { toast } from 'react-toastify';
import MapModal from '../Modals/MapModal';
import { io } from 'socket.io-client';
import { getBackendUrl } from '../../utils/backend';

const UserReservations = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [travelTimes, setTravelTimes] = useState({});
    const { isLoaded } = useMapbox();
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedRouteReservation, setSelectedRouteReservation] = useState(null);
    const socketRef = useRef(null);

    // Adding a ref to avoid redundant calculations
    const calculatedRoutes = React.useRef(new Set());

    useEffect(() => {
        const fetchReservations = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Token not found');
                }

                const response = await axios.get(
                    `${getBackendUrl()}/api/reservations/my-reservations`,
                    {
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                // Debug logging
                response.data.forEach(reservation => {
                    console.log("Parking data:", {
                        id: reservation._id,
                        parkingName: reservation.parkingId?.name,
                        position: reservation.parkingId?.position,
                        coordinates: reservation.parkingId?.coordinates,
                        lat: reservation.parkingId?.lat,
                        lng: reservation.parkingId?.lng
                    });
                });

                setReservations(response.data);
            } catch (err) {
                console.error("Loading error:", err);
                setError(err.response?.data?.message || 'Error loading reservations');
            } finally {
                setLoading(false);
            }
        };

        fetchReservations();
    }, []);

    useEffect(() => {
        const socket = io(getBackendUrl(), {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        const token = localStorage.getItem('token');
        if (token) {
            socket.emit('authenticate', token);
        }

        const handleReservationPaymentCompleted = (payload) => {
            if (!payload?.reservationId) {
                return;
            }

            const matchingReservation = reservations.find((reservation) => String(reservation._id) === String(payload.reservationId));
            if (!matchingReservation) {
                return;
            }

            toast.success('RFID payment confirmed. Opening your parking map.');
            setSelectedRouteReservation(matchingReservation);
            setIsMapModalOpen(true);
        };

        socket.on('reservation_payment_completed', handleReservationPaymentCompleted);

        return () => {
            socket.off('reservation_payment_completed', handleReservationPaymentCompleted);
            socket.disconnect();
        };
    }, [reservations]);

    // Add this utility conversion function
    const formatDuration = (minutes) => {
        if (minutes < 60) {
          return `${Math.round(minutes)} min`;
        } else {
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = Math.round(minutes % 60);
          return remainingMinutes > 0 
            ? `${hours}h ${remainingMinutes}min`
            : `${hours}h`;
        }
    };

    const calculateTravelTime = React.useCallback(async (reservation) => {
        if (calculatedRoutes.current.has(reservation._id)) {
            return null;
        }
      
        if (!isLoaded || !userLocation || !reservation.parkingId) {
            return null;
        }
      
        try {
            calculatedRoutes.current.add(reservation._id);
            
            const parkingPosition = reservation.parkingId.position;
            
            if (!parkingPosition?.lat || !parkingPosition?.lng) {
                return null;
            }
      
            // Get the token directly from the MapboxContext or environment
            const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
            
            if (!mapboxToken) {
                console.error("Mapbox token not available");
                return null;
            }

            // Properly format the URL with error handling
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${parkingPosition.lng},${parkingPosition.lat}?access_token=${mapboxToken}`;
            
            // Add timeout to prevent long-hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, { 
                method: 'GET',
                signal: controller.signal 
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Mapbox API returned ${response.status}: ${response.statusText}`);
            }
      
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const duration = data.routes[0].duration;
                const durationMinutes = duration / 60;
                const formattedDuration = formatDuration(durationMinutes);
                
                setTravelTimes(prev => ({
                    ...prev,
                    [reservation._id]: {
                        text: formattedDuration,
                        value: duration,
                        minutes: durationMinutes
                    }
                }));
                
                return formattedDuration;
            }
        } catch (error) {
            // Don't add to calculatedRoutes to allow retrying
            calculatedRoutes.current.delete(reservation._id);
            
            // More specific error handling
            if (error.name === 'AbortError') {
                console.error("Request timed out for travel time calculation");
            } else {
                console.error("Error calculating travel time:", error.message);
            }
        }
        return null;
    }, [isLoaded, userLocation]);

    // Modifying the geolocation effect
    useEffect(() => {
        if (!isLoaded || !navigator.geolocation) return;

        let mounted = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (!mounted) return;

                const userPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setUserLocation(userPos);
            },
            (error) => {
                console.error("Error getting user location:", error);
            }
        );

        return () => {
            mounted = false;
        };
    }, [isLoaded]);

    // Separate effect for travel time calculation
    useEffect(() => {
        if (!userLocation || !isLoaded || reservations.length === 0) return;

        // Reset calculated routes when user location changes
        calculatedRoutes.current.clear();

        // Calculate travel times sequentially
        const calculateTravelTimes = async () => {
            for (const reservation of reservations) {
                if (reservation.parkingId?.position) {
                    await calculateTravelTime(reservation);
                }
            }
        };

        calculateTravelTimes();
    }, [userLocation, isLoaded, reservations, calculateTravelTime]);

    const handleDelete = async (reservationId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Session expired. Please log in again.');
                return;
            }

         
            const response = await axios.delete(
                `${getBackendUrl()}/api/${reservationId}`,
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 200) {
                // Update local state
                setReservations(prevReservations => 
                    prevReservations.filter(res => res._id !== reservationId)
                );
                toast.success('Reservation deleted successfully');
            }
        } catch (err) {
            console.error("Error deleting reservation:", err);
            const errorMessage = err.response?.data?.message || 'Error deleting reservation';
            toast.error(errorMessage);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'accepted':
                return {
                    style: {
                        backgroundColor: '#d1fae5',
                        color: '#065f46'
                    },
                    label: 'confirmed'
                };
            case 'pending':
                return {
                    style: {
                        backgroundColor: '#fef3c7',
                        color: '#92400e'
                    },
                    label: 'pending'
                };
            default:
                return {
                    style: {
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c'
                    },
                    label: 'cancelled'
                };
        }
    };

    const getPaymentStatusColor = (status) => {
        switch(status) {
            case 'completed':
                return {
                    style: {
                        backgroundColor: '#d1fae5',
                        color: '#065f46'
                    },
                    label: 'paid'
                };
            case 'pending':
                return {
                    style: {
                        backgroundColor: '#fef3c7',
                        color: '#92400e'
                    },
                    label: 'pending'
                };
            case 'failed':
                return {
                    style: {
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c'
                    },
                    label: 'failed'
                };
            default:
                return {
                    style: {
                        backgroundColor: '#f3f4f6',
                        color: '#4b5563'
                    },
                    label: 'unknown'
                };
        }
    };

    const vehiculeOptions = [
        { value: "Moto", label: "Motorcycle", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765730/moto_xdypx2.png" },
        { value: "Citadine", label: "City Car", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-ville_ocwbob.png" },
        { value: "Berline / Petit SUV", label: "Small SUV", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/wagon-salon_bj2j1s.png" },
        { value: "Familiale / Grand SUV", label: "Large SUV", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-familiale_rmgclg.png" },
        { value: "Utilitaire", label: "Utility vehicle", image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-livraison_nodnzh.png" }
    ];
    
    const getVehicleIcon = (vehicleType) => {
        const matchedOption = vehiculeOptions.find(option =>
            vehicleType.toLowerCase().includes(option.value.toLowerCase())
        );
    
        if (matchedOption) {
            return (
                <img
                    src={matchedOption.image}
                    alt={matchedOption.label}
                    className="w-5 h-5 mr-1"
                />
            );
        }
    
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        );
    };

    const getPaymentMethodIcon = (method) => {
        switch(method) {
            case 'cash':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                );
            case 'online':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                );
            case 'fastag':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                );
            default:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const openGoogleMapsDirections = (reservation) => {
        console.log('🗺️ Opening Google Maps for reservation:', reservation);
        
        if (!reservation?.parkingId?.position) {
            console.error('❌ Missing parking position data');
            alert('Parking location data is not available');
            return;
        }

        const { lat, lng } = reservation.parkingId.position;
        console.log('📍 Parking coordinates:', { lat, lng });

        // Validate coordinates
        const destLat = parseFloat(lat);
        const destLng = parseFloat(lng);
        
        if (isNaN(destLat) || isNaN(destLng)) {
            console.error('❌ Invalid coordinates:', { lat, lng });
            alert('Invalid parking coordinates');
            return;
        }

        // Use parking name if available
        const parkingName = reservation.parkingId.name || 'Parking Location';
        console.log('🏢 Parking name:', parkingName);

        // Construct Google Maps directions URL
        const destination = `${destLat},${destLng}`;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=&travelmode=driving`;
        
        console.log('🔗 Opening URL:', url);

        try {
            const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
            
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                console.warn('⚠️ Popup blocked, falling back to clipboard');
                navigator.clipboard.writeText(url).then(() => {
                    alert(`Popup blocked! The Google Maps link has been copied to your clipboard:\n\n${parkingName}\nCoordinates: ${destLat}, ${destLng}\n\nPaste the link in your browser to get directions.`);
                }).catch(err => {
                    console.error('❌ Clipboard write failed:', err);
                    alert(`Popup blocked! Please allow popups or copy this URL:\n\n${url}`);
                });
            } else {
                console.log('✅ Google Maps opened successfully');
            }
        } catch (error) {
            console.error('❌ Error opening Google Maps:', error);
            alert('Could not open Google Maps. Please try again.');
        }
    };

    const handleShowRoute = (reservation) => {
        console.log('🚗 Route button clicked for reservation:', reservation);
        openGoogleMapsDirections(reservation);
    };

    const ReservationCard = React.memo(({ reservation }) => {
        const statusInfo = getStatusColor(reservation.status);
        const paymentStatusInfo = getPaymentStatusColor(reservation.paymentStatus);
        
        useEffect(() => {
            if (reservation.parkingId) {
                calculateTravelTime(reservation);
            }
        }, [reservation]);

        const renderTravelTime = () => {
            const travelTime = travelTimes[reservation._id];
            if (!travelTime) return null;
    
            return (
                <div className="mt-3 flex items-center text-gray-600 bg-gray-50 p-4 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Estimated travel time:</span>
                        <span className="text-lg font-semibold text-blue-600">{travelTime.text}</span>
                    </div>
                </div>
            );
        };

        const handleShowQRCode = () => {
            setSelectedReservation(reservation);
        };

        return (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 relative">
                    <div className="absolute top-0 right-0 mt-2 mr-2">
                        <span style={statusInfo.style} className="text-xs px-3 py-1 rounded-full font-semibold">
                            {statusInfo.label}
                        </span>
                    </div>
                    <h3 className="text-black text-xl font-semibold">{reservation.parkingId?.name || 'Parking'}</h3>
                    <p className="text-blue-100 text-sm opacity-90">
                    </p>
                </div>
                
                <div className="p-6">
                    <div className="flex justify-between mb-6 bg-gray-50 rounded-lg p-4">
                        <div className="text-center flex-1 border-r border-gray-200">
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Arrival</p>
                            <p className="font-medium text-gray-800">
                                {format(new Date(reservation.startTime), 'dd MMM yyyy', { locale: enUS })}
                            </p>
                            <p className="text-sm text-gray-700">
                                {format(new Date(reservation.startTime), 'HH:mm', { locale: enUS })}
                            </p>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Departure</p>
                            <p className="font-medium text-gray-800">
                                {format(new Date(reservation.endTime), 'dd MMM yyyy', { locale: enUS })}
                            </p>
                            <p className="text-sm text-gray-700">
                                {format(new Date(reservation.endTime), 'HH:mm', { locale: enUS })}
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-5">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div className="flex items-center text-gray-700">
                                {getVehicleIcon(reservation.vehicleType)}
                                <span className="text-sm">Vehicle</span>
                            </div>
                            <span className="font-medium text-gray-900">{reservation.vehicleType}</span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div className="flex items-center text-gray-700">
                                {getPaymentMethodIcon(reservation.paymentMethod)}
                                <span className="text-sm">Payment Method</span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-medium text-gray-900 mr-2">{reservation.paymentMethod === 'cash' ? 'Cash' : reservation.paymentMethod === 'fastag' ? 'FASTag RFID' : 'Online'}</span>
                                <span style={paymentStatusInfo.style} className="text-xs px-2 py-1 rounded-full font-semibold">
                                    {paymentStatusInfo.label}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div className="flex items-center text-gray-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm">Total Price</span>
                            </div>
                            <span className="font-semibold text-lg text-blue-700">₹{reservation.totalPrice}</span>
                        </div>

                        {reservation.matricule && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <div className="flex items-center text-gray-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                    </svg>
                                    <span className="text-sm">License Plate</span>
                                </div>
                                <span className="font-medium text-gray-900">{reservation.matricule}</span>
                            </div>
                        )}
                    </div>
                    
                    {renderTravelTime()}

                    <div className="flex space-x-2 mt-6">
                        <button
                            onClick={handleShowQRCode}
                            className="flex-1 bg-black border border-red-500 text-white py-2.5 px-4 rounded-lg hover:bg-red-50 transition-colors flex justify-center items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            QR Code
                        </button>
                        <a
                            href={reservation?.parkingId?.position?.lat && reservation?.parkingId?.position?.lng 
                                ? `https://www.google.com/maps/dir/?api=1&destination=${parseFloat(reservation.parkingId.position.lat)},${parseFloat(reservation.parkingId.position.lng)}&travelmode=driving`
                                : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-black border border-red-500 text-white py-2.5 px-4 rounded-lg hover:bg-red-50 transition-colors flex justify-center items-center"
                            onClick={(e) => {
                                if (!reservation?.parkingId?.position?.lat || !reservation?.parkingId?.position?.lng) {
                                    e.preventDefault();
                                    alert('Parking location data is not available');
                                }
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Route
                        </a>
                        <button
                            onClick={() => {
                                if (!reservation?.parkingId?._id) {
                                    toast.error('Parking data is not available');
                                    return;
                                }

                                window.open(`/parkingLiveView/${reservation.parkingId._id}`, '_blank', 'noopener,noreferrer');
                            }}
                            className="flex-1 bg-black border border-red-500 text-white py-2.5 px-4 rounded-lg hover:bg-red-50 transition-colors flex justify-center items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6l12-2v6l-12 2zm0 0v-6l-6-1v6l6 1zm12-8v8l-12 2" />
                            </svg>
                            Live Map
                        </button>
                        <button
                            onClick={() => handleDelete(reservation._id)}
                            className="flex-1 bg-black border border-red-500 text-white py-2.5 px-4 rounded-lg hover:bg-red-50 transition-colors flex justify-center items-center"
                        >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-5 w-5 mr-2" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    });

    const QRCodeModal = () => {
        const handlePrintQR = () => {
            const printWindow = window.open('', '', 'width=600,height=600');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Reservation QR Code - ${selectedReservation.parkingId.name}</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                            .qr-container { margin: 20px auto; }
                            .details { margin: 20px 0; text-align: left; max-width: 400px; margin: auto; }
                            .footer { margin-top: 20px; font-size: 12px; color: #666; }
                            h2 { color: #3B82F6; }
                            .details p { padding: 8px 0; border-bottom: 1px solid #eee; }
                        </style>
                    </head>
                    <body>
                        <h2>Parking Reservation - ${selectedReservation.parkingId.name}</h2>
                        <div class="qr-container">
                            <img src="${selectedReservation.qrCode}" alt="QR Code" style="max-width: 300px"/>
                        </div>
                        <div class="details">
                            <p><strong>Arrival Date:</strong> ${new Date(selectedReservation.startTime).toLocaleString()}</p>
                            <p><strong>Departure Date:</strong> ${new Date(selectedReservation.endTime).toLocaleString()}</p>
                            <p><strong>Vehicle Type:</strong> ${selectedReservation.vehicleType}</p>
                            <p><strong>Payment Method:</strong> ${selectedReservation.paymentMethod === 'cash' ? 'Cash' : 'Online'}</p>
                            <p><strong>Payment Status:</strong> ${selectedReservation.paymentStatus}</p>
                            <p><strong>Total Amount:</strong> ₹${selectedReservation.totalPrice}</p>
                        </div>
                        <div class="footer">
                            <p>Please present this QR code at the parking entrance</p>
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl animate-scaleIn">
                    <button 
                        onClick={() => setSelectedReservation(null)}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    
                    <h3 className="text-2xl font-bold mb-2 text-center text-gray-800">Reservation QR Code</h3>
                    <p className="text-center text-sm text-gray-600 mb-6">Parking {selectedReservation.parkingId.name}</p>
                    
                    <div className="bg-gradient-to-b from-blue-50 to-white p-6 rounded-xl mb-6 shadow-inner">
                        <img 
                            src={selectedReservation.qrCode} 
                            alt="QR Code" 
                            className="mx-auto w-64 h-64 object-contain"
                        />
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center text-blue-800 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Instructions</span>
                        </div>
                        <p className="text-blue-700 text-sm">
                            Present this QR code at the parking entrance to access your spot.
                        </p>
                    </div>
                    
                    <div className="flex space-x-3">
                        <button
                            onClick={handlePrintQR}
                            className="flex-1 py-3 px-4 bg-blue-600 text-black rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print
                        </button>
                        <button
                            onClick={() => setSelectedReservation(null)}
                            className="flex-1 py-3 px-4 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Loading animation
    if (loading) return (   
        <div className="flex flex-col justify-center items-center min-h-[500px]">   
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-4"></div>
            <p className="text-gray-500 font-medium">Loading your reservations...</p>
        </div>   
    );

    // Improved error message
    if (error) return (  
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto my-8">
            <div className="flex items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-red-800">Loading Error</h3>
            </div>
            <p className="text-red-600">{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-100 text-red-700 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors inline-flex items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
            </button>
        </div>  
    );

    // No reservations
    if (reservations.length === 0) return (    
        <div className="container mx-auto px-4 py-12">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center max-w-2xl mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-700 mb-2">No reservations found</h3>
                <p className="text-gray-500 mb-6">You haven't made any reservations yet.</p>
                <a href="/Booking" className="inline-block bg-blue-600 text-black py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                    Discover parking lots
                </a>
            </div>
        </div>    
    );

    return (    
        <div className="container mx-auto px-4 py-10 max-w-6xl">
            <h2 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">My Reservations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reservations.map(reservation => (
                    <ReservationCard 
                        key={reservation._id || Math.random().toString()} 
                        reservation={reservation}
                        onShowRoute={handleShowRoute}
                    />
                ))}
            </div>
            {isMapModalOpen && selectedRouteReservation && userLocation && (
                <MapModal
                    isOpen={isMapModalOpen}
                    onClose={() => {
                        setIsMapModalOpen(false);
                        setSelectedRouteReservation(null);
                    }}
                    reservation={selectedRouteReservation}
                    userLocation={userLocation}
                />
            )}
            {selectedReservation && <QRCodeModal />}
            <style>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out forwards;
                }
            `}</style>
        </div>    
    );
};

export default UserReservations;
