# Menu de Obra â€” Arquitectura de InformaÃ§Ã£o
> DecisÃ£o fechada: 2026-05-18
> Substitui a lÃ³gica de "ObraDetailView" embutida em ObrasView.jsx

---

## 1. PrincÃ­pio Orientador

O sistema tem dados que soluÃ§Ãµes de mercado (Procore, ACC, HCSS) normalmente nÃ£o tÃªm:
**sessÃµes RFID com timestamps exactos** por operador Ã— mÃ¡quina Ã— obra.

Isto permite calcular:
- Custo real por obra (horas Ã— tarifÃ¡rio histÃ³rico imutÃ¡vel)
- Produtividade por operador na mesma mÃ¡quina (comparaÃ§Ã£o A vs B)
- COâ‚‚ e combustÃ­vel por mÃ¡quina/obra/operador
- PrevisÃ£o de manutenÃ§Ã£o por horas reais (nÃ£o por calendÃ¡rio)
- Downtime e horas improdutivas
- ROI por equipamento (receita gerada vs. custo de manutenÃ§Ã£o)

**A PWA Ã© a camada analÃ­tica e operacional. O Procore Ã© o sistema master para estrutura.**

---

## 2. DivisÃ£o de Responsabilidades

| Sistema | Papel | O que gere |
|---|---|---|
| **Procore** | Master de estrutura | Lista de obras, funcionÃ¡rios, mÃ¡quinas (fonte de verdade) |
| **PWA** | Camada operacional + analÃ­tica | RFID, sessÃµes, horas, COâ‚‚, manutenÃ§Ã£o, KPIs |
| **IntegraÃ§Ã£o PWAâ†’Procore** | Apenas dados nativos | `equipment_logs` (horas diÃ¡rias), `manpower_logs` (presenÃ§a), `observations` (avarias reais) |

**Removido da integraÃ§Ã£o (MÃªs 2):** notas IoT em campo `notes`, observations para WOs de rotina.

---

## 3. Estrutura de Rotas

```
/dashboard                     â† Global: multi-obra, alertas, estado geral (simplificado)
/obras                         â† Lista de obras (cards compactos)
/obras/:obraId                 â† Menu de obra â€” layout com header + submenus
/obras/:obraId/resumo          â† KPIs executivos + semÃ¡foros RAG + delta vs perÃ­odo
/obras/:obraId/equipamentos    â† Frota: horas, utilizaÃ§Ã£o, heatmap, manutenÃ§Ã£o
/obras/:obraId/trabalhadores   â† Headcount, horas, produtividade por operador
/obras/:obraId/sessoes         â† HistÃ³rico RFID, validaÃ§Ã£o, anomalias, export
/obras/:obraId/manutencao      â† WOs, alertas, calendÃ¡rio, hoursSinceMaintenance
/obras/:obraId/co2             â† EmissÃµes por equipamento, acumulado, meta vs real
/obras/:obraId/localizacao     â† Mapa Google Maps, info base da obra
```

---

## 4. Layout do Menu de Obra

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  â† Obras   |   Torre Boavista â€” Porto          [Procore badge]  â”‚  â† breadcrumb
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  [ Hoje ]  [ Semana ]  [ MÃªs ]  [ Trimestre ]  [ Personalizado ]â”‚  â† PeriodHeader
â”‚                                           [ vs. perÃ­odo anterior ]â”‚  â† toggle opcional
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Resumo  |  Equipamentos  |  Trabalhadores  |  SessÃµes  |       â”‚
â”‚  ManutenÃ§Ã£o  |  COâ‚‚  |  LocalizaÃ§Ã£o                            â”‚  â† submenu nav
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                   â”‚
â”‚            CONTEÃšDO DO SUBMENU ACTIVO                           â”‚
â”‚                                                                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

O `PeriodHeader` sincroniza **todos os submenus** â€” nÃ£o hÃ¡ pickers individuais por grÃ¡fico.

---

## 5. Arquitectura de InformaÃ§Ã£o por Submenu

### 5.1 Resumo
**AudiÃªncia:** Gestor de obra, Director de OperaÃ§Ãµes  
**NÃ­vel:** Executivo â€” o que estÃ¡ a acontecer agora e como compara com o perÃ­odo anterior

| Elemento | Tipo | Dados | RAG |
|---|---|---|---|
| MÃ¡quinas activas | KPI card | sessÃµes abertas / total frota | >80% verde, <50% vermelho |
| Trabalhadores hoje | KPI card | operadores com sessÃ£o aberta / headcount previsto | â€” |
| Horas perÃ­odo | KPI card | soma durationHours do perÃ­odo | vs. perÃ­odo anterior |
| Custo estimado | KPI card | horas Ã— tarifÃ¡rio Ã— operadores | vs. orÃ§amento se configurado |
| COâ‚‚ perÃ­odo | KPI card | horas Ã— fatorCO2 | â€” |
| TendÃªncia horas | AreaChart | horas/dia no perÃ­odo | â€” |
| Alertas activos | Strip | manutenÃ§Ãµes em atraso, avarias abertas, anomalias | urgente/normal |

Diffs vs perÃ­odo anterior visÃ­veis em cada card como badge `+12%` / `-8%`.

### 5.2 Equipamentos
**AudiÃªncia:** Encarregado, Gestor de frota  
**NÃ­vel:** Frota da obra â€” detalhe por mÃ¡quina

| Elemento | Tipo | Dados |
|---|---|---|
| Fleet header | 4 mini KPI tiles | total frota, activas, manutenÃ§Ã£o/alerta, horas no perÃ­odo |
| Lista de frota | HÃ­brido: tabela desktop / cards mobile | nome, estado normalizado, horas, utilizaÃ§Ã£o, manutenÃ§Ã£o, sessÃµes |
| UtilizaÃ§Ã£o % | Barra horizontal | horas trabalhadas / horas disponÃ­veis no perÃ­odo; melhor legibilidade do que gauge |
| ManutenÃ§Ã£o | Barra fina secundÃ¡ria | `partialHours / maintenanceThreshold` como contexto separado da utilizaÃ§Ã£o |
| Drill-down mÃ¡quina | Drawer lateral / ecrÃ£ inteiro em mobile | sessÃµes recentes, custo, COâ‚‚, maintenance context, heatmap stub |
| Heatmap actividade | Stub adiado | arquitectura preparada; implementaÃ§Ã£o real fica para fase posterior |

**Estado real em 2026-05-18:** submenu `Equipamentos` jÃ¡ implementado e validado em browser.  
**DecisÃµes reais aplicadas:**
- hÃ­brido tabela/cards, sem scroll horizontal como experiÃªncia principal
- barras horizontais em vez de gauges circulares
- drawer como drill-down principal
- normalizaÃ§Ã£o de status legados (`IDLE`, `ACTIVE`, etc.) antes da UI

### 5.3 Trabalhadores
**AudiÃªncia:** Encarregado, RH  
**NÃ­vel:** PresenÃ§a e produtividade

| Elemento | Tipo | Dados |
|---|---|---|
| Headcount hoje | KPI | operadores com sessÃ£o activa |
| Horas por operador | BarChart | soma horas no perÃ­odo, ordenado desc |
| Produtividade | Tabela | horas Ã— mÃ¡quinas Ã— sessÃµes por operador |
| Drill-down operador | Modal | sessÃµes detalhadas, mÃ¡quinas usadas, horas no perÃ­odo |

MÃªs 2: comparaÃ§Ã£o operador A vs B na mesma mÃ¡quina.

### 5.4 SessÃµes
**AudiÃªncia:** Encarregado, validador  
**NÃ­vel:** HistÃ³rico RFID detalhado

| Elemento | Tipo | Dados |
|---|---|---|
| Header resumo | 5 KPI tiles | total, em curso, fechadas, anomalias operacionais, horas fechadas |
| Lista de sessÃµes | Tabela agrupada por dia | mÃ¡quina, operador, inÃ­cio, fim, duraÃ§Ã£o, estado, custo |
| Filtros | Dropdown + pills + toggle | mÃ¡quina, estado, sÃ³ anomalias operacionais |
| Anomalias | Badge + borda esquerda | `FATIGUE`, `AUTO_CLOSE`, `CORRECTED` contam como operacionais; `NO_OPERATOR` fica informativo |
| ValidaÃ§Ã£o | Drawer + CTA | detalhe da sessÃ£o com encaminhamento para validaÃ§Ã£o global |
| Export | BotÃ£o | CSV do perÃ­odo filtrado |

**Estado real em 2026-05-18:** submenu `SessÃµes` implementado e validado localmente em browser.  
**DecisÃµes reais aplicadas:**
- agrupamento colapsÃ¡vel por dia em vez de tabela totalmente plana
- `NO_OPERATOR` continua visÃ­vel na linha mas nÃ£o infla KPI/filtro de anomalias
- gate local aprovado; deploy real continua pendente para RFID, `costs.total` e semÃ¢ntica final de `AUTO_CLOSED`

### 5.5 ManutenÃ§Ã£o
**AudiÃªncia:** ResponsÃ¡vel de manutenÃ§Ã£o, encarregado  
**NÃ­vel:** Planeamento e estado de manutenÃ§Ã£o

| Elemento | Tipo | Dados |
|---|---|---|
| KPI grid | 4 tiles | total, em alerta, vencida, avarias abertas |
| Alertas crÃ­ticos | Strip | mÃ¡quinas `OVERDUE` com intervenÃ§Ã£o necessÃ¡ria |
| Lista principal | HÃ­brido: tabela desktop / cards mobile | nome, estado, `partialHours`, threshold, % consumida, RAG, prÃ³ximo trigger |
| Drill-down | Drawer lateral | threshold, partialHours, Ãºltima manutenÃ§Ã£o, avarias, contexto da mÃ¡quina |
| OrdenaÃ§Ã£o | Regra explÃ­cita | `OVERDUE â†’ ALERT â†’ NORMAL â†’ UNKNOWN`, depois `% consumida` desc |

**Estado real em 2026-05-18:** submenu `ManutenÃ§Ã£o` implementado e validado localmente em browser.  
**DecisÃµes reais aplicadas:**
- nÃ£o usar calendÃ¡rio nesta fase; lista priorizada + drawer dÃ¡ mais valor operacional
- `OVERDUE` nunca mostra `0h restantes`; mostra `Vencida hÃ¡ Xh`
- `UNKNOWN` Ã© estado neutro/cinzento, nunca verde
- fallback explÃ­cito `DEFAULT_THRESHOLD = 150h`
- join com avarias Ã© local por `machineId` e nÃ£o representa histÃ³rico perfeito de mudanÃ§a de obra

### 5.6 COâ‚‚
**AudiÃªncia:** Gestor de sustentabilidade, Director  
**NÃ­vel:** Impacto ambiental da obra

| Elemento | Tipo | Dados |
|---|---|---|
| Total emissÃµes | KPI card | soma COâ‚‚ no perÃ­odo (vs. perÃ­odo anterior) |
| EmissÃµes/dia | AreaChart | emissÃµes diÃ¡rias no perÃ­odo |
| Por mÃ¡quina | PieChart | distribuiÃ§Ã£o de emissÃµes por equipamento |
| Tabela | Lista | kg COâ‚‚ por mÃ¡quina, com horas e combustÃ­vel estimado |
| Meta | Linha no AreaChart | se target configurado (MÃªs 2) |

### 5.7 LocalizaÃ§Ã£o
**AudiÃªncia:** Todos  
**NÃ­vel:** Contexto geogrÃ¡fico da obra

| Elemento | Tipo | Dados |
|---|---|---|
| Mapa | Google Maps embed | coordenadas da obra |
| Info card | Dados da obra | morada, cÃ³digo, datas, responsÃ¡vel |
| MÃ¡quinas na obra | Contagem | total confirmadas por RFID vs. despacho pendente |

Fase futura: overlay de mÃ¡quinas/operadores em tempo real se GPS disponÃ­vel.

---

## 6. NÃ­veis de Drill-Down

```
NÃ­vel 1 â€” Dashboard global
  â†’ Frota total, alertas, estado multi-obra

NÃ­vel 2 â€” Menu de obra (/obras/:id)
  â†’ KPIs executivos, comparaÃ§Ã£o perÃ­odos, submenus

NÃ­vel 3 â€” Detalhe de mÃ¡quina (submenu Equipamentos, drill-down)
  â†’ SessÃµes, manutenÃ§Ã£o, COâ‚‚, custo, histÃ³rico

NÃ­vel 3 â€” Detalhe de operador (submenu Trabalhadores, drill-down)
  â†’ SessÃµes, horas, mÃ¡quinas, produtividade

NÃ­vel 4 â€” SessÃ£o individual (submenu SessÃµes, modal)
  â†’ Timestamps exactos, validaÃ§Ã£o, correcÃ§Ã£o
```

---

## 7. Componentes a Criar, Reutilizar e Remover

### Criar (novos)
| Componente | LocalizaÃ§Ã£o | PropÃ³sito |
|---|---|---|
| `ObraMenuLayout` | `components/obra/ObraMenuLayout.jsx` | Shell: breadcrumb + PeriodHeader + submenu nav |
| `PeriodHeader` | `components/obra/PeriodHeader.jsx` | Toggle Hoje/Semana/MÃªs/Trimestre/Personalizado + comparaÃ§Ã£o |
| `KpiCard` | `components/obra/KpiCard.jsx` | Card com valor, RAG status, delta vs perÃ­odo anterior |
| `ActivityHeatmap` | `components/charts/ActivityHeatmap.jsx` | Heatmap de calendÃ¡rio por mÃ¡quina |
| `ResumoView` | `views/obra/ResumoView.jsx` | Submenu Resumo |
| `EquipamentosObraView` | `views/obra/EquipamentosObraView.jsx` | Submenu Equipamentos |
| `TrabalhadoresObraView` | `views/obra/TrabalhadoresObraView.jsx` | Submenu Trabalhadores |
| `SessoesObraView` | `views/obra/SessoesObraView.jsx` | Submenu SessÃµes (adaptar de SessoesView) |
| `ManutencaoObraView` | `views/obra/ManutencaoObraView.jsx` | Submenu ManutenÃ§Ã£o |
| `Co2ObraView` | `views/obra/Co2ObraView.jsx` | Submenu COâ‚‚ |
| `LocalizacaoObraView` | `views/obra/LocalizacaoObraView.jsx` | Submenu LocalizaÃ§Ã£o |

### Reutilizar / Mover
| Origem | Destino | O que mover |
|---|---|---|
| `ObrasView.jsx` (linhas 302â€“644) | `ObraMenuLayout` | ObraDetailView como base |
| `AnalisesView.jsx` PeriodSelector | `PeriodHeader` | LÃ³gica de presets |
| `DashboardView.jsx` chartData aggregation | `utils/chartDataHelpers.js` | `aggregateSessionsByPeriod()` |
| `ManutencaoView.jsx` MaintenanceCalendar | `ManutencaoObraView` | Componente de calendÃ¡rio |
| `ObrasView.jsx` Google Maps embed | `LocalizacaoObraView` | LÃ³gica do mapa |
| `SessoesView.jsx` ValidationModal | `components/ValidationModal.jsx` | Extrair componente partilhado |

### Remover / Consolidar
| View | AcÃ§Ã£o | Substituto |
|---|---|---|
| `QualidadeView.jsx` | **Remover** | LÃ³gica de validaÃ§Ã£o â†’ `SessoesObraView` |
| `RelatoriosView.jsx` | **Remover** | Export CSV por submenu em cada obra |
| `DashboardView.jsx` | **Simplificar** | Remover charts por obra â†’ ficam em `/obra/:id` |
| DateFilters inline no Dashboard | **Extrair** | `DateRangePicker` componente |
| TabNav duplicado em 3 views | **Consolidar** | Usar `components/TabNav.jsx` existente |

---

## 8. AlteraÃ§Ãµes ao Zustand (useStore)

```javascript
// Novos selectors a adicionar em useStore.js:

// Filtra sessÃµes por obraId + perÃ­odo
getSessionsByObraId: (obraId, dateRange) => ...

// KPIs calculados para uma obra num perÃ­odo
getObraKPIs: (obraId, dateRange) => ({
  totalHours,       // soma durationHours
  totalCost,        // soma costs.total
  totalCO2,         // soma co2Kg estimado
  totalFuel,        // soma combustÃ­velLitros
  activeSessions,   // sessÃµes OPEN agora
  uniqueOperators,  // cardIds distintos no perÃ­odo
  uniqueMachines,   // machineIds distintos no perÃ­odo
})

// MÃ¡quinas actualmente na obra (por localizacao.obraId)
getMachinesByObraId: (obraId) => ...

// Operadores com sessÃµes numa obra num perÃ­odo
getWorkersByObraId: (obraId, dateRange) => ...
```

---

## 9. ExtracÃ§Ã£o para utils/chartDataHelpers.js

```javascript
// Centralizar lÃ³gica de agregaÃ§Ã£o que hoje estÃ¡ duplicada:

aggregateSessionsByDay(sessions, period)
  â†’ [{ date, hours, cost, co2, fuel }]

aggregateSessionsByMachine(sessions)
  â†’ [{ machineId, machineName, hours, cost, co2, utilization }]

aggregateSessionsByOperator(sessions)
  â†’ [{ operatorId, operatorName, hours, machines[], sessions }]

calculateUtilization(activeSessions, totalMachines, periodDays)
  â†’ percentage 0-100

calculateRAGStatus(value, thresholds: { red, amber, green })
  â†’ 'red' | 'amber' | 'green'
```

---

## 10. IntegraÃ§Ã£o Procore â€” O que muda

### MÃªs 1 (sem alteraÃ§Ãµes Ã  integraÃ§Ã£o actual)
- NÃ£o tocar na lÃ³gica existente de sync
- O menu de obra puxa dados do Firestore (PWA como camada analÃ­tica)

### MÃªs 2 (limpeza Procore)
- **Remover:** `notes` com dados IoT em equipamentos Procore
- **Remover:** observations automÃ¡ticas para WOs de rotina (manter sÃ³ avarias reais)
- **Manter:** `equipment_logs` diÃ¡rios (horas por equipamento â€” dado nativo Procore)
- **Manter:** `manpower_logs` (presenÃ§a diÃ¡ria â€” dado nativo Procore)
- **Manter:** `observations` para avarias crÃ­ticas e nÃ£o-conformidades reais

---

## 11. DecisÃµes de UX Fechadas

1. **Rota prÃ³pria** `/obras/:obraId` â€” nÃ£o drawer/modal
2. **PeriodHeader global** no topo da obra, nÃ£o pickers individuais por grÃ¡fico
3. **ComparaÃ§Ã£o com perÃ­odo anterior** Ã© um toggle opcional (nÃ£o forÃ§ado)
4. **RAG status** em todos os KPI cards com thresholds configurÃ¡veis futuramente
5. **Drill-down** por mÃ¡quina e por operador a partir dos submenus
6. **Mapa** integrado mas nÃ£o geoespacial complexo na Fase 1
7. **Export CSV** nos submenus SessÃµes e Equipamentos (nÃ£o view separada de RelatÃ³rios)
8. **Equipamentos** usa lista hÃ­brida (tabela desktop, cards mobile), barras horizontais de utilizaÃ§Ã£o e drawer como drill-down
9. **Heatmap de actividade** nÃ£o entra como meia feature; fica preparado e explicitamente adiado atÃ© haver implementaÃ§Ã£o suficientemente boa

