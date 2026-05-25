# Troubleshooting

Active runbook for operational issues worth checking first.

## Hardware And Bridge

### Python bridge says port is busy or access is denied

Cause:

- Arduino IDE serial monitor still open

Check:

- close serial monitor
- retry the bridge process

## Frontend And Auth

### Firebase Auth noise appears in console

Current expectation:

- some auth-related console noise can be expected in local/dev contexts

Do:

- verify whether the issue is functional or only console noise before treating it as a bug

## Procore

### 401 or token-related Procore failures

Check:

- integration state in `integrations/procore`
- OAuth connection flow in `procoreBridge.js`
- whether token refresh is succeeding through `getValidAccessToken()`

### Timecards do not show `equipment_id` in sandbox

Current reality:

- Procore sandbox v1.0 equipment endpoints can return `404`
- this is a sandbox limitation, not necessarily a code bug

Read:

- `FINDINGS.md`
- `docs/integrations/project_procore_integration.md`

### Observations export fails in sandbox

Current reality:

- sandbox behavior is limited and may reject observation creation even when the code path is correct

Check:

- `FINDINGS.md` for current known limitation details

## Documentation Drift

### Docs disagree with code

Rule:

- trust code first
- then update the active docs
- do not patch historical snapshots to look current

Read first:

- `docs/ROADMAP_EXECUCAO.md`
- `docs/architecture/DATA_MODEL_CURRENT.md`
- `docs/integrations/project_procore_integration.md`
- `FINDINGS.md`

## Sessions And Evidence

### Too much noise under `docs/sessions/`

Rule:

- session markdowns stay in `docs/sessions/`
- preserved screenshots go under `docs/sessions/evidence/YYYY-MM-DD/`
- temporary Playwright dumps belong in `docs/archive/sessions/`
