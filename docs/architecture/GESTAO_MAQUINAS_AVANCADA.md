# 🚜 GESTÃO AVANÇADA DE MÁQUINAS - CASAIS FLEET INTELLIGENCE

> **Data:** 07 Dezembro 2025  
> **Status:** ✅ Estrutura Definida  
> **Funcionalidades:** Categorias, Localização, Pesquisas, Filtros, Gestão em Massa

---

## 🎯 FUNCIONALIDADES PRINCIPAIS

### **1. Organização por Tipo de Equipamento** 📂
- Cada máquina pertence a uma **Categoria** (ex: Escavadoras, Gruas)
- #### [Registo de Máquinas]
O sistema suporta dois métodos de entrada de equipamentos:
1. **PWA (Manual)**: Criação direta na interface com **Nomenclatura Sugerida** (`{CAT}-{NUM} - {OBRA}`).
2. **Procore (Sync)**: Sincronização automática de equipamentos (em standby, aguardando verificação de conta dev).
- **Expansível:** Casais pode adicionar mais categorias via Procore.
- Permite agrupar e filtrar máquinas por tipo
- **Validação:** Não permite eliminar tipo se houver máquinas associadas

### **2. Organização por Localização (Obra/Estaleiro)** 📍
- Cada máquina está numa **Obra** ou **Estaleiro** (Centro de Custo)
- Permite saber onde está cada máquina
- Permite filtrar por localização
- **Termo Profissional:** "Obra" ou "Estaleiro" (já correto)

### **3. Pesquisas Avançadas** 🔍
- **Todas as máquinas na Obra X** (em qualquer tipo)
- **Todas as máquinas do Tipo Y na Obra X** (combinação)
- **Todas as máquinas do Tipo Y** (em qualquer localização/obra)
- Combinações de filtros múltiplos

### **4. Ordenação e Filtros** 📊
- Ordenar por custo (menor a maior, maior a menor)
- Outros filtros importantes (status, horas, etc.)

### **5. Gestão em Massa** ⚡
| **Gestão em Massa** | 🔴 PLANEADO | Edição de tarifários, categorias e localizações de múltiplas máquinas simultaneamente. | Requisito administrativo pós-demo. |
| **Nomenclatura Inteligente** | 🟡 EM CURSO | Implementar gerador `{CAT}-{NUM} - {OBRA}` como sugestão de preenchimento na PWA. | Facilitar criação manual enquanto o Procore está pendente. |
- Mecanismo de segurança (confirmação)

### **6. Padrões de Nomenclatura** 🏷️
- O sistema deve usar os nomes oficiais do inventário.
- **Sincronização Procore:** Se a máquina existir no Procore, o nome é bloqueado para edição local para manter a integridade.

---

## 🗂️ ESTRUTURA DE DADOS

### **Firestore: Máquinas (Atualizada)**

```javascript
// Firestore: machines/{machineId}
{
  // Identificação
  id: "M_GRUAC_01",
  name: "Escavadora 01 - Obra Porto",  // Nome atribuído para controlo
  displayName: "Escavadora 01",         // Nome curto para exibição
  
  // Categoria
  category: {
    id: "escavadoras",
    name: "Escavadoras",
    code: "ESC"  // Código padrão para nomenclatura
  },
  
  // Localização
  location: {
    workId: "obra_porto_2025",          // ID da obra/estaleiro
    workName: "Obra Porto 2025",        // Nome da obra
    gps: {
      latitude: 41.1579,
      longitude: -8.6291
    },
    lastUpdated: timestamp,
    updatedBy: "admin@casais.com"
  },
  
  // Status e Operação
  status: "ACTIVE" | "IDLE" | "MAINTENANCE" | "IN_TRANSIT",
  totalHours: 1250.5,
  consumptionRate: 12.5,  // L/h
  
  // Custos (Custo Horário)
  currentTariff: {
    // ... estrutura de tarifário (ver SISTEMA_TARIFARIOS.md)
    machineCostPerHour: 25.00,
    operatorCostPerHour: 15.00,
    totalCostPerHour: 40.00
  },
  
  // Emissões
  co2Factor: 2.68,  // kg CO₂ por litro
  
  // Metadados
  createdAt: timestamp,
  createdBy: "admin@casais.com",
  lastModified: timestamp,
  lastModifiedBy: "admin@casais.com"
}
```

### **Firestore: Tipos de Equipamento (Categorias)**

```javascript
// Firestore: machine_categories/{categoryId}
{
  id: "escavadoras",
  name: "Escavadoras",
  code: "ESC",  // Código para padrão de nomenclatura
  description: "Máquinas de escavação",
  defaultConsumptionRate: 12.5,  // L/h padrão
  defaultCo2Factor: 2.68,
  namingPattern: "{CODE}-{NUM} - {WORK}",  // Padrão de nomenclatura
  autoNumbering: true,  // Gerar número automaticamente?
  nextNumber: 3,  // Próximo número disponível
  isActive: true,  // Tipo ativo ou arquivado
  createdAt: timestamp,
  createdBy: "admin@casais.com",
  lastModified: timestamp,
  lastModifiedBy: "admin@casais.com",
  machineCount: 5  // Número de máquinas deste tipo (atualizado automaticamente)
}
```

**Gestão de Tipos:**
- ✅ **Criar:** Adicionar novo tipo de equipamento
- ✅ **Editar:** Modificar nome, código, padrão de nomenclatura
- ✅ **Eliminar:** Remover tipo (só se não houver máquinas associadas)
- ✅ **Arquivar:** Desativar tipo sem eliminar (mantém histórico)

### **Firestore: Obras/Estaleiros**

```javascript
// Firestore: works/{workId}
{
  id: "obra_porto_2025",
  name: "Obra Porto 2025",
  location: {
    address: "Rua X, Porto",
    gps: {
      latitude: 41.1579,
      longitude: -8.6291
    }
  },
  status: "ACTIVE" | "COMPLETED" | "SUSPENDED",
  startDate: timestamp,
  endDate: timestamp | null,
  createdAt: timestamp
}
```

---

## 🔍 SISTEMA DE PESQUISAS

### **Pesquisas Disponíveis:**

#### **1. Todas as Máquinas na Obra X**
```javascript
// Query Firestore
const machinesInWork = query(
  collection(db, 'machines'),
  where('location.workId', '==', 'obra_porto_2025')
);
```

#### **2. Todas as Máquinas do Tipo Y na Obra X**
```javascript
// Query Firestore (múltiplos filtros)
const machines = query(
  collection(db, 'machines'),
  where('location.workId', '==', 'obra_porto_2025'),
  where('category.id', '==', 'escavadoras')
);
```

#### **3. Todas as Máquinas do Tipo Y (Todas as Obras/Localizações)**
```javascript
// Query Firestore
const machines = query(
  collection(db, 'machines'),
  where('category.id', '==', 'escavadoras')
);
```

**Termo Profissional:** "Tipo de Equipamento" em vez de "Categoria"

#### **4. Pesquisa por Nome**
```javascript
// Pesquisa textual (client-side ou Cloud Function)
const searchTerm = "Escavadora";
const filtered = machines.filter(m => 
  m.name.toLowerCase().includes(searchTerm.toLowerCase())
);
```

---

## 📊 FILTROS E ORDENAÇÃO

### **Filtros Disponíveis:**

1. **Por Categoria**
   - Escolher uma ou várias categorias
   - Exemplo: "Escavadoras", "Gruas", "Betoneiras"

2. **Por Localização (Obra)**
   - Escolher uma ou várias obras
   - Exemplo: "Obra Porto 2025", "Obra Lisboa 2025"

3. **Por Status**
   - ACTIVE (Em operação)
   - IDLE (Parada)
   - MAINTENANCE (Em manutenção)
   - IN_TRANSIT (Em trânsito)

4. **Por Custo Horário**
   - Intervalo: "Entre X e Y €/h"
   - Exemplo: "Entre 20€ e 50€ por hora"

5. **Por Horas Totais**
   - Intervalo: "Entre X e Y horas"
   - Exemplo: "Mais de 1000 horas"

6. **Por Emissões CO₂**
   - Intervalo: "Entre X e Y kg"
   - Exemplo: "Mais de 500 kg"

### **Ordenação Disponível:**

1. **Por Custo Horário**
   - Menor a Maior (mais baratas primeiro)
   - Maior a Menor (mais caras primeiro)

2. **Por Nome**
   - A-Z
   - Z-A

3. **Por Categoria**
   - Agrupar por categoria, depois ordenar por nome

4. **Por Localização**
   - Agrupar por obra, depois ordenar por nome

5. **Por Horas Totais**
   - Menor a Maior
   - Maior a Menor

6. **Por Status**
   - Agrupar por status, depois ordenar por nome

---

## ⚡ GESTÃO EM MASSA (PENDENTE - BACKLOG)

### **Funcionalidade: Aplicar Valores a Múltiplas Máquinas**

**Casos de Uso:**
- Definir custo horário para várias máquinas da mesma categoria
- Atualizar emissões CO₂ para várias máquinas
- Alterar consumo (L/h) para várias máquinas
- Mudar localização de várias máquinas

### **Fluxo de Gestão em Massa:**

```
┌─────────────────────────────────────────────────────────┐
│  1. SELECIONAR MÁQUINAS                                 │
│     ☑️ Escavadora 01 - Obra Porto                       │
│     ☑️ Escavadora 02 - Obra Porto                       │
│     ☑️ Escavadora 03 - Obra Lisboa                      │
│     ☐ Escavadora 04 - Obra Porto                       │
│                                                         │
│     [Selecionar Todas] [Desmarcar Todas]               │
│     [Selecionar por Categoria] [Selecionar por Obra]   │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  2. ESCOLHER AÇÃO                                       │
│     [ ] Atualizar Custo Horário                         │
│     [ ] Atualizar Emissões CO₂                          │
│     [ ] Atualizar Consumo (L/h)                         │
│     [●] Atualizar Custo Horário                         │
│                                                         │
│     Custo Máquina: [25.00] €/h                        │
│     Custo Operador: [15.00] €/h                        │
│     Total: 40.00 €/h                                   │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  3. CONFIRMAÇÃO DE SEGURANÇA                            │
│                                                         │
│     ⚠️ ATENÇÃO: Vais alterar 3 máquinas                │
│                                                         │
│     Máquinas Selecionadas:                              │
│     • Escavadora 01 - Obra Porto                        │
│     • Escavadora 02 - Obra Porto                        │
│     • Escavadora 03 - Obra Lisboa                       │
│                                                         │
│     Alteração:                                          │
│     Custo Horário: 40.00 €/h                           │
│                                                         │
│     [CANCELAR] [CONFIRMAR ALTERAÇÃO]                    │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  4. RESULTADO                                           │
│                                                         │
│     ✅ 3 máquinas atualizadas com sucesso               │
│                                                         │
│     • Escavadora 01 - Obra Porto                        │
│     • Escavadora 02 - Obra Porto                        │
│     • Escavadora 03 - Obra Lisboa                       │
│                                                         │
│     [FECHAR]                                            │
└─────────────────────────────────────────────────────────┘
```

### **Mecanismo de Segurança:**

1. **Lista de Confirmação:**
   - Mostra TODAS as máquinas que vão ser alteradas
   - Mostra o valor que vai ser aplicado
   - Botão "CANCELAR" sempre visível

2. **Confirmação Dupla:**
   - Primeiro: "Confirmar Alteração?"
   - Segundo: "Tens CERTEZA? Isto vai alterar X máquinas."

3. **Histórico de Alterações:**
   - Guarda quem fez a alteração
   - Guarda quando foi feita
   - Guarda valores antigos e novos
   - Permite reverter (se necessário)

4. **Validação:**
   - Verifica se valores são válidos (ex: custo > 0)
   - Verifica se máquinas existem
   - Verifica permissões do utilizador

---

### **🛑 NOTA: Naming Automático (Removido)**
*A funcionalidade de geração automática `{CODE}-{NUM}` foi removida para evitar conflitos com os códigos de inventário oficiais da Casais/Procore.*

---

## 🎨 INTERFACE DE GESTÃO

### **Página: Gestão de Máquinas**

```
┌─────────────────────────────────────────────────────────┐
│  🚜 GESTÃO DE MÁQUINAS                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔍 PESQUISA E FILTROS:                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Pesquisa: [________________] 🔍                 │   │
│  │                                                 │   │
│  │ Categoria: [Todas ▼]                           │   │
│  │ Obra: [Todas ▼]                                 │   │
│  │ Status: [Todos ▼]                               │   │
│  │ Custo: [Todos ▼]                                │   │
│  │                                                 │   │
│  │ Ordenar por: [Custo (Menor a Maior) ▼]        │   │
│  │                                                 │   │
│  │ [Aplicar Filtros] [Limpar]                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📊 RESULTADOS: 15 máquinas encontradas                │
│                                                         │
│  [☑️ Selecionar Todas] [⚡ Gestão em Massa]          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ☑️ ESC-01 - Obra Porto                          │   │
│  │    Categoria: Escavadoras                       │   │
│  │    Custo: 40,00 €/h | Status: ATIVA             │   │
│  │    [Editar] [Ver Detalhes]                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ☑️ ESC-02 - Obra Porto                          │   │
│  │    Categoria: Escavadoras                       │   │
│  │    Custo: 40,00 €/h | Status: ATIVA             │   │
│  │    [Editar] [Ver Detalhes]                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [+ Adicionar Máquina]                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **Modal: Gestão em Massa**

```
┌─────────────────────────────────────────────────────────┐
│  ⚡ GESTÃO EM MASSA                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Máquinas Selecionadas: 3                              │
│                                                         │
│  ☑️ ESC-01 - Obra Porto                                │
│  ☑️ ESC-02 - Obra Porto                                │
│  ☑️ ESC-03 - Obra Lisboa                               │
│                                                         │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  Ação:                                                  │
│  [●] Atualizar Custo Horário                           │
│  [ ] Atualizar Emissões CO₂                            │
│  [ ] Atualizar Consumo (L/h)                           │
│  [ ] Mudar Localização                                 │
│                                                         │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  Custo Máquina: [25.00] €/h                           │
│  Custo Operador: [15.00] €/h                          │
│  Total: 40.00 €/h                                     │
│                                                         │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  ⚠️ ATENÇÃO: Vais alterar 3 máquinas                  │
│                                                         │
│  [CANCELAR] [CONFIRMAR ALTERAÇÃO]                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar estrutura Firestore para categorias
- [ ] Criar estrutura Firestore para obras/estaleiros
- [ ] Atualizar estrutura de máquinas (categoria, localização)
- [ ] Criar função `searchMachines()` (pesquisas avançadas)
- [ ] Criar função `filterMachines()` (filtros múltiplos)
- [ ] Criar função `sortMachines()` (ordenação)
- [ ] Criar função `bulkUpdateMachines()` (gestão em massa)
- [ ] Criar função `generateMachineName()` (padrões de nomenclatura)
- [ ] Criar componente `MachinesManagementView.jsx` (página principal)
- [ ] Criar componente `MachineFilters.jsx` (filtros)
- [ ] Criar componente `MachineCard.jsx` (card de máquina)
- [ ] Criar componente `BulkUpdateModal.jsx` (gestão em massa)
- [ ] Criar componente `ConfirmationDialog.jsx` (confirmação de segurança)
- [ ] Criar componente `CategoryManager.jsx` (gestão de categorias)
- [ ] Criar componente `WorkManager.jsx` (gestão de obras)
- [ ] Implementar histórico de alterações em massa
- [ ] Testar pesquisas complexas
- [ ] Testar gestão em massa com confirmação

---

**Última atualização:** 07 Dezembro 2025

