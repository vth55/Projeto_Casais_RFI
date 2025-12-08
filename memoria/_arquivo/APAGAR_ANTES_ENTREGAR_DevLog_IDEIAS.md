# 📋 PARKING LOT - IDEIAS NÃO PROCESSADAS

> **Registo de ideias soltas para processar depois**

---

## 🎯 SISTEMA DE CAPTURA DE IDEIAS SOLTAS

**Como Funciona:**
1. Vitor manda ideia solta 
2. IA regista em "Parking Lot → Ideias Não Processadas"
3. Periodicamente, IA organiza ideias em categorias
4. revisamos e decidimos prioridades

**Vantagens:**
- Zero fricção (Vitor não organiza)
- Nada se perde
- Decisões ponderadas 
- Backlog sempre atualizado


## 💡 IDEIAS COMPLEMENTARES (ACEITES PELO VITOR)
  
**Status:** ✅ ACEITES   
**Fonte:** Sugestões da IA baseadas no que já foi discutido

### **1. Sistema de Notificações Push** 📱
**Prioridade:** Média  
**Complexidade:** PRO

**Descrição:**
- Notificações no PWA quando há alertas
- Notificações para gestores (avarias, manutenções críticas)
- Notificações para operadores (validações pendentes)
- Notificações em tempo real (sem precisar refrescar)

**Quando Implementar:** Fase 6 ou 7

---

### **2. Dashboard Executivo (C-Level)** 📊
**Prioridade:** Alta  
**Complexidade:** Baixa-Média

**Descrição:**
- Visão de alto nível para direção
- KPIs agregados (todas as obras)
- Gráficos de tendências
- Alertas críticos apenas
- Métricas estratégicas (ROI, eficiência global)

**Quando Implementar:** Fase 5 ou 6

---

### **3. Sistema de Backup/Offline** 💾
**Prioridade:** Média-Alta  
**Complexidade:** Alta

**Descrição:**
- ESP32 guarda dados offline se WiFi falhar
- Sincronização automática quando volta conexão
- PWA funciona offline (dados em cache)
- Service Worker para cache inteligente

**Quando Implementar:** Fase 5 ou depois

---

### **4. Integração com Sistemas Externos** 🔗
**Prioridade:** Baixa (depende de necessidades Casais)  
**Complexidade:** Alta

**Descrição:**
- Export para SAP (se Casais usar)
- API REST para integração com outros sistemas
- Webhooks para notificações externas
- Formatos padrão (JSON, XML)

**Quando Implementar:** Fase 7 ou depois

---

### **5. Previsões e Análise Preditiva** 🔮
**Prioridade:** Baixa (nice-to-have)  
**Complexidade:** Muito Alta

**Descrição:**
- Previsão de custos futuros (baseado em histórico)
- Previsão de manutenções necessárias
- Análise de tendências
- Machine Learning (futuro)

**Quando Implementar:** Após apresentação (futuro)

---

### **6. Mapa Interativo de Localização** 🗺️
**Prioridade:** Alta  
**Complexidade:** Média

**Descrição:**
- Mostrar localização de máquinas em mapa
- Agrupar por obra/estaleiro
- Filtros por tipo de máquina
- Visualização de rotas

**Quando Implementar:** Fase 5 ou 6

---

### **7. Checklist Diário para Operadores** ✅
**Prioridade:** Média  
**Complexidade:** Baixa

**Descrição:**
- Checklist digital pré-utilização
- Verificações de segurança
- Upload de fotos (se necessário)
- Assinatura digital

**Quando Implementar:** Fase 6 ou 7

---

### **8. Gamificação (Longo Prazo)** 🎮
**Prioridade:** Baixa (nice-to-have)  
**Complexidade:** Média

**Descrição:**
- Pontos por eficiência
- Rankings (opcional)
- Badges por conquistas
- Engajamento de operadores

**Quando Implementar:** Após apresentação (futuro)

---

## 📊 VISÃO ORIGINAL (Recuperada)

**Data de Recuperação:** 07 Dezembro 2025

### **VISÃO GERAL:**
**Sistema Full-Stack de Gestão de Frota e Manutenção Preditiva para Estaleiros**

**Diferencial Competitivo:**
- Solução híbrida (CAN Bus simulado + RFID low-cost)
- Foco em **Qualidade de Dados** (não só coleta)
- **Gestão Financeira** integrada (não só rastreio)
- **Correção Automática de Erros** (human-in-the-loop)

**Pilares Principais:**
1. Rastreabilidade
2. Gestão Financeira (Custos)
3. Manutenção Digital
4. **Qualidade de Dados com Validação Humana** ⭐

---

### **MÓDULOS PLANEADOS (6 Módulos):**

#### **MÓDULO 1: Gestão Operacional (Dashboard)**
- RF 1.1 - Monitorização em Tempo Real
  - Estado máquina (Ativa/Inativa) ✅ IMPLEMENTADO
  - Operador atual ✅ IMPLEMENTADO
- RF 1.2 - **Centros de Custo (Obras)** ❌ NÃO IMPLEMENTADO
  - Associar máquinas a obras específicas
  - Rastreio por projeto

#### **MÓDULO 2: Manutenção Avançada**
- RF 2.1 - **Duplo Contador** ❌ PARCIALMENTE IMPLEMENTADO
  - Horas Totais (vida útil) ✅ Temos
  - **Horas Parciais (desde última manutenção)** ❌ Falta
- RF 2.2 - Alertas Preditivos ✅ IMPLEMENTADO
  - Baseado em limites de horas
- RF 2.3 - **Histórico Digital de Manutenção** ❌ NÃO IMPLEMENTADO
  - Registo técnico com reset de horas
  - Upload de fotos
  - Lista de peças substituídas

#### **MÓDULO 3: Inteligência Financeira** ⭐⭐⭐
- RF 3.1 - **Tarifário (€/h por máquina)** ❌ NÃO IMPLEMENTADO
  - Custo hora configurável
- RF 3.2 - **Rentabilidade** ❌ NÃO IMPLEMENTADO
  - Cálculo automático de custos por sessão
  - Agregação por Obra
  - Análise de rentabilidade

#### **MÓDULO 4: Rastreabilidade e Auditoria**
- RF 4.1 - Exportação CSV/Excel ✅ IMPLEMENTADO
  - Detalhado para auditoria

#### **MÓDULO 5: Hardware (Protótipo RFID)**
- RF 5.1 - Autonomia Wi-Fi ✅ IMPLEMENTADO (ESP32)
- RF 5.2 - Híbrido ✅ PREPARADO (telemetryParser.js)
  - Dados simulados para máquinas high-end

#### **MÓDULO 6: Qualidade de Dados (INOVAÇÃO!)** ⭐⭐⭐
**Esta é a feature KILLER que diferencia o projeto!**

- RF 6.1 - **Monitorização de Fadiga (Soft Alert)** ❌ NÃO IMPLEMENTADO
  - Sistema monitoriza duração em tempo real
  - Se sessão > X horas (ex: 5h ou 8h contínuas)
  - Gera alerta no Dashboard para Gestor verificar
  - Sessão permanece aberta (só aviso)
  
- RF 6.2 - **Timeout Automático (Hard Stop)** ❌ NÃO IMPLEMENTADO
  - Se sessão > limite máximo (ex: 14h)
  - Sistema assume "Esquecimento"
  - Encerra sessão automaticamente
  
- RF 6.3 - **Fluxo de Validação Humana** ❌ NÃO IMPLEMENTADO
  - Após auto-stop, envia email ao Operador
  - Email com link para Interface de Correção
  - Operador confirma ("Sim, trabalhei 14h") OU corrige ("Saí às 18:00")
  - Sistema atualiza BD com hora correta
  - **EVITA inflação de custos por erros**

---

### **PERFIS DE ACESSO (3 Níveis):**
❌ NÃO IMPLEMENTADO (todos têm acesso total agora)

1. **Operador:**
   - Regista ponto
   - Recebe emails de validação
   
2. **Gestor de Frota (Admin):**
   - Gestão total
   - Valida correções de horário
   
3. **Gestor Financeiro:**
   - Apenas custos e relatórios
   - Sem acesso a operações

---

## 🎯 PLANO DE AÇÃO PROPOSTO

### **FASE 1: Features Financeiras (CRÍTICO!)** 
**Tempo estimado: 4-6 horas**

1. Centros de Custo (Obras)
   - Collection `obras` no Firestore
   - Dropdown em Configuração
   - Associar máquina → obra
   
2. Tarifário (€/h)
   - Campo `costPerHour` em máquinas
   - Input em Configuração (ao lado de consumo)
   
3. Rentabilidade
   - Calcular `custo = durationHours × costPerHour`
   - StatCard com "Custos do Período"
   - Tabela de custos por obra
   - Export CSV com custos

**Impacto:** Projeto salta de "protótipo tech" para "ferramenta de gestão real"

---

### **FASE 2: Sistema de Qualidade de Dados (DIFERENCIAL!)** 
**Tempo estimado: 6-8 horas**

1. Monitorização de Fadiga
   - Frontend calcula duração em tempo real
   - Alerta amarelo aos 5h (soft alert)
   - Alerta laranja aos 8h (atenção)
   
2. Timeout Automático
   - Cloud Function check a cada hora
   - Se sessão > 14h → auto-close
   - Marca como `autoStopped: true`
   
3. Interface de Correção
   - Email com link único (token)
   - Página de correção (`/validate/{token}`)
   - Operador escolhe hora real
   - Atualiza sessão retroativamente
   - Recalcula custos

**Impacto:** FEATURE KILLER - Nenhum concorrente tem isto!

---

### **FASE 3: Manutenção Avançada (Polimento)** 
**Tempo estimado: 3-4 horas**

1. Duplo Contador
   - `totalHours` (vida útil) ← já temos
   - `partialHours` (desde manutenção) ← adicionar
   
2. Histórico de Manutenção
   - Collection `maintenance_records`
   - Upload de fotos (Firebase Storage)
   - Lista de peças
   - Reset de `partialHours`

---



### **✅ O QUE JÁ TEMOS (Implementado):**

| Feature | Status | Qualidade |
|---------|--------|-----------|
| Monitorização tempo real | ✅ | Excelente |
| Gestão de Operadores | ✅ | Excelente |
| Scan-to-Register (auto-fill) | ✅ | Excelente |
| Manutenção preditiva básica | ✅ | Boa (1 contador) |
| Alertas de manutenção | ✅ | Excelente |
| Exportação CSV | ✅ | Excelente |
| LEDs físicos de feedback | ✅ | Excelente |
| PWA para tablets | ✅ | Boa |
| Filtros de data/BI básico | ✅ | Boa |
| Hardware RFID (Arduino/ESP32) | ✅ | Excelente |





### **❌ O QUE FALTA (Gap Crítico):**

#### **CRÍTICO (Impacto Alto):**
1. **Centros de Custo / Obras** 🔴
2. **Tarifário (€/h)** 🔴
3. **Rentabilidade / Custos** 🔴
4. **Sistema de Qualidade de Dados** 🔴🔴🔴

#### **IMPORTANTE (Impacto Médio):**
5. **Duplo Contador de Horas** 🟡
6. **Histórico Digital de Manutenção** 🟡
7. **Perfis de Acesso** 🟡

#### **OPCIONAL (Nice to have):**
8. **Gráficos avançados** ⚪
9. **Notificações push** ⚪
10. **Integração GPS real** ⚪

---

**Ver também:**
- [docs/ROADMAP_6_MESES.md](../docs/ROADMAP_6_MESES.md)
- [docs/SISTEMA_TARIFARIOS.md](../docs/SISTEMA_TARIFARIOS.md)
- [APAGAR_ANTES_ENTREGAR_DevLog_DECISOES.md](APAGAR_ANTES_ENTREGAR_DevLog_DECISOES.md)

