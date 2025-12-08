# 🔄 FLUXO PRINCIPAL: Gestão de Sessões com Validação Humana

> **Data:** 07 Dezembro 2025  
> **Status:** 🟢 Decisões Tomadas (aguardar decisão sobre histórico)  
> **Prioridade:** 🔴 CRÍTICA (Fluxo principal do sistema)

---

## 📋 VISÃO GERAL

Este documento descreve o **fluxo principal** do sistema de gestão de sessões, incluindo:
- Regras de negócio para sessões simultâneas
- Sistema de alertas configuráveis
- Validação humana via email/formulário
- Menu de responsáveis para gestão de pendências

---

## 🎯 REGRAS DE NEGÓCIO

### **REGRA #1: Uma Máquina = Uma Sessão Aberta**

```
┌─────────────────────────────────────────────────────────┐
│  CENÁRIO: Funcionário B passa cartão na Máquina X      │
│           enquanto Funcionário A tem sessão aberta      │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  1. Sistema detecta sessão aberta do Funcionário A     │
│  2. Fecha sessão do Funcionário A (mais antiga)         │
│  3. Abre sessão do Funcionário B (nova)                │
│  4. Regista motivo: "Substituído por outro operador"   │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  RESULTADO:                                             │
│  • Sessão A: status = "CLOSED", motivo = "AUTO_CLOSE"  │
│  • Sessão B: status = "OPEN", motivo = "MANUAL_START"  │
│  • Histórico completo guardado para relatórios         │
└─────────────────────────────────────────────────────────┘
```

### **REGRA #2: Um Funcionário = Uma Sessão Aberta**

```
┌─────────────────────────────────────────────────────────┐
│  CENÁRIO: Funcionário A tem sessão na Máquina X        │
│           e passa cartão na Máquina Y                   │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  1. Sistema detecta sessão aberta do Funcionário A     │
│     na Máquina X                                         │
│  2. Fecha sessão na Máquina X (mais antiga)             │
│  3. Abre sessão na Máquina Y (nova)                     │
│  4. Regista motivo: "Mudança de máquina"                │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  RESULTADO:                                             │
│  • Sessão X: status = "CLOSED", motivo = "MACHINE_SWITCH"│
│  • Sessão Y: status = "OPEN", motivo = "MANUAL_START"  │
│  • Histórico completo guardado para relatórios         │
└─────────────────────────────────────────────────────────┘
```

---

## ⏰ SISTEMA DE ALERTAS CONFIGURÁVEIS

### **Estrutura de Alertas por Máquina**

```javascript
// Estrutura Firestore: machines/{machineId}
{
  alerts: [
    {
      name: "ALERTA_ATENCAO",  // Nome do alerta
      hours: 5,                // Horas para trigger
      type: "WARNING",         // Tipo: WARNING | CRITICAL
      action: "NOTIFY",        // Ação: NOTIFY (apenas visual)
      emailTemplate: "alert_atencao"  // Template de email (opcional)
    },
    {
      name: "ALERTA_CRITICO",  // Nome do alerta
      hours: 14,
      type: "CRITICAL",
      action: "AUTO_CLOSE",    // Ação: AUTO_CLOSE (encerra sessão)
      emailTemplate: "alert_critico_validation"
    }
  ]
}
```

**Nomes dos Alertas:**
- **ALERTA_ATENCAO:** Alerta visual (cor diferente na sessão), não encerra
- **ALERTA_CRITICO:** Alerta crítico que encerra sessão automaticamente

**Regra:** Se encerrar sessão após qualquer limite definido, recebe link de validação

### **Fluxo de Alertas**

```
┌─────────────────────────────────────────────────────────┐
│  SESSÃO ABERTA: Funcionário A na Máquina X              │
│  Tempo decorrido: 0h                                    │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
        [Sistema monitoriza em tempo real]
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  ⚠️ ALERTA_ATENCAO: 5 horas decorridas                  │
│  • Tipo: WARNING                                        │
│  • Ação: NOTIFY (apenas visual - cor diferente)        │
│  • Sessão continua aberta                               │
│  • Dashboard mostra sessão com cor de atenção           │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
        [Sessão continua...]
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  🔴 ALERTA_CRITICO: 14 horas decorridas                 │
│  • Tipo: CRITICAL                                       │
│  • Ação: AUTO_CLOSE (Encerra sessão automaticamente)   │
│  • Gera ID único de alerta                              │
│  • Gera link de validação                               │
│  • Envia email ao funcionário                           │
└─────────────────────────────────────────────────────────┘
```

**Regra Importante:**
- Se encerrar sessão **após qualquer limite definido** (ex: 6h após ALERTA_ATENCAO de 5h), recebe link de validação

---

## 📧 SISTEMA DE VALIDAÇÃO HUMANA

### **Fluxo Completo (Alerta 14h)**

```
┌─────────────────────────────────────────────────────────┐
│  1. SESSÃO AUTO-ENCERRADA (14h)                         │
│     • Sistema fecha sessão automaticamente               │
│     • Gera token único de validação                      │
│     • Cria registo de "alerta pendente"                  │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  2. EMAIL ENVIADO AO FUNCIONÁRIO                        │
│     • Assunto: "Confirmação de Horas - Máquina X"      │
│     • Corpo:                                            │
│       "Olá [Nome],                                       │
│        A sua sessão na Máquina X foi encerrada          │
│        automaticamente após 14 horas.                   │
│        Por favor, confirme as horas reais:"             │
│                                                          │
│        [LINK DE VALIDAÇÃO]                              │
│                                                          │
│        Horas registadas: 14h00                          │
│        Máquina: X                                        │
│        Obra: Y                                           │
│        Data: DD/MM/AAAA"                                 │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  3. FUNCIONÁRIO CLICA NO LINK                           │
│     • Link: https://pwa.casais.com/validate?token=XXX  │
│     • Token único, expira em 7 dias                     │
│     • Redireciona para formulário de validação          │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  4. FORMULÁRIO DE VALIDAÇÃO                             │
│     ┌─────────────────────────────────────┐             │
│     │ Máquina: X                          │             │
│     │ Obra: Y                             │             │
│     │ Data: DD/MM/AAAA                    │             │
│     │                                      │             │
│     │ Horas Registadas:                   │             │
│     │ Início: 08:00                       │             │
│     │ Fim: 22:00                          │             │
│     │ Duração: 14h00                      │             │
│     │                                      │             │
│     │ ✅ Confirmar Horas                  │             │
│     │ OU                                  │             │
│     │ ✏️ Corrigir Horas:                  │             │
│     │    Início: [08:00]                  │             │
│     │    Fim: [18:00]                     │             │
│     │    Duração: 10h00                   │             │
│     │                                      │             │
│     │ [SUBMIT]                            │             │
│     └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  5. SISTEMA ATUALIZA DADOS                              │
│     • Atualiza sessão com horas corrigidas              │
│     • Ajusta contadores da máquina                      │
│     • Marca alerta como "RESOLVIDO"                     │
│     • Guarda histórico (horas originais + corrigidas)   │
└─────────────────────────────────────────────────────────┘
```

### **Alerta 5h (Visual + Validação ao Encerrar)**

```
┌─────────────────────────────────────────────────────────┐
│  CENÁRIO: Sessão atinge 5 horas                         │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  ⚠️ ALERTA 5H ATIVADO:                                  │
│  • Dashboard mostra sessão com cor diferente (amarelo)  │
│  • Sessão continua aberta (não encerra)                 │
│  • Apenas alerta visual no sistema                     │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
        [Sessão continua...]
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  CENÁRIO: Funcionário encerra sessão manualmente       │
│           após 6h (passou alerta de 5h)                  │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  SISTEMA DETECTA:                                       │
│  • Sessão foi encerrada manualmente                     │
│  • Duração > 5h (passou alerta de 5h)                  │
│  • Gera ID único de alerta                             │
│  • Gera link de validação                               │
│  • Envia email com link                                 │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  FORMULÁRIO DE 5H:                                      │
│  • Link único: /validate?token={alertId}                │
│  • Permite confirmar/corrigir horas                     │
│  • Se não responder, continua até 14h                  │
└─────────────────────────────────────────────────────────┘
```

---

## 👥 MENU DE RESPONSÁVEIS

### **Estrutura de Dados**

```javascript
// Firestore: alerts/{alertId}
{
  id: "alert_123",  // ID único gerado ao criar alerta
  alertName: "ALERTA_CRITICO",  // ALERTA_ATENCAO | ALERTA_CRITICO
  machineId: "M_GRUAC_01",
  operatorId: "OP_001",
  sessionId: "session_456",
  type: "AUTO_CLOSE",  // AUTO_CLOSE | MANUAL_CLOSE_AFTER_ALERT
  status: "PENDING",  // PENDING | RESOLVED | EXPIRED
  createdAt: timestamp,
  resolvedAt: timestamp | null,
  validationToken: "unique_token_123",  // Token único para link
  validationLink: "https://pwa.casais.com/validate?token=unique_token_123",
  originalHours: 14.0,
  correctedHours: 10.0 | null,
  operatorEmail: "funcionario@casais.com"
}
```

### **Interface do Menu**

```
┌─────────────────────────────────────────────────────────┐
│  📊 MENU DE RESPONSÁVEIS - Alertas Pendentes          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  FILTROS:                                              │
│  [Todas] [Pendentes] [Resolvidos] [Expirados]         │
│  [Máquina: ▼] [Funcionário: ▼] [Data: 📅]             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ⚠️ ALERTA #001                                    │ │
│  │ Máquina: M_GRUAC_01                              │ │
│  │ Funcionário: João Silva                           │ │
│  │ Data: 07/12/2025                                  │ │
│  │ Horas Registadas: 14h00                           │ │
│  │ Status: 🟡 PENDENTE                               │ │
│  │ Link enviado: 07/12/2025 22:00                    │ │
│  │ [Ver Detalhes] [Reenviar Email]                   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ✅ ALERTA #002                                    │ │
│  │ Máquina: M_GRUAC_02                              │ │
│  │ Funcionário: Maria Santos                         │ │
│  │ Data: 06/12/2025                                  │ │
│  │ Horas Registadas: 14h00                          │ │
│  │ Horas Corrigidas: 10h30                          │ │
│  │ Status: 🟢 RESOLVIDO                             │ │
│  │ Resolvido em: 07/12/2025 09:15                    │ │
│  │ [Ver Detalhes] [Exportar]                        │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
│  [Exportar Relatório CSV] [Exportar Relatório Excel]   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### **Backend (Cloud Functions)**

**Funções Necessárias:**
1. `handleSessionTrigger` (já existe) - Atualizar com regras de negócio
2. `checkAndCloseConflictingSessions` - Verificar e fechar sessões conflitantes
3. `generateValidationLink` - Gerar link único de validação
4. `sendValidationEmail` - Enviar email com link
5. `processValidationResponse` - Processar resposta do formulário
6. `monitorSessionDuration` - Monitorizar duração e gerar alertas

### **Frontend (PWA)**

**Páginas/Componentes Necessários:**
1. `ValidationForm.jsx` - Formulário de validação de horas
2. `AlertsManagerView.jsx` - Menu de responsáveis
3. `AlertCard.jsx` - Card de alerta individual
4. `AlertFilters.jsx` - Filtros de alertas

### **Firestore Structure**

```javascript
// Estrutura adicional necessária:

// 1. Associar email a cartão RFID
operators/{cardId} {
  name: string,
  email: string,  // NOVO!
  registeredAt: timestamp
}

// 2. Alertas pendentes
alerts/{alertId} {
  machineId: string,
  operatorId: string,
  sessionId: string,
  type: "AUTO_CLOSE_14H" | "WARNING_5H",
  status: "PENDING" | "RESOLVED" | "EXPIRED",
  createdAt: timestamp,
  resolvedAt: timestamp | null,
  validationToken: string,  // Token único para link
  validationLink: string,
  originalHours: number,
  correctedHours: number | null,
  operatorEmail: string
}

// 3. Sessões com motivo de encerramento
sessions/{sessionId} {
  // ... campos existentes ...
  closeReason: "MANUAL" | "AUTO_CLOSE" | "MACHINE_SWITCH" | "OPERATOR_SWITCH",
  autoClosed: boolean,
  validated: boolean,
  originalDuration: number,
  correctedDuration: number | null
}

// 4. Configuração de alertas por máquina
machines/{machineId} {
  // ... campos existentes ...
  alerts: [
    {
      hours: number,
      type: "WARNING" | "CRITICAL",
      action: "NOTIFY" | "AUTO_CLOSE",
      emailTemplate: string
    }
  ]
}
```

---

## ✅ DECISÕES TOMADAS

1. **Link de Validação:**
   - ✅ **PWA mas só mostrar formulário** (não o PWA todo)
   - ✅ Cada alerta tem ID único que corresponde a link específico
   - ✅ IDs gerados ao mesmo tempo que se decide enviar link
   - ✅ Link: `https://pwa.casais.com/validate?token={alertId}`

2. **Email:**
   - ✅ **Firebase Auth** confirmado (se for melhor)

3. **Alerta 5h:**
   - ✅ Gera alerta só no sistema (cor diferente na sessão)
   - ✅ Se fechar sessão com 6h (passou alerta de 5h), recebe link de validação
   - ✅ Alerta 5h é visual apenas (não encerra sessão)

4. **Relatórios:**
   - ✅ **CSV + Excel** confirmado (formato usado nas empresas)

5. **Histórico:**
   - ⚠️ **PENDENTE:** Não sabe se guardar originais + corrigidas ou só corrigidas
   - **A debater:** Ver secção abaixo

---

## ✅ DECISÃO FINAL: Histórico de Horas

### **Opção A: Guardar Originais + Corrigidas** ✅ (ESCOLHIDO)

**Vantagens:**
- ✅ Auditoria completa (sempre sabemos o que foi alterado)
- ✅ Transparência total (não esconde erros do sistema)
- ✅ Relatórios podem mostrar ambas versões
- ✅ Compliance e rastreabilidade (importante para empresas)

**Desvantagens:**
- ❌ Mais espaço de armazenamento (mínimo)
- ❌ Lógica um pouco mais complexa

**Estrutura:**
```javascript
sessions/{sessionId} {
  // ... campos existentes ...
  originalDuration: 14.0,      // Horas registadas automaticamente
  correctedDuration: 10.0,      // Horas corrigidas pelo funcionário
  wasCorrected: true,           // Flag para saber se foi corrigido
  correctedAt: timestamp,       // Quando foi corrigido
  correctedBy: "operator_email" // Quem corrigiu
}
```

### **Opção B: Guardar Só Corrigidas** ❌ (Não Recomendado)

**Vantagens:**
- ✅ Mais simples (substitui valor)
- ✅ Menos espaço (mínimo)

**Desvantagens:**
- ❌ Perde histórico (não sabemos o que foi alterado)
- ❌ Sem auditoria (problema para compliance)
- ❌ Não podemos analisar padrões de erro
- ❌ Relatórios não podem mostrar "antes/depois"

**Estrutura:**
```javascript
sessions/{sessionId} {
  // ... campos existentes ...
  durationHours: 10.0,  // Substitui valor original
  wasCorrected: true
}
```

### **Recomendação: Opção A (Originais + Corrigidas)**

**Razão:** Para uma empresa como Casais, auditoria e rastreabilidade são críticas. Perder histórico pode ser problemático em auditorias ou análises futuras.

**Pergunta para Vitor:**
> "Preferes guardar ambas as versões (originais + corrigidas) para ter auditoria completa, ou só as corrigidas para simplificar? Para empresas, normalmente guardamos ambas."

---

## 📅 PRÓXIMOS PASSOS

1. ✅ **Registado no DevLog** (Parking Lot)
2. ✅ **Debater questões técnicas** com Vitor (quase tudo decidido!)
3. ⏳ **Decisão final sobre histórico** (originais + corrigidas vs só corrigidas)
4. ✅ **Criar diagramas de fluxo detalhados** (feito!)
5. ⏳ **Implementar regras de negócio no backend**
6. ⏳ **Criar formulário de validação no frontend** (PWA, só formulário)
7. ⏳ **Implementar menu de responsáveis**
8. ⏳ **Integrar sistema de emails** (Firebase Auth)
9. ⏳ **Testar fluxo completo**

---

**Última atualização:** 07 Dezembro 2025

