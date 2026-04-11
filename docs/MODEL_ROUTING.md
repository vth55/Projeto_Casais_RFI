# 🧭 Guia de Roteamento de Modelos (Free Agents)

Este documento é a tua "Bússola Corporativa" para o projeto *Casais Fleet Intelligence*. Com ele, saberás exatamente qual modelo selecionar na tua UI do **OpenCode/OpenRouter** para cada tipo de tarefa, maximizando a qualidade e poupando os créditos do Claude.

---

## 🎯 Categorias de Tarefas (S1 - S5)

Sempre que eu (**Gemini**) te der uma instrução, indicarei a categoria e o modelo recomendado.

| Categoria | Tipo de Trabalho | Modelo Sugerido |
| :--- | :--- | :--- |
| **🏆 O Motor Geral** | Código, Lógica, Backend, Debug, Features. | **Qwen 3.6 Plus (free)** |
| **🎨 O Especialista** | UI Premium, Animações, Bugs complexos. | **Claude (Sonnet/Opus)** |
| **⚠️ Fallback (Qwen Limit)** | Apenas se o Qwen 3.6 atingir o limite. | **Llama 3.3 70B** |

---

## 🚀 Como Executar uma Tarefa

Quando vires um bloco `OPEN / TASK` no chat, segue estes passos:

1.  **Abre** os ficheiros indicados no `OPEN`.
2.  **Seleciona** o modelo recomendado (ex: *Qwen 3 Coder*) no teu menu do OpenCode.
3.  **Cola** o conteúdo da `TASK` no prompt do modelo.
4.  **Aplica** o código gerado.

## 🎨 O Papel do Claude (Reserva de Elite)

Reservaremos o Claude (Sonnet/Opus) APENAS para:
-   🎨 **Visual Pro-Max:** Interfaces com animações complexas, gradientes dinâmicos ou estética "Glassmorphism".
-   🧠 **Bugs Infernais:** Problemas que nem o Llama 70B nem o Qwen 480B conseguiram resolver após 2 tentativas.
-   ⚠️ **Deploy Crítico:** Verificação final de segurança antes de um push para produção.

---

## 📊 Monitorização de Arena (Leaderboard)

*Última atualização: Abril 2026*
Consulta sempre a [Arena.ai Leaderboard](https://arena.ai/leaderboard) para ver se há novos "Free Agents" a subir no ranking!
