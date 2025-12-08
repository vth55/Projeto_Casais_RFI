# 💾 ARQUITETURA DE DADOS - CASAIS FLEET INTELLIGENCE

> **Data:** 07 Dezembro 2025  
> **Status:** ✅ Estrutura Completa Definida  
> **Plataforma:** Firebase Firestore (Cloud Database)

---

## 🎯 ONDE SÃO GUARDADOS OS DADOS?

### **Resposta Curta:**
**Firebase Firestore** - Base de dados NoSQL na cloud (Google Cloud Platform)

### **Resposta Detalhada:**
- **Plataforma:** Firebase (Google)
- **Tipo:** NoSQL Database (documentos)
- **Localização:** Cloud (servidores Google)
- **Acesso:** Via Internet (HTTPS)
- **Backup:** Automático (Google)
- **Escalabilidade:** Automática (cresce conforme necessário)

---

## 📂 ESTRUTURA COMPLETA DO FIRESTORE

### **Caminho Base:**
```
artifacts/
└── casais-rfid/
    └── public/
        └── data/
```

### **Collections (Coleções de Dados):**

```
artifacts/casais-rfid/public/data/
│
├── 📋 operators/                    (Operadores/Cartões RFID)
│   └── {cardId}/
│       ├── name: string
│       ├── email: string              ← NOVO (para validações)
│       └── registeredAt: timestamp
│
├── 🚜 machines/                     (Máquinas/Equipamentos)
│   └── {machineId}/
│       ├── name: string
│       ├── displayName: string        ← NOVO
│       ├── category: {                ← NOVO (Tipo de Equipamento)
│       │   id: string
│       │   name: string
│       │   code: string
│       │ }
│       ├── location: {                ← NOVO (Obra/Estaleiro)
│       │   workId: string
│       │   workName: string
│       │   gps: { lat, lng }
│       │   lastUpdated: timestamp
│       │   updatedBy: string
│       │ }
│       ├── status: "ACTIVE" | "IDLE" | "MAINTENANCE" | "IN_TRANSIT"
│       ├── totalHours: number
│       ├── consumptionRate: number    (L/h)
│       ├── co2Factor: number          (kg CO₂ por litro)
│       ├── currentTariff: {           ← NOVO (Custo Horário)
│       │   id: string
│       │   type: "MACHINE_ONLY" | "MACHINE_AND_OPERATOR"
│       │   machineCostPerHour: number
│       │   operatorCostPerHour: number
│       │   totalCostPerHour: number
│       │   validFrom: timestamp
│       │   validUntil: timestamp | null
│       │ }
│       ├── tariffHistory: []          ← NOVO (Histórico de custos)
│       ├── alerts: []                 ← NOVO (Alertas configuráveis)
│       │   └── {
│       │       name: "ALERTA_ATENCAO" | "ALERTA_CRITICO"
│       │       hours: number
│       │       type: "WARNING" | "CRITICAL"
│       │       action: "NOTIFY" | "AUTO_CLOSE"
│       │   }
│       ├── maintenanceThresholdHours: number
│       ├── partialHours: number       ← NOVO (Horas desde última manutenção)
│       ├── createdAt: timestamp
│       ├── createdBy: string
│       ├── lastModified: timestamp
│       └── lastModifiedBy: string
│
├── 📂 machine_categories/              ← NOVO (Tipos de Equipamento)
│   └── {categoryId}/
│       ├── id: string
│       ├── name: string
│       ├── code: string
│       ├── description: string
│       ├── defaultConsumptionRate: number
│       ├── defaultCo2Factor: number
│       ├── namingPattern: string
│       ├── autoNumbering: boolean
│       ├── nextNumber: number
│       ├── isActive: boolean
│       ├── machineCount: number
│       ├── createdAt: timestamp
│       └── createdBy: string
│
├── 🏗️ works/                         ← NOVO (Obras/Estaleiros)
│   └── {workId}/
│       ├── id: string
│       ├── name: string
│       ├── location: {
│       │   address: string
│       │   gps: { latitude, longitude }
│       │ }
│       ├── status: "ACTIVE" | "COMPLETED" | "SUSPENDED"
│       ├── startDate: timestamp
│       ├── endDate: timestamp | null
│       └── createdAt: timestamp
│
├── ⏱️ sessions/                      (Sessões de Trabalho)
│   └── {sessionId}/
│       ├── cardId: string
│       ├── machineId: string
│       ├── startTime: timestamp
│       ├── endTime: timestamp | null
│       ├── durationHours: number
│       ├── status: "OPEN" | "CLOSED"
│       ├── closeReason: string        ← NOVO
│       │   "MANUAL" | "AUTO_CLOSE" | "MACHINE_SWITCH" | "OPERATOR_SWITCH"
│       ├── autoClosed: boolean        ← NOVO
│       ├── originalStartTime: timestamp      ← NOVO (Histórico)
│       ├── originalEndTime: timestamp        ← NOVO
│       ├── originalDurationHours: number     ← NOVO
│       ├── correctedStartTime: timestamp | null  ← NOVO
│       ├── correctedEndTime: timestamp | null   ← NOVO
│       ├── correctedDurationHours: number | null ← NOVO
│       ├── wasCorrected: boolean      ← NOVO
│       ├── correctedAt: timestamp | null
│       ├── correctedBy: string | null
│       ├── tariff: {                  ← NOVO (Custo Horário usado)
│       │   id: string
│       │   type: string
│       │   machineCostPerHour: number
│       │   operatorCostPerHour: number
│       │   totalCostPerHour: number
│       │   snapshot: {
│       │       validFrom: timestamp
│       │       validUntil: timestamp | null
│       │   }
│       │ }
│       ├── costs: {                   ← NOVO (Custos calculados)
│       │   hours: number
│       │   costPerHour: number
│       │   totalCost: number
│       │   breakdown: {
│       │       machineCost: number
│       │       operatorCost: number
│       │   }
│       │ }
│       └── workId: string             ← NOVO (Obra onde aconteceu)
│
├── ⚠️ alerts/                        ← NOVO (Alertas e Validações)
│   └── {alertId}/
│       ├── id: string
│       ├── alertName: "ALERTA_ATENCAO" | "ALERTA_CRITICO"
│       ├── machineId: string
│       ├── operatorId: string
│       ├── sessionId: string
│       ├── type: "AUTO_CLOSE" | "MANUAL_CLOSE_AFTER_ALERT"
│       ├── status: "PENDING" | "RESOLVED" | "EXPIRED"
│       ├── createdAt: timestamp
│       ├── resolvedAt: timestamp | null
│       ├── validationToken: string    (Token único para link)
│       ├── validationLink: string
│       ├── originalHours: number
│       ├── correctedHours: number | null
│       └── operatorEmail: string
│
├── 🔧 maintenance_history/            ← NOVO (Histórico de Manutenções)
│   └── {maintenanceId}/
│       ├── id: string
│       ├── machineId: string
│       ├── type: "PREVENTIVE" | "CORRECTIVE"
│       ├── date: timestamp
│       ├── hoursReset: number
│       ├── partsReplaced: []           (Lista de peças)
│       ├── cost: number | null
│       ├── performedBy: "INTERNAL" | "EXTERNAL"
│       ├── photos: []                 (URLs das fotos)
│       ├── notes: string
│       └── createdAt: timestamp
│
├── 🚨 breakdowns/                     ← NOVO (Avarias Reportadas)
│   └── {breakdownId}/
│       ├── id: string
│       ├── machineId: string
│       ├── reportedBy: string         (Operador)
│       ├── date: timestamp
│       ├── shortDescription: string
│       ├── longDescription: string
│       ├── urgency: 1 | 2 | 3 | 4     (Escala de gravidade)
│       ├── status: "PENDING" | "RESOLVED"
│       ├── photos: []                 (URLs das fotos)
│       ├── resolution: string | null
│       └── createdAt: timestamp
│
├── 📍 location_history/               ← NOVO (Histórico de Localizações)
│   └── {movementId}/
│       ├── id: string
│       ├── machineId: string
│       ├── fromWorkId: string | null
│       ├── toWorkId: string
│       ├── date: timestamp
│       ├── type: "RFID" | "MANUAL"
│       ├── changedBy: string | null    (Se manual)
│       └── gps: { lat, lng } | null
│
├── 🔐 unregistered_scans/             (Logs de Segurança)
│   └── {cardId}/
│       ├── id: string
│       ├── machineId: string
│       ├── timestamp: timestamp
│       ├── type: "access_attempt" | "registration_scan"
│       └── resolved: boolean
│
├── 📥 scan_buffer/                    (Buffer para Auto-fill)
│   └── latest/
│       ├── cardId: string
│       ├── machineId: string
│       └── timestamp: timestamp
│
└── 👥 users/                          ← NOVO (Utilizadores do Sistema)
    └── {userId}/
        ├── id: string
        ├── email: string
        ├── name: string
        ├── role: "OPERATOR" | "FLEET_MANAGER" | "FINANCIAL_MANAGER"
        ├── createdAt: timestamp
        └── lastLogin: timestamp
```

---

## 💰 CONSIDERAÇÕES DE CUSTOS

### **Firebase Firestore (Plano Gratuito):**
- ✅ **50,000 leituras/dia** (gratuito)
- ✅ **20,000 escritas/dia** (gratuito)
- ✅ **20,000 eliminações/dia** (gratuito)
- ✅ **1 GB de armazenamento** (gratuito)

### **Firebase Firestore (Plano Pago - Pay as you go):**
- 💰 **$0.06 por 100,000 leituras**
- 💰 **$0.18 por 100,000 escritas**
- 💰 **$0.02 por 100,000 eliminações**
- 💰 **$0.18 por GB de armazenamento/mês**

### **Estimativa para Protótipo:**
- **Leituras:** ~10,000/dia (bem dentro do gratuito)
- **Escritas:** ~5,000/dia (bem dentro do gratuito)
- **Armazenamento:** ~100 MB (bem dentro do gratuito)

**Conclusão:** Para protótipo, plano gratuito é suficiente! ✅

### **Estimativa para Produção (Casais):**
- **Leituras:** ~50,000-100,000/dia (pode precisar plano pago)
- **Escritas:** ~20,000-50,000/dia (pode precisar plano pago)
- **Armazenamento:** ~5-10 GB/ano (pode precisar plano pago)

**Custo Estimado:** ~$50-150/mês (depende do uso)

---

## 🔒 SEGURANÇA E BACKUP

### **Backup Automático:**
- ✅ Firebase faz backup automático
- ✅ Dados replicados em múltiplos servidores
- ✅ 99.999% de disponibilidade (SLA Google)

### **Segurança:**
- ✅ Dados encriptados em trânsito (HTTPS)
- ✅ Dados encriptados em repouso
- ✅ Regras de segurança Firestore (controlo de acesso)
- ✅ Autenticação Firebase Auth

### **Regras de Segurança (Firestore Rules):**
```javascript
// Exemplo de regras (a implementar)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Operadores: só ler seus próprios dados
    match /operators/{cardId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'FLEET_MANAGER';
    }
    
    // Máquinas: todos podem ler, só gestores podem escrever
    match /machines/{machineId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'FLEET_MANAGER';
    }
    
    // Sessões: todos podem ler, sistema escreve
    match /sessions/{sessionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // Cloud Function escreve
    }
  }
}
```

---

## 📊 ESTIMATIVA DE VOLUME DE DADOS

### **Por Máquina (por ano):**
- **Sessões:** ~500-1000 sessões/ano
- **Tamanho por sessão:** ~2 KB
- **Total por máquina:** ~1-2 MB/ano

### **Por Obra (por ano):**
- **Máquinas:** 10-50 máquinas
- **Sessões:** ~5,000-50,000 sessões/ano
- **Total por obra:** ~10-100 MB/ano

### **Sistema Completo (100 máquinas, 10 obras, 1 ano):**
- **Sessões:** ~50,000-100,000 sessões
- **Armazenamento:** ~100-200 MB
- **Muito abaixo do limite gratuito!** ✅

---

## 🔄 SINCRONIZAÇÃO E OFFLINE

### **PWA Offline:**
- ✅ Service Worker cacheia dados
- ✅ Funciona offline (modo leitura)
- ✅ Sincroniza quando volta conexão

### **ESP32 Offline:**
- ✅ Guarda dados localmente se WiFi falhar
- ✅ Sincroniza quando volta conexão
- ✅ Não perde dados

---

## 🎯 VANTAGENS DO FIRESTORE

### **✅ Escalabilidade:**
- Cresce automaticamente
- Sem limite de dados (paga o que usa)
- Performance constante

### **✅ Real-time:**
- Dados atualizados em tempo real
- Sem precisar refrescar
- Sincronização automática

### **✅ Simplicidade:**
- Sem servidor próprio
- Sem gestão de base de dados
- Google gere tudo

### **✅ Segurança:**
- Encriptação automática
- Backup automático
- Regras de acesso flexíveis

---

## ⚠️ LIMITAÇÕES E CONSIDERAÇÕES

### **Limitações:**
- ❌ Não é SQL (não há JOINs complexos)
- ❌ Queries limitadas (máx. 10 filtros)
- ❌ Custo pode aumentar com escala

### **Soluções:**
- ✅ Estrutura bem organizada (evita queries complexas)
- ✅ Agregações no frontend (se necessário)
- ✅ Monitorizar custos

---

## 🔄 ALTERNATIVAS (Se Necessário)

### **Opção 1: Firebase Firestore** ✅ (Atual)
- **Vantagens:** Real-time, escalável, simples
- **Desvantagens:** Custo pode aumentar
- **Recomendação:** Manter para protótipo e produção

### **Opção 2: MongoDB Atlas**
- **Vantagens:** Mais flexível, SQL-like queries
- **Desvantagens:** Mais complexo, precisa servidor
- **Recomendação:** Só se Firestore não servir

### **Opção 3: PostgreSQL (Cloud)**
- **Vantagens:** SQL completo, relacional
- **Desvantagens:** Mais complexo, precisa servidor
- **Recomendação:** Só se precisar de queries muito complexas

### **Opção 4: Híbrido (Firestore + Cloud Storage)**
- **Firestore:** Dados estruturados
- **Cloud Storage:** Fotos, ficheiros grandes
- **Recomendação:** Usar para fotos de manutenções/avarias

---

## ✅ RECOMENDAÇÃO FINAL

### **Para Protótipo:**
✅ **Firebase Firestore** (Plano Gratuito)
- Suficiente para desenvolvimento
- Sem custos
- Fácil de usar

### **Para Produção (Casais):**
✅ **Firebase Firestore** (Plano Pago)
- Escalável
- Confiável
- Custo razoável (~$50-150/mês)
- **OU** MongoDB Atlas se precisar de mais flexibilidade

### **Para Fotos/Ficheiros:**
✅ **Firebase Cloud Storage**
- Armazenar fotos de manutenções
- Armazenar fotos de avarias
- 5 GB gratuito, depois $0.026/GB/mês

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Verificar estrutura Firestore atual
- [ ] Criar collections novas (machine_categories, works, alerts, etc.)
- [ ] Migrar dados existentes (se necessário)
- [ ] Configurar regras de segurança Firestore
- [ ] Configurar Firebase Cloud Storage (para fotos)
- [ ] Testar queries de todas as novas features
- [ ] Monitorizar custos (Firebase Console)
- [ ] Configurar alertas de custo (se necessário)

---

**Última atualização:** 07 Dezembro 2025

