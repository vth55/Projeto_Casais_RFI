/**
 * Exemplo de Uso da API Gemini com Controles
 * 
 * Este arquivo demonstra como usar o GeminiClient de forma segura
 * com controle automático de uso e custos.
 */

const GeminiClient = require('../utils/geminiClient');
const RateLimiter = require('../utils/rateLimiter');
const CostCalculator = require('../utils/costCalculator');

// Exemplo 1: Uso básico com GeminiClient
async function exemploBasico() {
    try {
        const client = new GeminiClient();
        
        // Análise de texto simples
        const resultado = await client.analyzeText(
            'O sistema está funcionando perfeitamente hoje!',
            'sentiment'
        );
        
        console.log('Resultado:', resultado.text);
        console.log('Tokens usados:', resultado.tokensUsed);
        console.log('Tempo de resposta:', resultado.responseTime, 'ms');
        console.log('Estatísticas de uso:', resultado.usage);
        
    } catch (error) {
        if (error.message.includes('Rate limit')) {
            console.error('⚠️ Limite atingido. Aguarde antes de tentar novamente.');
        } else {
            console.error('Erro:', error.message);
        }
    }
}

// Exemplo 2: Code Review
async function exemploCodeReview() {
    try {
        const client = new GeminiClient();
        
        const codigo = `
function calcularTotal(items) {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}
        `;
        
        const review = await client.reviewCode(codigo, 'javascript');
        console.log('Code Review:', review.text);
        
    } catch (error) {
        console.error('Erro no code review:', error.message);
    }
}

// Exemplo 3: Verificar uso antes de fazer request
async function exemploVerificacaoPrevia() {
    const rateLimiter = new RateLimiter();
    
    // Verificar se pode fazer request
    const check = await rateLimiter.checkLimit();
    
    if (!check.allowed) {
        console.warn('⚠️ Request bloqueado:', check.reason);
        if (check.waitTime) {
            console.log(`Aguarde ${check.waitTime} segundos`);
        }
        return;
    }
    
    // Fazer request normalmente
    const client = new GeminiClient();
    const resultado = await client.generateContent('Prompt aqui');
    console.log('Sucesso:', resultado.text);
}

// Exemplo 4: Monitoramento de custos
async function exemploMonitoramentoCustos() {
    const rateLimiter = new RateLimiter();
    const costCalculator = new CostCalculator();
    
    // Obter estatísticas
    const stats = await rateLimiter.getUsageStats();
    
    // Calcular custos
    const dailyCost = costCalculator.calculateDailyCost(stats.tokensToday);
    const monthlyProjection = costCalculator.projectMonthlyCost(stats.tokensToday);
    
    console.log('📊 Estatísticas de Uso:');
    console.log(`Requests hoje: ${stats.requestsToday}/${stats.limits.requestsPerDay}`);
    console.log(`Tokens hoje: ${stats.tokensToday.toLocaleString()}/${stats.limits.tokensPerDay.toLocaleString()}`);
    console.log(`Uso: ${stats.usagePercent.requestsPerDay}% do limite diário`);
    
    console.log('\n💰 Custos:');
    console.log(`Custo hoje: $${dailyCost.totalCost}`);
    console.log(`Projeção mensal: $${monthlyProjection.monthlyProjection}`);
    console.log(`Modelo: ${dailyCost.model} ${dailyCost.isFree ? '(GRATUITO)' : '(PAGO)'}`);
    
    // Verificar alertas
    const warnings = await rateLimiter.checkWarnings();
    if (warnings.warning) {
        console.log('\n⚠️ ALERTAS:');
        warnings.alerts.forEach(alert => console.log(`  - ${alert}`));
    }
}

// Exemplo 5: Uso em Cloud Function
async function exemploCloudFunction(req, res) {
    try {
        const client = new GeminiClient();
        
        const { prompt, type } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt é obrigatório' });
        }
        
        let resultado;
        
        switch (type) {
            case 'analyze':
                resultado = await client.analyzeText(prompt, 'general');
                break;
            case 'review':
                resultado = await client.reviewCode(prompt, 'javascript');
                break;
            default:
                resultado = await client.generateContent(prompt);
        }
        
        res.json({
            success: true,
            result: resultado.text,
            usage: resultado.usage,
            tokensUsed: resultado.tokensUsed
        });
        
    } catch (error) {
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({
                error: 'Limite de uso atingido',
                message: error.message
            });
        }
        
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
}

// Executar exemplos (descomente para testar)
// exemploBasico();
// exemploCodeReview();
// exemploVerificacaoPrevia();
// exemploMonitoramentoCustos();

module.exports = {
    exemploBasico,
    exemploCodeReview,
    exemploVerificacaoPrevia,
    exemploMonitoramentoCustos,
    exemploCloudFunction
};

