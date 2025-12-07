# 🛡️ Sistema de Controle de Uso - API Gemini

Este documento descreve o sistema implementado para controlar e monitorar o uso da API do Gemini, evitando custos inesperados.

## 📋 Visão Geral

O sistema inclui:
- ✅ **Rate Limiting**: Controle de requests por minuto/dia
- ✅ **Monitoramento de Tokens**: Rastreamento de uso de tokens
- ✅ **Cálculo de Custos**: Estimativa de custos em tempo real
- ✅ **Alertas Automáticos**: Avisos quando próximo dos limites
- ✅ **Endpoints de Monitoramento**: APIs para verificar uso

## 🏗️ Arquitetura

```
Backend_Cloud/functions/
├── utils/
│   ├── rateLimiter.js      # Controle de rate limiting
│   ├── geminiClient.js     # Wrapper seguro da API
│   └── costCalculator.js   # Cálculo de custos
├── examples/
│   └── geminiUsageExample.js  # Exemplos de uso
└── index.js                # Cloud Functions (inclui endpoints)
```

## 🚀 Configuração Inicial

### 1. Instalar Dependências

```bash
cd Backend_Cloud/functions
npm install
```

Isso instalará:
- `@google/generative-ai` - SDK oficial do Gemini

### 2. Configurar API Key

A API key já está configurada no arquivo `.env`:
```
GEMINI_API_KEY=AIzaSyBV-AGKOeiiyp_edXHMesNxIV-CJE2cCVs
```

Para usar em produção (Firebase Functions):
```bash
firebase functions:config:set gemini.api_key="sua_key_aqui"
```

## 📊 Limites Configurados

### Limites Padrão (Tier Gratuito)

| Métrica | Limite | Descrição |
|---------|--------|-----------|
| Requests/Minuto | 15 | Máximo de requests por minuto |
| Requests/Dia | 1.000 | Máximo de requests por dia |
| Tokens/Dia | 5.000.000 | Máximo de tokens por dia |
| Tokens/Request | 100.000 | Limite por request individual |

### Modelo Recomendado

- **Modelo**: `gemini-2.0-flash-exp`
- **Custo**: **GRATUITO** ✅
- **Uso**: Desenvolvimento e testes

## 💻 Como Usar

### Uso Básico

```javascript
const GeminiClient = require('./utils/geminiClient');

const client = new GeminiClient();

// Análise de texto
const resultado = await client.analyzeText('Texto para analisar');

// Code review
const review = await client.reviewCode('código aqui', 'javascript');

// Request customizado
const response = await client.generateContent('Seu prompt');
```

### Verificar Estatísticas

```javascript
const RateLimiter = require('./utils/rateLimiter');
const rateLimiter = new RateLimiter();

const stats = await rateLimiter.getUsageStats();
console.log(`Requests hoje: ${stats.requestsToday}`);
console.log(`Tokens hoje: ${stats.tokensToday}`);
```

### Verificar Alertas

```javascript
const warnings = await rateLimiter.checkWarnings();
if (warnings.warning) {
    console.warn('⚠️ Alertas:', warnings.alerts);
}
```

## 🌐 Endpoints de Monitoramento

Após deploy das Cloud Functions, você pode acessar:

### GET `/api/gemini/usage`

Retorna estatísticas completas de uso:

```json
{
  "usage": {
    "requestsToday": 45,
    "requestsThisMinute": 3,
    "tokensToday": 125000,
    "lastRequest": "2025-01-15T10:30:00Z",
    "limits": { ... },
    "usagePercent": {
      "requestsPerMinute": "20.0",
      "requestsPerDay": "4.5",
      "tokensPerDay": "2.5"
    }
  },
  "warnings": [],
  "hasWarnings": false,
  "costs": {
    "today": {
      "totalCost": "0.0000",
      "isFree": true
    },
    "monthlyProjection": {
      "monthlyProjection": "0.00",
      "isFree": true
    }
  }
}
```

### GET `/api/gemini/warnings`

Retorna apenas alertas de uso:

```json
{
  "hasWarnings": true,
  "alerts": [
    "⚠️ 85.0% do limite de requests/minuto usado"
  ],
  "stats": { ... }
}
```

## ⚠️ Alertas Automáticos

O sistema gera alertas quando:
- **> 80%** do limite de requests/minuto
- **> 80%** do limite de requests/dia
- **> 80%** do limite de tokens/dia

Os alertas aparecem:
- No console (logs)
- Nas respostas dos endpoints
- No objeto `warnings` retornado pelo `checkWarnings()`

## 💰 Cálculo de Custos

### Modelos Gratuitos

- `gemini-2.0-flash-exp`: **$0.00** (gratuito)

### Modelos Pagos (para referência)

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|----------------------|------------------------|
| gemini-1.5-pro | $1.25 | $5.00 |
| gemini-1.5-flash | $0.075 | $0.30 |

**Recomendação**: Use sempre `gemini-2.0-flash-exp` para desenvolvimento.

## 🔒 Segurança

### Proteções Implementadas

1. **Rate Limiting Automático**
   - Bloqueia requests quando limites são atingidos
   - Retorna erro claro quando bloqueado

2. **Monitoramento Contínuo**
   - Todas as chamadas são registradas
   - Métricas armazenadas no Firestore (privado)

3. **Alertas Preventivos**
   - Avisos antes de atingir limites
   - Permite ajustar uso antes de bloqueio

4. **Cálculo de Custos**
   - Estimativa em tempo real
   - Projeção mensal baseada no uso atual

## 📝 Exemplos Práticos

Ver arquivo `Backend_Cloud/functions/examples/geminiUsageExample.js` para exemplos completos.

## 🐛 Troubleshooting

### Erro: "Rate limit excedido"

**Causa**: Limite de requests atingido

**Solução**:
1. Aguarde alguns minutos
2. Verifique estatísticas: `GET /api/gemini/usage`
3. Se necessário, ajuste limites (cuidado com custos)

### Erro: "GEMINI_API_KEY não configurada"

**Causa**: API key não encontrada

**Solução**:
1. Verifique arquivo `.env` na raiz do projeto
2. Ou configure via Firebase: `firebase functions:config:set gemini.api_key="key"`

### Alertas constantes

**Causa**: Uso próximo dos limites

**Solução**:
1. Verifique se está usando modelo gratuito
2. Considere otimizar prompts (menos tokens)
3. Implemente cache para evitar requests repetidos

## 📚 Referências

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Gemini Pricing](https://ai.google.dev/pricing)
- [Firebase Functions](https://firebase.google.com/docs/functions)

## ✅ Checklist de Implementação

- [x] Rate limiter implementado
- [x] Gemini client com controles
- [x] Calculadora de custos
- [x] Endpoints de monitoramento
- [x] Documentação completa
- [x] Exemplos de uso
- [ ] Deploy das Cloud Functions (próximo passo)
- [ ] Configurar alertas no frontend (opcional)

## 🎯 Próximos Passos

1. **Deploy das Functions**:
   ```bash
   cd Backend_Cloud
   firebase deploy --only functions
   ```

2. **Testar Endpoints**:
   - Acessar `/api/gemini/usage` após deploy
   - Verificar se métricas estão sendo registradas

3. **Integrar no Frontend** (opcional):
   - Criar componente de monitoramento
   - Mostrar alertas quando necessário

---

**Última atualização**: 2025-01-15
**Status**: ✅ Implementado e pronto para uso

