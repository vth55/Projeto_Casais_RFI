# 🏗️ TIPOS DE EQUIPAMENTO PROFISSIONAIS - INDÚSTRIA DE CONSTRUÇÃO

> **Data:** 07 Dezembro 2025  
> **Contexto:** Nomenclatura profissional usada na indústria portuguesa  
> **Fonte:** Pesquisa de mercado e práticas da indústria

---

## 📋 TERMOS PROFISSIONAIS

### **Em vez de "Categoria":**
- ✅ **"Tipo de Equipamento"** (mais profissional)
- ✅ **"Família de Equipamentos"** (alternativa)
- ✅ **"Classificação de Equipamentos"** (alternativa)

### **Em vez de "Localização":**
- ✅ **"Obra"** (já correto - termo padrão)
- ✅ **"Estaleiro"** (já correto - termo padrão)
- ✅ **"Centro de Custo"** (alternativa empresarial)

### **Em vez de "Categoria + Localização":**
- ✅ **"Tipo de Equipamento na Obra X"**
- ✅ **"Equipamentos do Tipo Y na Obra X"**
- ✅ **"Equipamentos do Tipo Y (Todas as Obras)"**

---

## 🚜 TIPOS DE EQUIPAMENTO COMUNS NA INDÚSTRIA

### **1. Equipamentos de Terraplanagem e Escavação**
- **Escavadoras** (ESC)
- **Retroescavadoras** (RET)
- **Bulldozers** (BUL)
- **Pás Carregadoras** (PCA)
- **Motoniveladoras** (MOT)

### **2. Equipamentos de Elevação e Movimentação**
- **Gruas Torre** (GRT)
- **Gruas Móveis** (GRM)
- **Empilhadores** (EMP)
- **Guindastes** (GUI)

### **3. Equipamentos de Compactação**
- **Compactadores de Solo** (CPS)
- **Rolos Compactadores** (ROC)
- **Placas Vibratórias** (PLV)

### **4. Equipamentos de Betão e Argamassa**
- **Betoneiras** (BET) - *A confirmar se faz sentido para Casais*
- **Bombas de Betão** (BOB)
- **Central de Betão** (CEB)

### **5. Equipamentos de Perfuração e Fundação**
- **Furadeiras** (FUR)
- **Martelos Hidráulicos** (MAR)
- **Equipamentos de Fundação** (FUN)

### **6. Equipamentos de Transporte**
- **Camiões** (CAM)
- **Dumpers** (DUM)
- **Reboques** (REB)

### **7. Equipamentos Auxiliares**
- **Geradores** (GER)
- **Compressores** (COM)
- **Soldadoras** (SOL)

---

## 🎯 TIPOS INICIAIS PARA O PROJETO

### **Tipos de Exemplo (Mínimos para Demo):**

**NOTA:** Isto é um projeto/protótipo. Apenas alguns tipos iniciais como exemplo. A Casais pode adicionar mais tipos depois conforme necessário.

**Tipos Sugeridos (3-4 exemplos):**

1. **Escavadoras** (ESC)
2. **Gruas** (GRU)
3. **Compactadores** (COM)
4. **Outros** (OUT) - Para equipamentos diversos

**Ou apenas:**
1. **Escavadoras** (ESC)
2. **Gruas** (GRU)
3. **Outros** (OUT)

### **Importante:**
- ✅ Sistema permite **criar novos tipos** depois
- ✅ Sistema permite **eliminar tipos** (se não houver máquinas)
- ✅ Sistema permite **editar tipos** existentes
- ✅ **Flexibilidade total** - Casais adiciona o que precisar

---

## 🏷️ PADRÕES DE NOMENCLATURA PROFISSIONAIS

### **Padrão 1: Tipo + Número + Obra** (Recomendado)
```
ESC-01 - Obra Porto 2025
ESC-02 - Obra Porto 2025
GRU-01 - Obra Lisboa 2025
```

### **Padrão 2: Tipo + Número Sequencial Global**
```
ESC-001
ESC-002
GRU-001
```

### **Padrão 3: Tipo + Número + Localização Curta**
```
ESC-01-POR
ESC-02-POR
GRU-01-LIS
```

---

## ✅ GESTÃO DE TIPOS DE EQUIPAMENTO

### **Funcionalidades:**

1. **Criar Tipo:**
   - Nome (ex: "Escavadoras")
   - Código (ex: "ESC")
   - Descrição
   - Padrão de nomenclatura
   - Valores padrão (consumo, CO₂)

2. **Editar Tipo:**
   - Modificar todos os campos
   - Não afeta máquinas existentes (só novas)

3. **Eliminar Tipo:**
   - ⚠️ **Validação:** Só permite se não houver máquinas associadas
   - Mostra quantas máquinas usam este tipo
   - Opção de "Arquivar" em vez de eliminar (mantém histórico)

4. **Arquivar Tipo:**
   - Desativa tipo sem eliminar
   - Máquinas existentes mantêm tipo
   - Não aparece em listas de seleção (só em histórico)

---

## 📊 INTERFACE DE GESTÃO

### **Página: Gestão de Tipos de Equipamento**

```
┌─────────────────────────────────────────────────────────┐
│  📂 GESTÃO DE TIPOS DE EQUIPAMENTO                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [+ Criar Novo Tipo]                                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔧 Escavadoras (ESC)                           │   │
│  │    Código: ESC                                  │   │
│  │    Máquinas: 5                                  │   │
│  │    Padrão: {CODE}-{NUM} - {WORK}               │   │
│  │    [Editar] [Ver Máquinas] [Arquivar]          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔧 Gruas (GRU)                                  │   │
│  │    Código: GRU                                  │   │
│  │    Máquinas: 3                                  │   │
│  │    Padrão: {CODE}-{NUM} - {WORK}               │   │
│  │    [Editar] [Ver Máquinas] [Arquivar]          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📦 Betoneiras (BET) - ARQUIVADO                │   │
│  │    Código: BET                                  │   │
│  │    Máquinas: 0                                  │   │
│  │    [Restaurar] [Eliminar]                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **Modal: Criar/Editar Tipo**

```
┌─────────────────────────────────────────────────────────┐
│  ✏️ CRIAR TIPO DE EQUIPAMENTO                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Nome: [Escavadoras________________]                   │
│                                                         │
│  Código: [ESC___] (máx. 5 caracteres)                 │
│                                                         │
│  Descrição:                                            │
│  [Máquinas de escavação para terraplanagem...]        │
│                                                         │
│  Padrão de Nomenclatura:                               │
│  [{CODE}-{NUM} - {WORK}________________]              │
│                                                         │
│  Valores Padrão:                                       │
│  Consumo: [12.5] L/h                                  │
│  Fator CO₂: [2.68] kg/L                               │
│                                                         │
│  [CANCELAR] [CRIAR]                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **Modal: Eliminar Tipo (com Validação)**

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ ELIMINAR TIPO DE EQUIPAMENTO                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tipo: Escavadoras (ESC)                               │
│                                                         │
│  ⚠️ ATENÇÃO:                                            │
│  Este tipo tem 5 máquinas associadas!                  │
│                                                         │
│  Não é possível eliminar um tipo com máquinas.         │
│                                                         │
│  Opções:                                               │
│  [ ] Arquivar tipo (desativar sem eliminar)           │
│  [ ] Mover máquinas para outro tipo primeiro           │
│                                                         │
│  [CANCELAR] [ARQUIVAR]                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar estrutura Firestore para tipos de equipamento
- [ ] Criar função `createEquipmentType()` (criar tipo)
- [ ] Criar função `updateEquipmentType()` (editar tipo)
- [ ] Criar função `deleteEquipmentType()` (eliminar com validação)
- [ ] Criar função `archiveEquipmentType()` (arquivar)
- [ ] Criar função `validateTypeDeletion()` (verificar máquinas associadas)
- [ ] Criar componente `EquipmentTypesView.jsx` (gestão de tipos)
- [ ] Criar componente `EquipmentTypeForm.jsx` (criar/editar)
- [ ] Criar componente `EquipmentTypeCard.jsx` (card de tipo)
- [ ] Criar componente `DeleteTypeDialog.jsx` (confirmação com validação)
- [ ] Atualizar queries de pesquisa (usar "tipo" em vez de "categoria")
- [ ] Atualizar interface (terminologia profissional)
- [ ] Testar criação/edição/eliminação de tipos
- [ ] Testar validação (não eliminar com máquinas associadas)

---

**Última atualização:** 07 Dezembro 2025

