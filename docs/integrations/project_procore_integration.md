# Procore Integration - Current State

Atualizado em `2026-05-18`.

## Estado executivo

A integracao Procore esta operacional no sandbox atual e ja cobre:

- OAuth e refresh de token
- sync de projects, directory e equipment
- exportacao de sessoes para timecards
- sync bidirecional basico entre PWA e Procore
- retry e resiliência para falhas conhecidas

O estado atual do trabalho ja nao e "Fase 4/Fase 5". Essa linguagem ficou historica. Hoje este ficheiro serve como snapshot tecnico do estado real.

## Codigo principal

- `Backend_Cloud/functions/procore/procoreBridge.js`
- `Backend_Cloud/functions/procore/procoreSessionExporter.js`
- `Backend_Cloud/functions/procore/procoreDeepIntegration.js`
- `Frontend_App/dashboard/src/views/ConfiguracoesView.jsx`

## IDs e ambiente validados

- Procore sandbox company: `4283171`
- Projeto sandbox principal: `328122`
- Equipment API valida: `/rest/v2.1/companies/4283171/equipment_register`

## O que esta funcional

- Bridge OAuth e estado da conexao
- refresh de token centralizado em `getValidAccessToken()`
- sync de equipment register v2.1
- criacao e atualizacao de equipment a partir da PWA
- exportacao de sessoes como timecards
- tratamento de retries e degradacao controlada em endpoints problemáticos

## Limites confirmados do sandbox

Isto nao deve ser tratado como bug do projeto:

- `GET /rest/v1.0/projects/328122/equipment` retorna `404`
- `GET /rest/v1.0/companies/4283171/equipment` retorna `404`
- `POST` de Observations continua bloqueado no sandbox
- `DELETE` de equipment pode devolver `405`
- `PATCH` para arquivar equipment pode responder `200` sem efeito real
- webhooks outbound do sandbox nao sao uma base fiavel para validacao final

Para detalhes e evidencias recentes, ler `FINDINGS.md`.

## Decisoes tecnicas atuais

- O token refresh deixou de ser privado do exporter; `procoreSessionExporter.js` usa `getValidAccessToken()` de `procoreBridge.js`
- O Firestore continua a ser a fonte de verdade operacional da app
- O Procore funciona como sistema integrado e espelho parcial, nao como substituto total da modelacao local

## Pendencias reais

- validar melhor os cenarios ainda bloqueados por sandbox
- continuar a distinguir claramente comportamento de sandbox vs producao
- consolidar UI de observabilidade da integracao em `ConfiguracoesView`
- reduzir drift entre docs antigas e estado atual do codigo

## Historico

Os seguintes ficheiros foram mantidos apenas como arquivo historico:

- `docs/archive/integrations/PROCORE_PHASE1_PROGRESS.md`
- `docs/archive/integrations/project_procore_status.md`

Se houver conflito entre esses ficheiros e este, prevalece este ficheiro e o codigo atual.
