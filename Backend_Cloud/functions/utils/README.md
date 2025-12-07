# Utilitários de Controle de Uso - API Gemini

Este diretório contém utilitários para controlar e monitorar o uso da API do Gemini, evitando custos inesperados.

## 📁 Arquivos

### `rateLimiter.js`
Controla rate limiting (requests por minuto/dia) e monitora uso de tokens.

**Funcionalidades:**
- ✅ Limite de requests por minuto (padrão: 15)
- ✅ Limite de requests por dia (padrão: 1000)
- ✅ Limite de tokens por dia (padrão: 5M)
- ✅ Armazenamento de métricas no Firestore
- ✅ Limpeza automática de dados antigos

### `geminiClient.js`
Wrapper seguro para a API do Gemini com controles integrados.

**Funcionalidades:**
- ✅ Verificação automática de limites antes de cada request
- ✅ Registro automático de uso
- ✅ Alertas quando próximo dos limites
- ✅ Métodos auxiliares: `analyzeText()`, `reviewCode()`
- ✅ Estimativa de tokens usados

### `costCalculator.js`
Calcula e projeta custos baseado no uso.

**Funcionalidades:**
- ✅ Cálculo de custo por request
- ✅ Cálculo de custo diário
- ✅ Projeção de custo mensal
- ✅ Suporte para múltiplos modelos (gratuito e pagos)

## 🚀 Uso Básico

### Exemplo 1: Usar Gemini Client

```javascript
const GeminiClient = require('./utils/geminiClient');

const client = new GeminiClient();

// Análise de texto
const result = await client.analyzeText('Texto para analisar', 'sentiment');

// Code review
const review = await client.reviewCode('function test() { ... }', 'javascript');

// Request customizado
const response = await client.generateContent('Seu prompt aqui');
```

### Exemplo 2: Verificar Estatísticas

```javascript
const RateLimiter = require('./utils/rateLimiter');
const rateLimiter = new RateLimiter();

// Obter estatísticas
const stats = await rateLimiter.getUsageStats();
console.log(`Requests hoje: ${stats.requestsToday}`);
console.log(`Tokens hoje: ${stats.tokensToday}`);

// Verificar alertas
const warnings = await rateLimiter.checkWarnings();
if (warnings.warning) {
    console.warn('⚠️ Alertas:', warnings.alerts);
}
```

### Exemplo 3: Calcular Custos

```javascript
const CostCalculator = require('./utils/costCalculator');
const calculator = new CostCalculator();

// Custo de um request
const cost = calculator.calculateRequestCost(1000, 500, 'gemini-2.0-flash-exp');
console.log(`Custo: $${cost}`);

// Projeção mensal
const projection = calculator.projectMonthlyCost(100000);
console.log(`Projeção mensal: $${projection.monthlyProjection}`);
```

## 📊 Endpoints de Monitoramento

Após deploy, você pode acessar:

- **GET** `/api/gemini/usage` - Estatísticas completas de uso
- **GET** `/api/gemini/warnings` - Alertas de uso

## ⚙️ Configuração

### Limites Padrão

Os limites padrão são conservadores para o tier gratuito:

```javascript
{
    requestsPerMinute: 15,      // 15 requests/minuto
    requestsPerDay: 1000,       // 1000 requests/dia
    tokensPerDay: 5000000,      // 5M tokens/dia
    tokensPerRequest: 100000   // Limite por request
}
```

### Personalizar Limites

```javascript
const customLimits = {
    requestsPerMinute: 30,
    requestsPerDay: 2000,
    tokensPerDay: 10000000
};

const rateLimiter = new RateLimiter(customLimits);
```

## 🔒 Segurança

- ✅ Rate limiting automático previne uso excessivo
- ✅ Alertas quando > 80% dos limites
- ✅ Bloqueio automático quando limites atingidos
- ✅ Métricas armazenadas no Firestore (privado)

## 📝 Notas Importantes

1. **Modelo Recomendado**: Use `gemini-2.0-flash-exp` (gratuito) para desenvolvimento
2. **Monitoramento**: Verifique estatísticas regularmente via endpoints
3. **Alertas**: Configure notificações quando alertas forem detectados
4. **Custos**: Modelos gratuitos têm custo $0, mas têm limites de uso

## 🐛 Troubleshooting

### Erro: "Rate limit excedido"
- Aguarde alguns minutos antes de tentar novamente
- Verifique estatísticas de uso
- Considere aumentar limites se necessário (cuidado com custos)

### Erro: "GEMINI_API_KEY não configurada"
- Configure a variável de ambiente no `.env`
- Ou configure via Firebase Functions: `firebase functions:config:set gemini.api_key="sua_key"`

## 📚 Referências

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Gemini Pricing](https://ai.google.dev/pricing)
- [Firebase Functions Config](https://firebase.google.com/docs/functions/config-env)

