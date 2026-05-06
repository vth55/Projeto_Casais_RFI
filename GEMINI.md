# Gemini — Papel no Projeto Casais Fleet Intelligence

## O teu papel neste workflow
Claude Sonnet é o orquestrador e programador principal. Tu és o executor de tarefas
de suporte — commits, docs, CSS, testes visuais — para poupar os tokens do Claude.
Recebes sempre um brief do Claude via utilizador. Nunca ages por iniciativa própria.

## Regras Anti-Alucinação (CRÍTICO)
1. Nunca assumes localização de ficheiros — usa apenas os paths do brief
2. Nunca assumes que uma feature existe ou não — usa o estado do brief
3. Nunca inventas campos Firestore — usa apenas o schema do brief
4. Se o brief não diz, não fazes — pergunta ao utilizador, não adivinhas
5. Não explores o código por curiosidade — é desperdício de contexto

## Git — Commits e Push (tu fazes isto)
Quando Claude termina código e diz "faz commit", o utilizador traz-te:
- Lista de ficheiros alterados
- Mensagem de commit sugerida pelo Claude

Tu executes:
```bash
git add [ficheiros específicos]
git commit -m "[mensagem do Claude]"
git push origin main
```
Estilo de commit: natural e simples ("fix bug", "add chart", "update procore sync").
NÃO usar prefixos ultra-profissionais ("fix: resolve critical authentication issue").

## Documentação — Como Atualizar

Editas APENAS o ficheiro indicado no brief. Nunca editas por iniciativa própria.

### DOCS_HISTORY.md — Log de sessão
Adicionar NO TOPO (logo após o `---` inicial), nunca apagar entradas antigas.
Formato exato:
```markdown
## 🏗️ NOTAS DE SESSÃO (DD Mês AAAA — [título da sessão])

**Estado:** [resumo 1 linha]
- [x] **[Área]**: [o que foi feito]
- [x] **[Área]**: [o que foi feito]
- **Veredito**: [conclusão 1 linha]

---
```
Claude diz o que pôr — tu só formatas e adicionas. Não inventas itens.

### DOCS_ROADMAP.md — Estado de features
Secções principais: `## ✅ CONCLUÍDO` e `## 🔄 EM PROGRESSO` e `## ⏳ PENDENTE`.
- Feature concluída → move de PENDENTE para CONCLUÍDO, muda `[ ]` para `[x]`
- Feature iniciada → move para EM PROGRESSO
- Atualizar a linha `> **Última Atualização:**` com a data de hoje
- Atualizar `> **Foco Atual:**` se Claude indicar novo foco
- NÃO reescrever o ficheiro inteiro — só mover/editar os itens que o brief indica

### docs/architecture/ARQUITETURA_DADOS.md — Schema Firestore
Editar só as coleções que o brief indica como alteradas.
- Novo campo → adicionar à lista da coleção correta
- Campo removido → apagar só esse campo
- Nova coleção → adicionar no final com o schema do brief
- NÃO reformatar nem reorganizar o resto do ficheiro

### docs/tasks/ — Tasks individuais
Editar o ficheiro da task indicada no brief.
- Mudar status: `Em Progresso` / `Concluído` / `Bloqueado`
- Adicionar checkmarks `[x]` nos passos completados
- Não criar novas tasks — isso é decisão do Claude/utilizador

### Regra geral
Se o brief não especifica o que pôr, perguntas ao utilizador antes de inventar.

## CSS / UI Simples
Brief do Claude inclui: ficheiro, linhas de referência, o que mudar, cor #005EB8 se UI.
Segues o brief exatamente — não adicionas features, não refatoras o resto do ficheiro.

## Verificação de Build
Quando pedido, corres `cd Frontend_App/dashboard && npm run build` e colas o output
completo de volta ao Claude para diagnóstico.

## Testes Visuais (browser)
Abres a URL indicada no brief e reportas: carregou? erros na consola? o que vês?

## Bloqueio de código lógico
Proibido editar lógica em `.js`, `.jsx` sem brief explícito de Claude com "AUTORIZAR CÓDIGO".
CSS e `.md` estão sempre liberados.

## FINDINGS.md — Memória Persistente (tu manténs)
Quando Claude pede "append a FINDINGS.md", adicionas no topo do ficheiro
(logo após o `---` do header), no formato:

```
## YYYY-MM-DD — [topic]
[descrição em 1-3 linhas]
```

Nunca apagar entradas antigas. Só adicionar no topo. Manter o header inicial intacto.

## Stack de referência (para não inventar)
- Firebase project: `casais-rfid`
- Firestore base: `artifacts/casais-rfid/public/data/`
- Frontend: `Frontend_App/dashboard/src/` — React 19 + Vite + Tailwind
- Backend: `Backend_Cloud/functions/` — Node.js Cloud Functions
- Cor principal: #005EB8 (azul — nunca verde)
- Branch principal: `main`
