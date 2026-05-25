# ADR 001: Seleção de Hardware para Retrofit (Arduino Uno)

## Estado
Aceite ✅

## Contexto
Originalmente, o projeto explorou várias opções de hardware, incluindo ESP32 e simuladores Wokwi. Contudo, para o ambiente de construção civil (obras), era necessário um hardware robusto, de fácil manutenção e com suporte estável para periféricos RFID (RC522) e feedback visual (LEDs).

## Decisão
Decidimos utilizar o **Arduino Uno** como o nó de hardware principal para as máquinas fixas (Retrofit).

## Consequências
- **Vantagens**: 
  - Alta resiliência elétrica e simplicidade de programação.
  - Facilidade de substituição de componentes no terreno.
  - Comunicação serial estável com a Ponte Python (`serial_to_cloud_bridge.py`).
- **Desvantagens**: 
  - Necessidade de um computador host (ou Raspberry Pi) para a ligação à Cloud (resolvido via Python Bridge).
  - Ausência de Wi-Fi nativo (mitigado pela segurança da ligação física/serial).

## Referências
- `arduino_rfid_simple/arduino_rfid_led.ino`
- `docs/archive/root/DOCS_OPERATIONS.md` (Secção de Hardware)
