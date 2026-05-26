/**
 * PROCORE — Estratégia de migração pivot 2026-05
 *
 * Decisão arquitectural (Claude + Codex, 2026-05-26):
 *
 * NÃO fazer dual-write de `tool_sessions` → Procore Timecards.
 *
 * Razão:
 * - Timecards no Procore representam "operador trabalhou X horas na máquina Y".
 * - O pivot small-tools NFC tem semântica diferente: "operador levou ferramenta X
 *   da obra A para a obra B durante Y dias". Forçar este conceito num Timecard
 *   distorce os relatórios do cliente final no Procore.
 * - Cost Entries baseados em `fuelUsed × consumptionRate` não fazem sentido para
 *   uma rebarbadora ou martelo pneumático.
 *
 * Estratégia adoptada:
 *
 * 1. Os exporters actuais (procoreSessionExporter, procoreScheduler,
 *    procoreDeepIntegration, procorePwaProjector) continuam a ler `sessions`
 *    e `machines` legacy. Não tocar.
 *
 * 2. Como a UI activa do pivot escreve em `tool_sessions` (não em `sessions`),
 *    as crons Procore deixarão naturalmente de produzir Timecards/Cost Entries.
 *    Estado equivalente a "Procore sync pausado".
 *
 * 3. Quando o cliente Casais decidir o que quer no Procore para o modelo small-tools
 *    (Equipment Logs com movimentações? Daily Logs com inventário em obra?),
 *    criar exporter NOVO neste directório, separado dos legacy. Não tentar
 *    adaptar os existentes — semântica é incompatível.
 *
 * 4. Marcar todos os ficheiros Procore actuais com `// LEGACY` no header.
 *    Quando o exporter novo estiver pronto, apagar os legacy.
 *
 * Kill switch (opcional, para parar exports antigos antes do exporter novo):
 *
 * Adicionar guard no topo de cada handler exportado:
 *
 *   const settings = await db.collection('artifacts/casais-rfid/public/data/settings').doc('system').get();
 *   if (settings.data()?.procoreLegacyDisabled) return;
 *
 * Não é obrigatório — basta deixar sessions vazio que as crons devolvem
 * "nenhuma sessão hoje" e ninguém é incomodado.
 *
 * SAP Bridge (`Backend_Cloud/functions/sap/sapBridge.js`):
 * Já usa `TOOL_SESSIONS_PATH` nativamente. Não bloqueia migração.
 *
 * Auditoria detalhada dos campos consumidos por cada cron e cada trigger
 * foi feita em sessão anterior (agente procore-specialist, 2026-05-26).
 * Resumo: 7 crons + 3 triggers Firestore acoplados a `SESSIONS_PATH`/`MACHINES_PATH`.
 * Nenhum precisa ser duplicado para tool_sessions no curto prazo.
 */

module.exports = {
  PIVOT_DECISION: 'NO_DUAL_WRITE',
  LEGACY_FILES: [
    'procoreSessionExporter.js',
    'procoreScheduler.js',
    'procoreDeepIntegration.js',
    'procorePwaProjector.js',
  ],
  KILL_SWITCH_SETTING: 'procoreLegacyDisabled', // settings/system field, opcional
};
