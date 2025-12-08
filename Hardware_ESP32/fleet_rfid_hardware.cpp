#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

// --- CONFIGURAÇÃO PESSOAL (MUDE ISTO!) ---
const char* ssid = "NOME_DA_SUA_WIFI";
const char* password = "PASSWORD_DA_WIFI";

// URL do Backend (JÁ ATUALIZADO)
const char* SERVER_URL = "https://handlesessiontrigger-mtaqaropqq-uc.a.run.app";

// Identificação Única desta Máquina
const char* MACHINE_ID = "M_GRUAC_01_ESP32";

// Pinos do ESP32 para o MFRC522 (Padrão VSPI)
#define SS_PIN  5
#define RST_PIN 22 

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin(); 
  rfid.PCD_Init();

  // Conectar WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Conectado!");
  Serial.println("Pronto para ler cartões...");
}

void loop() {
  // Verificar cartão
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial())
    return;

  // Criar String do ID
  String cardId = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if(rfid.uid.uidByte[i] < 0x10) cardId += "0";
    cardId += String(rfid.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();

  Serial.print("Cartão lido: ");
  Serial.println(cardId);

  // Enviar para a Cloud
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\"cardId\":\"" + cardId + "\",\"machineId\":\"" + String(MACHINE_ID) + "\"}";
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if(httpResponseCode > 0){
      String response = http.getString();
      Serial.println("Resposta do Servidor: " + response);
    } else {
      Serial.print("Erro no envio: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }

  // Parar leitura para evitar duplicados imediatos
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(2000); 
}