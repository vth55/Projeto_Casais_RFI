/*
 * CÓDIGO PARA ARDUINO UNO/NANO COM LED DE STATUS
 * Máquina de Teste 1 (Ligada ao PC)
 *
 * HARDWARE:
 * - MFRC522 RFID:
 *   SDA (SS) -> Pino 10
 *   RST      -> Pino 9
 *   SCK      -> Pino 13
 *   MOSI     -> Pino 11
 *   MISO     -> Pino 12
 * 
 * - LED RGB (ou 3 LEDs separados):
 *   LED VERDE  -> Pino 5 (Sessão INICIADA)
 *   LED AMARELO-> Pino 6 (A aguardar)
 *   LED VERMELHO-> Pino 7 (Erro/Cartão não registado)
 * 
 * LIGAÇÃO DO LED:
 * Arduino Pino 5 -> Resistor 220Ω -> LED Verde (Anodo) -> GND
 * Arduino Pino 6 -> Resistor 220Ω -> LED Amarelo (Anodo) -> GND
 * Arduino Pino 7 -> Resistor 220Ω -> LED Vermelho (Anodo) -> GND
 */

#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9

// Pinos dos LEDs
#define LED_GREEN 5   // Sessão Ativa (START)
#define LED_YELLOW 6  // Aguardar Cartão
#define LED_RED 7     // Erro/Bloqueado
 
MFRC522 rfid(SS_PIN, RST_PIN);

void setup() { 
  Serial.begin(9600); 
  SPI.begin(); 
  rfid.PCD_Init();
  
  // Configurar pinos dos LEDs como saída
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  
  // Estado inicial: LED Amarelo (A aguardar)
  setLED("yellow");
  
  Serial.println("Arduino pronto (Maquina 1 com LED).");
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
  } else if (color == "off") {
    // Todos desligados
  }
}

// Piscar LED para feedback visual
void blinkLED(int pin, int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(150);
    digitalWrite(pin, LOW);
    delay(150);
  }
}
 
void loop() {
  // 1. Verificar cartão
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial())
    return;

  // 2. Formatar ID
  String cardId = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
     cardId.concat(String(rfid.uid.uidByte[i] < 0x10 ? "0" : ""));
     cardId.concat(String(rfid.uid.uidByte[i], HEX));
  }
  cardId.toUpperCase();

  // 3. Feedback visual: Cartão detetado
  blinkLED(LED_YELLOW, 2); // Piscar amarelo 2x
  setLED("yellow"); // Voltar ao amarelo enquanto processa

  // 4. Enviar para o PC
  Serial.print("CARD:");
  Serial.println(cardId);

  // 5. Aguardar resposta do Backend via Python
  // O Python deve enviar de volta: "START", "STOP", ou "DENIED"
  unsigned long timeout = millis() + 5000; // 5 segundos timeout
  String response = "";
  
  while (millis() < timeout) {
    if (Serial.available() > 0) {
      response = Serial.readStringUntil('\n');
      response.trim();
      break;
    }
  }

  // 6. Atualizar LED baseado na resposta
  if (response == "START") {
    setLED("green"); // VERDE: Sessão iniciada
    delay(2000); // Mostrar por 2 segundos
    setLED("yellow"); // Voltar ao amarelo (a aguardar)
  } else if (response == "STOP") {
    blinkLED(LED_GREEN, 3); // Piscar verde 3x (sessão encerrada)
    setLED("yellow"); // Voltar ao amarelo
  } else if (response == "DENIED") {
    setLED("red"); // VERMELHO: Acesso negado
    delay(3000); // Mostrar por 3 segundos
    setLED("yellow"); // Voltar ao amarelo
  } else {
    // Sem resposta ou timeout
    blinkLED(LED_RED, 1); // Piscar vermelho 1x (erro de comunicação)
    setLED("yellow");
  }

  // Pausa para não ler o mesmo cartão 
  delay(1000);
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

