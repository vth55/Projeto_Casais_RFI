# CASAIS FLEET INTELLIGENCE - Memória do Projeto

> **Ficheiro único de contexto** - Substitui todos os ficheiros da pasta memoria/

---

## RESUMO RÁPIDO

| Item | Valor |
|------|-------|
| Projeto | PWA Gestão de Frotas Industriais |
| Cliente | Grupo Casais (empresa real) |
| Prazo | Junho 2025 |
| Stack | React 19 + Vite + Firebase + Tailwind |
| Cor Casais | #005EB8 (azul) |

---

## ARQUITETURA

```
Hardware (Arduino/ESP32 + RFID)
         ↓
Firebase Cloud Functions (handleSessionTrigger)
         ↓
Firestore (operators, machines, sessions)
         ↓
React PWA (Dashboard, Views, Components)
```

---

## ESTRUTURA FIRESTORE

```
artifacts/casais-rfid/public/data/
├── operators/{cardId}     → {name, registeredAt}
├── machines/{machineId}   → {name, status, totalHours, consumptionRate}
├── sessions/{autoId}      → {cardId, machineId, startTime, endTime, status}
├── scan_buffer/latest     → {cardId, timestamp} (auto-fill)
└── unregistered_scans/    → logs de segurança
```

---

## FEATURES IMPLEMENTADAS

- Dashboard com KPIs e 4 gráficos (Recharts)
- Navegação Sidebar com submenus + tabs
- Gestão: Máquinas, Operadores, Sessões
- Scan-to-Register (auto-fill de cartões)
- Alertas de Manutenção (150h threshold)
- Cálculo CO₂ (horas × consumo × 2.68)
- Exportação CSV
- Responsivo (mobile/tablet/desktop)
- Hardware RFID com LEDs feedback

---

## FEATURES EM FALTA (Por Prioridade)

### CRÍTICO
1. **Módulo Financeiro** - Centros custo, tarifários €/h, rentabilidade
2. **Qualidade de Dados** - Alerta 5h, auto-close 14h, validação email

### ALTA
3. Duplo Contador (horas totais + parciais)
4. Histórico Manutenção com fotos

### MÉDIA
5. PWA completo (Service Worker, offline)
6. Perfis de acesso (Operador/Gestor/Financeiro)

### BAIXA
7. Dashboard Executivo, Mapa, Notificações push

---

## DECISÕES TÉCNICAS

| Decisão | Valor | Razão |
|---------|-------|-------|
| Threshold Manutenção | 150h | Baseado em prática industrial |
| Fator CO₂ | 2.68 kg/L | Standard diesel EPA |
| Alerta Fadiga | 5h | Visual apenas |
| Auto-close | 14h | Encerra + email validação |
| Histórico | Original + Corrigido | Auditoria completa |

---

## COMANDOS

```bash
# Frontend
cd Frontend_App/dashboard && npm run dev

# Deploy Backend
cd Backend_Cloud && firebase deploy --only functions

# Python Bridge (Arduino)
python Hardware_Bridge_PC/serial_to_cloud_bridge.py
```

---

## REGRAS DE TRABALHO

1. Qualidade > Velocidade (6 meses disponíveis)
2. Código nível enterprise, não protótipo
3. Commits frequentes com mensagens claras
4. Atualizar este ficheiro quando relevante
5. Testes antes de commit

---

## PATHS IMPORTANTES

```
Frontend:     Frontend_App/dashboard/src/
Views:        Frontend_App/dashboard/src/views/
Components:   Frontend_App/dashboard/src/components/
Config:       Frontend_App/dashboard/src/config/
Backend:      Backend_Cloud/functions/index.js
Hardware:     arduino_rfid_simple/, Hardware_ESP32/
```

---

## NOTAS DE SESSÃO

**08 Dezembro 2025 (Sessão 2):**
- Componentes melhorados para nível enterprise:
  - `StatCard.jsx` - Animação de contagem, loading state, trends
  - `Card.jsx` - 6 variantes, loading state, headerAction
  - `Skeleton.jsx` (NOVO) - Loading states profissionais
  - `EmptyState.jsx` (NOVO) - Estados vazios elegantes
  - `index.css` - Animações (spin-slow, bounce-soft, scale-in, stagger)
- Ficheiros antigos arquivados em `memoria/_arquivo/`
- Estrutura de memória simplificada

**08 Dezembro 2025 (Sessão 1):**
- Leitura completa do projeto
- Estrutura de memória consolidada neste ficheiro único

---

## COMPONENTES DISPONÍVEIS

```
Components/
├── Card.jsx          # Container (default/elevated/glass/gradient)
├── Button.jsx        # Botões (primary/secondary/danger/ghost)
├── StatCard.jsx      # KPIs com animação de contagem
├── Skeleton.jsx      # Loading states
├── EmptyState.jsx    # Estados vazios
├── Sidebar.jsx       # Navegação lateral
├── DateFilter.jsx    # Filtros temporais
├── Input.jsx         # Campos de formulário
├── Toast.jsx         # Notificações
└── MaintenanceAlert.jsx
```

---

*Última atualização: 08 Dezembro 2025*
