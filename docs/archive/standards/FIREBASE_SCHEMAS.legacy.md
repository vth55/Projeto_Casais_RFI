# 📊 Contrato de Dados - Firebase Firestore

Este documento define os schemas oficiais das coleções no Firestore. **MANDATÓRIO** para qualquer IA antes de criar/editar triggers ou views.

## Estrutura Base (Paths)
- **Produção**: `artifacts/casais-rfid/public/data/`
- **Prefixos**: Documentos de localização começam com `LOC_`.

---

## 🏗️ 1. Machines (`/machines`)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ID único (ex: `machine_123`) |
| `name` | string | Nome da máquina (`CAT-NUM - OBRA`) |
| `category` | string | Categoria (ex: `Escavadora`) |
| `status` | string | `ACTIVE` | `IDLE` | `MAINTENANCE` |
| `totalHours` | number | Acumulado total de horas de vida |
| `partialHours` | number | Horas desde a última revisão (reset no maintenance) |
| `consumptionRate`| number | Consumo de diesel (Litros/Hora) |
| `co2Factor` | number | Fator de emissão (Override) |
| `maintenanceInterval` | number | Intervalo de manutenção (Override) |
| `location` | object | `{ workId, workName, gps, updatedAt }` |
| `currentTariff` | object | Tarifário atual ativo |

## 👷 2. Operators (`/operators`)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cardId` | string | ID do cartão RFID (Document ID) |
| `name` | string | Nome completo do operador |
| `email` | string | Email para alertas (Crucial para Procore Match) |
| `phone` | string | Contacto telefónico |
| `role` | string | Nível de acesso (Admin, Supervisor, etc.) |

## ⏱️ 3. Sessions (`/sessions`)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `machineId` | string | FK para `/machines` |
| `cardId` | string | FK para `/operators` |
| `startTime` | Timestamp | Início da sessão |
| `endTime` | Timestamp | Fim da sessão (null se aberta) |
| `durationHours` | number | Calculado no fecho |
| `status` | string | `OPEN` | `CLOSED` | `AUTO_CLOSED` |
| `costs` | object | `{ totalCost, hours, breakdown }` |
| `procoreId` | string | ID do Timecard no Procore (se sincronizado) |

## 📍 4. Location Cards (`/location_cards`)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Prefixo `LOC_` + Card ID |
| `obraId` | string | ID da obra associada |
| `obraName` | string | Nome legível da obra |

## ⚙️ 5. System Settings (`/settings/system`)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `fuelPricePerLitre` | number | Preço do diesel por litro (ex: 1.89€) |
| `co2FactorPerLitre` | number | Fator padrão de kg CO2/L (ex: 2.68) |
| `defaultMaintenanceInterval` | number | Horas padrão até manutenção (ex: 150h) |
| `updatedAt` | Timestamp | Data da última alteração de parâmetros |

## 📅 6. Maintenance Schedules (`/maintenance_schedules`)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Auto-ID do Firestore |
| `machineId` | string | FK para `/machines` |
| `machineName` | string | Cache do nome da máquina |
| `date` | Timestamp | Data agendada para a intervenção |
| `type` | string | `PREVENTIVE` | `CORRECTIVE` |
| `notes` | string | Observações do agendador |
| `status` | string | `SCHEDULED` | `COMPLETED` | `CANCELLED` |
| `createdBy` | string | Nome/ID do utilizador que agendou |
| `createdAt` | Timestamp | Data de criação do registo |

---
> **Nota para IA**: Sempre use `admin.firestore.Timestamp` no Backend e `firebase.firestore.Timestamp` no Frontend.
