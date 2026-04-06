#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

/**
 * 🧪 SIMULADOR ESP32 - PROJETO CASAIS (LABORATORIO DE BRAGA)
 * 
 * Este código funciona no WOKWI.COM e permite testar a comunicação
 * real com o teu Firebase sem precisares do hardware físico.
 */

// --- CONFIGURAÇÃO SIMULADOR WOKWI ---
const char* ssid = "Wokwi-GUEST"; 
const char* password = ""; 

// URL do Teu Backend Firebase
const char* SERVER_URL = "https://handlesessiontrigger-mtaqaropqq-uc.a.run.app";

// Identificação Única para Testes em Braga
const char* MACHINE_ID = "M_GRUAC_01_SIMULADA";

// Pinos ESP32 para MFRC522
#define SS_PIN  5
#define RST_PIN 22 

// Pinos LEDs
#define LED_GREEN  25
#define LED_YELLOW 26
#define LED_RED    27

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin(); 
  rfid.PCD_Init();

  pinMode(LED_GREEN,  OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED,    OUTPUT);
  
  setLED("yellow");

  Serial.println("🌐 A conectar ao Wi-Fi Virtual (Wokwi)...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Wi-Fi Conectado!");
  Serial.println("📡 Servidor: " + String(SERVER_URL));
  Serial.println("🆔 Maquina: " + String(MACHINE_ID));
  Serial.println("💡 DICA: Clica no componente RFID azul e escolhe um cartao para simular.");
}

void setLED(String color) {
  digitalWrite(LED_GREEN,  LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED,    LOW);
  if (color == "green")  digitalWrite(LED_GREEN,  HIGH);
  if (color == "yellow") digitalWrite(LED_YELLOW, HIGH);
  if (color == "red")    digitalWrite(LED_RED,    HIGH);
}

void loop() {
  // Verificar se ha cartao
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial())
    return;

  // Gerar ID do Cartao
  String cardId = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if(rfid.uid.uidByte[i] < 0x10) cardId += "0";
    cardId += String(rfid.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();

  Serial.println("\n------------------------------------");
  Serial.println("💳 Cartão Detectado: " + cardId);

  // Enviar para a Firebase
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\"cardId\":\"" + cardId + "\",\"machineId\":\"" + String(MACHINE_ID) + "\"}";
    
    Serial.println("🚀 A enviar dados para a Cloud...");
    int httpResponseCode = http.POST(jsonPayload);
    
    if(httpResponseCode > 0){
      String response = http.getString();
      Serial.println("📥 Resposta do Firebase (" + String(httpResponseCode) + "): " + response);
      
      if(httpResponseCode == 200) {
        if(response.indexOf("\"status\":\"START\"") > 0) {
          setLED("green");
          Serial.println("🔥 SESSÃO INICIADA!");
        } else if(response.indexOf("\"status\":\"STOP\"") > 0) {
          setLED("yellow");
          Serial.println("🛑 SESSÃO ENCERRADA.");
        }
      } else if(httpResponseCode == 403) {
        setLED("red");
        Serial.println("❌ ACESSO NEGADO: Cartao nao registado.");
      }
    } else {
      Serial.println("⚠️ Erro no envio HTTP.");
    }
    http.end();
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(3000); 
}
