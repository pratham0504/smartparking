/*
===========================================
BLUETOOTH CAR TRACKING MODULE
===========================================
Tracks car movement through parking lot using:
- Bluetooth HC-05 receivers at checkpoints
- Ultrasonic sensors at parking spots
- Real-time signal strength & distance measurements

PIN SETUP:
- Bluetooth HC-05 RX -> Pin 19 (A5)
- Bluetooth HC-05 TX -> Pin 18 (A4)
- Ultrasonic Trigger -> Pin 11
- Ultrasonic Echo -> Pin 12
- Checkpoints IR sensors -> Pins 13, 14, 15
*/

#include <SoftwareSerial.h>
#include <NewPing.h>

// ========== PIN DEFINITIONS ==========
// Bluetooth module (HC-05)
const int BT_RX = 19;  // A5
const int BT_TX = 18;  // A4
SoftwareSerial btSerial(BT_RX, BT_TX);  // RX, TX

// Ultrasonic sensor (at each parking spot)
const int TRIGGER_PIN = 11;
const int ECHO_PIN = 12;
const int MAX_DISTANCE = 400;  // cm
NewPing sonar(TRIGGER_PIN, ECHO_PIN, MAX_DISTANCE);

// IR sensors for checkpoint detection (zone detection)
const int CHECKPOINT_1_PIN = 13;  // Entrance zone
const int CHECKPOINT_2_PIN = 14;  // Middle zone
const int CHECKPOINT_3_PIN = 15;  // Spot zone

// ========== CONFIGURATION ==========
const unsigned long LOCATION_UPDATE_INTERVAL = 2000;  // Send location every 2 seconds
const unsigned long ULTRASONIC_CHECK_INTERVAL = 500;   // Check distance every 500ms
const int DISTANCE_THRESHOLD = 100;  // cm - consider car "arrived" if < 100cm
const int SIGNAL_THRESHOLD = -80;    // dBm - threshold for Bluetooth signal

// ========== STATE TRACKING ==========
unsigned long lastLocationUpdate = 0;
unsigned long lastUltrasonicCheck = 0;
String currentZone = "OUTSIDE";
int lastSignalStrength = -100;
int lastDistance = 0;
bool carArrived = false;

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  btSerial.begin(9600);  // HC-05 default baud rate
  
  // Setup checkpoint sensors
  pinMode(CHECKPOINT_1_PIN, INPUT_PULLUP);
  pinMode(CHECKPOINT_2_PIN, INPUT_PULLUP);
  pinMode(CHECKPOINT_3_PIN, INPUT_PULLUP);
  
  delay(1000);
  
  Serial.println("==========================================");
  Serial.println("CAR TRACKING MODULE - BLUETOOTH + ULTRASONIC");
  Serial.println("==========================================");
  Serial.println("Waiting for Bluetooth connection...");
  Serial.println("Place car with HC-05 tag within range");
}

// ========== MAIN LOOP ==========
void loop() {
  // Check Bluetooth signal strength continuously
  checkBluetoothSignal();
  
  // Update checkpoint zones
  updateZoneDetection();
  
  // Check ultrasonic distance periodically
  if (millis() - lastUltrasonicCheck >= ULTRASONIC_CHECK_INTERVAL) {
    checkUltrasonicDistance();
    lastUltrasonicCheck = millis();
  }
  
  // Send location update to backend periodically
  if (millis() - lastLocationUpdate >= LOCATION_UPDATE_INTERVAL) {
    sendLocationUpdate();
    lastLocationUpdate = millis();
  }
  
  delay(10);
}

// ========== BLUETOOTH SIGNAL STRENGTH ==========
// This estimates position based on signal strength (RSSI)
// Note: RSSI accuracy varies; combine with checkpoint data for better accuracy
void checkBluetoothSignal() {
  if (btSerial.available()) {
    String data = "";
    while (btSerial.available()) {
      char c = btSerial.read();
      if (c == '\n' || c == '\r') break;
      data += c;
    }
    
    if (data.startsWith("RSSI:")) {
      // Parse: RSSI:-65  (negative value in dBm)
      lastSignalStrength = data.substring(5).toInt();
      
      Serial.print("[BT] Signal strength: ");
      Serial.print(lastSignalStrength);
      Serial.println(" dBm");
      
      // Estimate distance from signal strength
      // RSSI = -10n*log10(d) + A (where A ≈ -40, n ≈ 2)
      // Rough formula: distance(m) ≈ 10^((A - RSSI) / (10*n))
      if (lastSignalStrength > SIGNAL_THRESHOLD) {
        Serial.println("[BT] ✓ Car in range");
      } else {
        Serial.println("[BT] ✗ Car out of range");
      }
    }
  }
}

// ========== ZONE/CHECKPOINT DETECTION ==========
// Detect which zone car is in based on IR sensors
void updateZoneDetection() {
  bool zone1 = digitalRead(CHECKPOINT_1_PIN) == LOW;  // LOW = motion detected
  bool zone2 = digitalRead(CHECKPOINT_2_PIN) == LOW;
  bool zone3 = digitalRead(CHECKPOINT_3_PIN) == LOW;
  
  String newZone = "OUTSIDE";
  
  if (zone1) newZone = "ENTRANCE";
  else if (zone2) newZone = "MIDDLE";
  else if (zone3) newZone = "SPOT";
  
  if (newZone != currentZone) {
    currentZone = newZone;
    Serial.print("[ZONE] Car detected at: ");
    Serial.println(currentZone);
  }
}

// ========== ULTRASONIC DISTANCE CHECK ==========
// Detect when car arrives at parking spot
void checkUltrasonicDistance() {
  int distance = sonar.ping_cm();  // Distance in cm
  
  if (distance > 0) {  // Valid reading
    lastDistance = distance;
    
    Serial.print("[ULTRASONIC] Distance: ");
    Serial.print(distance);
    Serial.println(" cm");
    
    // Check if car arrived at spot
    if (distance < DISTANCE_THRESHOLD && distance > 0) {
      if (!carArrived) {
        carArrived = true;
        Serial.println("[SPOT] ✓ CAR ARRIVED - Parking spot occupied!");
      }
    } else if (distance > DISTANCE_THRESHOLD + 50) {
      carArrived = false;  // Reset if car moves away
    }
  }
}

// ========== SEND LOCATION UPDATE ==========
// Format: {cardId, reservationId, zone, distance, signalStrength, arrived}
void sendLocationUpdate() {
  String locationData = "";
  locationData += "LOC:";
  locationData += currentZone;
  locationData += ":DIST:";
  locationData += lastDistance;
  locationData += ":SIGNAL:";
  locationData += lastSignalStrength;
  locationData += ":ARRIVED:";
  locationData += (carArrived ? "1" : "0");
  
  Serial.println(locationData);
  // This will be captured by rfidGateBridge.py and sent to backend
}
