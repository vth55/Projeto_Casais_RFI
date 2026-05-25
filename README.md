# CASAIS Fleet Intelligence

Projeto de gestao de frota e operacao em campo para o Grupo Casais.

## Entrada rapida

- Estado atual de execucao: `docs/ROADMAP_EXECUCAO.md`
- Mapa de documentacao canonica: `docs/INDEX.md`
- Politica de documentacao: `docs/DOCUMENTATION_POLICY.md`
- Quirks, bugs reais e limites externos: `FINDINGS.md`
- Contexto operacional para agentes: `CLAUDE.md`
- Memoria duravel multi-IA: `obsidian-vault/00 Home.md`

## Estrutura

- `Frontend_App/dashboard/` - PWA React/Vite
- `Backend_Cloud/functions/` - Cloud Functions e integracao Procore
- `docs/` - documentacao ativa, ADRs, standards, troubleshooting e sessoes
- `obsidian-vault/` - memoria curada para IA e handoff entre ferramentas

## Regra de leitura

Nem toda a documentacao da raiz tem o mesmo peso.

- Usa `docs/ROADMAP_EXECUCAO.md` para estado atual.
- Usa `FINDINGS.md` para comportamento real e limites do sandbox.
- Usa `docs/architecture/` e `docs/standards/` para contratos mais estaveis.
- Trata `docs/archive/root/` e `docs/archive/` como historico ou contexto de apoio, nao como fonte primaria.

## Execucao local

- Frontend: `cd Frontend_App/dashboard && npm run dev`
- Backend functions: `cd Backend_Cloud/functions && npm run serve`
- Deploy functions: `cd Backend_Cloud/functions && firebase deploy --only functions`

## Nota

O projeto acumulou varios snapshots historicos. A limpeza feita em 2026-05-18 passou a distinguir explicitamente documentacao canonica de arquivo, para reduzir contradicoes e drift.
