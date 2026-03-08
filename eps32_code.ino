#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "DHT.h"

#define WIFI_SSID "WIFI_NAME"
#define WIFI_PASSWORD "WIFI_PASSWORD"

#define DATABASE_URL "FIREBASE_DATABASE_URL"
#define DATABASE_SECRET "FIREBASE_DATABASE_SECRET"

#define DHTPIN 4
#define DHTTYPE DHT11
#define MOISTURE_PIN 34
#define LDR_PIN 32
#define TDS_PIN 35

/* Moisture Calibration */
int DRY_VALUE = 3300;
int WET_VALUE = 1400; // Adjust as per your needs

/* LDR Calibration */
int DARK_VALUE = 3500;
int BRIGHT_VALUE = 200;

DHT dht(DHTPIN, DHTTYPE);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {

  Serial.begin(115200);
  delay(2000);
  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");

  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {

  /* Read DHT11 */
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  /* Read Soil Moisture */
  int moistureRaw = analogRead(MOISTURE_PIN);
  int moisturePercent = map(moistureRaw, DRY_VALUE, WET_VALUE, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);

  /* Read Light (Inverted) */
  int lightRaw = analogRead(LDR_PIN);
  int lightPercent = map(lightRaw, DARK_VALUE, BRIGHT_VALUE, 0, 100);
  lightPercent = constrain(lightPercent, 0, 100);

  int tdsRaw = analogRead(TDS_PIN);

  /* Print values */
  Serial.println("------ SENSOR DATA ------");

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");

  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.print("Moisture: ");
  Serial.print(moisturePercent);
  Serial.println(" %");

  Serial.print("Light: ");
  Serial.print(lightPercent);
  Serial.println(" %");

  Serial.print("TDS Raw: ");
  Serial.println(tdsRaw);

  Serial.println("-------------------------");

  /* Send to Firebase */

  Firebase.RTDB.setFloat(&fbdo, "/CropData/Temperature", temperature);
  Firebase.RTDB.setFloat(&fbdo, "/CropData/Humidity", humidity);
  Firebase.RTDB.setInt(&fbdo, "/CropData/Moisture", moisturePercent);
  Firebase.RTDB.setInt(&fbdo, "/CropData/Light", lightPercent);
  Firebase.RTDB.setInt(&fbdo, "/CropData/TDS", tdsRaw);

  Serial.println("Data Sent to Firebase\n");

  delay(5000);
}