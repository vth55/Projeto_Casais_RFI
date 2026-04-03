# CASAIS FLEET INTELLIGENCE

## REGRAS EXTREMAS DE POUPANÇA DE TOKENS
**ESTRITAMENTE PROIBIDO:** Tu (Claude) **NÃO VÁS** explorar livremente documentações gerais como o `MEMORIA.md` ou ler outros ficheiros do repositório por iniciativa própria. O contexto essencial já te será entregue em *snippets* pequenos diretamente no bloco da tarefa (`TASK`). Lê diretórios inteiros *apenas* e exclusivamente se a tarefa referenciar explicitamente essa autorização e necessidade.

## Contexto Rápido
| Item | Valor |
|------|-------|
| Projeto | PWA Gestão de Frotas Industriais |
| Cliente | Grupo Casais (empresa real) |
| Prazo | Junho 2025 |
| Stack | React 19 + Vite + Firebase + Zustand + Tailwind + Recharts |
| Cor Casais | #005EB8 (azul) |
| Versão Estável | v1.1.0-stable (commit ad4c4d1) |

## Comandos
```bash
cd Frontend_App/dashboard && npm run dev --host   # Frontend (porta 5173)
cd Backend_Cloud && firebase deploy               # Backend
```

## BUGS CONHECIDOS (Verificar antes de mudar código)
1. **Objects as React child**: `machine.category` e `machine.location` são OBJETOS no Firestore
   - Solução: `typeof x === 'object' ? x?.name : x`
2. **Tela branca**: ErrorBoundary já implementado em App.jsx

## Estruturas de Dados Importantes
```javascript
// machine.category é OBJETO:
{ id: 'escavadoras', name: 'Escavadoras', code: 'ESC' }

// machine.location é OBJETO:
{ workId: 'obra_porto', workName: 'Obra Porto 2025', gps: { lat, lng } }
```

## Prioridades Atuais
1. **RFID de Localização** - Cartões para mudar localização de máquinas
2. **Cargos de Funcionários** - Encarregado de Obra, Operador, etc.
3. **Auto-assign funcionários a obras** - Baseado em uso de máquinas

## Recentemente Implementado (09/12/2025)
- Módulo Obras com GPS/Google Maps
- Gráficos comparativos Período vs Período
- Mudança bulk de localização de máquinas
- Remoção de referências Gemini/IA

## Regras de Código
- Código final tem de ser de grau Enterprise-level
- UI profissional e visualmente impactante (NÃO minimalista)
- Não efetues commits no git nem atualizes logs de tarefas no fim de cada run. O Gemini fará isso por ti.

## WORKFLOW EM EQUIPA (Gemini / MiniMax / Claude)

### 1. Fase de Arquiteto (Instruções para Gemini/MiniMax)
Antes de implementar qualquer feature, o utilizador usará o Gemini ou MiniMax para fazer o rastreio da arquitetura com este prompt:

```text
Atua como o 'Arquiteto de Tarefas' do meu projeto.
Quando eu te descrever uma nova tarefa, analisa a estrutura do projeto Casais Fleet Intelligence e mapeia exatamente o que precisa de ser feito para que o Claude Code execute.

Regras absolutas:
1. SEM explicações longas.
2. SEM cumprimentos ou justificações.
3. Responde APENAS no formato:

OPEN: caminho/exato/ficheiro.ext — acao curta do que modificar
TASK: Resumo de 1 frase para o Claude Code
```

### 2. O Teu Papel (Mensagem direta para o Claude Code)
Tu és o **Engenheiro de Execução Principal**. 
Quando receberes do utilizador as instruções já mapeadas pelo Gemini/MiniMax (no formato `OPEN` e `TASK`), a tua função é focar-te **100% na qualidade de código e implementação de excelência**.
* **O que NÃO DEVES fazer NUNCA (Sob pena de gastar tokens injustificados):** 
  - Não uses ferramentas de terminal para ler o `MEMORIA.md` (o Gemini já é o cérebro/Wikipedia e fará isso).
  - Nunca re-atualizes documentações no fim.
  - Nunca faças Commits nem Push para o Github no fim do trabalho (há workflows separados que tratam disso).
  - Limita-te como um sniper a codificar nos ficheiros passados via `OPEN`.
* **O que DEVES fazer:** Nos ficheiros que te foram delegados, não aceites atalhos na qualidade. Usa todo o teu poder computacional e raciocínio para criar código enterprise-level, testado, com UI impactante, lidando corretamente com os states do React/Zustand e Firebase. Faz o teu melhor trabalho técnico!
