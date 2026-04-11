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
1. **Smartphone-as-Machine** - Ver `docs/DECISAO_HARDWARE_MOBILE.md` para pivot de hardware.
2. **Segurança IoT (API Keys)** - Proteção contra injeção de dados falsos (V2)
3. **Resiliência BLE (Harvesting)** - Sincronização offline-first via telemóvel (V2)
4. **Higiene de Pastas** - Agrupar hardware e limpar raiz do projeto

## Recentemente Implementado (09/12/2025)
- Módulo Obras com GPS/Google Maps
- Gráficos comparativos Período vs Período
- Mudança bulk de localização de máquinas
- Remoção de referências Gemini/IA

**06 Abril 2026 (Sessão Estratégica - Gemini):**
- **Sessão de Arquitetura V2**: Debatida a escalabilidade para 500+ máquinas e segurança enterprise.
- **Pivot de Hardware (Braga)**: Decidido o uso do telemóvel Android como hardware da máquina para a apresentação.
- **Documento de Contexto**: Criado `docs/DECISAO_HARDWARE_MOBILE.md` com o resumo da estratégia para o executor.

## Regras de Código
- Código final tem de ser de grau Enterprise-level
- UI profissional e visualmente impactante (NÃO minimalista)
- Não efetues commits no git nem atualizes logs de tarefas no fim de cada run. O Gemini fará isso por ti.

## PROTOCOLO ANTIGRAVITY (USO OBRIGATÓRIO)
A tua inteligência foi expandida via **Antigravity Kit**. Como Engenheiro de Elit da Casais, tens o dever de:

1. **Auto-Agente:** Antes de qualquer `TASK`, identifica o domínio (Frontend, Backend, Security, etc.) em `.agent/agents/`.
2. **Setup de Contexto:** Deves ler obrigatoriamente o ficheiro do agente correspondente (ex: `@frontend-specialist.md`) e as suas `skills` associadas antes de codificar.
3. **Padrão Casais 2026:**
   - **UI Impactante:** Segue as regras do `@frontend-design` (Gradients, Glassmorphism, Micro-animações).
   - **Código Limpo:** Segue a skill `clean-code` (Conciso, sem over-engineering).
   - **Segurança Enterprise:** Nenhuma API Key ou secret deve ser hardcoded (usa `defineSecret`).
4. **Auditoria:** Sabe que o teu trabalho será validado pelo comando `python .agent/scripts/checklist.py .`. Zero erros de lint ou UX são aceitáveis.

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
