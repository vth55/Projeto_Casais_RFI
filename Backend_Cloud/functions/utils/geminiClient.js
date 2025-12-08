/**
 * Cliente Gemini com controle de uso integrado
 * Wrapper seguro para API Gemini com rate limiting e monitoramento
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const RateLimiter = require('./rateLimiter');
const functions = require('firebase-functions');

class GeminiClient {
    constructor() {
        const apiKey = functions.config().gemini?.api_key || process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY não configurada. Configure em .env ou Firebase Functions config.');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.rateLimiter = new RateLimiter();
        this.modelName = 'gemini-2.0-flash-exp'; // Modelo gratuito recomendado
    }

    /**
     * Faz uma chamada à API Gemini com controle de uso
     * @param {string} prompt - Prompt para enviar
     * @param {Object} options - Opções adicionais
     * @returns {Promise<Object>}
     */
    async generateContent(prompt, options = {}) {
        // Verificar limites antes de fazer request
        const limitCheck = await this.rateLimiter.checkLimit();
        
        if (!limitCheck.allowed) {
            throw new Error(`Rate limit excedido: ${limitCheck.reason}`);
        }

        try {
            const model = this.genAI.getGenerativeModel({ 
                model: options.model || this.modelName 
            });

            const startTime = Date.now();
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const endTime = Date.now();

            // Calcular tokens usados (estimativa)
            const tokensUsed = this.estimateTokens(prompt, response.text());

            // Registrar uso
            await this.rateLimiter.recordUsage(tokensUsed);

            // Verificar alertas
            const warnings = await this.rateLimiter.checkWarnings();
            if (warnings.warning) {
                console.warn('⚠️ Alertas de uso da API:', warnings.alerts);
            }

            return {
                text: response.text(),
                tokensUsed,
                responseTime: endTime - startTime,
                usage: await this.rateLimiter.getUsageStats()
            };
        } catch (error) {
            console.error('Erro na chamada Gemini API:', error);
            
            // Se for erro de rate limit da API, registrar mas não contar como uso
            if (error.message?.includes('429') || error.message?.includes('quota')) {
                throw new Error('Quota da API Gemini excedida. Tente novamente mais tarde.');
            }
            
            throw error;
        }
    }

    /**
     * Faz análise de texto (caso de uso comum)
     * @param {string} text - Texto para analisar
     * @param {string} analysisType - Tipo de análise
     * @returns {Promise<Object>}
     */
    async analyzeText(text, analysisType = 'general') {
        const prompts = {
            general: `Analisa o seguinte texto e fornece um resumo das informações principais:\n\n${text}`,
            sentiment: `Analisa o sentimento do seguinte texto (positivo, neutro, negativo) e explica o porquê:\n\n${text}`,
            summary: `Cria um resumo conciso do seguinte texto:\n\n${text}`
        };

        const prompt = prompts[analysisType] || prompts.general;
        return await this.generateContent(prompt);
    }

    /**
     * Code review (caso de uso específico do projeto)
     * @param {string} code - Código para revisar
     * @param {string} language - Linguagem do código
     * @returns {Promise<Object>}
     */
    async reviewCode(code, language = 'javascript') {
        const prompt = `Faz um code review do seguinte código ${language}. 
        Foca em: bugs potenciais, melhorias de performance, boas práticas, e sugestões de refactoring.
        Seja conciso e prático.\n\n\`\`\`${language}\n${code}\n\`\`\``;

        return await this.generateContent(prompt);
    }

    /**
     * Obtém estatísticas de uso
     * @returns {Promise<Object>}
     */
    async getUsageStats() {
        return await this.rateLimiter.getUsageStats();
    }

    /**
     * Verifica alertas de uso
     * @returns {Promise<Object>}
     */
    async checkWarnings() {
        return await this.rateLimiter.checkWarnings();
    }

    /**
     * Estima tokens usados (aproximação)
     * @private
     */
    estimateTokens(input, output) {
        // Estimativa: ~4 caracteres por token (aproximação)
        const inputTokens = Math.ceil(input.length / 4);
        const outputTokens = Math.ceil(output.length / 4);
        return inputTokens + outputTokens;
    }
}

module.exports = GeminiClient;

