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

// Pinos dos LEDs (ESP32 tem muitos pinos disponíveis)
#define LED_GREEN 25   // Sessão Ativa (START)
#define LED_YELLOW 26  // Aguardar Cartão
#define LED_RED 27     // Erro/Bloqueado

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin(); 
  rfid.PCD_Init();

  // Configurar LEDs
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  
  // Estado inicial: LED Amarelo (A aguardar)
  setLED("yellow");

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

// Função para controlar os LEDs
void setLED(String color) {
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);
  
  if (color == "green") {
    digitalWrite(LED_GREEN, HIGH);
  } else if (color == "yellow") {
    digitalWrite(LED_YELLOW, HIGH);
  } else if (color == "red") {
    digitalWrite(LED_RED, HIGH);
  }
}

// Piscar LED
void blinkLED(int pin, int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(150);
    digitalWrite(pin, LOW);
    delay(150);
  }
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

  // Feedback: Cartão detetado
  blinkLED(LED_YELLOW, 2);
  setLED("yellow");

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
      
      // Processar resposta e atualizar LED
      if(httpResponseCode == 200) {
        if(response.indexOf("\"status\":\"START\"") > 0) {
          setLED("green");
          Serial.println("→ SESSÃO INICIADA (LED Verde)");
          delay(2000);
          setLED("yellow");
        } else if(response.indexOf("\"status\":\"STOP\"") > 0) {
          blinkLED(LED_GREEN, 3);
          Serial.println("→ SESSÃO ENCERRADA (LED Verde Piscante)");
          setLED("yellow");
        }
      } else if(httpResponseCode == 403) {
        // Acesso negado (cartão não registado)
        setLED("red");
        Serial.println("→ ACESSO NEGADO (LED Vermelho)");
        delay(3000);
        setLED("yellow");
      } else {
        // Outro erro
        blinkLED(LED_RED, 2);
        setLED("yellow");
      }
    } else {
      Serial.print("Erro no envio: ");
      Serial.println(httpResponseCode);
      blinkLED(LED_RED, 1);
      setLED("yellow");
    }
    http.end();
  } else {
    Serial.println("WiFi desconectado!");
    setLED("red");
  }

  // Parar leitura para evitar duplicados imediatos
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(2000); 
}

