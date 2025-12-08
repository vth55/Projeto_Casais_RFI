# 💰 SISTEMA DE TARIFÁRIOS VERSIONADOS - CASAIS FLEET INTELLIGENCE

> **Data:** 07 Dezembro 2025  
> **Status:** ✅ Estrutura Definida  
> **Conceito:** Histórico de custos para orçamentação e auditoria

---

## 🎯 CONCEITO

**Tarifário:** Custo por hora de funcionamento de uma máquina.

**Versionamento:** Guardar histórico de todos os tarifários ao longo do tempo.

**Porquê?**
- Valores mudam (ex: daqui a 1 ano máquina fica mais cara)
- Relatórios históricos precisam do valor correto da época
- Auditoria: provar que usámos tarifário X na data Y
- Orçamentação: saber custo real por hora para futuras obras

---

## 📊 TIPOS DE TARIFÁRIO

### **1. Tarifário Só Máquina** 🚜
**Custo hora apenas da máquina:**
- Combustível
- Desgaste
- Manutenção
- Depreciação
- Seguros
- **NÃO inclui:** Custo do operador

**Exemplo:**
- Máquina: Escavadora
- Custo Hora: 25,00 €/h
- **Usado para:** Cálculo de custos quando operador já está incluído noutro orçamento

---

### **2. Tarifário Máquina + Operador** 👷‍♂️🚜
**Custo hora da máquina + operador:**
- Tudo do tarifário "Só Máquina" +
- Salário do operador (proporcional por hora)
- Encargos sociais
- Formação
- **Inclui:** Tudo necessário para operar

**Exemplo:**
- Máquina: Escavadora
- Custo Máquina: 25,00 €/h
- Custo Operador: 15,00 €/h
- **Total: 40,00 €/h**
- **Usado para:** Orçamentação completa de obra

---

## 🗂️ ESTRUTURA DE DADOS

### **Firestore: Tarifários por Máquina**

```javascript
// Firestore: machines/{machineId}
{
  // ... campos existentes ...
  
  // Tarifário atual (sempre o mais recente)
  currentTariff: {
    id: "tariff_2025_12_01",
    type: "MACHINE_ONLY" | "MACHINE_AND_OPERATOR",
    machineCostPerHour: 25.00,      // €/h
    operatorCostPerHour: 15.00,      // €/h (se type = MACHINE_AND_OPERATOR)
    totalCostPerHour: 40.00,         // €/h (calculado)
    validFrom: timestamp,            // Data de início
    validUntil: null,                 // null = ainda em vigor
    createdBy: "admin@casais.com",
    createdAt: timestamp
  },
  
  // Histórico de tarifários (versões antigas)
  tariffHistory: [
    {
      id: "tariff_2024_01_01",
      type: "MACHINE_ONLY",
      machineCostPerHour: 20.00,
      operatorCostPerHour: 0,
      totalCostPerHour: 20.00,
      validFrom: timestamp("2024-01-01"),
      validUntil: timestamp("2025-11-30"),  // Foi substituído
      createdBy: "admin@casais.com",
      createdAt: timestamp("2024-01-01")
    },
    {
      id: "tariff_2025_12_01",
      type: "MACHINE_AND_OPERATOR",
      machineCostPerHour: 25.00,
      operatorCostPerHour: 15.00,
      totalCostPerHour: 40.00,
      validFrom: timestamp("2025-12-01"),
      validUntil: null,  // Atual
      createdBy: "admin@casais.com",
      createdAt: timestamp("2025-12-01")
    }
  ]
}
```

### **Firestore: Sessões com Tarifário**

```javascript
// Firestore: sessions/{sessionId}
{
  // ... campos existentes ...
  
  // Tarifário em vigor durante esta sessão
  tariff: {
    id: "tariff_2025_12_01",           // ID do tarifário usado
    type: "MACHINE_AND_OPERATOR",
    machineCostPerHour: 25.00,
    operatorCostPerHour: 15.00,
    totalCostPerHour: 40.00,
    // Guardamos snapshot para não depender de histórico
    snapshot: {
      validFrom: timestamp("2025-12-01"),
      validUntil: null
    }
  },
  
  // Cálculo de custos desta sessão
  costs: {
    hours: 8.5,                         // Horas finais (corrigidas ou originais)
    costPerHour: 40.00,                 // Tarifário usado
    totalCost: 340.00,                   // 8.5h × 40€/h
    breakdown: {
      machineCost: 212.50,              // 8.5h × 25€/h
      operatorCost: 127.50              // 8.5h × 15€/h
    }
  }
}
```

---

## 🔄 FLUXO DE VERSIONAMENTO

### **Cenário: Mudança de Tarifário**

```
┌─────────────────────────────────────────────────────────┐
│  SITUAÇÃO ATUAL:                                        │
│  Máquina: M_GRUAC_01                                    │
│  Tarifário Atual: 20,00 €/h (desde 01/01/2024)         │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  ADMIN MUDA TARIFÁRIO:                                  │
│  Data: 01/12/2025                                       │
│  Novo: 25,00 €/h                                        │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  SISTEMA:                                               │
│  1. Marca tarifário antigo como "validUntil: 30/11/2025"│
│  2. Cria novo tarifário "validFrom: 01/12/2025"        │
│  3. Adiciona ao histórico                               │
│  4. Atualiza currentTariff                              │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  RESULTADO:                                             │
│  • Histórico preservado (não perde dados)              │
│  • Sessões antigas mantêm tarifário antigo             │
│  • Sessões novas usam tarifário novo                   │
│  • Relatórios históricos usam tarifário correto        │
└─────────────────────────────────────────────────────────┘
```

---

## 📈 CÁLCULO DE CUSTOS

### **Ao Criar/Encerrar Sessão:**

```javascript
// Função: calculateSessionCost(session, tariff)
function calculateSessionCost(session, tariff) {
  // 1. Determinar horas finais (corrigidas ou originais)
  const finalHours = session.correctedDurationHours ?? session.originalDurationHours;
  
  // 2. Usar tarifário em vigor na data da sessão
  const sessionDate = session.startTime.toDate();
  const activeTariff = getTariffForDate(sessionDate, tariffHistory);
  
  // 3. Calcular custos
  const costs = {
    hours: finalHours,
    costPerHour: activeTariff.totalCostPerHour,
    totalCost: finalHours * activeTariff.totalCostPerHour,
    breakdown: {
      machineCost: finalHours * activeTariff.machineCostPerHour,
      operatorCost: activeTariff.type === "MACHINE_AND_OPERATOR" 
        ? finalHours * activeTariff.operatorCostPerHour 
        : 0
    }
  };
  
  // 4. Guardar na sessão
  session.tariff = {
    id: activeTariff.id,
    type: activeTariff.type,
    machineCostPerHour: activeTariff.machineCostPerHour,
    operatorCostPerHour: activeTariff.operatorCostPerHour,
    totalCostPerHour: activeTariff.totalCostPerHour,
    snapshot: {
      validFrom: activeTariff.validFrom,
      validUntil: activeTariff.validUntil
    }
  };
  
  session.costs = costs;
  
  return session;
}
```

### **Função: getTariffForDate()**

```javascript
// Encontrar tarifário em vigor numa data específica
function getTariffForDate(date, tariffHistory) {
  // Ordenar por validFrom (mais recente primeiro)
  const sorted = tariffHistory.sort((a, b) => 
    b.validFrom.toMillis() - a.validFrom.toMillis()
  );
  
  // Encontrar primeiro tarifário válido na data
  for (const tariff of sorted) {
    const validFrom = tariff.validFrom.toDate();
    const validUntil = tariff.validUntil?.toDate() || new Date('2099-12-31');
    
    if (date >= validFrom && date <= validUntil) {
      return tariff;
    }
  }
  
  // Se não encontrar, usar o mais antigo (fallback)
  return sorted[sorted.length - 1];
}
```

---

## 📊 RELATÓRIOS FINANCEIROS (ATUALIZADOS)

### **3.1. Relatório de Custos por Máquina**

**Conteúdo:**
- ID da Máquina
- Nome da Máquina
- **Tarifário em Vigor (Atual):**
  - Tipo (Só Máquina / Máquina + Operador)
  - Custo Hora (€/h)
  - Válido Desde (Data)
- **Período Analisado:**
  - Data Início
  - Data Fim
- **Resumo:**
  - Total de Horas
  - Custo Total (€)
  - Custo Médio por Hora (€/h)
- **Breakdown (se Máquina + Operador):**
  - Custo Máquina (€)
  - Custo Operador (€)

**Filtros:**
- Por máquina
- Por período
- Por obra
- Por tipo de tarifário

**Formatos:** CSV, Excel, PDF

---

### **3.2. Relatório de Custos por Obra**

**Conteúdo:**
- Nome da Obra
- Localização
- Período (Data Início - Data Fim)
- **Máquinas Utilizadas:**
  - ID da Máquina
  - Nome da Máquina
  - Horas na Obra
  - Tarifário Usado (€/h)
  - Custo Total (€)
- **Total da Obra:**
  - Total de Horas
  - Custo Total (€)
  - Custo Médio por Hora (€/h)

**Filtros:**
- Por obra
- Por período

**Formatos:** CSV, Excel, PDF

---

### **3.3. Relatório de Evolução de Tarifários** (NOVO!)

**Propósito:** Ver como custos evoluíram ao longo do tempo

**Conteúdo:**
- ID da Máquina
- Nome da Máquina
- **Histórico de Tarifários:**
  - Data Início
  - Data Fim
  - Tipo (Só Máquina / Máquina + Operador)
  - Custo Hora (€/h)
  - Variação (%) (comparado com anterior)
  - Criado Por
  - Data de Criação

**Filtros:**
- Por máquina
- Por período

**Formatos:** CSV, Excel, PDF

**Visualização:**
- Gráfico de linha (evolução ao longo do tempo)
- Tabela com todas as versões

---

### **3.4. Relatório de Orçamentação** (NOVO!)

**Propósito:** Ajudar a criar orçamentos para futuras obras

**Conteúdo:**
- **Tarifários Atuais (Vigentes):**
  - ID da Máquina
  - Nome da Máquina
  - Tipo de Tarifário
  - Custo Hora (€/h)
  - Válido Desde
- **Estimativas:**
  - Horas Estimadas
  - Custo Estimado (€)
- **Breakdown:**
  - Custo Máquina (€)
  - Custo Operador (€)

**Formatos:** Excel, PDF

**Funcionalidade:**
- Selecionar máquinas para obra
- Inserir horas estimadas
- Calcular custo total automaticamente
- Exportar para Excel (editar depois)

---

## 🎨 INTERFACE DE GESTÃO

### **Página: Gestão de Tarifários**

```
┌─────────────────────────────────────────────────────────┐
│  💰 GESTÃO DE TARIFÁRIOS                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MÁQUINA: [Escolher Máquina ▼]                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📊 TARIFÁRIO ATUAL                              │   │
│  │                                                 │   │
│  │ Tipo: [●] Só Máquina  [ ] Máquina + Operador   │   │
│  │                                                 │   │
│  │ Custo Máquina: [25.00] €/h                     │   │
│  │ Custo Operador: [15.00] €/h                    │   │
│  │ Total: 40.00 €/h                               │   │
│  │                                                 │   │
│  │ Válido Desde: 01/12/2025                       │   │
│  │                                                 │   │
│  │ [EDITAR TARIFÁRIO] [VER HISTÓRICO]             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📈 HISTÓRICO DE TARIFÁRIOS                      │   │
│  │                                                 │   │
│  │ 01/12/2025 - Atual                              │   │
│  │  40.00 €/h (Máquina + Operador)                │   │
│  │                                                 │   │
│  │ 01/01/2024 - 30/11/2025                         │   │
│  │  20.00 €/h (Só Máquina)                        │   │
│  │                                                 │   │
│  │ [Ver Gráfico] [Exportar]                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **Modal: Editar Tarifário**

```
┌─────────────────────────────────────────────────────────┐
│  ✏️ EDITAR TARIFÁRIO                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Máquina: M_GRUAC_01                                    │
│                                                         │
│  Tipo:                                                  │
│  [●] Só Máquina                                         │
│  [ ] Máquina + Operador                                │
│                                                         │
│  Custo Máquina: [25.00] €/h                            │
│  Custo Operador: [15.00] €/h                           │
│                                                         │
│  Total: 40.00 €/h                                      │
│                                                         │
│  Data de Início: [01/12/2025]                          │
│                                                         │
│  ⚠️ ATENÇÃO:                                            │
│  O tarifário anterior será arquivado automaticamente.  │
│                                                         │
│  [CANCELAR] [SALVAR]                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar estrutura Firestore para tarifários
- [ ] Criar função `getTariffForDate()` (encontrar tarifário por data)
- [ ] Criar função `calculateSessionCost()` (calcular custos)
- [ ] Atualizar `handleSessionTrigger` para guardar tarifário na sessão
- [ ] Criar função `createNewTariff()` (criar novo tarifário)
- [ ] Criar função `archiveOldTariff()` (arquivar tarifário antigo)
- [ ] Criar componente `TariffManagementView.jsx` (gestão de tarifários)
- [ ] Criar componente `TariffHistoryChart.jsx` (gráfico de evolução)
- [ ] Criar componente `TariffEditModal.jsx` (editar tarifário)
- [ ] Atualizar relatórios financeiros com tarifários
- [ ] Criar relatório "Evolução de Tarifários"
- [ ] Criar relatório "Orçamentação"
- [ ] Testar versionamento (mudar tarifário e verificar histórico)
- [ ] Testar cálculo de custos com tarifários antigos

---

## 🎯 CASOS DE USO

### **Caso 1: Orçamentação de Nova Obra**
1. Admin acessa "Gestão de Tarifários"
2. Vê tarifários atuais de todas as máquinas
3. Seleciona máquinas para obra
4. Insere horas estimadas
5. Sistema calcula custo total
6. Exporta para Excel
7. Usa no orçamento da obra

### **Caso 2: Análise de Evolução de Custos**
1. Admin acessa "Relatório de Evolução de Tarifários"
2. Seleciona máquina
3. Vê gráfico de evolução ao longo do tempo
4. Identifica aumentos de custo
5. Analisa impacto financeiro

### **Caso 3: Auditoria de Custos Históricos**
1. Auditor pede relatório de custos de Janeiro 2024
2. Sistema usa tarifário que estava em vigor em Janeiro 2024
3. Relatório mostra custos corretos da época
4. Auditor pode verificar que valores estão corretos

---

**Última atualização:** 07 Dezembro 2025

