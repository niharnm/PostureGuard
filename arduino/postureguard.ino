#include <LiquidCrystal.h>

const int RED_PIN = 9;
const int GREEN_PIN = 10;
const int BLUE_PIN = 11;
const int BUZZER = 8;

LiquidCrystal lcd(12, 13, 5, 4, 3, 2);

String inputBuffer = "";

int currentR = 0;
int currentG = 255;
int currentB = 0;

int targetR = 0;
int targetG = 255;
int targetB = 0;

bool badState = false;
bool breakMode = false;

unsigned long lastFadeTime = 0;
const int fadeSpeed = 5;

unsigned long lastBuzzTime = 0;
const unsigned long buzzInterval = 1000;

unsigned long lastBreathTime = 0;
int breathBrightness = 0;
int breathDirection = 1;


//---------------------------------
void setup() {

  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  Serial.begin(9600);

  lcd.begin(16,2);
  lcd.print("PostureGaurd");
  lcd.setCursor(0,1);
  lcd.print("Initializing");

  delay(1500);
  lcd.clear();
}

//---------------------------------
void loop() {

  readSerial();
  updateFade();
  handleBuzzer();

  if (breakMode) {
    breathingPurple();
  }
}

//---------------------------------
void readSerial() {

  while (Serial.available()) {

    char c = Serial.read();

    if (c == '\n' || c == '\r') {

      processMessage(inputBuffer);
      inputBuffer = "";

    } else {

      inputBuffer += c;

      if (inputBuffer.length() > 20)
        inputBuffer = "";
    }
  }
}

//---------------------------------
void processMessage(String msg) {

  msg.trim();
  msg.toUpperCase();

  if (msg == "GOOD") {

    setTargetColor(0,255,0);
    badState = false;
    breakMode = false;

    lcd.clear();
    lcd.print("Posture: GOOD");
    lcd.setCursor(0,1);
    lcd.print("Keep it up!");

  }
  else if (msg == "WARN") {

    setTargetColor(255,255,0);
    badState = false;
    breakMode = false;

    lcd.clear();
    lcd.print("Posture: WARN");
    lcd.setCursor(0,1);
    lcd.print("Sit straighter");

  }
  else if (msg == "BAD") {

    setTargetColor(255,0,0);
    badState = true;
    breakMode = false;

    lcd.clear();
    lcd.print("Posture: BAD");
    lcd.setCursor(0,1);
    lcd.print("Fix posture!");

    tone(BUZZER,1500,150);
  }
  else if (msg == "BREAK") {

    breakMode = true;
    badState = false;

    lcd.clear();
    lcd.print("Break Time");
    lcd.setCursor(0,1);
    lcd.print("Stand & stretch");
  }
}

//---------------------------------
void setTargetColor(int r,int g,int b) {

  targetR = r;
  targetG = g;
  targetB = b;
}

//---------------------------------
void updateFade() {

  if (breakMode) return;

  unsigned long now = millis();

  if (now - lastFadeTime < fadeSpeed) return;

  lastFadeTime = now;

  if (currentR < targetR) currentR++;
  if (currentR > targetR) currentR--;

  if (currentG < targetG) currentG++;
  if (currentG > targetG) currentG--;

  if (currentB < targetB) currentB++;
  if (currentB > targetB) currentB--;

  analogWrite(RED_PIN,currentR);
  analogWrite(GREEN_PIN,currentG);
  analogWrite(BLUE_PIN,currentB);
}

//---------------------------------
void breathingPurple() {

  unsigned long now = millis();

  if (now - lastBreathTime < 20) return;

  lastBreathTime = now;

  breathBrightness += breathDirection;

  if (breathBrightness >= 255 || breathBrightness <= 0)
    breathDirection *= -1;

  analogWrite(RED_PIN, breathBrightness);
  analogWrite(GREEN_PIN, 0);
  analogWrite(BLUE_PIN, breathBrightness);
}

//---------------------------------
void handleBuzzer() {

  if (!badState) return;

  unsigned long now = millis();

  if (now - lastBuzzTime >= buzzInterval) {

    lastBuzzTime = now;
    tone(BUZZER,1200,150);
  }
}
