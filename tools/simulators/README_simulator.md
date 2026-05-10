Multi-camera + FASTag Event Simulator

This simulator publishes synthetic camera detection events and FASTag reads to an MQTT broker so you can prototype the backend ingestion and realtime bridge.

Requirements
- Python 3.8+
- paho-mqtt

Install dependencies

```bash
python3 -m pip install --user paho-mqtt
```

Run simulator (local Mosquitto broker)

```bash
python3 tools/simulators/multi_camera_simulator.py --broker localhost --port 1883 --cameras 5 --interval 2 --fastag-prob 0.25
```

Topics published
- parkEz/camera/{cameraId}/events
- parkEz/fastag/{readerId}/reads

Next steps
- Implement backend MQTT consumer to subscribe to these topics and update slot state.
- Add Socket.IO emitter to broadcast slot state to connected frontends.
