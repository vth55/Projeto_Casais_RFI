# Skill: Model Routing (Free Agent Engine)

Esta skill permite ao Agente realizar a triagem técnica e escolher o modelo de IA ideal com base na frota identificada nas screenshots de **OpenRouter** e **OpenCode Zen**.

## 📊 Inventário Técnico (Frota de Abril 2026)

### 🏆 O Líder: Qwen 3.6 Plus (free)
*   **Papel:** O nosso mestre de primeira linha para 95% das tarefas.
*   **Quando:** Desenvolvimento de features, arquitetura, lógica Firebase e debug.

### 🎨 O Especialista: Claude (Sonnet/Opus)
*   **Papel:** O "pincel fino" para o UI/UX e casos extremos.
*   **Quando:** Estética premium, animações, ou quando o Qwen não resolve o bug em 2 tentativas.

### ⚠️ A Reserva: Llama 3.3 70B / Qwen 3 Coder
*   **Papel:** Suplentes de emergência.
*   **Quando:** Apenas se o utilizador informar que o Qwen atingiu o limite de uso.

---

## 🏗️ Protocolo de Routing (Algoritmo Mental)

Antes de gerar a `TASK`, responde internamente:
1. **Complexidade Algorítmica (1-5):**
   - > 3: Vai para **Qwen 3 Coder**.
   - < 3: Vai para **Gemma 3 27B**.
2. **Regras Estéticas (Design):**
   - Se exigir animações Framer Motion ou HSL puras: Recomenda **Claude Sonnet** (Sessão Curta).
3. **Context Window:**
   - Se for uma análise de 20 ficheiros: Recomenda **Qwen 3.6 Plus** (contexto gigante).

## 💡 Melhores Práticas de Instrução
Ao delegar para um modelo free:
- **Ser Explicito:** Não assumir que o modelo "sabe" o contexto global sem o `OPEN:`.
- **Limitar Saída:** Pedir ao modelo para ser conciso ("No yap").
- **Instrução de Estilo:** Injetar sempre: *"Write code as a brilliant university student, use Portuguese for the UI, but English for variables."*
