# 📊 SISTEMA DE GRÁFICOS E ANÁLISES - CASAIS FLEET INTELLIGENCE

> **Data:** 07 Dezembro 2025  
> **Status:** ✅ Estrutura Definida  
> **Conceito:** Dashboards interativos com análises temporais e comparativas

---

## 🎯 VISÃO GERAL

Sistema completo de visualização de dados com gráficos interativos que permitem:
- Análise por obra, máquina, tipo de equipamento
- Filtros temporais flexíveis (dia, semana, mês, ano, múltiplos anos)
- Comparações e tendências
- KPIs de rendimento, custos, emissões

---

## 📈 TIPOS DE GRÁFICOS E ANÁLISES

> ⭐ **KPIs Profissionais do Setor:** Taxa de Disponibilidade, MTBF, MTTR, OEE, CPMV
> Estes são os indicadores mais valorizados na gestão profissional de frotas industriais.

### **1. GRÁFICOS POR OBRA** 🏗️

#### **1.1. Emissões CO₂ por Obra**
- **Visualização:** Gráfico de barras ou linha
- **Dados:** Total de emissões CO₂ (kg) por obra
- **Filtros:** Período temporal, comparar múltiplas obras
- **Comparação:** Obra vs Obra, Obra vs Média Geral

#### **1.2. Custos por Obra**
- **Visualização:** Gráfico de barras empilhadas
- **Dados:** Custo total (€) por obra, breakdown por máquina/tipo
- **Filtros:** Período temporal, tipo de custo (máquina, operador, total)
- **Comparação:** Custo planeado vs Real

#### **1.3. Horas de Trabalho por Obra**
- **Visualização:** Gráfico de área ou barras
- **Dados:** Total de horas trabalhadas por obra
- **Filtros:** Período temporal, tipo de equipamento
- **Breakdown:** Por máquina, por tipo de equipamento

#### **1.4. Rendimento por Obra**
- **Visualização:** Gráfico de linha (evolução temporal)
- **Dados:** Horas trabalhadas / Custo total = Rendimento (€/h)
- **Filtros:** Período temporal
- **Comparação:** Tendência ao longo do tempo

#### **1.5. Distribuição de Máquinas por Obra**
- **Visualização:** Gráfico de pizza ou barras
- **Dados:** Quantidade de máquinas por tipo em cada obra
- **Filtros:** Data específica
- **Comparação:** Entre obras

---

### **2. GRÁFICOS POR MÁQUINA** 🚜

#### **2.1. Desempenho de Máquina Específica**
- **Visualização:** Dashboard com múltiplos gráficos
- **Dados:**
  - Horas trabalhadas ao longo do tempo
  - Custos acumulados
  - Emissões CO₂
  - Sessões de trabalho
  - **Taxa de Disponibilidade (%)** - ⭐ KPI Profissional
  - **MTBF (Tempo Médio Entre Falhas)** - ⭐ KPI Profissional
  - **MTTR (Tempo Médio para Reparo)** - ⭐ KPI Profissional
  - **OEE (Eficiência Global)** - ⭐ KPI Profissional
  - Tempo de Inatividade (Downtime)
- **Filtros:** Período temporal, obra específica ou todas
- **Comparação:** Máquina vs Média do Tipo

#### **2.2. Taxa de Disponibilidade e Utilização** ⭐ KPI Profissional
- **Visualização:** Gráfico de barras ou área
- **Dados:**
  - **Taxa de Disponibilidade (%)** - Tempo disponível / Tempo total
  - **% de Utilização (Uptime)** - Horas trabalhadas / Horas disponíveis
  - Tempo de Inatividade (Downtime)
- **Filtros:** Período temporal
- **Breakdown:** Por motivo (manutenção, parada, operação, espera)
- **Comparação:** Máquina vs Média do Tipo, vs Meta (ex: 85%)

#### **2.3. Custo por Hora de Máquina**
- **Visualização:** Gráfico de linha
- **Dados:** Evolução do custo por hora ao longo do tempo
- **Filtros:** Período temporal
- **Nota:** Mostra mudanças de tarifário (custo horário)

#### **2.4. Histórico de Sessões de Máquina**
- **Visualização:** Timeline ou gráfico de barras
- **Dados:** Sessões de trabalho ao longo do tempo
- **Filtros:** Período temporal, operador específico
- **Detalhes:** Duração, operador, obra

---

### **3. GRÁFICOS POR TIPO DE EQUIPAMENTO** 📂

#### **3.1. Desempenho por Tipo (na Obra X ou Geral)**
- **Visualização:** Gráfico de barras comparativo
- **Dados:**
  - Total de horas por tipo
  - Custo total por tipo
  - Emissões por tipo
- **Filtros:** Obra específica ou todas, período temporal
- **Comparação:** Entre tipos de equipamento

#### **3.2. Distribuição de Custos por Tipo**
- **Visualização:** Gráfico de pizza ou barras empilhadas
- **Dados:** % de custos totais por tipo de equipamento
- **Filtros:** Obra específica ou todas, período temporal
- **Insight:** Qual tipo consome mais recursos

#### **3.3. Rendimento Médio por Tipo**
- **Visualização:** Gráfico de barras
- **Dados:** Custo total / Horas totais = Rendimento (€/h) por tipo
- **Filtros:** Obra específica ou todas, período temporal
- **Comparação:** Qual tipo é mais rentável

---

### **4. GRÁFICOS DE EMISSÕES** 🌍

#### **4.1. Emissões CO₂ por Obra**
- **Visualização:** Gráfico de barras ou linha
- **Dados:** Total de emissões (kg) por obra
- **Filtros:** Período temporal
- **Comparação:** Entre obras, vs Meta/Orçamento

#### **4.2. Emissões CO₂ por Tipo de Equipamento**
- **Visualização:** Gráfico de barras empilhadas
- **Dados:** Emissões por tipo de equipamento
- **Filtros:** Obra específica ou todas, período temporal
- **Insight:** Qual tipo polui mais

#### **4.3. Evolução de Emissões ao Longo do Tempo**
- **Visualização:** Gráfico de linha
- **Dados:** Emissões acumuladas ao longo do tempo
- **Filtros:** Obra, máquina, tipo
- **Comparação:** Tendência, metas

#### **4.4. Emissões vs Horas Trabalhadas**
- **Visualização:** Gráfico de dispersão ou linha dupla
- **Dados:** Correlação entre horas e emissões
- **Filtros:** Obra, máquina, tipo
- **Insight:** Eficiência energética

---

### **5. GRÁFICOS DE RENDIMENTO E PRODUTIVIDADE** 📈

#### **5.1. Rendimento por Obra (€/h)**
- **Visualização:** Gráfico de barras ou linha
- **Dados:** Custo total / Horas totais = Rendimento
- **Filtros:** Período temporal
- **Comparação:** Entre obras, vs Meta

#### **5.2. Produtividade de Máquinas**
- **Visualização:** Gráfico de barras
- **Dados:** Horas trabalhadas / Custo = Produtividade
- **Filtros:** Obra, tipo, período
- **Comparação:** Máquina vs Média

#### **5.3. Análise de Rentabilidade**
- **Visualização:** Dashboard com múltiplos KPIs
- **Dados:**
  - Receitas (se disponível)
  - Custos
  - Margem
  - ROI
- **Filtros:** Obra, período
- **Comparação:** Planeado vs Real

### **6. GRÁFICOS DE MANUTENÇÃO E CONFIABILIDADE** 🔧 ⭐ KPIs Profissionais

#### **6.1. MTBF (Mean Time Between Failures)**
- **Visualização:** Gráfico de barras ou linha
- **Dados:** Tempo médio entre falhas/avarias
- **Filtros:** Máquina, tipo, obra, período
- **Comparação:** Máquina vs Média, vs Meta
- **Insight:** Indica confiabilidade do equipamento

#### **6.2. MTTR (Mean Time To Repair)**
- **Visualização:** Gráfico de barras ou linha
- **Dados:** Tempo médio para reparar após falha
- **Filtros:** Máquina, tipo, obra, período
- **Comparação:** Máquina vs Média, vs Meta
- **Insight:** Indica eficiência da manutenção

#### **6.3. OEE (Overall Equipment Effectiveness)**
- **Visualização:** Gráfico de barras ou gauge (medidor)
- **Dados:** Eficiência Global = Disponibilidade × Desempenho × Qualidade
- **Filtros:** Máquina, tipo, obra, período
- **Comparação:** Máquina vs Média, vs Meta (ex: 85%)
- **Insight:** Indica eficácia geral do equipamento
- **Breakdown:** Mostrar cada componente (Disponibilidade, Desempenho, Qualidade)

#### **6.4. Taxa de Disponibilidade**
- **Visualização:** Gráfico de barras ou linha
- **Dados:** % de tempo que máquina está disponível
- **Filtros:** Máquina, tipo, obra, período
- **Comparação:** Máquina vs Média, vs Meta
- **Breakdown:** Por motivo de indisponibilidade

#### **6.5. Custo de Manutenção sobre Valor de Reposição (CPMV)**
- **Visualização:** Gráfico de barras
- **Dados:** (Custo manutenção / Valor reposição) × 100
- **Filtros:** Máquina, tipo, período
- **Comparação:** Máquina vs Média
- **Insight:** Indica se vale a pena manter ou substituir
- **Regra:** Se CPMV > 50%, considerar substituição

---

## ⏰ FILTROS TEMPORAIS

### **Opções de Período:**

#### **1. Período Único:**
- **Hoje** - Dados do dia atual
- **Esta Semana** - Últimos 7 dias
- **Este Mês** - Mês atual
- **Este Trimestre** - Trimestre atual
- **Este Ano** - Ano atual

#### **2. Período Personalizado:**
- **Últimos X Dias** - Escolher número de dias (ex: últimos 30 dias)
- **Últimas X Semanas** - Escolher número de semanas
- **Últimos X Meses** - Escolher número de meses
- **Últimos X Anos** - Escolher número de anos

#### **3. Período Específico:**
- **Data Início - Data Fim** - Escolher intervalo específico
- **Mês Específico** - Escolher mês/ano (ex: Dezembro 2024)
- **Ano Específico** - Escolher ano (ex: 2024)

#### **4. Comparação Temporal:**
- **Comparar Períodos** - Ex: Dezembro 2024 vs Dezembro 2023
- **Ano vs Ano** - Comparar anos completos
- **Mês vs Mês** - Comparar meses

### **Agregação de Dados:**

- **Por Dia** - Dados agregados diariamente
- **Por Semana** - Dados agregados semanalmente
- **Por Mês** - Dados agregados mensalmente
- **Por Trimestre** - Dados agregados trimestralmente
- **Por Ano** - Dados agregados anualmente

---

## 🎨 TIPOS DE VISUALIZAÇÃO

### **1. Gráficos de Linha**
- **Uso:** Evolução temporal, tendências
- **Exemplos:** Emissões ao longo do tempo, custos acumulados

### **2. Gráficos de Barras**
- **Uso:** Comparações, distribuições
- **Exemplos:** Custos por obra, horas por tipo

### **3. Gráficos de Barras Empilhadas**
- **Uso:** Breakdown de dados
- **Exemplos:** Custos por obra (breakdown por máquina)

### **4. Gráficos de Área**
- **Uso:** Dados acumulados, volume
- **Exemplos:** Horas trabalhadas acumuladas

### **5. Gráficos de Pizza**
- **Uso:** Distribuições percentuais
- **Exemplos:** % de custos por tipo, % de máquinas por obra

### **6. Gráficos de Dispersão**
- **Uso:** Correlações, relações
- **Exemplos:** Emissões vs Horas, Custo vs Utilização

### **7. Dashboards (Múltiplos Gráficos)**
- **Uso:** Visão geral, KPIs
- **Exemplos:** Dashboard de obra, dashboard de máquina

---

## 📊 KPIs PRINCIPAIS (Alinhados com o Setor)

### **Por Obra:**
1. **Total de Horas Trabalhadas**
2. **Custo Total (€)**
3. **Emissões CO₂ Totais (kg)**
4. **Rendimento (€/h)** - Custo Total / Horas Totais
5. **Número de Máquinas Utilizadas**
6. **Número de Sessões**
7. **Custo Médio por Hora**
8. **Emissões por Hora (kg/h)**
9. **Taxa de Disponibilidade (%)** - Tempo disponível / Tempo total
10. **Tempo de Inatividade (Downtime)** - Horas paradas

### **Por Máquina:**
1. **Horas Totais**
2. **Custo Total (€)**
3. **Emissões CO₂ (kg)**
4. **Taxa de Disponibilidade (%)** - ⭐ KPI Profissional do Setor
   - Tempo disponível / Tempo total
   - Indica % de tempo que máquina está operacional
5. **% de Utilização (Uptime)** - Horas trabalhadas / Horas disponíveis
6. **Custo por Hora (€/h)**
7. **Número de Sessões**
8. **Horas desde Última Manutenção**
9. **Rendimento (€/h)**
10. **MTBF (Mean Time Between Failures)** - ⭐ KPI Profissional do Setor
    - Tempo médio entre falhas/avarias
    - Indica confiabilidade do equipamento
11. **MTTR (Mean Time To Repair)** - ⭐ KPI Profissional do Setor
    - Tempo médio para reparar após falha
    - Indica eficiência da manutenção
12. **Tempo de Inatividade (Downtime)** - Horas paradas
13. **OEE (Overall Equipment Effectiveness)** - ⭐ KPI Profissional do Setor
    - Eficiência Global dos Equipamentos
    - Fórmula: Disponibilidade × Desempenho × Qualidade
    - Indica eficácia geral do equipamento

### **Por Tipo de Equipamento:**
1. **Total de Horas por Tipo**
2. **Custo Total por Tipo (€)**
3. **Emissões por Tipo (kg)**
4. **Número de Máquinas do Tipo**
5. **Rendimento Médio por Tipo (€/h)**
6. **% de Participação nos Custos Totais**
7. **Taxa de Disponibilidade Média (%)** - Média do tipo
8. **MTBF Médio** - Tempo médio entre falhas do tipo
9. **MTTR Médio** - Tempo médio de reparo do tipo
10. **OEE Médio** - Eficiência média do tipo

### **KPIs de Manutenção (Profissionais):**
1. **Custo de Manutenção sobre Valor de Reposição (CPMV)** - ⭐ KPI Profissional
   - Custo manutenção / Valor de reposição × 100
   - Indica se vale a pena manter ou substituir
2. **Taxa de Falhas** - Número de falhas / Horas totais
3. **Custo de Manutenção por Hora** - Custo total manutenção / Horas totais
4. **Frequência de Manutenções** - Número de manutenções / Período

---

## 🔍 FILTROS E SELEÇÕES

### **Filtros Disponíveis:**

1. **Obra:**
   - Todas as Obras
   - Obra Específica
   - Múltiplas Obras (comparação)

2. **Máquina:**
   - Todas as Máquinas
   - Máquina Específica
   - Múltiplas Máquinas (comparação)

3. **Tipo de Equipamento:**
   - Todos os Tipos
   - Tipo Específico
   - Múltiplos Tipos (comparação)

4. **Período Temporal:**
   - Ver secção "Filtros Temporais" acima

5. **Status:**
   - Todas
   - Apenas Ativas
   - Apenas em Manutenção

---

## 🎯 CASOS DE USO

### **Caso 1: Análise de Obra Específica**
1. Selecionar obra: "Obra Porto 2025"
2. Selecionar período: "Este Ano"
3. Ver gráficos:
   - Emissões CO₂ ao longo do ano
   - Custos por mês
   - Horas trabalhadas por tipo de equipamento
   - Rendimento mensal

### **Caso 2: Comparação entre Obras**
1. Selecionar múltiplas obras: "Obra Porto" + "Obra Lisboa"
2. Selecionar período: "Últimos 6 Meses"
3. Ver gráficos comparativos:
   - Emissões: Obra Porto vs Obra Lisboa
   - Custos: Comparação lado a lado
   - Rendimento: Qual obra é mais eficiente

### **Caso 3: Análise de Máquina Específica**
1. Selecionar máquina: "ESC-01"
2. Selecionar período: "Último Ano"
3. Ver gráficos:
   - Horas trabalhadas por mês
   - Custos acumulados
   - Emissões por mês
   - Sessões de trabalho

### **Caso 4: Análise por Tipo de Equipamento**
1. Selecionar tipo: "Escavadoras"
2. Selecionar obra: "Todas" ou "Obra Porto"
3. Selecionar período: "Este Ano"
4. Ver gráficos:
   - Total de horas de todas as escavadoras
   - Custo total das escavadoras
   - Rendimento médio das escavadoras

### **Caso 5: Análise de Emissões**
1. Selecionar: "Todas as Obras"
2. Selecionar período: "Últimos 2 Anos"
3. Ver gráficos:
   - Evolução de emissões ao longo do tempo
   - Emissões por tipo de equipamento
   - Comparação ano vs ano

---

## 🎨 INTERFACE DE GRÁFICOS

### **Página: Análises e Gráficos**

```
┌─────────────────────────────────────────────────────────┐
│  📊 ANÁLISES E GRÁFICOS                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔍 FILTROS:                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Obra: [Todas ▼]                                 │   │
│  │ Máquina: [Todas ▼]                              │   │
│  │ Tipo: [Todos ▼]                                  │   │
│  │ Período: [Este Ano ▼]                           │   │
│  │ Agregação: [Por Mês ▼]                          │   │
│  │ [Aplicar Filtros] [Limpar]                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📈 GRÁFICOS DISPONÍVEIS:                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [ ] Emissões CO₂ por Obra                      │   │
│  │ [ ] Custos por Obra                            │   │
│  │ [ ] Horas de Trabalho por Obra                 │   │
│  │ [ ] Rendimento por Obra                        │   │
│  │ [ ] Desempenho de Máquina                      │   │
│  │ [ ] Desempenho por Tipo                        │   │
│  │ [ ] Evolução de Emissões                       │   │
│  │ [ ] Análise de Rentabilidade                   │   │
│  │                                                 │   │
│  │ [GERAR GRÁFICOS]                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📊 GRÁFICOS GERADOS:                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🌍 Emissões CO₂ por Obra (Este Ano)            │   │
│  │ [Gráfico de Barras]                             │   │
│  │ [Exportar] [Partilhar]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 💰 Custos por Obra (Este Ano)                  │   │
│  │ [Gráfico de Barras Empilhadas]                  │   │
│  │ [Exportar] [Partilhar]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar componente `AnalyticsView.jsx` (página principal)
- [ ] Criar componente `AnalyticsFilters.jsx` (filtros)
- [ ] Criar componente `ChartSelector.jsx` (seleção de gráficos)
- [ ] Criar componente `EmissionsChart.jsx` (emissões)
- [ ] Criar componente `CostsChart.jsx` (custos)
- [ ] Criar componente `HoursChart.jsx` (horas)
- [ ] Criar componente `ProductivityChart.jsx` (rendimento)
- [ ] Criar componente `MachinePerformanceChart.jsx` (máquina)
- [ ] Criar componente `TypePerformanceChart.jsx` (tipo)
- [ ] Criar função `aggregateDataByPeriod()` (agregação temporal)
- [ ] Criar função `filterDataByWork()` (filtro por obra)
- [ ] Criar função `filterDataByMachine()` (filtro por máquina)
- [ ] Criar função `filterDataByType()` (filtro por tipo)
- [ ] Criar função `calculateKPIs()` (cálculo de KPIs)
- [ ] Integrar Recharts (biblioteca de gráficos)
- [ ] Implementar exportação de gráficos (PNG, PDF)
- [ ] Testar filtros temporais (dia, semana, mês, ano)
- [ ] Testar comparações (múltiplas obras, máquinas, tipos)
- [ ] Testar agregação de dados
- [ ] Otimizar performance (queries Firestore eficientes)

---

## 💡 MELHORIAS FUTURAS

1. **Gráficos Interativos:**
   - Zoom e pan
   - Tooltips detalhados
   - Click para ver detalhes

2. **Exportação:**
   - PNG (imagem)
   - PDF (relatório)
   - Excel (dados)

3. **Partilha:**
   - Link partilhável
   - Email automático
   - Agendamento de relatórios

4. **Alertas:**
   - Notificações quando KPIs ultrapassam limites
   - Alertas de tendências

5. **Previsões:**
   - Projeções baseadas em dados históricos
   - Machine Learning (futuro)

---

**Última atualização:** 07 Dezembro 2025

