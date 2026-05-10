import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { getBackendUrl } from '../../../utils/backend';

const EVENT_LABELS = {
  card_scan: 'Card scanned',
  auth_result: 'Access decision',
  gate_open: 'Gate opened',
  gate_close: 'Gate closed',
  slot_update: 'Slot update',
};

const EVENT_STYLES = {
  card_scan: {
    badge: 'bg-slate-100 text-slate-700',
    dot: 'bg-slate-500',
  },
  auth_result: {
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  gate_open: {
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
  gate_close: {
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  slot_update: {
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
};

const LiveGateFeed = ({ parkingName = 'shah&anchor' }) => {
  const [slots, setSlots] = useState([]);
  const [events, setEvents] = useState([]);
  const [connectionLabel, setConnectionLabel] = useState('Connecting...');
  const previousSlotsRef = useRef([]);
  const pollingRef = useRef(null);

  const socketUrl = getBackendUrl();

  useEffect(() => {
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      setConnectionLabel('Live connected');
    });

    socket.on('disconnect', () => {
      setConnectionLabel('Disconnected');
    });

    socket.on('connect_error', () => {
      setConnectionLabel('Connection error');
    });

    socket.on('slots:update', (latest) => {
      const normalizedSlots = Array.isArray(latest) ? latest : [];
      console.log('[LIVE-PARKING] slots:update payload:', {
        isArray: Array.isArray(latest),
        length: normalizedSlots.length,
        sample: normalizedSlots.slice(0, 5),
      });

      const previousSlots = previousSlotsRef.current || [];

      if (previousSlots.length > 0) {
        const previousBySlot = new Map(previousSlots.map((slot) => [slot.slotNumber, slot]));
        const changedSlots = normalizedSlots.filter((slot) => {
          const previousSlot = previousBySlot.get(slot.slotNumber);
          return !previousSlot || previousSlot.isOccupied !== slot.isOccupied;
        });

        if (changedSlots.length > 0) {
          setEvents((prev) => [
            ...changedSlots.map((slot) => ({
              id: `slot-${slot.slotNumber}-${slot.sensorLastSeen || Date.now()}`,
              eventType: 'slot_update',
              message: `Slot ${slot.slotNumber} is now ${slot.isOccupied ? 'occupied' : 'free'}`,
              slotNumber: slot.slotNumber,
              isOccupied: slot.isOccupied,
              timestamp: slot.sensorLastSeen || new Date().toISOString(),
            })),
            ...prev,
          ].slice(0, 8));
        } else if (normalizedSlots.length > 0) {
          // Debug: Arduino might still be publishing, but occupancy isn't changing
          const previousBySlot = new Map(previousSlots.map((slot) => [slot.slotNumber, slot]));
          const noChangeSlots = normalizedSlots
            .filter(
              (slot) =>
                previousBySlot.has(slot.slotNumber) &&
                previousBySlot.get(slot.slotNumber).isOccupied === slot.isOccupied
            )
            .map((s) => `S${s.slotNumber}:${s.isOccupied ? 1 : 0}`)
            .slice(0, 6);

          if (noChangeSlots.length > 0) {
            console.log('[LIVE-PARKING] slots:update received but no occupancy change:', noChangeSlots.join(', '));
          }
        }
      }

      previousSlotsRef.current = normalizedSlots;
      setSlots(normalizedSlots);
    });

    socket.on('gate:live', (event) => {
      setEvents((prev) => [
        {
          ...event,
          id: `${event.eventType}-${event.timestamp || Date.now()}-${Math.random().toString(16).slice(2)}`,
        },
        ...prev,
      ].slice(0, 8));
    });

    const fetchSnapshot = async () => {
      try {
        const resp = await axios.get(`${socketUrl}/api/slots`);
        const snapshot = Array.isArray(resp.data) ? resp.data : [];
        previousSlotsRef.current = snapshot;
        setSlots(snapshot);
      } catch (err) {
        // ignore snapshot failures - next poll will recover
      }
    };

    // Initial fetch
    fetchSnapshot();

    // Polling fallback: keeps slot cards synced with DB even if Socket.IO misses events
    pollingRef.current = setInterval(fetchSnapshot, 1000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      socket.disconnect();
    };
  }, [socketUrl]);

  const visibleSlots = useMemo(() => {
    return slots
      .filter((slot) => {
        const slotParking = slot.parkingName || slot.meta?.parkingName || parkingName;
        return !parkingName || slotParking === parkingName;
      })
      .sort((a, b) => Number(a.slotNumber) - Number(b.slotNumber));
  }, [slots, parkingName]);

  const latestCardScan = events.find((event) => event.eventType === 'card_scan');
  const latestGateEvent = events.find((event) => event.eventType === 'gate_open' || event.eventType === 'gate_close');

  return (
    <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Realtime gate feed</p>
            <h4 className="text-xl font-semibold mt-1">{parkingName}</h4>
            <p className="text-sm text-slate-300 mt-1">{connectionLabel}</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-white/10 text-sm text-slate-200 border border-white/10">
            {visibleSlots.length || 2} slots
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Latest card</p>
            <p className="mt-2 text-sm font-medium">
              {latestCardScan ? latestCardScan.cardId || 'Unknown card' : 'Waiting for card scan...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {latestCardScan ? latestCardScan.message || EVENT_LABELS.card_scan : 'No scan yet'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Latest gate state</p>
            <p className="mt-2 text-sm font-medium">
              {latestGateEvent ? latestGateEvent.message || EVENT_LABELS[latestGateEvent.eventType] : 'Waiting for gate event...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {latestGateEvent ? new Date(latestGateEvent.timestamp).toLocaleTimeString() : 'No gate activity yet'}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-semibold text-slate-200">Slot status</h5>
            <span className="text-xs text-slate-400">Live from Arduino</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(visibleSlots.length > 0
              ? visibleSlots
              : [1, 2].map((slotNumber) => ({ slotNumber, isOccupied: false }))).map((slot) => (
              <div
                key={slot.slotNumber}
                className={`rounded-xl border p-4 ${
                  slot.isOccupied ? 'border-red-500/40 bg-red-950/40' : 'border-green-500/40 bg-green-950/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Slot {slot.slotNumber}</p>
                    <p className="text-lg font-semibold mt-1">{slot.isOccupied ? 'Occupied' : 'Available'}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${slot.isOccupied ? 'bg-red-400' : 'bg-green-400'}`} />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {slot.sensorLastSeen ? `Updated ${new Date(slot.sensorLastSeen).toLocaleTimeString()}` : 'Waiting for sensor update'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-semibold text-slate-200">Event log</h5>
            <span className="text-xs text-slate-400">Last {events.length} events</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {events.length > 0 ? (
              events.map((event) => {
                const styles = EVENT_STYLES[event.eventType] || EVENT_STYLES.card_scan;
                return (
                  <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 inline-block w-2.5 h-2.5 rounded-full ${styles.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${styles.badge}`}>
                            {EVENT_LABELS[event.eventType] || event.eventType}
                          </span>
                          {event.decision && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                event.decision === 'ALLOW'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {event.decision}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-100 mt-2 break-words">
                          {event.message || 'Event received'}
                        </p>

                        {(typeof event.minutesRemaining === 'number' || typeof event.minutesRemaining === 'string') && (
                          <p className="text-xs text-slate-300 mt-1">
                            Minutes remaining: <span className="text-slate-100 font-semibold">{event.minutesRemaining}</span>
                          </p>
                        )}

                        {event.reason && (
                          <p className="text-xs text-slate-400 mt-1">
                            Reason: <span className="text-slate-200">{event.reason}</span>
                          </p>
                        )}

                        <p className="text-xs text-slate-400 mt-1">
                          {event.cardId ? `Card ${event.cardId}` : ''}
                          {event.gateId ? `${event.cardId ? ' · ' : ''}${event.gateId}` : ''}
                          {event.slotNumber ? `${event.cardId || event.gateId ? ' · ' : ''}Slot ${event.slotNumber}` : ''} ·{' '}
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400 text-center">
                Waiting for RFID scan, slot changes, or gate events...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

LiveGateFeed.propTypes = {};

export default LiveGateFeed;
