# Docs Index

Mapa de leitura da documentacao ativa.

## Fontes canonicas

- Estado atual de execucao: `docs/ROADMAP_EXECUCAO.md`
- Bugs reais, descobertas e limites do sandbox: `FINDINGS.md`
- Contexto operacional para agentes: `CLAUDE.md`
- Politica de documentacao: `docs/DOCUMENTATION_POLICY.md`
- Memoria duravel e handoff entre IAs: `obsidian-vault/00 Home.md`

## Arquitetura e dados

| Pergunta | Ler |
| --- | --- |
| Modelo de dados operacional atual | `docs/architecture/DATA_MODEL_CURRENT.md` |
| Modelo de dados historico / detalhado | `docs/architecture/ARQUITETURA_DADOS.md` |
| Schema Firebase e contratos | `docs/standards/FIREBASE_SCHEMAS.md` |
| Padroes de codigo | `docs/standards/CODE_PATTERNS.md` |
| Decisoes de arquitetura | `docs/architecture/ADR/` |

## Procore

| Pergunta | Ler |
| --- | --- |
| Estado atual e limites conhecidos | `docs/integrations/project_procore_integration.md` |
| OAuth, sync e endpoints | `Backend_Cloud/functions/procore/procoreBridge.js` |
| Exportacao de sessoes/timecards | `Backend_Cloud/functions/procore/procoreSessionExporter.js` |
| Achados recentes de sandbox | `FINDINGS.md` |

## Operacao

| Pergunta | Ler |
| --- | --- |
| Troubleshooting e recovery | `docs/operations/TROUBLESHOOTING.md` |
| Ultimas sessoes de trabalho | `docs/sessions/` |
| Ultimo wrap-up automatico | `.claude/memory/runtime/last_wrapup.md` |

## Design e produto

| Pergunta | Ler |
| --- | --- |
| Design system Casais | `docs/design/DESIGN_SYSTEM_CASAIS.md` |
| Logotipo e branding | `docs/design/INSTRUCOES_LOGOTIPO.md` |

## O que nao e canonico

- `docs/archive/` contem snapshots, briefings antigos e docs superadas.
- Ficheiros historicos na raiz podem continuar uteis para contexto, mas nao devem prevalecer sobre `docs/ROADMAP_EXECUCAO.md`, `FINDINGS.md` e o codigo atual.
