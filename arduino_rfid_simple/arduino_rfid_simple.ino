/*
 * CÓDIGO PARA ARDUINO UNO/NANO (1 LEITOR)
 * Máquina de Teste 1 (Ligada ao PC)
 *
 * Pinos MFRC522:
 * SDA (SS) -> Pino 10
 * RST      -> Pino 9
 * SCK      -> Pino 13
 * MOSI     -> Pino 11
 * MISO     -> Pino 12
 */

#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9
 
MFRC522 rfid(SS_PIN, RST_PIN);

void setup() { 
  Serial.begin(9600); 
  SPI.begin(); 
  rfid.PCD_Init(); 
  Serial.println("Arduino pronto (Maquina 1).");
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

  // 3. Enviar para o PC
  
  Serial.print("CARD:");
  Serial.println(cardId);

  // Pausa para não ler o mesmo cartão 
  delay(2000); 
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}