/**
 * Calculadora de Custos para API Gemini
 * Monitora e estima custos baseado no uso
 */

// Preços por milhão de tokens (Gemini 2.0 Flash - modelo gratuito recomendado)
const PRICING = {
    'gemini-2.0-flash-exp': {
        input: 0.0,      // Gratuito no tier gratuito
        output: 0.0      // Gratuito no tier gratuito
    },
    'gemini-1.5-pro': {
        input: 1.25,     // $1.25 por milhão de tokens
        output: 5.00     // $5.00 por milhão de tokens
    },
    'gemini-1.5-flash': {
        input: 0.075,    // $0.075 por milhão de tokens
        output: 0.30     // $0.30 por milhão de tokens
    }
};

class CostCalculator {
    constructor() {
        this.pricing = PRICING;
    }

    /**
     * Calcula custo estimado de um request
     * @param {number} inputTokens - Tokens de entrada
     * @param {number} outputTokens - Tokens de saída
     * @param {string} model - Modelo usado
     * @returns {number} Custo em USD
     */
    calculateRequestCost(inputTokens, outputTokens, model = 'gemini-2.0-flash-exp') {
        const modelPricing = this.pricing[model] || this.pricing['gemini-2.0-flash-exp'];
        
        const inputCost = (inputTokens / 1000000) * modelPricing.input;
        const outputCost = (outputTokens / 1000000) * modelPricing.output;
        
        return inputCost + outputCost;
    }

    /**
     * Calcula custo total do dia
     * @param {number} totalTokens - Total de tokens usados no dia
     * @param {string} model - Modelo usado
     * @returns {Object} Estatísticas de custo
     */
    calculateDailyCost(totalTokens, model = 'gemini-2.0-flash-exp') {
        const modelPricing = this.pricing[model] || this.pricing['gemini-2.0-flash-exp'];
        
        // Estimativa: 70% input, 30% output (típico)
        const inputTokens = totalTokens * 0.7;
        const outputTokens = totalTokens * 0.3;
        
        const inputCost = (inputTokens / 1000000) * modelPricing.input;
        const outputCost = (outputTokens / 1000000) * modelPricing.output;
        const totalCost = inputCost + outputCost;

        return {
            totalCost: totalCost.toFixed(4),
            inputCost: inputCost.toFixed(4),
            outputCost: outputCost.toFixed(4),
            totalTokens,
            inputTokens: Math.round(inputTokens),
            outputTokens: Math.round(outputTokens),
            model,
            isFree: totalCost === 0
        };
    }

    /**
     * Projeta custo mensal baseado no uso atual
     * @param {number} dailyTokens - Tokens usados hoje
     * @param {string} model - Modelo usado
     * @returns {Object} Projeção mensal
     */
    projectMonthlyCost(dailyTokens, model = 'gemini-2.0-flash-exp') {
        const dailyCost = this.calculateDailyCost(dailyTokens, model);
        const monthlyCost = parseFloat(dailyCost.totalCost) * 30;

        return {
            dailyCost: dailyCost.totalCost,
            monthlyProjection: monthlyCost.toFixed(2),
            dailyTokens,
            monthlyTokens: dailyTokens * 30,
            model,
            isFree: dailyCost.isFree
        };
    }

    /**
     * Obtém informações de pricing para um modelo
     * @param {string} model - Modelo
     * @returns {Object} Informações de preço
     */
    getPricingInfo(model = 'gemini-2.0-flash-exp') {
        const modelPricing = this.pricing[model] || this.pricing['gemini-2.0-flash-exp'];
        
        return {
            model,
            inputPerMillion: modelPricing.input,
            outputPerMillion: modelPricing.output,
            isFree: modelPricing.input === 0 && modelPricing.output === 0,
            recommendation: model === 'gemini-2.0-flash-exp' 
                ? '✅ Modelo gratuito recomendado para desenvolvimento'
                : '⚠️ Modelo pago - monitore custos cuidadosamente'
        };
    }
}

module.exports = CostCalculator;

