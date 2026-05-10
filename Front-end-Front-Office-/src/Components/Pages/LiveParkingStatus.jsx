import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import './LiveParkingStatus.css';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../../AuthContext';
import { getBackendUrl } from '../../utils/backend';

const LiveParkingStatus = ({ parkingId = null, parkingName = 'shah&anchor', readOnly = true, title = 'Live Parking Status' }) => {
    const { token } = useAuth();
    const [slots, setSlots] = useState([]);
    const [parkingData, setParkingData] = useState(null);
    const [error, setError] = useState(null);
    const [busySlot, setBusySlot] = useState(null);
        const [zoom, setZoom] = useState(0.85);
        const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const pollingRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        // Connect to Socket.IO server for realtime slot updates
        const socketUrl = getBackendUrl();
        const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

        socket.on('connect', () => {
            console.log('[LIVE-PARKING] Socket.IO connected:', socket.id);
            // Clear any prior connection error shown in the UI
            setError(null);
        });

        socket.on('slots:update', (latest) => {
            const normalized = Array.isArray(latest) ? latest : [];
            console.log('[LIVE-PARKING] Received slots:update event with', normalized.length, 'slots', normalized);
            setSlots(normalized);
        });

        socket.on('connect_error', (err) => {
            console.error('[LIVE-PARKING] Socket connect error:', err);
            // Keep a helpful message for the user but include error text when available
            setError(`Realtime connection error${err?.message ? `: ${err.message}` : ''}`);
        });

        socket.on('reconnect', (attempt) => {
            console.log('[LIVE-PARKING] Socket reconnected after', attempt, 'attempts');
            setError(null);
        });

        socket.on('disconnect', (reason) => {
            console.warn('[LIVE-PARKING] Socket disconnected:', reason);
            if (reason && reason !== 'io client disconnect') {
                setError(`Realtime disconnected: ${reason}`);
            }
        });

        // Polling fallback (updates map automatically from DB even if socket events are missed)
        const fetchSnapshot = async () => {
            try {
                const resp = await axios.get(`${socketUrl}/api/slots`);
                if (Array.isArray(resp.data)) setSlots(resp.data);
            } catch (err) {
                // ignore polling failures - socket updates (or next poll) will recover
                // but keep a console hint
                // console.warn('[LIVE-PARKING] Polling /api/slots failed:', err?.message || err);
            }
        };

        // start immediately
        fetchSnapshot();

        pollingRef.current = setInterval(fetchSnapshot, 1000);

        return () => {
            console.log('[LIVE-PARKING] Disconnecting socket');
            if (pollingRef.current) clearInterval(pollingRef.current);
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        const fetchParkingData = async () => {
            if (!parkingId) {
                setParkingData(null);
                return;
            }

            try {
                const backend = getBackendUrl();
                const resp = await axios.get(`${backend}/api/parkings/${parkingId}`);
                setParkingData(resp.data || null);
            } catch (err) {
                console.warn('[LIVE-PARKING] Failed to load parking layout:', err?.message || err);
                setParkingData(null);
            }
        };

        fetchParkingData();
    }, [parkingId]);

    const handleSlotClick = useCallback(async (slot) => {
        if (readOnly) return;
        try {
            const stat = getSlotStatus(slot);
            if (stat.status === 'occupied' || stat.status === 'reserved') {
                alert(`This slot is currently ${stat.status.toUpperCase()}. Please select an available slot.`);
                return;
            }

            setBusySlot(slot.slotNumber);

            const backend = getBackendUrl();
            await axios.put(
                `${backend}/api/slots/${slot.slotNumber}`,
                {
                    isOccupied: true,
                    reservedAt: Date.now(),
                    reservedBy: 'web-ui'
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token ? `Bearer ${token}` : undefined,
                    },
                }
            );
        } catch (err) {
            console.error('Error updating slot:', err);
            setError('Failed to update slot. Check console for details.');
        } finally {
            setBusySlot(null);
        }
    }, [readOnly, token]);

    const filteredSlots = useMemo(() => {
        const allSlots = Array.isArray(slots) ? slots : [];

        if (!parkingId && !parkingName) {
            return allSlots;
        }

        const normalizedParkingId = parkingId ? String(parkingId).trim() : '';
        const normalizedParkingName = parkingName ? String(parkingName).trim().toLowerCase() : '';

        const matchedSlots = allSlots.filter((slot) => {
            const slotParkingId = slot?.parkingId ? String(slot.parkingId).trim() : '';
            const slotParkingName = slot?.parkingName ? String(slot.parkingName).trim().toLowerCase() : '';

            if (normalizedParkingId && slotParkingId) {
                return slotParkingId === normalizedParkingId;
            }

            if (normalizedParkingName && slotParkingName) {
                return slotParkingName === normalizedParkingName;
            }

            return !normalizedParkingId && !normalizedParkingName;
        });

        return matchedSlots.length > 0 ? matchedSlots : allSlots;
    }, [slots, parkingId, parkingName]);

    const renderedSlots = useMemo(() => {
        const toCssValue = (value) => {
            if (value === null || value === undefined || value === '') return undefined;
            return typeof value === 'number' ? `${value}px` : String(value);
        };

        const layoutSpots = Array.isArray(parkingData?.spots) ? parkingData.spots : [];

        if (layoutSpots.length === 0) {
            return filteredSlots.map((slot) => ({
                ...slot,
                position: slot.position || {
                    left: `${(slot.slotNumber * 15) % 80 + 10}%`,
                    top: `${(slot.slotNumber * 25) % 70 + 15}%`,
                },
            }));
        }

        return layoutSpots.map((spot, index) => {
            const liveSlot = filteredSlots.find((slot) => {
                const liveSlotNumber = Number(slot?.slotNumber);
                const parkingSpotNumber = Number(spot?.slotNumber ?? spot?.number ?? spot?.id);
                if (!Number.isNaN(liveSlotNumber) && !Number.isNaN(parkingSpotNumber)) {
                    return liveSlotNumber === parkingSpotNumber;
                }
                return String(slot?.slotNumber ?? '').trim() === String(spot?.id ?? index + 1).trim();
            }) || filteredSlots[index];

            const slotNumber = Number(spot?.slotNumber ?? spot?.number ?? liveSlot?.slotNumber ?? index + 1);

            return {
                ...liveSlot,
                slotNumber,
                parkingSpotId: spot?.id || spot?._id || `spot-${index + 1}`,
                position: {
                    left: toCssValue(spot?.x ?? spot?.position?.left),
                    top: toCssValue(spot?.y ?? spot?.position?.top),
                },
                size: {
                    width: toCssValue(spot?.width ?? spot?.size?.width),
                    height: toCssValue(spot?.height ?? spot?.size?.height),
                },
                rotation: spot?.rotation || 0,
            };
        });
    }, [filteredSlots, parkingData]);

    const parkingDimensions = useMemo(() => {
        const elements = [...renderedSlots, ...(Array.isArray(parkingData?.layout?.streets) ? parkingData.layout.streets : [])];

        if (elements.length === 0) {
            return { width: 0, height: 0, boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
        }

        const boundingBox = elements.reduce((acc, el) => {
            const left = typeof el.position?.left === 'string' && el.position.left.includes('%') ? 0 : parseFloat(String(el.position?.left || 0)) || 0;
            const top = typeof el.position?.top === 'string' && el.position.top.includes('%') ? 0 : parseFloat(String(el.position?.top || 0)) || 0;
            const width = parseFloat(String(el.size?.width || el.width || 60)) || 60;
            const height = parseFloat(String(el.size?.height || el.length || 30)) || 30;

            return {
                minX: Math.min(acc.minX, left),
                minY: Math.min(acc.minY, top),
                maxX: Math.max(acc.maxX, left + width),
                maxY: Math.max(acc.maxY, top + height),
            };
        }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

        return {
            width: boundingBox.maxX - boundingBox.minX,
            height: boundingBox.maxY - boundingBox.minY,
            boundingBox,
        };
    }, [renderedSlots, parkingData]);

    const calculateInitialView = useCallback(() => {
        if (!containerRef.current || renderedSlots.length === 0) return;

        const containerWidth = containerRef.current.clientWidth || 800;
        const containerHeight = containerRef.current.clientHeight || 600;
        const { width: parkingWidth, height: parkingHeight, boundingBox } = parkingDimensions;

        if (!parkingWidth || !parkingHeight) return;

        const zoomX = containerWidth / parkingWidth;
        const zoomY = containerHeight / parkingHeight;
        const initialZoom = Math.min(zoomX, zoomY) * 0.9;

        const centeringOffsetX = (containerWidth / initialZoom - parkingWidth) / 2 - boundingBox.minX;
        const centeringOffsetY = (containerHeight / initialZoom - parkingHeight) / 2 - boundingBox.minY;

        setZoom(initialZoom);
        setOffset({ x: centeringOffsetX, y: centeringOffsetY });
    }, [parkingDimensions, renderedSlots.length]);

    useEffect(() => {
        if (parkingData && renderedSlots.length > 0) {
            calculateInitialView();
        }
    }, [parkingData, renderedSlots.length, calculateInitialView]);

    // --- Mouse & Touch Event Handlers for Panning & Zooming (matching ParkingLiveView) ---
    const handleMouseDown = (e) => {
        if (e.button === 0) {
            setIsDragging(true);
            setStartPos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const dx = (e.clientX - startPos.x) / zoom;
        const dy = (e.clientY - startPos.y) / zoom;

        setOffset((prevOffset) => {
            const newX = prevOffset.x + dx;
            const newY = prevOffset.y + dy;
            return { x: newX, y: newY };
        });

        setStartPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleMouseLeave = () => setIsDragging(false);

    const handleWheel = useCallback((e) => {
        const isMouseOverContainer = e.target === containerRef.current || containerRef.current?.contains(e.target);
        if (!isMouseOverContainer) return;

        e.preventDefault();
        e.stopPropagation();

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.5, Math.min(3, zoom * zoomFactor));

        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / zoom;
        const mouseY = (e.clientY - rect.top) / zoom;

        setOffset((prevOffset) => ({
            x: prevOffset.x - mouseX * (newZoom - zoom),
            y: prevOffset.y - mouseY * (newZoom - zoom),
        }));

        setZoom(newZoom);
    }, [zoom]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener("wheel", handleWheel, { passive: false });
            return () => {
                container.removeEventListener("wheel", handleWheel, { passive: false });
            };
        }
    }, [handleWheel]);

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const initialDistance = Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY);
            e.currentTarget.initialDistance = initialDistance;
        } else if (e.touches.length === 1) {
            const touch = e.touches[0];
            setIsDragging(true);
            setStartPos({ x: touch.clientX, y: touch.clientY });
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2) {
            const isMultiTouchOverContainer = e.currentTarget === containerRef.current || containerRef.current.contains(e.currentTarget);
            if (!isMultiTouchOverContainer) return;

            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY);
            const zoomFactor = currentDistance / e.currentTarget.initialDistance;
            const newZoom = Math.max(0.5, Math.min(3, zoom * zoomFactor));

            const centerX = (touch1.pageX + touch2.pageX) / 2;
            const centerY = (touch1.pageY + touch2.pageY) / 2;
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = (centerX - rect.left) / zoom;
            const mouseY = (centerY - rect.top) / zoom;

            setOffset((prevOffset) => ({
                x: prevOffset.x - mouseX * (newZoom - zoom),
                y: prevOffset.y - mouseY * (newZoom - zoom),
            }));

            setZoom(newZoom);
            e.currentTarget.initialDistance = currentDistance;
        } else if (e.touches.length === 1 && isDragging) {
            const touch = e.touches[0];
            const dx = (touch.clientX - startPos.x) / zoom;
            const dy = (touch.clientY - startPos.y) / zoom;

            setOffset((prevOffset) => ({
                x: prevOffset.x + dx,
                y: prevOffset.y + dy,
            }));

            setStartPos({ x: touch.clientX, y: touch.clientY });
        }
    };

    const handleTouchEnd = () => setIsDragging(false);

    const getSlotStatus = (slot) => {
        if (slot.reservedBy && slot.isOccupied) return { status: 'reserved' };
        if (slot.isOccupied) return { status: 'occupied' };
        if (slot.isReserved) return { status: 'reserved' };
        return { status: 'available' };
    };

    const renderParkingSpot = (slot) => {
        const status = getSlotStatus(slot);
        const spotWidth = Number.parseFloat(String(slot.size?.width || 60).replace('px', '')) || 60;
        const spotHeight = Number.parseFloat(String(slot.size?.height || 30).replace('px', '')) || 30;
        const position = slot.position || { left: '10%', top: '10%' };

        let spotStyle = {
            available: { fillColor: "#10b981", borderColor: "#059669", opacity: 0.9 },
            reserved: { fillColor: "#f59e0b", borderColor: "#d97706", opacity: 0.9 },
            occupied: { fillColor: "#ef4444", borderColor: "#dc2626", opacity: 0.9 },
        };
        const { fillColor, borderColor, opacity } = spotStyle[status.status] || spotStyle.available;

        const spotNumber = String(slot.slotNumber ?? slot.parkingSpotId ?? '').replace('parking-spot-', '') || '1';

        return (
            <div
                key={slot.parkingSpotId || slot.slotNumber}
                style={{
                    position: 'absolute',
                    left: position.left,
                    top: position.top,
                    width: `${spotWidth}px`,
                    height: `${spotHeight}px`,
                    transform: slot.rotation ? `rotate(${slot.rotation}rad)` : 'none',
                    transformOrigin: 'center center',
                    cursor: readOnly ? 'default' : 'pointer',
                    transition: 'all 0.3s ease',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                    zIndex: 10,
                }}
                onClick={() => !readOnly && handleSlotClick(slot)}
                role="button"
                tabIndex={0}
                title={`Spot ${spotNumber} - ${status.status}`}
            >
                <svg
                    width={spotWidth}
                    height={spotHeight}
                    viewBox={`0 0 ${spotWidth} ${spotHeight}`}
                >
                    <rect
                        x="0"
                        y="0"
                        width={spotWidth}
                        height={spotHeight}
                        rx="4"
                        fill="#334155"
                    />
                    <rect
                        x="2"
                        y="2"
                        width={spotWidth - 4}
                        height={spotHeight - 4}
                        rx="3"
                        stroke={borderColor}
                        strokeWidth="2"
                        fill={fillColor}
                        fillOpacity={opacity}
                    >
                        <animate
                            attributeName="fillOpacity"
                            values={busySlot === slot.slotNumber ? '0.9;0.5;0.9' : '0.9'}
                            dur="1s"
                            repeatCount="1"
                        />
                    </rect>

                    {/* Modern floor marking */}
                    <rect
                        x={spotWidth * 0.15}
                        y={spotHeight * 0.15}
                        width={spotWidth * 0.7}
                        height={spotHeight * 0.7}
                        rx="2"
                        stroke="rgba(255, 255, 255, 0.3)"
                        strokeWidth="1"
                        strokeDasharray="4,2"
                        fill="none"
                    />

                    {/* Spot number with depth effect */}
                    <text
                        x={spotWidth / 2}
                        y={spotHeight / 2}
                        fontSize="14"
                        fontWeight="bold"
                        fill="white"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        filter={`url(#text-shadow-live-${spotNumber})`}
                    >
                        {spotNumber}
                    </text>

                    <defs>
                        <filter
                            id={`text-shadow-live-${spotNumber}`}
                            x="-20%"
                            y="-20%"
                            width="140%"
                            height="140%"
                        >
                            <feDropShadow
                                dx="1"
                                dy="1"
                                stdDeviation="1"
                                floodColor="rgba(0,0,0,0.5)"
                            />
                        </filter>
                    </defs>
                </svg>
            </div>
        );
    };

    const renderStreet = (street) => (
        <div
            key={street.id}
            style={{
                position: 'absolute',
                left: street.position?.left ?? street.x ?? 0,
                top: street.position?.top ?? street.y ?? 0,
                width: `${street.width || 40}px`,
                height: `${street.length || 80}px`,
                transform: street.rotation ? `rotate(${street.rotation}rad)` : 'none',
                transformOrigin: 'center center',
                backgroundColor: '#334155',
                borderRadius: '6px',
                pointerEvents: 'none',
                zIndex: 0,
                boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.2)',
            }}
        >
            {/* Modern center marking */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '4px',
                    height: '100%',
                    background: 'linear-gradient(to bottom, transparent, #f8fafc, transparent)',
                    opacity: 0.8,
                    zIndex: 1,
                }}
            />
            {street.hasEntrance && (
                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2 }}>
                    <div style={{ width: '24px', height: '24px', backgroundColor: '#3b82f6', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>
                        <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>E</span>
                    </div>
                </div>
            )}
            {street.hasExit && (
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 2 }}>
                    <div style={{ width: '24px', height: '24px', backgroundColor: '#ef4444', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>
                        <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>S</span>
                    </div>
                </div>
            )}
        </div>
    );

    const occupiedCount = renderedSlots.filter(s => getSlotStatus(s).status === 'occupied' || getSlotStatus(s).status === 'reserved').length;
    const availableCount = renderedSlots.length - occupiedCount;


    const renderLegend = () => (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            color: 'white',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '14px',
            zIndex: 10,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            backdropFilter: 'blur(4px)',
            minWidth: '170px',
        }}>
            <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '16px' }}>
                {parkingData?.name || parkingName || title}
            </div>
            <div style={{ marginBottom: '12px', color: '#94a3b8', fontSize: '12px' }}>
                {availableCount}/{renderedSlots.length} spots available
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', marginRight: '8px', backgroundColor: '#10b981' }} />
                <span>Available</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', marginRight: '8px', backgroundColor: '#f59e0b' }} />
                <span>Reserved</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', marginRight: '8px', backgroundColor: '#ef4444' }} />
                <span>Occupied</span>
            </div>
        </div>
    );

    const renderZoomControls = () => (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 10,
        }}>
            <button onClick={() => setZoom((prev) => Math.min(3, prev * 1.2))} style={{ width: '36px', height: '36px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', margin: '4px', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Zoom in">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <button onClick={() => setZoom((prev) => Math.max(0.5, prev / 1.2))} style={{ width: '36px', height: '36px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', margin: '4px', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Zoom out">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <button onClick={calculateInitialView} style={{ width: '36px', height: '36px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', margin: '4px', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Reset view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeWidth="2" /><path d="M3 3v5h5" strokeWidth="2" /></svg>
            </button>
        </div>
    );
    return (
        <div className="live-parking-status-container" style={{ backgroundColor: 'transparent', padding: 0, borderRadius: 0, marginTop: 0, color: 'inherit' }}>
            {error && <p className="error-message">⚠️ {error}</p>}

            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '600px',
                    backgroundColor: '#1e293b',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div style={{ position: 'absolute', inset: 0, backgroundColor: '#1e293b', backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.9 }} />

                <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`, transformOrigin: 'top left', transition: 'transform 0.1s ease-out' }}>
                    {Array.isArray(parkingData?.layout?.streets) && parkingData.layout.streets.map(renderStreet)}
                    {renderedSlots.length > 0 ? renderedSlots.map((slot) => renderParkingSpot(slot)) : !error && null}
                </div>

                {renderLegend()}
                {renderZoomControls()}

                {renderedSlots.length === 0 && !error && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', zIndex: 2 }}>
                        No parking slot data available
                    </div>
                )}
            </div>
        </div>
    );
};

LiveParkingStatus.propTypes = {
    parkingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    parkingName: PropTypes.string,
    readOnly: PropTypes.bool,
    title: PropTypes.string,
};

export default LiveParkingStatus;
