# 📊 ESTRUTURA DE RELATÓRIOS - CASAIS FLEET INTELLIGENCE

> **Data:** 07 Dezembro 2025  
> **Status:** ✅ Estrutura Definida  
> **Princípio:** Relatórios fáceis de entender, bem organizados, separados por tipo

---

## 🎯 PRINCÍPIOS DE DESIGN

1. **Facilidade de Compreensão:**
   - Qualquer pessoa deve entender (não só técnicos)
   - Linguagem clara e direta
   - Formatação profissional

2. **Organização:**
   - Separados por tipo (não misturar)
   - Cada relatório tem propósito específico
   - Fácil de encontrar o que se precisa

3. **Formatos:**
   - CSV (para Excel/importação)
   - Excel (formatação rica)
   - PDF (apresentações)

---

## 📋 CATEGORIAS DE RELATÓRIOS

### **1. RELATÓRIOS OPERACIONAIS** 🔧
*Gestão do dia-a-dia*

#### **1.1. Relatório de Sessões de Trabalho**
**Propósito:** Ver todas as sessões de trabalho (início, fim, duração, operador)

**Conteúdo:**
- ID da Sessão
- ID da Máquina
- Nome da Máquina
- ID do Operador (Cartão RFID)
- Nome do Operador
- Data de Início
- Hora de Início
- Data de Fim
- Hora de Fim
- Duração (horas)
- Horas Originais (automáticas)
- Horas Corrigidas (validadas)
- Foi Corrigido? (Sim/Não)
- Status (ABERTA/FECHADA)
- Motivo de Encerramento (MANUAL/AUTO_CLOSE/MUDANCA_MÁQUINA/MUDANCA_OPERADOR)
- Obra/Estaleiro
- Localização GPS

**Filtros:**
- Por máquina
- Por operador
- Por data/período
- Por obra
- Por status (abertas/fechadas)

**Formatos:** CSV, Excel, PDF

---

#### **1.2. Relatório de Operadores**
**Propósito:** Lista completa de operadores registados

**Conteúdo:**
- ID do Operador (Cartão RFID)
- Nome do Operador
- Email
- Data de Registo
- Total de Sessões
- Total de Horas Trabalhadas
- Última Sessão (Data/Hora)
- Status (ATIVO/INATIVO)

**Filtros:**
- Por status
- Por data de registo

**Formatos:** CSV, Excel

---

#### **1.3. Relatório de Máquinas**
**Propósito:** Estado atual de todas as máquinas

**Conteúdo:**
- ID da Máquina
- Nome da Máquina
- Status (ATIVA/PARADA/EM_MANUTENCAO)
- Horas Totais (Vida Útil)
- Horas desde Última Manutenção
- Consumo (L/h)
- Emissões CO₂ Totais (kg)
- Última Sessão (Data/Hora)
- Operador Atual
- Obra/Estaleiro Atual
- Localização GPS

**Filtros:**
- Por status
- Por obra
- Por tipo de máquina

**Formatos:** CSV, Excel, PDF

---

### **2. RELATÓRIOS DE ALERTAS E VALIDAÇÕES** ⚠️
*Gestão de alertas e correções*

#### **2.1. Relatório de Alertas Pendentes**
**Propósito:** Ver alertas que ainda não foram resolvidos

**Conteúdo:**
- ID do Alerta
- Tipo (ALERTA_ATENCAO/ALERTA_CRITICO)
- ID da Máquina
- Nome da Máquina
- ID do Operador
- Nome do Operador
- Data do Alerta
- Hora do Alerta
- Horas Registadas (Originais)
- Status (PENDENTE/RESOLVIDO/EXPIRADO)
- Link de Validação Enviado (Sim/Não)
- Data de Envio do Link
- Dias Pendentes

**Filtros:**
- Por status
- Por tipo de alerta
- Por máquina
- Por operador
- Por data

**Formatos:** CSV, Excel

---

#### **2.2. Relatório de Validações de Horas**
**Propósito:** Histórico completo de correções de horas

**Conteúdo:**
- ID do Alerta
- ID da Sessão
- ID da Máquina
- Nome da Máquina
- ID do Operador
- Nome do Operador
- Data da Sessão
- Horas Originais (Automáticas)
- Horas Corrigidas (Validadas)
- Diferença (horas)
- Foi Corrigido? (Sim/Não)
- Data de Correção
- Corrigido Por (Email)
- Motivo da Correção (se houver)

**Filtros:**
- Por máquina
- Por operador
- Por data
- Por diferença (ex: > 2h de diferença)

**Formatos:** CSV, Excel, PDF

---

#### **2.3. Relatório de Alertas Resolvidos**
**Propósito:** Alertas que já foram tratados

**Conteúdo:**
- ID do Alerta
- Tipo (ALERTA_ATENCAO/ALERTA_CRITICO)
- ID da Máquina
- Nome da Máquina
- ID do Operador
- Nome do Operador
- Data do Alerta
- Data de Resolução
- Tempo de Resolução (dias)
- Horas Originais
- Horas Corrigidas
- Status Final (RESOLVIDO/EXPIRADO)

**Filtros:**
- Por tipo
- Por período
- Por tempo de resolução

**Formatos:** CSV, Excel

---

### **3. RELATÓRIOS FINANCEIROS** 💰
*Gestão de custos e rentabilidade*

#### **3.1. Relatório de Custos por Máquina**
**Propósito:** Custo total de cada máquina (com tarifários versionados)

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

**Nota:** Usa tarifário correto de cada período (versionamento)

**Filtros:**
- Por máquina
- Por período
- Por obra
- Por tipo de tarifário

**Formatos:** CSV, Excel, PDF

---

#### **3.2. Relatório de Custos por Obra**
**Propósito:** Custo total por obra/estaleiro

**Conteúdo:**
- Nome da Obra
- Localização
- Máquinas Utilizadas
- Total de Horas
- Custo Total (€)
- Período (Data Início - Data Fim)

**Filtros:**
- Por obra
- Por período

**Formatos:** CSV, Excel, PDF

---

#### **3.3. Relatório de Rentabilidade**
**Propósito:** Análise de rentabilidade por máquina/obra

**Conteúdo:**
- ID da Máquina / Nome da Obra
- Receitas (€)
- Custos (€) - *calculados com tarifários corretos da época*
- Lucro/Prejuízo (€)
- Margem (%)
- Período

**Filtros:**
- Por máquina
- Por obra
- Por período

**Formatos:** CSV, Excel, PDF

---

#### **3.4. Relatório de Evolução de Tarifários** (NOVO!)
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

**Visualização:**
- Gráfico de linha (evolução ao longo do tempo)
- Tabela com todas as versões

**Filtros:**
- Por máquina
- Por período

**Formatos:** CSV, Excel, PDF

---

#### **3.5. Relatório de Orçamentação** (NOVO!)
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

**Funcionalidade:**
- Selecionar máquinas para obra
- Inserir horas estimadas
- Calcular custo total automaticamente
- Exportar para Excel (editar depois)

**Formatos:** Excel, PDF

---

### **4. RELATÓRIOS DE MANUTENÇÃO** 🔧
*Gestão de manutenção preditiva*

#### **4.1. Relatório de Manutenção Preventiva**
**Propósito:** Máquinas que precisam de manutenção

**Conteúdo:**
- ID da Máquina
- Nome da Máquina
- Horas Totais
- Horas desde Última Manutenção
- Limite de Manutenção (horas)
- Progresso (%)
- Status (OK/ATENÇÃO/CRÍTICO)
- Próxima Manutenção Prevista (Data)

**Filtros:**
- Por status
- Por tipo de máquina

**Formatos:** CSV, Excel, PDF

---

#### **4.2. Relatório de Histórico de Manutenções**
**Propósito:** Histórico completo de manutenções

**Conteúdo:**
- ID da Manutenção
- ID da Máquina
- Nome da Máquina
- Data da Manutenção
- Tipo (PREVENTIVA/CORRETIVA)
- Horas Resetadas
- Peças Substituídas
- Custo (€)
- Realizado Por (Interno/Externo)
- Fotos (Sim/Não)
- Observações

**Filtros:**
- Por máquina
- Por tipo
- Por período
- Por custo

**Formatos:** CSV, Excel, PDF

---

#### **4.3. Relatório de Avarias Reportadas**
**Propósito:** Histórico de avarias reportadas via QR Code

**Conteúdo:**
- ID do Reporte
- ID da Máquina
- Nome da Máquina
- Data do Reporte
- Hora do Reporte
- Reportado Por (Operador)
- Descrição Curta
- Descrição Longa
- Urgência (1-4)
- Status (PENDENTE/RESOLVIDO)
- Fotos (Sim/Não)
- Resolução (se resolvido)

**Filtros:**
- Por máquina
- Por urgência
- Por status
- Por período

**Formatos:** CSV, Excel, PDF

---

### **5. RELATÓRIOS AMBIENTAIS** 🌍
*Sustentabilidade e emissões*

#### **5.1. Relatório de Emissões CO₂**
**Propósito:** Emissões de carbono por máquina/obra

**Conteúdo:**
- ID da Máquina / Nome da Obra
- Total de Horas
- Consumo Total (L)
- Emissões CO₂ (kg)
- Período (Data Início - Data Fim)

**Filtros:**
- Por máquina
- Por obra
- Por período

**Formatos:** CSV, Excel, PDF

---

#### **5.2. Relatório de Sustentabilidade (Resumo)**
**Propósito:** Visão geral de impacto ambiental

**Conteúdo:**
- Total de Máquinas
- Total de Horas
- Consumo Total (L)
- Emissões CO₂ Totais (kg)
- Equivalente em Árvores Plantadas
- Período

**Formatos:** PDF (apresentação)

---

### **6. RELATÓRIOS DE RASTREABILIDADE** 📍
*Localização e movimentos*

#### **6.1. Relatório de Localização de Máquinas**
**Propósito:** Onde está cada máquina agora

**Conteúdo:**
- ID da Máquina
- Nome da Máquina
- Obra/Estaleiro Atual
- Localização GPS (Lat/Long)
- Data de Chegada
- Última Atualização
- Status (EM_OBRA/EM_TRANSITO/EM_MANUTENCAO/EM_ARMAZEM)

**Filtros:**
- Por obra
- Por status

**Formatos:** CSV, Excel

---

#### **6.2. Relatório de Histórico de Movimentos**
**Propósito:** Timeline de movimentos de cada máquina

**Conteúdo:**
- ID da Máquina
- Nome da Máquina
- Data/Hora do Movimento
- Origem (Obra/Estaleiro)
- Destino (Obra/Estaleiro)
- Tipo (RFID/MANUAL)
- Alterado Por (se manual)
- Distância (km) - se GPS disponível

**Filtros:**
- Por máquina
- Por período
- Por tipo de movimento

**Formatos:** CSV, Excel, PDF

---

### **7. RELATÓRIOS DE AUDITORIA** 🔍
*Rastreabilidade e compliance*

#### **7.1. Relatório de Auditoria de Sessões**
**Propósito:** Histórico completo com todas as alterações

**Conteúdo:**
- ID da Sessão
- ID da Máquina
- ID do Operador
- Data/Hora de Criação
- Data/Hora de Encerramento
- Horas Originais
- Horas Corrigidas
- Foi Corrigido? (Sim/Não)
- Data de Correção
- Corrigido Por
- Motivo de Encerramento
- Todas as alterações (log completo)

**Filtros:**
- Por máquina
- Por operador
- Por período
- Por correções (só corrigidas)

**Formatos:** CSV, Excel, PDF

---

#### **7.2. Relatório de Tentativas de Acesso Não Autorizadas**
**Propósito:** Segurança - cartões não registados

**Conteúdo:**
- ID do Scan
- ID do Cartão (RFID)
- ID da Máquina
- Data/Hora
- Tipo (TENTATIVA_ACESSO/SCAN_REGISTO)
- Resolvido? (Sim/Não)
- Data de Resolução
- Operador Registado (se resolvido)

**Filtros:**
- Por status (resolvido/pendente)
- Por período
- Por máquina

**Formatos:** CSV, Excel

---

## 🎨 FORMATO DOS RELATÓRIOS

### **CSV (Comma-Separated Values)**
- Separador: `;` (ponto e vírgula - padrão PT)
- Encoding: UTF-8 com BOM (para Excel PT)
- Primeira linha: Cabeçalhos
- Formato de data: `DD/MM/AAAA HH:MM`

### **Excel (.xlsx)**
- Formatação rica (cores, bordas, fórmulas)
- Múltiplas abas (se necessário)
- Gráficos (quando relevante)
- Filtros automáticos
- Formatação condicional (ex: alertas em vermelho)

### **PDF**
- Layout profissional
- Logotipo Casais (se disponível)
- Cabeçalho e rodapé
- Numeração de páginas
- Data de geração

---

## 📂 ORGANIZAÇÃO DE FICHEIROS

### **Estrutura de Nomes:**
```
casais_fleet_[TIPO]_[PERIODO]_[DATA].csv
casais_fleet_[TIPO]_[PERIODO]_[DATA].xlsx
casais_fleet_[TIPO]_[PERIODO]_[DATA].pdf
```

**Exemplos:**
- `casais_fleet_sessoes_mes_2025-12-07.csv`
- `casais_fleet_alertas_pendentes_2025-12-07.xlsx`
- `casais_fleet_manutencao_trimestre_2025-Q4.pdf`

### **Tipos:**
- `sessoes` - Sessões de trabalho
- `operadores` - Operadores
- `maquinas` - Máquinas
- `alertas_pendentes` - Alertas pendentes
- `alertas_resolvidos` - Alertas resolvidos
- `validacoes` - Validações de horas
- `custos_maquina` - Custos por máquina
- `custos_obra` - Custos por obra
- `rentabilidade` - Rentabilidade
- `manutencao_preventiva` - Manutenção preventiva
- `manutencao_historico` - Histórico de manutenções
- `avarias` - Avarias reportadas
- `emissoes` - Emissões CO₂
- `localizacao` - Localização de máquinas
- `movimentos` - Histórico de movimentos
- `auditoria` - Auditoria de sessões
- `seguranca` - Tentativas não autorizadas

### **Períodos:**
- `hoje` - Hoje
- `semana` - Esta semana
- `mes` - Este mês
- `trimestre` - Este trimestre
- `ano` - Este ano
- `personalizado` - Período personalizado

---

## 🎯 INTERFACE DE EXPORTAÇÃO

### **Menu de Relatórios no PWA:**

```
┌─────────────────────────────────────────────────────────┐
│  📊 RELATÓRIOS                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔧 OPERACIONAIS                                        │
│  ├─ Sessões de Trabalho                                │
│  ├─ Operadores                                         │
│  └─ Máquinas                                           │
│                                                         │
│  ⚠️ ALERTAS E VALIDAÇÕES                               │
│  ├─ Alertas Pendentes                                  │
│  ├─ Validações de Horas                                │
│  └─ Alertas Resolvidos                                 │
│                                                         │
│  💰 FINANCEIROS                                        │
│  ├─ Custos por Máquina                                 │
│  ├─ Custos por Obra                                    │
│  ├─ Rentabilidade                                      │
│  ├─ Evolução de Tarifários                             │
│  └─ Orçamentação                                       │
│                                                         │
│  🔧 MANUTENÇÃO                                         │
│  ├─ Manutenção Preventiva                              │
│  ├─ Histórico de Manutenções                           │
│  └─ Avarias Reportadas                                 │
│                                                         │
│  🌍 AMBIENTAIS                                         │
│  ├─ Emissões CO₂                                       │
│  └─ Sustentabilidade (Resumo)                           │
│                                                         │
│  📍 RASTREABILIDADE                                    │
│  ├─ Localização de Máquinas                            │
│  └─ Histórico de Movimentos                            │
│                                                         │
│  🔍 AUDITORIA                                          │
│  ├─ Auditoria de Sessões                               │
│  └─ Tentativas Não Autorizadas                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Para cada relatório:**
1. Selecionar filtros
2. Escolher período
3. Escolher formato (CSV/Excel/PDF)
4. [GERAR RELATÓRIO]

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar função `exportSessionsReport()` (CSV/Excel)
- [ ] Criar função `exportOperatorsReport()` (CSV/Excel)
- [ ] Criar função `exportMachinesReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportAlertsPendingReport()` (CSV/Excel)
- [ ] Criar função `exportValidationsReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportAlertsResolvedReport()` (CSV/Excel)
- [ ] Criar função `exportCostsByMachineReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportCostsByWorkReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportProfitabilityReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportTariffEvolutionReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportBudgetingReport()` (Excel/PDF)
- [ ] Criar função `exportMaintenancePreventiveReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportMaintenanceHistoryReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportBreakdownsReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportEmissionsReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportSustainabilityReport()` (PDF)
- [ ] Criar função `exportLocationReport()` (CSV/Excel)
- [ ] Criar função `exportMovementsReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportAuditReport()` (CSV/Excel/PDF)
- [ ] Criar função `exportSecurityReport()` (CSV/Excel)
- [ ] Criar componente `ReportsView.jsx` (interface)
- [ ] Criar componente `ReportFilters.jsx` (filtros)
- [ ] Criar componente `ReportCard.jsx` (card de relatório)
- [ ] Integrar biblioteca Excel (ex: `xlsx` ou `exceljs`)
- [ ] Integrar biblioteca PDF (ex: `jspdf` ou `pdfkit`)

---

**Última atualização:** 07 Dezembro 2025

