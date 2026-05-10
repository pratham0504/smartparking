#!/usr/bin/env python3
"""
Multi-camera + FASTag event simulator for the ParkEz project.

Publishes simulated camera detection events and FASTag reads to an MQTT broker.

Usage:
  python tools/simulators/multi_camera_simulator.py --broker localhost --port 1883 --cameras 5 --interval 2

Dependencies:
  pip install paho-mqtt

Topics published:
  camera/{cameraId}/events  -> JSON camera detection event
  fastag/{readerId}/reads   -> JSON fastag read event

This script is for prototyping and testing the backend MQTT ingest + realtime bridge.
"""

import argparse
import json
import random
import string
import threading
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt


def random_plate():
    # Simple random plate generator (format: XX-00-XX-0000 or tuned to region)
    letters = ''.join(random.choices(string.ascii_uppercase, k=2))
    numbers = ''.join(random.choices(string.digits, k=4))
    return f"{letters}-{numbers}"


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


class CameraSimulator(threading.Thread):
    def __init__(self, client, camera_id, gate_id, interval, fastag_prob, mqtt_prefix):
        super().__init__(daemon=True)
        self.client = client
        self.camera_id = camera_id
        self.gate_id = gate_id
        self.interval = interval
        self.fastag_prob = fastag_prob
        self.mqtt_prefix = mqtt_prefix
        self.running = True

    def stop(self):
        self.running = False

    def run(self):
        while self.running:
            # Randomly decide if a vehicle is detected in this cycle
            seen = random.random() < 0.7  # 70% chance to detect a vehicle each interval
            if seen:
                plate = random_plate()
                event = {
                    "cameraId": self.camera_id,
                    "gateId": self.gate_id,
                    "timestampUtc": utc_now_iso(),
                    "plateText": plate,
                    "confidence": round(random.uniform(0.6, 0.98), 2),
                    "snapshot": None,  # placeholder: not sending images in simulator
                    "location": None,
                }
                topic = f"{self.mqtt_prefix}/camera/{self.camera_id}/events"
                payload = json.dumps(event)
                self.client.publish(topic, payload)
                print(f"[PUB] {topic} -> {payload}")

                # Optionally publish a FASTag read associated with this capture
                if random.random() < self.fastag_prob:
                    # Simulate a FASTag read event
                    fastag_id = "FT" + ''.join(random.choices(string.digits, k=8))
                    reader_id = f"reader-{self.gate_id}"
                    fastag_event = {
                        "readerId": reader_id,
                        "fastagId": fastag_id,
                        "timestampUtc": utc_now_iso(),
                        "gateId": self.gate_id,
                        "detectedPlate": plate,
                    }
                    f_topic = f"{self.mqtt_prefix}/fastag/{reader_id}/reads"
                    f_payload = json.dumps(fastag_event)
                    self.client.publish(f_topic, f_payload)
                    print(f"[PUB] {f_topic} -> {f_payload}")

            time.sleep(self.interval)


def main():
    parser = argparse.ArgumentParser(description="Multi-camera + FASTag MQTT simulator")
    parser.add_argument("--broker", default="localhost", help="MQTT broker host")
    parser.add_argument("--port", type=int, default=1883, help="MQTT broker port")
    parser.add_argument("--cameras", type=int, default=3, help="Number of simulated cameras")
    parser.add_argument("--interval", type=float, default=2.0, help="Seconds between each camera cycle")
    parser.add_argument("--fastag-prob", type=float, default=0.3, help="Probability that a FASTag read accompanies a camera detection (0..1)")
    parser.add_argument("--mqtt-prefix", default="parkEz", help="MQTT topic prefix")
    parser.add_argument("--gate-prefix", default="gate", help="Prefix to build gate ids")
    args = parser.parse_args()

    client = mqtt.Client()
    client.connect(args.broker, args.port)
    client.loop_start()

    simulators = []
    for i in range(args.cameras):
        camera_id = f"cam-{i+1}"
        gate_id = f"{args.gate_prefix}-{(i % 4) + 1}"  # map cameras to gates (example)
        sim = CameraSimulator(client, camera_id, gate_id, args.interval, args.fastag_prob, args.mqtt_prefix)
        sim.start()
        simulators.append(sim)

    print(f"Started {len(simulators)} camera simulators. Publishing to {args.broker}:{args.port} with prefix '{args.mqtt_prefix}'")
    print("Press Ctrl+C to stop")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping simulators...")
        for s in simulators:
            s.stop()
        time.sleep(1)
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
