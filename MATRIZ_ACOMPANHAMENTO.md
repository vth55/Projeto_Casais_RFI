# 🎯 MATRIZ DE ACOMPANHAMENTO: PEDIDOS VS. EXECUÇÃO
> **Doc Obrigatório do Gemini** - Atualizar sempre que o estatuto de uma feature mude.

Este documento cruza o que foi idealizado e pedido pelo utilizador ao longo das sessões vs. aquilo que já efetivamente habita o código/produção.

---

## 🟢 FASE DE QUALIDADE & ANOMALIAS (Em Curso - Jan/Fev)

| O que foi pedido/Idealizado | Status | O que já foi garantido no Código | O que falta / Impedimentos |
|----------------------------|--------|----------------------------------|---------------------------|
| **Renomear "Fadiga" e adequar linguajar** | ✅ FEITO | Eliminou-se a palavra "Fadiga" do Frontend e Roadmap a favor de "Possível Esquecimento/Anomalia". | (Nenhum, limpo do Frontend e Roadmap). |
| **Vigilante/Deteção > 5 Horas** | ✅ FEITO | Backend `checkLongSessions` cria docs de alerta/emails passadas as horas estabelecidas. Frontend exibe crachás `amber-600`. | - |
| **Auto-Close / Fecho Compulsivo > 14 Horas** | ✅ FEITO | Backend já faz trigger de Fecho. Frontend apresenta na tab de validações pendentes. | - |
| **Menu de Resolução UI das Validações** | 🟡 PENDENTE | Modal inicial em `SessoesView` já propõe edição de data/hora (A UI básica). | Faltam ligações robustas de estado de "PENDING" para "RESOLVED". Confirmar se guarda "Original" + "Corrigidas" como dita a bíblia `FLUXO_GESTAO_SESSOES.md`. |
| **Emails Tokenizados de Validação** | ✅ FEITO | Backend tem função `generateValidationLink`/`sendValidationEmail` preparada. Rota `/validar/:token` implementada no Frontend. | Testar com SMTP real em produção. |


---

## 💰 FASE FINANCEIRA & TARIFÁRIOS

| O que foi pedido/Idealizado | Status | O que já foi garantido no Código | O que falta / Impedimentos |
|----------------------------|--------|----------------------------------|---------------------------|
| **Formatadores de Moeda e Enterprise UI** | ✅ FEITO | Funções `Intl.NumberFormat` e Lógicas no FinanceiroView unificadas. | - |
| **Versionamento Histórico de Custos** | 🟡 PENDENTE | Backend `index.js` tem lógicas bases para cálculo. Formulário permite editar/eliminar tarifário. | Lógica profunda da bíblia `SISTEMA_TARIFARIOS.md` (guardar tracking array histórico quando altera custo em vez de sobrescrever). |
| **Modificar Custos em Lote (Gestão em Massa)** | 🔴 NÃO INICIADO| Bíblia de `GESTAO_MAQUINAS_AVANCADA` exige bulk updates. | UI e Bulk functions ainda por construir no Frontend. |

---

## 🏗️ FASE DE INTEGRAÇÃO ERP (PROCORE)

| O que foi pedido/Idealizado | Status | O que já foi garantido no Código | O que falta / Impedimentos |
|----------------------------|--------|----------------------------------|---------------------------|
| **Procore Bridge (OAuth2)** | ✅ FEITO | Cloud Function `procoreBridge` funcional com autorização e refresh automático. | - |
| **Sincronização & Interface** | ✅ FEITO | Sync horária ativa. Badges "Procore Sync" no `ObrasView` e `OperadoresView`. Nova aba de Integrações nas Configurações. | - |
| **Timecard Write-back** | 🟡 EM CURSO | Helper `createTimecardEntry` pronto em `procoreBridge.js`. | Ligar o trigger de fecho de sessão (IoT) ao push da Timecard. |

---

## 🚜 FASE MÁQUINAS E OBRAS

| O que foi pedido/Idealizado | Status | O que já foi garantido no Código | O que falta / Impedimentos |
|----------------------------|--------|----------------------------------|---------------------------|
| **Registo Rápido (Auto-fill RFID)** | ✅ FEITO | `scan_buffer/latest` a empurrar novos cartões para a vista. | - |
| **Nomenclaturas Parametrizadas UI** | 🔴 NÃO INICIADO| Roadmap Pede `{CATEGORIA}-{NÚMERO} - {OBRA}`. | Construir gerador local de chaves automáticas. |

---

## 🔧 FASE HARDWARE/BRIDGE

| O que foi pedido/Idealizado | Status | O que já foi garantido no Código | O que falta / Impedimentos |
|----------------------------|--------|----------------------------------|---------------------------|
| **LEDs Físicos Funcionais com Firebase** | ✅ FEITO | Scripts de Python `serial_to_cloud_bridge.py` e Arduino finalizados. | - |
| **Limpeza e Modo Produção** | 🟡 EM CURSO | Interface ainda com devTools. | - |

---

## 🏆 FASE DE OURO: IDEIAS EXTRAS (Recuperadas do arquivo)

| O que foi pedido/Idealizado | Status | O que já foi garantido no Código | O que falta / Impedimentos |
|----------------------------|--------|----------------------------------|---------------------------|
| **Reporte QR Code (Mobile-First)** | ✅ FEITO | Frontend tem rota `/reporte-avaria` standalone. | - |
| **Dashboard Executivo (C-Level)** | ✅ FEITO | Dashboard premium com KPIs, gráficos e filtros. | - |
| **Sistema Offline / Sync (PWA)** | ✅ FEITO | `enableIndexedDbPersistence` ativado. SW corrigido para servir `index.html` em navegações (SPA Fix). | - |

| **PWA Install & UI** | ✅ FEITO | Indicador Online/Offline no Header, LiveSessionsBar oculta em offline, e navegação adaptada para modo standalone. | - |
| **Ícones PWA** | ✅ FEITO | Novo ícone `icon-192.svg` com branding Casais (#005EB8) e manifest.json atualizado. | - |
| **Checklist Diário Segurança** | 🔴 NÃO INICIADO| - | Pop-up de pre-utilização no formulário PWA do Operador. |
| **Previsões Inteligentes (AI)** | 🔴 NÃO INICIADO| - | - |
| **Notificações Push (Browser)** | 🔴 NÃO INICIADO| - | - |

---

> **Última Atualização:** 12 de Abril de 2026 (Fix Crítico SW - Gemini).

> **Aviso de Integridade:** A Fase 2 (UI Enrichment) foi concluída com sucesso. O foco agora é a automação do Push (Fase 3).
> **Instrução Permanente:** Antes de sugerir uma tarefa ao executante (Claude), revê as linhas "🔴 NÃO INICIADO" e "🟡 PENDENTE" desta matriz. Quando concluídas, altera para "✅ FEITO" e atualiza a descrição da implementação.
