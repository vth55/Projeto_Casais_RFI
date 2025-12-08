# 🎯 DECISÕES IMPORTANTES

> Registo de escolhas críticas e porquê foram tomadas

---

## **Threshold de Manutenção: 150 horas**
- **Data:** Dezembro 2025
- **Decisão:** Alertas começam aos 80% (120h), crítico aos 100% (150h)
- **Razão:** Baseado na "Lógica Vitor" do ano passado. Manutenção por horas reais, não datas.
- **Impacto:** Se Casais quiser alterar, mudar em `MaintenanceAlert.jsx` linha 8

---

## **Fator de Emissão CO₂: 2.68 kg/L**
- **Data:** Dezembro 2025
- **Decisão:** Usar fator standard para diesel
- **Razão:** Valor aceite internacionalmente
- **Fonte:** EPA / Normas Europeias
- **Impacto:** Cálculos de sustentabilidade

---

## **Scan-to-Register (Auto-fill)**
- **Data:** Dezembro 2025
- **Decisão:** Cartões não registados vão para `scan_buffer/latest` em vez de erro direto
- **Razão:** Melhor UX - admin não digita IDs manualmente
- **Impacto:** Reduz erros de digitação, acelera registo

---

## **LEDs Físicos**
- **Data:** Dezembro 2025
- **Decisão:** Usar 3 LEDs (Verde/Amarelo/Vermelho) em vez de apenas 1
- **Razão:** Feedback visual mais claro para operadores no terreno
- **Custo:** ~2€ por máquina (muito baixo)
- **Impacto:** Melhor experiência de utilizador

---

## **Alerta 5h vs 14h**
- **Data:** 07 Dezembro 2025
- **Decisão:**
  - **5h:** Alerta visual apenas (não fecha sessão)
  - **14h:** Auto-close + link validação
- **Razão:** Distinguir fadiga normal de esquecimento crítico
- **Ver detalhes:** [APAGAR_ANTES_ENTREGAR_DevLog_CONVERSAS.md](APAGAR_ANTES_ENTREGAR_DevLog_CONVERSAS.md)

---

## **Link Validação**
- **Data:** 07 Dezembro 2025
- **Decisão:** PWA mas só mostrar o formulário (não o PWA todo)
- **Estrutura:** Cada alerta tem ID único que corresponde a link específico
- **Link:** `https://pwa.casais.com/validate?token={alertId}`
- **Razão:** Interface simples e focada apenas na correção

---

## **Histórico Sessões: Originais + Corrigidas**
- **Data:** 07 Dezembro 2025
- **Decisão:** Guardar originais + corrigidas (Opção A)
- **Razão:** Auditoria completa, transparência, compliance
- **Estrutura:**
  - `originalDurationHours` - Horas registadas automaticamente
  - `correctedDurationHours` - Horas corrigidas pelo funcionário
  - `wasCorrected: true/false` - Flag
- **Impacto:** Relatórios históricos podem mostrar ambas versões

---

## **Tarifários Versionados**
- **Data:** 07 Dezembro 2025
- **Decisão:** Sistema de tarifários com histórico completo
- **Tipos:**
  - **Tipo 1:** Só Máquina (€/h)
  - **Tipo 2:** Máquina + Operador (€/h)
- **Versionamento:** Histórico completo de valores ao longo do tempo
- **Razão:** Valores mudam, relatórios históricos precisam do valor correto da época
- **Ver detalhes:** `docs/SISTEMA_TARIFARIOS.md`

---

## **Nomes dos Alertas**
- **Data:** 07 Dezembro 2025
- **Decisão:**
  - **ALERTA_ATENCAO** (Alerta 1 - ex: 5h)
    - Tipo: WARNING
    - Ação: NOTIFY (apenas visual, não fecha sessão)
    - Se encerrar após este limite, recebe link de validação
  - **ALERTA_CRITICO** (Alerta 2 - ex: 14h)
    - Tipo: CRITICAL
    - Ação: AUTO_CLOSE (encerra sessão automaticamente)
    - Sempre gera link de validação

---

## **Escalabilidade: Múltiplas Máquinas**
- **Data:** 07 Dezembro 2025
- **Decisão:** Sistema JÁ está preparado para múltiplas máquinas
- **Razão:** Arquitetura foi desenhada corretamente desde o início
- **Análise:**
  - ✅ Backend usa `machineId` como identificador único
  - ✅ Frontend mostra todas as máquinas automaticamente
  - ✅ Firestore escala naturalmente
  - ✅ Cada máquina tem documento próprio
- **Impacto:** Não precisa refactoring para crescer

---

## **Logs de Segurança: Backend Only**
- **Data:** 07 Dezembro 2025
- **Decisão:** Não mostrar `unregistered_scans` na UI
- **Razão:**
  - UI fica mais limpa
  - Backend continua a guardar TUDO para auditoria
  - Sistema marca scans como "resolved: true" quando operador é registado
  - Distingue: scan de registo vs. tentativa maliciosa
- **Impacto:** Interface mais profissional, menos poluída

---

## **Memória Externa: DevLog**
- **Data:** 07 Dezembro 2025
- **Decisão:** DevLog como "memória externa" da IA
- **Razão:** Memória da IA é só da sessão, precisa persistência
- **Estrutura:** 4 documentos principais
  - DOCUMENTACAO_PROJETO.md
  - NOTAS_RAPIDAS.txt
  - FLUXO_SISTEMA.txt
  - DevLog (este)
- **Impacto:** Nada se perde entre sessões

---

## **Relatórios: Estrutura Profissional**
- **Data:** 07 Dezembro 2025
- **Decisão:** 7 categorias, 18 relatórios diferentes
- **Formatos:** CSV, Excel, PDF
- **Organização:** Bem separados por tipo, fáceis de entender
- **Ver detalhes:** `docs/ESTRUTURA_RELATORIOS.md`

---

## **Firebase Auth: Opcional (Não Crítico)**
- **Data:** 07 Dezembro 2025
- **Decisão:** Aplicação funciona sem Auth configurado
- **Razão:** Não crítico para desenvolvimento, pode ser feito depois
- **Status:** Preparado, mas não bloqueia desenvolvimento
- **Quando configurar:** Antes de deploy produção ou quando precisar regras mais restritivas

---

**Ver também:**
- [APAGAR_ANTES_ENTREGAR_DevLog_HISTORICO.md](APAGAR_ANTES_ENTREGAR_DevLog_HISTORICO.md)
- [APAGAR_ANTES_ENTREGAR_DevLog_CONVERSAS.md](APAGAR_ANTES_ENTREGAR_DevLog_CONVERSAS.md)

