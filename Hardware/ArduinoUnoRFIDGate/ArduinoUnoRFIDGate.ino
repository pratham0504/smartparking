#include <SoftwareSerial.h>
#include <Servo.h>

// ============================================
// EM-18 RFID Reader + 2 Slot IR Sensors + Gate
// ============================================
//
// RFID Reader Wiring:
// - RS232 Mode: EM-18 TX -> Arduino pin 2
// - Wiegand Mode: EM-18 WDATA1 -> pin 5, WDATA0 -> pin 6
// - Set SEL jumper on board to select mode (RS232=ON, Wiegand=OFF)
//
// Gate & Sensors:
// - Servo signal (gate control) -> Pin 10
// - IR Sensor 1 (slot 1) -> Pin 8
// - IR Sensor 2 (slot 2) -> Pin 9
//
// NOTE: Slot publishing is NON-BLOCKING and runs continuously
//       RFID scanning does NOT block slot updates

// ========== PIN DEFINITIONS ==========
constexpr byte EM18_RX_PIN = 2;
constexpr byte EM18_TX_PIN = 3;
constexpr byte SERVO_PIN = 10;
constexpr byte WIEGAND_D1_PIN = 5;
constexpr byte WIEGAND_D0_PIN = 6;
constexpr byte IR_SENSOR_1_PIN = 8;
constexpr byte IR_SENSOR_2_PIN = 9;

// ========== SERVO GATE SETTINGS ==========
constexpr int GATE_OPEN_ANGLE = 90;
constexpr int GATE_CLOSED_ANGLE = 0;
constexpr unsigned long GATE_PULSE_MS = 7000;

// ========== PROJECT SETTINGS ==========
const char* readerId = "uno-reader-1";
const char* gateId = "gate-a";

// ========== HARDWARE OBJECTS ==========
SoftwareSerial em18Serial(EM18_RX_PIN, EM18_TX_PIN);
Servo gateServo;

// ========== STATE TRACKING ==========
// Sensor timing
unsigned long lastSensorCheckTime = 0;
const unsigned long SENSOR_CHECK_INTERVAL = 250;  // Check every 250ms for responsive updates
unsigned long lastSnapshotPublishTime = 0;
const unsigned long SNAPSHOT_PUBLISH_INTERVAL = 30000;  // Full snapshot every 30 seconds (reduce spam)

// Slot states
bool slot1_occupied = false;
bool slot2_occupied = false;
bool sensor1_last_state = LOW;
bool sensor2_last_state = LOW;

// Wiegand (optional)
volatile uint32_t wiegandBits = 0;
volatile byte wiegandBitCount = 0;
volatile unsigned long lastWiegandTime = 0;
const unsigned long WIEGAND_TIMEOUT = 100;

// RFID card scanning (non-blocking state machine)
enum RFIDState { RFID_IDLE, RFID_READING, RFID_WAITING_DECISION };
RFIDState rfidState = RFID_IDLE;
String currentCardId = "";
unsigned long rfidReadStart = 0;
unsigned long rfidDecisionStart = 0;
const unsigned long RFID_READ_TIMEOUT = 400;      // 400ms to read card ID
const unsigned long RFID_DECISION_TIMEOUT = 2000; // 2000ms to get bridge decision (shorter = faster recovery)

// ========== SERIAL READER FUNCTION ==========
// Non-blocking: reads available data and extracts alphanumeric characters
// Returns the complete card ID when a line ending is found
String tryReadCardFromSerial() {
  // Non-blocking serial reader with tolerant termination.
  // Accumulates alphanumeric chars and returns when:
  //  - newline/carriage return received (most reliable), or
  //  - 12 chars are received (preferred full chip ID), or
  //  - a short pause after bytes (~250ms) with at least 4 chars (legacy IDs)
  static String buf = "";
  static unsigned long lastByteTime = 0;
  const unsigned long INTER_CHAR_TIMEOUT = 250; // ms (wait for inter-char gap before returning)
  const size_t MIN_CARD_LENGTH = 4;
  const size_t TARGET_CARD_LENGTH = 12;

  while (em18Serial.available() > 0) {
    char c = (char)em18Serial.read();
    lastByteTime = millis();

    if (c == '\n' || c == '\r') {
      if (buf.length() > 0) {
        String out = buf;
        buf = "";
        // Debug: show raw received line
        Serial.print(F("[RFID-RAW] "));
        Serial.println(out);
        return out;
      }
      // ignore empty line
    } else {
      if (isAlphaNumeric(c)) {
        buf += (char)toupper(c);
      } else {
        // non-alnum characters are ignored but shown for debug
      }

      // Prefer full 12-char ID immediately when available
      if (buf.length() >= TARGET_CARD_LENGTH) {
        String out = buf;
        buf = "";
        Serial.print(F("[RFID-RAW] "));
        Serial.println(out);
        return out;
      }
    }
  }

  // If we have partial data and there's been a pause, return it as complete
  if (buf.length() >= MIN_CARD_LENGTH && (millis() - lastByteTime) > INTER_CHAR_TIMEOUT) {
    String out = buf;
    buf = "";
    Serial.print(F("[RFID-RAW-TIMEOUT] "));
    Serial.println(out);
    return out;
  }

  return "";
}

// ========== WIEGAND INTERRUPT HANDLERS ==========
void wiegandD1Interrupt() {
  if (digitalRead(WIEGAND_D1_PIN) == LOW) {
    wiegandBits = (wiegandBits << 1) | 1;
    wiegandBitCount++;
    lastWiegandTime = millis();
  }
}

void wiegandD0Interrupt() {
  if (digitalRead(WIEGAND_D0_PIN) == LOW) {
    wiegandBits = (wiegandBits << 1) | 0;
    wiegandBitCount++;
    lastWiegandTime = millis();
  }
}

// ========== WIEGAND DECODER ==========
String decodeWiegand() {
  if (wiegandBitCount == 0) return "";

  String result;
  if (wiegandBitCount == 26) {
    uint16_t cardCode = (wiegandBits >> 1) & 0xFFFF;
    result = String(cardCode);
  } else if (wiegandBitCount == 34) {
    uint32_t cardCode = (wiegandBits >> 1) & 0xFFFFFFFFUL;
    result = String(cardCode);
  } else {
    result = String(wiegandBits, HEX);
  }

  result.toUpperCase();
  wiegandBits = 0;
  wiegandBitCount = 0;
  return result;
}

// ========== GATE CONTROL ==========
void openGatePulse() {
  Serial.println(F("[GATE] Opening gate..."));
  gateServo.write(GATE_OPEN_ANGLE);
  Serial.print(F("[GATE] Servo angle -> "));
  Serial.println(GATE_OPEN_ANGLE);

  delay(GATE_PULSE_MS);

  gateServo.write(GATE_CLOSED_ANGLE);
  Serial.print(F("[GATE] Servo angle -> "));
  Serial.println(GATE_CLOSED_ANGLE);
  Serial.println(F("[GATE] Gate closed"));
}

// ========== LIVE SLOT PUBLISHING ==========
void publishSlotState(byte slotNumber, bool occupied, byte pinNumber) {
  // Always publish in bridge-compatible format: SLOT:N:OCCUPIED|FREE:VAL:0|1:PIN:pin
  Serial.print(F("SLOT:"));
  Serial.print(slotNumber);
  Serial.print(occupied ? F(":OCCUPIED:VAL:1:PIN:") : F(":FREE:VAL:0:PIN:"));
  Serial.println(pinNumber);
}

void publishInitialSlotSnapshot() {
  bool initialSlot1 = (digitalRead(IR_SENSOR_1_PIN) == LOW);
  bool initialSlot2 = (digitalRead(IR_SENSOR_2_PIN) == LOW);

  slot1_occupied = initialSlot1;
  slot2_occupied = initialSlot2;
  sensor1_last_state = initialSlot1;
  sensor2_last_state = initialSlot2;

  Serial.print(F("[SLOT-SNAPSHOT] Slot 1 -> "));
  Serial.println(initialSlot1 ? F("OCCUPIED") : F("FREE"));
  publishSlotState(1, initialSlot1, IR_SENSOR_1_PIN);
  
  Serial.print(F("[SLOT-SNAPSHOT] Slot 2 -> "));
  Serial.println(initialSlot2 ? F("OCCUPIED") : F("FREE"));
  publishSlotState(2, initialSlot2, IR_SENSOR_2_PIN);
}

// ========== DUAL SLOT DETECTION (NON-BLOCKING) ==========
void checkDualIRSensors() {
  if (millis() - lastSensorCheckTime < SENSOR_CHECK_INTERVAL) {
    return;  // Not time yet - return immediately without blocking
  }

  lastSensorCheckTime = millis();

  int raw1 = digitalRead(IR_SENSOR_1_PIN);
  int raw2 = digitalRead(IR_SENSOR_2_PIN);
  bool sensor1_current = (raw1 == LOW);  // LOW = occupied
  bool sensor2_current = (raw2 == LOW);  // LOW = occupied

  // Log raw sensor changes (only when they change)
  static int last_raw_s1 = -1;
  static int last_raw_s2 = -1;
  if (raw1 != last_raw_s1 || raw2 != last_raw_s2) {
    last_raw_s1 = raw1;
    last_raw_s2 = raw2;
    Serial.print(F("[DIAG] Sensors: IR1="));
    Serial.print(raw1);
    Serial.print(F(" IR2="));
    Serial.println(raw2);
  }

  // Detect transitions on Slot 1
  if (sensor1_current != sensor1_last_state) {
    sensor1_last_state = sensor1_current;
    if (sensor1_current) {
      Serial.println(F("[SENSOR-1] ✓ Slot 1 occupied"));
    } else {
      Serial.println(F("[SENSOR-1] ✗ Slot 1 cleared"));
    }
    publishSlotState(1, sensor1_current, IR_SENSOR_1_PIN);
  }

  // Detect transitions on Slot 2
  if (sensor2_current != sensor2_last_state) {
    sensor2_last_state = sensor2_current;
    if (sensor2_current) {
      Serial.println(F("[SENSOR-2] ✓ Slot 2 occupied"));
    } else {
      Serial.println(F("[SENSOR-2] ✗ Slot 2 cleared"));
    }
    publishSlotState(2, sensor2_current, IR_SENSOR_2_PIN);
  }

  // Update overall slot occupancy state
  if (sensor1_current != slot1_occupied) {
    slot1_occupied = sensor1_current;
    Serial.println(slot1_occupied ? F("[SLOT-1] ⬆ OCCUPIED") : F("[SLOT-1] ⬇ EMPTY"));
  }

  if (sensor2_current != slot2_occupied) {
    slot2_occupied = sensor2_current;
    Serial.println(slot2_occupied ? F("[SLOT-2] ⬆ OCCUPIED") : F("[SLOT-2] ⬇ EMPTY"));
  }

  // Periodic full snapshot for synchronization (every 5 seconds)
  if (millis() - lastSnapshotPublishTime >= SNAPSHOT_PUBLISH_INTERVAL) {
    lastSnapshotPublishTime = millis();
    Serial.println(F("[SLOT-SNAPSHOT] Periodic sync"));
    // Stagger publishes slightly so the bridge/host has time to process lines one-by-one
    publishSlotState(1, slot1_occupied, IR_SENSOR_1_PIN);
    delay(8);
    publishSlotState(2, slot2_occupied, IR_SENSOR_2_PIN);
  }
}

// ========== RFID CARD SCANNING (NON-BLOCKING STATE MACHINE) ==========
void processRFIDStateMachine() {
  switch (rfidState) {
    
    case RFID_IDLE:
      // Continuously attempt serial parsing so transient bytes are not missed.
      {
        String serialCard = tryReadCardFromSerial();
        if (serialCard.length() > 0) {
          currentCardId = serialCard;

          Serial.print(F("[RFID] Card detected: "));
          Serial.println(currentCardId);
          Serial.print(F("CARD:"));
          Serial.print(currentCardId);
          Serial.print(F(":READER:"));
          Serial.print(readerId);
          Serial.print(F(":GATE:"));
          Serial.println(gateId);

          rfidState = RFID_WAITING_DECISION;
          rfidDecisionStart = millis();
          break;
        }
      }

      // Optional Wiegand path
      if (wiegandBitCount > 0 && (millis() - lastWiegandTime) > WIEGAND_TIMEOUT) {
        currentCardId = decodeWiegand();
        if (currentCardId.length() > 0) {
          Serial.print(F("[RFID] Card detected (Wiegand): "));
          Serial.println(currentCardId);
          Serial.print(F("CARD:"));
          Serial.print(currentCardId);
          Serial.print(F(":READER:"));
          Serial.print(readerId);
          Serial.print(F(":GATE:"));
          Serial.println(gateId);

          rfidState = RFID_WAITING_DECISION;
          rfidDecisionStart = millis();
        }
      }
      break;

    case RFID_READING:
      // Reading is handled continuously in RFID_IDLE.
      rfidState = RFID_IDLE;
      break;

    case RFID_WAITING_DECISION:
      // Check for bridge decision on USB serial (not SoftwareSerial)
      if (Serial.available() > 0) {
        String resp = "";
        while (Serial.available() > 0) {
          char c = Serial.read();
          if (c == '\n' || c == '\r') break;
          if (c > 0) resp += c;
        }
        resp.trim();
        
        if (resp.length() > 0) {
          Serial.print(F("[RFID] Bridge decision: "));
          Serial.println(resp);
          
          if (resp.indexOf("ALLOW") >= 0) {
            Serial.println(F("[AUTH] ✓ ALLOW - opening gate"));
            openGatePulse();
          } else {
            Serial.println(F("[AUTH] ✗ DENY"));
          }
          
          rfidState = RFID_IDLE;
        }
      } else if (millis() - rfidDecisionStart > RFID_DECISION_TIMEOUT) {
        // Timeout waiting for decision
        Serial.println(F("[RFID] Decision timeout"));
        currentCardId = "";
        rfidState = RFID_IDLE;
      }
      break;
  }
}


// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  em18Serial.begin(9600);

  gateServo.attach(SERVO_PIN);
  gateServo.write(GATE_CLOSED_ANGLE);

  pinMode(IR_SENSOR_1_PIN, INPUT_PULLUP);
  pinMode(IR_SENSOR_2_PIN, INPUT_PULLUP);

  pinMode(WIEGAND_D1_PIN, INPUT_PULLUP);
  pinMode(WIEGAND_D0_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(WIEGAND_D1_PIN), wiegandD1Interrupt, FALLING);
  attachInterrupt(digitalPinToInterrupt(WIEGAND_D0_PIN), wiegandD0Interrupt, FALLING);

  delay(1000);

  Serial.println(F("=========================================="));
  Serial.println(F("RFID Gate + 2 Slot Sensors"));
  Serial.println(F("=========================================="));
  Serial.print(F("Reader ID: "));
  Serial.println(readerId);
  Serial.print(F("Gate ID: "));
  Serial.println(gateId);
  Serial.println(F(""));
  Serial.println(F("HARDWARE SETUP:"));
  Serial.print(F("  Servo signal....... pin "));
  Serial.print(SERVO_PIN);
  Serial.println(F(" (gate control)"));
  Serial.print(F("  Open angle......... "));
  Serial.println(GATE_OPEN_ANGLE);
  Serial.print(F("  Closed angle....... "));
  Serial.println(GATE_CLOSED_ANGLE);
  Serial.print(F("  Gate pulse(ms)..... "));
  Serial.println(GATE_PULSE_MS);
  Serial.println(F("  EM-18 RX........... pin 2 (card read - SoftwareSerial RX)"));
  Serial.println(F("  EM-18 TX........... pin 3 (card write - SoftwareSerial TX)"));
  Serial.println(F("  Wiegand D1......... pin 5 (optional)"));
  Serial.println(F("  Wiegand D0......... pin 6 (optional)"));
  Serial.println(F("  IR Sensor 1........ pin 8 (slot 1)"));
  Serial.println(F("  IR Sensor 2........ pin 9 (slot 2)"));
  Serial.println(F(""));
  Serial.println(F("CRITICAL: Slot publishing runs continuously (non-blocking)"));
  Serial.println(F("         RFID scanning does NOT block slot updates"));
  Serial.println(F("Ready to scan cards..."));
  Serial.println(F("=========================================="));
  Serial.println(F(""));

  publishInitialSlotSnapshot();
  lastSnapshotPublishTime = millis();
}

// ========== MAIN LOOP (NON-BLOCKING) ==========
// KEY: Both checkDualIRSensors() and processRFIDStateMachine() are non-blocking
// They return immediately if it's not time to act, ensuring slot updates flow continuously
void loop() {
  // ALWAYS check slots first and continuously
  checkDualIRSensors();

  // Process RFID state machine (non-blocking state transitions)
  processRFIDStateMachine();

  // Small delay to avoid CPU spinning
  delay(10);
}
