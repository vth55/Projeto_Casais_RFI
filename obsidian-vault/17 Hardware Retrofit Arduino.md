---
tags:
  - hardware
  - arduino
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - docs/architecture/ADR/001-hardware-switch-arduino.md
  - Hardware_Bridge_PC/README.md
  - arduino_rfid_simple/README.md
---

# 17 Hardware Retrofit Arduino

## Why It Exists
- the project supports a fixed hardware path for RFID/event capture in the field
- chosen for robustness and maintainability rather than novelty

## Shape
- Arduino Uno reads RFID
- PC/Python bridge relays data into the system
- complements mobile/PWA workflows

## Why This Matters For AI
- some bugs live at the edge between hardware events, bridge software, and cloud session logic
- not every session issue is purely frontend/backend

## See Also
- [[11 Architecture Overview]]
- [[13 RFID Sessions and Rules]]
