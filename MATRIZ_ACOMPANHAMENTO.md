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
| **Emails Tokenizados de Validação** | 🟡 PENDENTE | Backend tem função `generateValidationLink`/`sendValidationEmail` preparada no papel. | Confirmação Firebase Auth/SMTP local; e criação da Rota `/validate?token=XXX` isolada no Frontend. |

---

## 💰 FASE FINANCEIRA & TARIFÁRIOS

| O que foi pedido/Idealizado | Status | O que já foi garantido no Código | O que falta / Impedimentos |
|----------------------------|--------|----------------------------------|---------------------------|
| **Formatadores de Moeda e Enterprise UI** | ✅ FEITO | Funções `Intl.NumberFormat` e Lógicas no FinanceiroView unificadas. | - |
| **Versionamento Histórico de Custos** | 🟡 PENDENTE | Backend `index.js` tem lógicas bases para cálculo. Formulário permite editar/eliminar tarifário. | Lógica profunda da bíblia `SISTEMA_TARIFARIOS.md` (guardar tracking array histórico quando altera custo em vez de sobrescrever). |
| **Modificar Custos em Lote (Gestão em Massa)** | 🔴 NÃO INICIADO| Bíblia de `GESTAO_MAQUINAS_AVANCADA` exige bulk updates. | UI e Bulk functions ainda por construir no Frontend. |

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
| **LEDs Físicos Funcionais com Firebase** | 🟡 EM TESTE / FEITO | Scripts de Python `serial_to_cloud_bridge.py` prontos. Lógicas do Arduino e ESP32 com LEDs finalizadas. | Teste de combate real e montagem física c/ os Breadboards. |
| **Limpeza e Modo Produção** | 🔴 NÃO INICIADO| Interface ainda com devTools. Ficheiros README da entrega escolar ainda por fechar. | - |

---

## 🏆 FASE DE OURO: IDEIAS EXTRAS (Recuperadas do arquivo)

| O que foi pedido/Idealizado | Status | O que já foi garantido no Código | O que falta / Impedimentos |
|----------------------------|--------|----------------------------------|---------------------------|
| **Reporte QR Code (Mobile-First)** | ✅ FEITO | Frontend tem rota `/reporte-avaria` standalone (React Router) e Zustand Store `useAvariasStore.js`. Tab no dashboard criada. | - |
| **Dashboard Executivo (C-Level)** | 🔴 NÃO INICIADO| - | KPIs agregados apenas das métricas macro (Eficiência global). |
| **Mapa Interativo (Location)** | 🔴 NÃO INICIADO| GPS base data guardado nas `obras`. | Frontend: Widget Google Maps/OpenStreetMap no painel de Obras. |
| **Checklist Diário Segurança** | 🔴 NÃO INICIADO| - | Pop-up de pre-utilização no formulário PWA do Operador. |
| **Sistema Offline / Sync** | 🟡 PENDENTE | PWA já tem manifest e SW básico. | Ligar IndexedDB ao SWC para re-envio inteligente quando volta a Net. |
| **Previsões Inteligentes (AI)** | 🔴 NÃO INICIADO| Extração de CSV base montada. | Componente preditivo para custos/manutenção face ao histórico. |
| **Notificações Push (Browser)** | 🔴 NÃO INICIADO| - | Service worker Notification API ligado ao Firebase Messaging. |

---

> **Última Atualização:** Sessão Gemini / Abril 2026.
> **Instrução Permanente:** Antes de sugerir uma tarefa ao executante (Claude), revê as linhas "🔴 NÃO INICIADO" e "🟡 PENDENTE" desta matriz. Quando concluídas, altera para "✅ FEITO" e atualiza a descrição da implementação.
