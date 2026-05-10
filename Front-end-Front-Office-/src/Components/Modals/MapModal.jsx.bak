/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapModal = ({ isOpen, onClose, reservation, userLocation }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [markers, setMarkers] = useState([]);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [nextInstruction, setNextInstruction] = useState(null);
    const [watchId, setWatchId] = useState(null);
    const [isLoadingPosition, setIsLoadingPosition] = useState(true);
    const speechRef = useRef(null);
    const [destinationReached, setDestinationReached] = useState(false);
    const directionArrow = useRef(null);
    const [currentRoute, setCurrentRoute] = useState(null);
    const [voiceInstructions, setVoiceInstructions] = useState([]);
    const userMarker = useRef(null);
    
    const INSTRUCTION_TYPES = {
        TURN_RIGHT: 'turn-right',
        TURN_LEFT: 'turn-left',
        STRAIGHT: 'straight',
        ARRIVE: 'arrive',
        DEPART: 'depart',
        ROUNDABOUT: 'roundabout'
    };
    
    const INSTRUCTION_VOICES = {
        [INSTRUCTION_TYPES.TURN_RIGHT]: 'Turn right',
        [INSTRUCTION_TYPES.TURN_LEFT]: 'Turn left',
        [INSTRUCTION_TYPES.STRAIGHT]: 'Continue straight',
        [INSTRUCTION_TYPES.ARRIVE]: 'You have arrived at your destination',
        [INSTRUCTION_TYPES.DEPART]: 'Start driving',
        [INSTRUCTION_TYPES.ROUNDABOUT]: 'At the roundabout'
    };
    const initVoiceSynthesis = () => {
        return new Promise((resolve) => {
            const synth = window.speechSynthesis;
            
            const initVoice = () => {
                const voices = synth.getVoices();
                const preferredVoice = voices.find(voice => 
                    voice.lang.includes('en-IN') && voice.localService
                ) || voices.find(voice => 
                    voice.lang.includes('en')
                );

                if (preferredVoice) {
                    const utterance = new SpeechSynthesisUtterance();
                    utterance.voice = preferredVoice;
                    utterance.lang = preferredVoice.lang || 'en-IN';
                    utterance.rate = 0.95;
                    utterance.pitch = 1;
                    utterance.volume = 1;
                    resolve(utterance);
                }
            };
    
            if (synth.getVoices().length) {
                initVoice();
            } else {
                synth.onvoiceschanged = initVoice;
            }
        });
    };

    // Mise à jour de la synthèse vocale avec une meilleure gestion
    useEffect(() => {
        let isMounted = true;
    
        const setupVoice = async () => {
            try {
                const utterance = await initVoiceSynthesis();
                if (isMounted) {
                    speechRef.current = utterance;
                    // Test the voice
                    announceInstruction("Start driving",0);
                }
            } catch (error) {
                console.error('Voice initialization error:', error);
            }
        };
    
        setupVoice();
    
        return () => {
            isMounted = false;
            window.speechSynthesis?.cancel();
        };
    }, []);
    

    // Ajout de logs pour le debugging
    useEffect(() => {
        console.log('MapModal mounted with props:', {
            isOpen,
            userLocation,
            reservation: {
                id: reservation?._id,
                parkingName: reservation?.parkingId?.name,
                parkingPosition: reservation?.parkingId?.position
            }
        });
    }, []);

    // Initialisation de la carte en 3D
    useEffect(() => {
        if (!isOpen || !mapContainer.current || !userLocation) {
            console.log('Conditions not met for map initialization:', {
                isOpen,
                hasContainer: !!mapContainer.current,
                hasUserLocation: !!userLocation
            });
            return;
        }

        console.log('Initializing map with:', {
            userLocation,
            destinationLocation: reservation?.parkingId?.position
        });

        mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/navigation-night-v1',
            center: [userLocation.lng, userLocation.lat],
            zoom: 18,
            pitch: 75,
            bearing: userLocation.bearing || 0,
            antialias: true
        });

        map.current.on('load', async () => {
            console.log('Map loaded, setting up navigation');

            map.current.addControl(new mapboxgl.NavigationControl());
            
            // Ajouter le marqueur utilisateur
            const userMarker = initializeUserMarker(userLocation);
            userMarker.addTo(map.current);

            // Ajouter le marqueur de destination
            const destMarker = new mapboxgl.Marker({
                element: createDestinationElement(),
                anchor: 'bottom'
            })
            .setLngLat([reservation.parkingId.position.lng, reservation.parkingId.position.lat])
            .setPopup(new mapboxgl.Popup().setHTML(`<h3>${reservation.parkingId.name}</h3>`))
            .addTo(map.current);
            if (userLocation.bearing) {
                userMarker.current.setRotation(userLocation.bearing);
                updateCameraPosition(userLocation, userLocation.bearing);
            }

            // Calculer et afficher l'itinéraire
            try {
                const response = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${reservation.parkingId.position.lng},${reservation.parkingId.position.lat}?steps=true&voice_instructions=true&banner_instructions=true&voice_units=metric&geometries=geojson&access_token=${mapboxgl.accessToken}`
                );

                const data = await response.json();
                console.log('Route data received:', data);

                if (data.routes?.[0]) {
                    // Afficher l'itinéraire
                    const route = data.routes[0];
                    const coordinates = route.geometry.coordinates;

                    // Ajouter la source de l'itinéraire
                    map.current.addSource('route', {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'LineString',
                                coordinates: coordinates
                            }
                        }
                    });

                    // Ajouter la couche de l'itinéraire
                    map.current.addLayer({
                        id: 'route',
                        type: 'line',
                        source: 'route',
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        paint: {
                            'line-color': '#3B82F6',
                            'line-width': 8,
                            'line-opacity': 0.8
                        }
                    });

                    // Ajuster la vue pour voir l'itinéraire complet
                    const bounds = new mapboxgl.LngLatBounds();
                    coordinates.forEach(coord => bounds.extend(coord));
                    
                    map.current.fitBounds(bounds, {
                        padding: 50,
                        bearing: 0,
                        pitch: 45,
                        duration: 2000
                    });

                    // Commencer le suivi de la position
                    const watchId = navigator.geolocation.watchPosition(
                        (position) => {
                            console.log('Position updated:', position.coords);
                            const newPos = {
                                lng: position.coords.longitude,
                                lat: position.coords.latitude
                            };

                            // Mettre à jour la carte
                            map.current.easeTo({
                                center: [newPos.lng, newPos.lat],
                                bearing: position.coords.heading || 0,
                                pitch: 45,
                                duration: 1000
                            });

                            // Vérifier la progression
                            checkProgressAndAnnounce(newPos, coordinates);
                        },
                        (error) => console.error('Geolocation error:', error),
                        { enableHighAccuracy: true }
                    );

                    setWatchId(watchId);
                }
            } catch (error) {
                console.error('Error setting up navigation:', error);
            }
        });

        return () => {
            console.log('Cleaning up map and watch position');
            if (map.current) map.current.remove();
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isOpen, userLocation, reservation]);

    // Fonction pour calculer la distance
    const calculateDistance = (point1, point2) => {
        const R = 6371e3;
        const φ1 = point1.lat * Math.PI/180;
        const φ2 = point2.lat * Math.PI/180;
        const Δφ = (point2.lat-point1.lat) * Math.PI/180;
        const Δλ = (point2.lng-point1.lng) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    };

    // Amélioration du calcul de l'itinéraire et des instructions
    const getRoute = async (start, end) => {
        try {
            const query = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&voice_instructions=true&banner_instructions=true&voice_units=metric&geometries=geojson&access_token=${process.env.REACT_APP_MAPBOX_TOKEN}`
            );
            const json = await query.json();
            
            if (json.routes?.[0]) {
                const route = json.routes[0];
                setCurrentRoute(route);
                updateMapRoute(route);

                // Préparation des instructions vocales
                const instructions = route.legs[0].steps.map(step => ({
                    text: step.maneuver.instruction,
                    distance: step.distance,
                    location: step.maneuver.location,
                    type: step.maneuver.type
                }));

                return instructions;
            }
        } catch (error) {
            console.error("Erreur lors du calcul de l'itinéraire:", error);
        }
        return null;
    };

    const calculateRoute = async (start, end) => {
        try {
            const query = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&voice_instructions=true&banner_instructions=true&voice_units=metric&geometries=geojson&access_token=${mapboxgl.accessToken}`
            );
            const data = await query.json();

            if (data.routes?.[0]) {
                const route = data.routes[0];
                setCurrentRoute(route);
                displayRoute(route);
                prepareVoiceInstructions(route.legs[0].steps);
            }
        } catch (error) {
            console.error("Erreur lors du calcul de l'itinéraire:", error);
        }
    };

    const prepareVoiceInstructions = (steps) => {
        // Préparer les instructions vocales
        const instructions = steps.map(step => ({
            text: step.maneuver.instruction,
            distance: step.distance,
            location: step.maneuver.location,
            triggered: false
        }));

        setVoiceInstructions(instructions);
    };

    const checkProgressAndAnnounce = (currentPos, routeCoordinates) => {
        console.log('Checking progress:', { currentPos, destinationPos: reservation?.parkingId?.position });
        
        if (!voiceInstructions || !voiceInstructions.length) return;

        voiceInstructions.forEach((instruction, index) => {
            if (instruction.triggered) return;

            const distanceToInstruction = calculateDistance(
                currentPos,
                { lat: instruction.location[1], lng: instruction.location[0] }
            );

            // Annoncer l'instruction quand on s'approche
            if (distanceToInstruction < 100) {
                speakInstruction(instruction.text);
                const updatedInstructions = [...voiceInstructions];
                updatedInstructions[index].triggered = true;
                setVoiceInstructions(updatedInstructions);
            }
        });
    };

    const speakInstruction = (text) => {
        if (!window.speechSynthesis) return;

        // Arrêter toute instruction en cours
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);
    };

    const displayRoute = (route) => {
        if (!map.current) return;

        if (map.current.getSource('route')) {
            map.current.removeLayer('route');
            map.current.removeSource('route');
        }

        map.current.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry
            }
        });

        map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#3B82F6',
                'line-width': 8,
                'line-opacity': 0.8
            }
        });

        // Ajuster la vue pour voir l'itinéraire complet
        const bounds = new mapboxgl.LngLatBounds();
        route.geometry.coordinates.forEach(coord => bounds.extend(coord));
        
        map.current.fitBounds(bounds, {
            padding: 50,
            duration: 1000,
            pitch: 60
        });
    };

    // Vérification de la progression
    const checkProgress = (position) => {
        if (!currentRoute || !position) return;

        const distance = calculateDistance(
            position,
            {
                lat: reservation.parkingId.position.lat,
                lng: reservation.parkingId.position.lng
            }
        );

        if (distance < 50 && !destinationReached) {
            setDestinationReached(true);
            announceInstruction("Vous êtes arrivé à destination");
            return;
        }

        const currentLeg = currentRoute.legs[0];
        let foundStep = null;
        let minDistance = Infinity;

        currentLeg.steps.forEach(step => {
            const stepDistance = calculateDistance(position, {
                lat: step.maneuver.location[1],
                lng: step.maneuver.location[0]
            });

            if (stepDistance < minDistance) {
                minDistance = stepDistance;
                foundStep = step;
            }
        });

        if (foundStep && minDistance < 100) {
            announceNextInstruction(foundStep);
        }
    };

    // Fonctions pour les instructions vocales
    const announceInstruction = (instruction, distance) => {
        if (!speechRef.current || !window.speechSynthesis) return;

        const distanceText = distance < 1000 
            ? `Dans ${Math.round(distance)} mètres` 
            : `Dans ${(distance / 1000).toFixed(1)} kilomètres`;

        const fullText = `${distanceText}, ${instruction}`;
        
        window.speechSynthesis.cancel();
        speechRef.current.text = fullText;
        window.speechSynthesis.speak(speechRef.current);
    };

    const announceNextInstruction = (step) => {
        if (!step) return;
        const instruction = {
            text: step.maneuver.instruction,
            distance: Math.round(step.distance),
            duration: Math.round(step.duration / 60)
        };
        setNextInstruction(instruction);
        if (step.distance < 100) {
            announceInstruction(instruction.text);
        }
    };

    // Mise à jour de la route sur la carte
    const updateMapRoute = (route) => {
        if (!map.current) return;

        if (map.current.getSource('route')) {
            map.current.removeLayer('route-outline');
            map.current.removeLayer('route-fill');
            map.current.removeSource('route');
        }

        map.current.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry
            }
        });

        map.current.addLayer({
            id: 'route-outline',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#fff',
                'line-width': 22
            }
        });

        map.current.addLayer({
            id: 'route-fill',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#3B82F6',
                'line-width': 20
            }
        });

        const coordinates = route.geometry.coordinates;
        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        map.current.fitBounds(bounds, {
            padding: { top: 100, bottom: 50, left: 50, right: 50 },
            duration: 2000,
            pitch: 60
        });
    };


   

    const createDestinationElement = () => {
        const destEl = document.createElement('div');
        destEl.className = 'destination-marker';
        destEl.innerHTML = `
            <div class="pulse"></div>
            <div class="marker">P</div>
        `;

        destEl.style.cssText = `
            width: 80px;
            height: 80px;
            position: relative;
            transform: scale(1.2);
        `;

        return destEl;
    };

    // Nouvelle fonction pour calculer l'angle vers la prochaine étape
    const calculateBearingToNextStep = (currentPosition, nextStepPosition) => {
        const lng1 = currentPosition.lng * Math.PI / 180;
        const lng2 = nextStepPosition[0] * Math.PI / 180;
        const lat1 = currentPosition.lat * Math.PI / 180;
        const lat2 = nextStepPosition[1] * Math.PI / 180;

        const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                 Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
        const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        return bearing;
    };

    // Fonction améliorée pour mettre à jour la position utilisateur et la caméra
    const updateUserPosition = (position) => {
        if (!map.current || !userMarker.current || !currentRoute) return;

        const newPos = {
            lng: position.coords.longitude,
            lat: position.coords.latitude
        };

        // Trouver la prochaine étape sur l'itinéraire
        const nextStep = findNextRouteStep(newPos, currentRoute);
        if (nextStep) {
            // Calculer l'angle vers la prochaine étape
            const bearing = calculateBearingToNextStep(newPos, nextStep.location);
            
            // Mettre à jour le marqueur avec la nouvelle rotation
            userMarker.current
                .setLngLat([newPos.lng, newPos.lat])
                .setRotation(bearing);

            // Mettre à jour la caméra avec une vue en perspective
            updateCameraPosition(newPos, bearing);
        }
    };

    // Fonction améliorée pour trouver la prochaine étape
    const findNextRouteStep = (currentPos, route) => {
        if (!route || !route.legs || !route.legs[0] || !route.legs[0].steps) return null;

        const steps = route.legs[0].steps;
        let minDistance = Infinity;
        let nextStep = null;

        steps.forEach((step, index) => {
            const stepStart = step.maneuver.location;
            const distance = calculateDistance(
                currentPos,
                { lat: stepStart[1], lng: stepStart[0] }
            );

            if (distance < minDistance && distance > 10) { // 10 mètres minimum pour éviter de sauter des étapes
                minDistance = distance;
                nextStep = step;
            }
        });

        return nextStep;
    };

    // Fonction améliorée pour mettre à jour la position de la caméra
    const updateCameraPosition = (position, bearing) => {
        if (!map.current) return;

        // Calculer la position de la caméra derrière l'utilisateur
        const cameraOffset = 0.0003; // Ajuster cette valeur pour la distance de la caméra
        const pitch = 60; // Angle d'inclinaison de la caméra
        const zoom = 18; // Niveau de zoom

        const behindLng = position.lng - Math.sin(bearing * Math.PI / 180) * cameraOffset;
        const behindLat = position.lat - Math.cos(bearing * Math.PI / 180) * cameraOffset;

        map.current.easeTo({
            center: [behindLng, behindLat],
            bearing: bearing,
            pitch: pitch,
            zoom: zoom,
            duration: 300, // Animation plus rapide pour une meilleure réactivité
            essential: true // Garantit que l'animation se produit même pendant le défilement
        });
    };

    // Amélioration du suivi de la position
    useEffect(() => {
        if (!isOpen || !map.current) return;

        const watchOptions = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setIsLoadingPosition(false);
                updateUserPosition(position);
            },
            (error) => {
                console.error('Geolocation error:', error);
                setIsLoadingPosition(false);
            },
            watchOptions
        );

        setWatchId(watchId);

        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isOpen, currentRoute]);

    // Modification du style du marqueur utilisateur pour une meilleure visibilité
    const initializeUserMarker = (userPos) => {
        const el = document.createElement('div');
        el.className = 'user-location-marker';
        el.innerHTML = `
            <div class="marker-container">
                <div class="direction-arrow">
                    <svg viewBox="0 0 24 24" class="h-8 w-8">
                        <path 
                            fill="#3B82F6" 
                            d="M12 2L8 11h8L12 2zm0 20l4-9H8l4 9z"
                            stroke="white"
                            stroke-width="1.5"
                        />
                    </svg>
                </div>
                <div class="accuracy-circle"></div>
            </div>
        `;

        // Ajouter les styles CSS ici...
        const styles = `
            .marker-container {
                position: relative;
                width: 48px;
                height: 48px;
            }
    
            .direction-arrow {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 2;
                transition: transform 0.3s ease;
            }
    
            .pulse-ring {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: radial-gradient(
                    circle,
                    rgba(59, 130, 246, 0.4) 0%,
                    rgba(59, 130, 246, 0) 70%
                );
                animation: pulse 2s infinite;
            }
    
            .accuracy-circle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #3B82F6;
                border: 2px solid white;
                box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
                z-index: 1;
            }
    
            @keyframes pulse {
                0% {
                    transform: translate(-50%, -50%) scale(0.5);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(2);
                    opacity: 0;
                }
            }
        `;
    
        // Add styles to document if not already present
        if (!document.getElementById('user-marker-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'user-marker-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    
        // Create and return the marker with enhanced options
        const marker = new mapboxgl.Marker({
            element: el,
            rotationAlignment: 'map',
            pitchAlignment: 'viewport',
            anchor: 'center',
            offset: [0, 0]
        }).setLngLat([userPos.lng, userPos.lat]);
    
        // Add method to update marker rotation
        marker.setRotation = (bearing) => {
            const arrow = el.querySelector('.direction-arrow');
            if (arrow) {
                arrow.style.transform = `translate(-50%, -50%) rotate(${bearing}deg)`;
            }
        };
    
        return marker;
    };

    // Mise à jour du composant pour afficher les instructions comme Google Maps
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 flex flex-col">
                {/* Barre d'instructions améliorée style Google Maps */}
                <div className="absolute top-0 left-0 right-0 bg-white shadow-lg z-10">
                    <div className="flex items-center p-4">
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        {nextInstruction && (
                            <div className="flex-1 ml-4">
                                <div className="flex items-center">
                                    <div className="bg-blue-500 text-black p-2 rounded-full mr-3">
                                        {getManeuverIcon(nextInstruction.type)}
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold">{nextInstruction.text}</p>
                                        <p className="text-sm text-gray-600">
                                            {formatDistance(nextInstruction.distance)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1"></div>
                    <div ref={mapContainer} className="w-full h-full" />
                </div>

                {isLoadingPosition && (
                    <div className="absolute top-20 left-0 right-0 flex justify-center">
                        <div className="bg-blue-500 text-black px-4 py-2 rounded-full shadow-lg flex items-center">
                            <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            Locating...
                        </div>
                    </div>
                )}

                <style>{`
                    .destination-marker {
                        width: 50px;
                        height: 50px;
                        position: relative;
                    }

                    .destination-marker .pulse {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        background: rgba(59, 130, 246, 0.2);
                        border-radius: 50%;
                        animation: pulse 2s infinite;
                    }

                    .destination-marker .marker {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 30px;
                        height: 30px;
                        background: #3B82F6;
                        border: 3px solid white;
                        border-radius: 50%;
                        color: white;
                        font-weight: bold;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    }

                    .user-location-marker {
                        width: 40px;
                        height: 40px;
                        position: relative;
                        background: transparent;
                    }

                    .user-location-marker .arrow {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 24px;
                        height: 24px;
                        transition: transform 0.3s ease;
                    }

                    .pulse-ring {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        border-radius: 50%;
                        animation: pulse 2s infinite;
                        background: rgba(59, 130, 246, 0.2);
                        border: 2px solid #3B82F6;
                    }

                    @keyframes pulse {
                        0% {
                            transform: scale(1);
                            opacity: 1;
                        }
                        100% {
                            transform: scale(3);
                            opacity: 0;
                        }
                    }

                    .custom-popup {
                        background: rgba(255, 255, 255, 0.95);
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                `}</style>
            </div>
    );
};

// Fonction utilitaire pour les icônes de manœuvre
const getManeuverIcon = (type) => {
    // Ajoutez ici les icônes correspondant aux différents types de manœuvre
    switch (type) {
        case 'turn-right':
            return '↱';
        case 'turn-left':
            return '↰';
        default:
            return '→';
    }
};

// Fonction utilitaire pour formater les distances
const formatDistance = (distance) => {
    if (distance < 1000) {
        return `${Math.round(distance)} m`;
    }
    return `${(distance / 1000).toFixed(1)} km`;
};

export default MapModal;
