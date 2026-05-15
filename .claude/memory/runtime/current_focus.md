# Foco Atual

## Ficheiro de trabalho activo
`docs/ROADMAP_EXECUCAO.md` — roadmap completo com 5 sprints, schemas, 71+ testes.
**Actualizar o estado das tarefas nesse ficheiro após cada implementação.**
**Apagar o ficheiro quando o utilizador confirmar que tudo está OK.**

## Sprint activo: Sprint 1
- Schema migration (localizacao + estadoOperacional em machines)
- Colecção rfidLocationCards
- Cloud Function processRfidScan (distingue operador vs localização)
- Colecção machineLocationEvents

## Contexto de arquitectura (descoberto nesta fase)
- `localizacao` e `estadoOperacional` são INDEPENDENTES em machines
- Despacho em 2 passos: gestor clica "Enviar" → estado "Em Trânsito" → RFID confirma chegada
- Sem GPS — localização por eventos RFID
- Equipment logs Procore são DIÁRIOS (agrega sessões do dia às 23:55), não por sessão
- procoreScheduledSync já existe e corre de hora em hora (puxa Procore → Firestore)
- procorePwaProjector já cria machine stubs a partir de equipamentos Procore
- procoreDailyWriteback já existe (23:30) — envia Timecards + Daily Logs + Cost Entries

## Bugs corrigidos recentes
- ObrasView: Plus import em falta + edit modal early return (commit fix)
- EstaleiroView: timeInYard sempre "—", stats vs lista inconsistentes, ACTIVE no estaleiro
- MachineQrView: mostrava obraId raw em vez do nome
- ReporteAvariaView: lista máquinas hardcoded → agora carrega do Firestore + pre-selecciona ?machine=
