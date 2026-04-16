# 🔌 arduino_rfid_simple - Firmware de Campo

Este módulo contém o código C++ para o Arduino Uno que controla o leitor RFID e os LEDs de feedback visual no terreno.

---

## 🛠️ Hardware Necessário
- **Arduino Uno**
- **RC522 RFID Reader**
- **3 LEDs** (Verde, Amarelo, Vermelho)
- **Resistores** (220-330 Ω)

---

## 📂 Ficheiros
- `arduino_rfid_led.ino`: Versão de produção com lógica de LEDs. **(Usar este)**
- `arduino_rfid_simple.ino`: Versão minimalista base sem LEDs.

---

## 🔌 Pinout (RC522 -> Arduino)
| RC522 | Arduino |
|-------|---------|
| SDA   | 10      |
| SCK   | 13      |
| MOSI  | 11      |
| MISO  | 12      |
| IRQ   | N/A     |
| GND   | GND     |
| RST   | 9       |
| 3.3V  | 3.3V    |

---

## 💡 Lógica de LEDs
- **Pino 5 (Verde)**: Sessão iniciada/concluída com sucesso.
- **Pino 6 (Amarelo)**: Standby / Cartão detetado.
- **Pino 7 (Vermelho)**: Erro / Cartão não autorizado.

---

## 🚀 Como Carregar
1. Abre o `arduino_rfid_led.ino` no Arduino IDE.
2. Instala a biblioteca `MFRC522` via Library Manager.
3. Carrega o código para o Arduino Uno.

---
> **IMPORTANTE**: Após o upload, fecha o Monitor Serial para permitir que a ponte Python (`Hardware_Bridge_PC`) tome controlo da porta COM.
