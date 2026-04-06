# Smartphone-as-Machine (PWA NFC)

**Decisao:** 06 Abril 2026 | **Estado:** Implementado

## Estrategia
O smartphone Android atua como **Unidade de Controlo da Maquina** autonoma (sem PC), substituindo o ESP32 para demonstracoes e testes.

## Como Funciona
1. Aceder a `/mobile-hub` no Chrome Android
2. O dispositivo recebe um ID unico automatico (ex: `M_MOB_A1B2C3D4`) e regista-se no Firestore como maquina
3. A maquina aparece no Dashboard e pode ser editada (nome, categoria, localizacao, tarifario) como qualquer outra
4. Cartoes NFC sao lidos via Web NFC API e enviados ao `handleSessionTrigger` via `/api/session`
5. Fallback de entrada manual disponivel para browsers sem NFC

## Detalhes Tecnicos
- **Rota:** `/mobile-hub` (standalone, sem sidebar/header)
- **Endpoint:** `/api/session` (rewrite no firebase.json -> handleSessionTrigger)
- **Auto-registo:** Categoria `mobile-hub`, tipo `mobile`, editavel no Dashboard
- **Persistencia:** ID guardado em localStorage, sobrevive a recarregamentos
- **Compatibilidade NFC:** Chrome Android 89+. Fallback manual para outros browsers.
