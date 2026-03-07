/*
  PostureGuard Arduino Firmware
  Receives serial commands: GOOD, WARN, BAD

  Wiring (Arduino Uno):
  - Green LED anode -> pin 8 through 220 ohm resistor, cathode -> GND
  - Yellow LED anode -> pin 9 through 220 ohm resistor, cathode -> GND
  - Red LED anode -> pin 10 through 220 ohm resistor, cathode -> GND
  - Buzzer positive -> pin 6, negative -> GND
*/

const int GREEN_LED = 8;
const int YELLOW_LED = 9;
const int RED_LED = 10;
const int BUZZER_PIN = 6;

String incoming = "";

void setup() {
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  allOff();
  Serial.begin(9600);
}

void loop() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      incoming.trim();
      if (incoming.length() > 0) {
        handleState(incoming);
      }
      incoming = "";
    } else {
      incoming += c;
    }
  }
}

void handleState(String state) {
  if (state == "GOOD") {
    showGood();
  } else if (state == "WARN") {
    showWarn();
  } else if (state == "BAD") {
    showBad();
  }
}

void allOff() {
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);
  noTone(BUZZER_PIN);
}

void showGood() {
  allOff();
  digitalWrite(GREEN_LED, HIGH);
}

void showWarn() {
  allOff();
  digitalWrite(YELLOW_LED, HIGH);
}

void showBad() {
  allOff();
  digitalWrite(RED_LED, HIGH);

  // Short pulse to avoid continuous harsh sound.
  tone(BUZZER_PIN, 880, 140);
}
