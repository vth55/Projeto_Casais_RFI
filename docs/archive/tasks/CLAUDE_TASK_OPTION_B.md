# 🦾 Missão para Claude: Industrialização da Sede (Manutenção Preditiva)

> **Contexto:** O Gemini (Arquiteto) já mapeou a lógica. O teu papel é a **Execução Direta** desta funcionalidade de BI Crítica para a demonstração de Junho.

## 🎯 Objetivo
Transformar o módulo de manutenção (`ManutencaoView.jsx`) numa ferramenta preditiva real, abandonando as estimativas estáticas por projeções baseadas na média de utilização das últimas 2 semanas.

---

## 🏗️ 1. Camada de Dados (useStore.js)

### [AÇÃO] Adicionar Estado e Listener
- No `useStore.js`, adicionar `maintenanceSchedules: []` ao estado inicial.
- Em `initializeListeners`, adicionar um listener `onSnapshot` para a coleção `artifacts/{projectId}/public/data/maintenance_schedules`.

### [AÇÃO] Implementar Inteligência: `getSmartMaintenancePrediction(machine)`
Implementa esta lógica no store para ser consumida pela UI:
1. **Filtro**: Analisar sessões d máquinas dos últimos 14 dias (status `CLOSED`).
2. **Média**: Somar `durationHours` e dividir pelo número de dias em que houve atividade.
3. **Cálculo**: `dias_faltantes = (intervalo - partialHours) / média_diária`.
4. **Projeção**: Calcular a data final **excluindo fins de semana** (Sáb/Dom).
5. **Fallback**: Se não houver dados históricos nas últimas 2 semanas, usar 8h/dia como base.

### [AÇÃO] CRUD de Agendamentos
Implementar `addMaintenanceSchedule`, `updateMaintenanceSchedule` e `deleteMaintenanceSchedule` apontando para a nova coleção.

---

## 🖥️ 2. Interface de Gestão (ManutencaoView.jsx)

### [AÇÃO] Correção Visual
- Garante que o ficheiro está livre de erros de sintaxe (JSX/Parenteses).

### [AÇÃO] Calendário Híbrido
O `MaintenanceCalendar` deve agora fundir 3 fontes de dados:
1. **Passado**: `maintenanceRecords` (Eventos Azuis).
2. **Avarias**: `avarias` (Eventos Vermelhos).
3. **Previsão IA**: Resultado do `getSmartMaintenancePrediction` (Eventos Amarelos/Amber).
4. **Agendado**: `maintenanceSchedules` do store (Eventos Indigo).

### [AÇÃO] Novo Modal de Agendamento
Implementar `ScheduleMaintenanceModal` que permita ao gestor na Sede fixar uma data no calendário para uma máquina específica.

---

## 📊 3. Dashboard "Work Focus" (DashboardView.jsx)

### [AÇÃO] Widget de Manutenção Crítica
Adicionar um pequeno painel (lado direito ou topo) que liste as 3 máquinas com a data de "Previsão IA" mais próxima. 

---

## 🚩 Regras de Ouro (Mandarory)
1. **Cores**: Usar apenas paleta Casais (#005EB8, Amarelo Casais, Vermelhos/Verdes standard). **PROIBIDO ROXO**.
2. **Icons**: `lucide-react`.
3. **Estilo**: Glassmorphism e animações suaves (`framer-motion` ou transições Tailwind).

---
**Gemini Workflow:** Mapeamento concluído. Claude Code, podes iniciar a execução conforme aprovado pelo Vitor.
