---
name: Firestore Quirks
description: Comportamentos não-óbvios do Firestore neste projecto que causam bugs
type: project
relevance: firestore, obras, sessoes, tarifários, offline, cache
---

# Firestore Quirks

## obras podem não existir
`sessions/{id}.obraId` pode referenciar uma obra que não tem doc em `obras/{id}`.
Sessões antigas foram criadas antes do schema de obras existir.
**Nunca assumir** que `obraId` tem doc correspondente — verificar antes de fazer `.get()`.

## Tarifários são imutáveis
- `sessions.tariffSnapshot` gravado no fecho — **nunca editar retroativamente**
- `sessions.costs` calculado no fecho — **nunca recalcular**
- `machines.tariffHistory[]` é append-only — **nunca apagar versões antigas**
- Função: `getTariffForDate(machine, date)` em `Backend_Cloud/functions/index.js` ~L223

## Base path sempre completa
`artifacts/casais-rfid/public/data/` — nunca omitir nenhuma parte.
Regra Firestore de segurança bloqueia qualquer path diferente.

## scan_buffer/latest é um documento único
Contém o último scan RFID. Frontend faz `.onSnapshot()` para auto-fill.
É sobrescrito em cada scan — não é uma coleção de scans.

## Firebase Auth não configurado
Erro `auth/...` na consola é **esperado e não crítico**. Projeto usa regras públicas intencionalmente (academic project).
