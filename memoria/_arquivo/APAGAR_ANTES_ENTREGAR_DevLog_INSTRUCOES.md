# 🤖 INSTRUÇÕES PARA IA FUTURA (LEIA PRIMEIRO!)

> **Se estás a ler isto pela primeira vez, OBRIGATÓRIO ler esta secção antes de fazer qualquer coisa!**

## **CONTEXTO CRÍTICO DO PROJETO:**
- **Vitor está a recuperar projeto de IA anterior** (documentação perdida)
- **Prazo:** 6 MESES até apresentação (Junho 2025)
- **Stakes:** Este projeto define FUTURO PROFISSIONAL do Vitor
- **Cliente:** Grupo Casais (empresa REAL, não simulação)
- **Nível exigido:** Enterprise, não protótipo

## **COMO VITOR TRABALHA:**
1. **Período Criativo:** Manda ideias SOLTAS, sem estrutura
2. **Teu trabalho:** TU organizas, ele não precisa
3. **Fluxo natural:** Ele "vomita" ideias, tu capturas e processa depois
4. **NÃO interromper:** Deixa ele despejar tudo, organiza no final

## **TEU PROCESSO DE TRABALHO:**
1. ✅ **SEMPRE** regista ideias cruas em "Parking Lot → Ideias Não Processadas"
2. ✅ **SEMPRE** usa Template de Debate quando discutir opções (Opção A vs B vs C)
3. ✅ **SEMPRE** atualiza docs automaticamente após implementar features
4. ✅ **SEMPRE** regista conversas críticas com contexto completo
5. ✅ **NUNCA** peças para Vitor organizar ideias - isso é TUA responsabilidade
6. ✅ **NUNCA** tenhas pressa - 6 meses disponíveis, faz com QUALIDADE MÁXIMA
7. ✅ **NUNCA** assumes nada - se não sabes, pesquisa ou pergunta

## **RESPONSABILIDADES DA IA:**
- 📝 **Documentação:** Manter sincronizada automaticamente
- 🗂️ **Organização:** Transformar ideias soltas em features estruturadas
- 🎯 **Decisões Técnicas:** Pesquisar melhores práticas e sugerir
- 🔄 **Continuidade:** Garantir que NADA se perde entre sessões
- ⚠️ **Honestidade:** Avaliar código atual sem poupar críticas
- ⏰ **Timestamps:** Perguntar hora EXATA quando relevante (sessões longas, múltiplas no dia, deploys)
- 🛡️ **Proteção de Dados:** NUNCA apagar ficheiros temporários sem ordem EXPLÍCITA + DUPLA CONFIRMAÇÃO

## **QUANDO IMPLEMENTAR ALGO NOVO:**
```
1. Implementa código
2. Atualiza DOCUMENTACAO_PROJETO.md (secção relevante)
3. Atualiza NOTAS_RAPIDAS.txt (se aplicável)
4. Regista no DevLog (decisão + contexto)
5. Diz ao Vitor: "✅ Implementado + docs atualizadas"
```

## **QUANDO RECEBER IDEIAS SOLTAS:**
```
1. Regista RAW em "Parking Lot → Ideias Não Processadas"
2. NÃO processar imediatamente (deixa acumular)
3. Quando Vitor disser "já terminei de dar ideias":
   → Organiza todas
   → Move para "Ideias Organizadas"
   → Sugere prioridades
   → Debate opções
```

## **SE HOUVER DÚVIDAS:**
- Lê ROADMAP_6_MESES.md (planeamento faseado)
- Lê DOCUMENTACAO_PROJETO.md (estado técnico atual)
- Lê este DevLog completo (decisões passadas)
- Lê INDEX_FICHEIROS.txt (navegação rápida)
- Se ainda não sabes: PERGUNTA ao Vitor (não assumes!)

## **QUANDO PERGUNTAR HORA EXATA:**
- Sessões de trabalho longas (> 2h)
- Múltiplos acontecimentos no mesmo dia
- Deploys ou mudanças críticas
- Bugs urgentes (timeline de resolução)
- **Pergunta:** "Que horas são agora?" ou "A que horas começámos?"

## **FICHEIROS DO PROJETO (onde atualizar info):**

**1. APAGAR_ANTES_ENTREGAR_DevLog.md (ESTE FICHEIRO)**
- **Quando atualizar:** SEMPRE que houver conversa importante, decisão ou ideia
- **O quê guardar:** 
  - Ideias soltas (Parking Lot)
  - Debates (Opção A vs B)
  - Decisões tomadas + razões
  - Tentativas falhadas
  - Conversas críticas
- **Formato:** SEMPRE com DATA (ordem cronológica é crítica!)

**2. DOCUMENTACAO_PROJETO.md**
- **Quando atualizar:** Após implementar feature TÉCNICA
- **O quê guardar:**
  - Arquitetura do sistema
  - Como funciona cada funcionalidade
  - Estrutura Firestore
  - Como fazer deploy
  - Troubleshooting

**3. NOTAS_RAPIDAS.txt**
- **Quando atualizar:** Quando houver comando/atalho/config novo
- **O quê guardar:**
  - Comandos para iniciar sistema
  - Ligações físicas (LEDs, hardware)
  - Fórmulas importantes
  - Problemas comuns + soluções rápidas
  - Limites/thresholds configuráveis

**4. FLUXO_SISTEMA.txt**
- **Quando atualizar:** Quando criar NOVO fluxo/processo
- **O quê guardar:**
  - Diagramas de fluxo (ASCII art)
  - Passo-a-passo de processos
  - Estados do sistema

**5. ROADMAP_6_MESES.md**
- **Quando atualizar:** Mensalmente OU quando prioridades mudarem
- **O quê guardar:**
  - Planeamento faseado
  - Milestones atingidos
  - Ajustes de timeline

**REGRA:** Se não sabes ONDE guardar algo → guarda no DevLog (este ficheiro). Sempre melhor ter duplicado que perdido!

---

## **🚀 COMO INICIAR NOVA SESSÃO (Cola isto no chat):**

**Quando Vitor abrir novo chat no futuro, deve colar:**

```
Estou de volta ao projeto CASAIS FLEET INTELLIGENCE.

Lê estes ficheiros (por ordem):
1. memoria/APAGAR_ANTES_ENTREGAR_DevLog.md (índice)
2. memoria/APAGAR_ANTES_ENTREGAR_DevLog_INSTRUCOES.md (contexto crítico)
3. docs/ROADMAP_6_MESES.md (onde estamos no plano)
4. DOCUMENTACAO_PROJETO.md (estado técnico)

Depois diz-me:
- Resumo do estado atual do projeto
- Última coisa que fizemos
- Próximos passos sugeridos
```

**OU versão curta:**
```
Lê o DevLog e põe-me a par do projeto CASAIS.
```

---

## **📅 ORDEM CRONOLÓGICA (CRÍTICO!):**

**TODAS as entradas no DevLog TÊM data!**

Formato obrigatório:
```
### **[Tipo]: [Título]**
- **Data:** DD Mês AAAA
- **Contexto:** ...
```

**Exemplo REAL:**
- 07 Dezembro 2025 (manhã) → Primeira sessão de desenvolvimento
- 07 Dezembro 2025 (noite) → Recuperação de ideias originais
- 08 Dezembro 2025 → Implementação Fase 1
- etc.

Assim podes sempre ver QUANDO cada decisão foi tomada e PORQUÊ (contexto da altura).

---

## **REGRA DE OURO:**
> **"Vitor pensa, IA documenta. Vitor cria, IA organiza. Vitor decide, IA implementa."**

---

**Ver também:**
- [APAGAR_ANTES_ENTREGAR_DevLog_DECISOES.md](APAGAR_ANTES_ENTREGAR_DevLog_DECISOES.md)
- [APAGAR_ANTES_ENTREGAR_DevLog_HISTORICO.md](APAGAR_ANTES_ENTREGAR_DevLog_HISTORICO.md)

