/**
 * Rate Limiter para API Gemini
 * Controla requests por minuto e por dia para evitar custos inesperados
 */

const admin = require('firebase-admin');
const db = admin.firestore();

// Limites padrão (tier gratuito Gemini)
const DEFAULT_LIMITS = {
    requestsPerMinute: 15,      // 15 requests/minuto (tier gratuito)
    requestsPerDay: 1000,       // 1000 requests/dia (estimativa conservadora)
    tokensPerDay: 5000000,      // 5M tokens/dia (estimativa)
    tokensPerRequest: 100000    // Limite por request individual
};

class RateLimiter {
    constructor(limits = DEFAULT_LIMITS) {
        this.limits = limits;
        this.usagePath = 'artifacts/casais-rfid/internal/api_usage';
    }

    /**
     * Verifica se pode fazer request
     * @returns {Promise<{allowed: boolean, reason?: string, waitTime?: number}>}
     */
    async checkLimit() {
        const now = new Date();
        const minuteKey = this.getMinuteKey(now);
        const dayKey = this.getDayKey(now);

        try {
            const usageRef = db.doc(`${this.usagePath}/current`);
            const usageSnap = await usageRef.get();
            const usage = usageSnap.exists ? usageSnap.data() : {};

            // Verificar limite por minuto
            const minuteCount = usage[minuteKey] || 0;
            if (minuteCount >= this.limits.requestsPerMinute) {
                const nextMinute = new Date(now);
                nextMinute.setMinutes(nextMinute.getMinutes() + 1);
                nextMinute.setSeconds(0);
                const waitTime = Math.ceil((nextMinute - now) / 1000);
                
                return {
                    allowed: false,
                    reason: `Limite de ${this.limits.requestsPerMinute} requests/minuto atingido`,
                    waitTime
                };
            }

            // Verificar limite por dia
            const dayCount = usage[dayKey] || 0;
            if (dayCount >= this.limits.requestsPerDay) {
                return {
                    allowed: false,
                    reason: `Limite de ${this.limits.requestsPerDay} requests/dia atingido`
                };
            }

            // Verificar tokens do dia
            const dayTokens = usage[`${dayKey}_tokens`] || 0;
            if (dayTokens >= this.limits.tokensPerDay) {
                return {
                    allowed: false,
                    reason: `Limite de ${this.limits.tokensPerDay} tokens/dia atingido`
                };
            }

            return { allowed: true };
        } catch (error) {
            console.error('Erro ao verificar limites:', error);
            // Em caso de erro, permitir mas logar
            return { allowed: true, warning: 'Erro ao verificar limites, request permitido' };
        }
    }

    /**
     * Registra uso após request bem-sucedido
     * @param {number} tokensUsed - Tokens usados no request
     */
    async recordUsage(tokensUsed = 0) {
        const now = new Date();
        const minuteKey = this.getMinuteKey(now);
        const dayKey = this.getDayKey(now);

        try {
            const usageRef = db.doc(`${this.usagePath}/current`);
            
            await db.runTransaction(async (t) => {
                const snap = await t.get(usageRef);
                const current = snap.exists ? snap.data() : {};

                // Incrementar contadores
                current[minuteKey] = (current[minuteKey] || 0) + 1;
                current[dayKey] = (current[dayKey] || 0) + 1;
                current[`${dayKey}_tokens`] = (current[`${dayKey}_tokens`] || 0) + tokensUsed;
                current.lastRequest = admin.firestore.Timestamp.now();

                // Limpar chaves antigas (manter apenas últimos 2 dias)
                this.cleanOldKeys(current, now);

                t.set(usageRef, current);
            });
        } catch (error) {
            console.error('Erro ao registrar uso:', error);
        }
    }

    /**
     * Obtém estatísticas de uso
     * @returns {Promise<Object>}
     */
    async getUsageStats() {
        try {
            const usageRef = db.doc(`${this.usagePath}/current`);
            const usageSnap = await usageRef.get();
            const usage = usageSnap.exists ? usageSnap.data() : {};

            const now = new Date();
            const dayKey = this.getDayKey(now);
            const minuteKey = this.getMinuteKey(now);

            return {
                requestsToday: usage[dayKey] || 0,
                requestsThisMinute: usage[minuteKey] || 0,
                tokensToday: usage[`${dayKey}_tokens`] || 0,
                lastRequest: usage.lastRequest?.toDate() || null,
                limits: this.limits,
                usagePercent: {
                    requestsPerMinute: ((usage[minuteKey] || 0) / this.limits.requestsPerMinute * 100).toFixed(1),
                    requestsPerDay: ((usage[dayKey] || 0) / this.limits.requestsPerDay * 100).toFixed(1),
                    tokensPerDay: ((usage[`${dayKey}_tokens`] || 0) / this.limits.tokensPerDay * 100).toFixed(1)
            };
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return { error: error.message };
        }
    }

    /**
     * Verifica se está próximo dos limites (para alertas)
     * @returns {Promise<{warning: boolean, alerts: string[]}>}
     */
    async checkWarnings() {
        const stats = await this.getUsageStats();
        const alerts = [];

        // Alerta se > 80% do limite
        if (stats.usagePercent.requestsPerMinute > 80) {
            alerts.push(`⚠️ ${stats.usagePercent.requestsPerMinute}% do limite de requests/minuto usado`);
        }
        if (stats.usagePercent.requestsPerDay > 80) {
            alerts.push(`⚠️ ${stats.usagePercent.requestsPerDay}% do limite de requests/dia usado`);
        }
        if (stats.usagePercent.tokensPerDay > 80) {
            alerts.push(`⚠️ ${stats.usagePercent.tokensPerDay}% do limite de tokens/dia usado`);
        }

        return {
            warning: alerts.length > 0,
            alerts,
            stats
        };
    }

    // Helpers
    getMinuteKey(date) {
        return `min_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    getDayKey(date) {
        return `day_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    cleanOldKeys(data, now) {
        const twoDaysAgo = new Date(now);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        
        Object.keys(data).forEach(key => {
            if (key.startsWith('min_') || key.startsWith('day_')) {
                // Extrair data da chave e verificar se é antiga
                const match = key.match(/(\d{4}-\d{2}-\d{2})/);
                if (match) {
                    const keyDate = new Date(match[1]);
                    if (keyDate < twoDaysAgo) {
                        delete data[key];
                    }
                }
            }
        });
    }
}

module.exports = RateLimiter;

