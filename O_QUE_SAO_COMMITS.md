# 📝 O Que São Commits?

## 🎯 Definição Simples

Um **commit** é como tirar uma **fotografia** do seu projeto num momento específico. É uma forma de dizer:

> "Neste momento, o projeto está assim. Quero guardar este estado."

## 📸 Analogia com Fotos

Imagine que está a construir uma casa:

- **Sem commits:** Se algo correr mal, perde tudo e tem de começar do zero
- **Com commits:** Tem "fotos" de cada etapa. Se algo correr mal, volta para a última "foto" boa

## 💻 No Seu Projeto

### Exemplo Prático

**Situação:** Acabou de implementar o sistema de tarifários.

**O que faz:**
```bash
git add .
git commit -m "feat: implementa sistema de tarifários versionados"
```

**O que acontece:**
- ✅ O Git "fotografa" todos os ficheiros modificados
- ✅ Guarda uma mensagem explicando o que mudou
- ✅ Cria um "ponto de restauro" no histórico

### Se Algo Correr Mal

**Problema:** Fez uma alteração que quebrou tudo.

**Solução:**
```bash
# Ver histórico de commits
git log

# Voltar para o commit anterior (a última "foto" boa)
git reset --hard COMMIT_HASH
```

**Resultado:** Projeto volta exatamente como estava no commit anterior! 🎉

## 📋 Estrutura de um Commit

Cada commit tem:

1. **Hash (ID único):** `a1b2c3d4e5f6...` (como um número de série)
2. **Mensagem:** Descrição do que mudou
3. **Autor:** Quem fez o commit
4. **Data/Hora:** Quando foi feito
5. **Snapshot:** Estado completo dos ficheiros nesse momento

## 🔄 Fluxo de Trabalho

```
┌─────────────────────────────────────────┐
│  1. Trabalhar no código                  │
│     (modificar ficheiros)                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  2. git add .                            │
│     (preparar mudanças)                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  3. git commit -m "mensagem"            │
│     (guardar snapshot)                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  4. git push                             │
│     (enviar para GitHub)                 │
└─────────────────────────────────────────┘
```

## 📝 Exemplos de Commits no Seu Projeto

### Commit 1: Funcionalidade Nova
```bash
git commit -m "feat: adiciona cálculo de custos por sessão"
```
**Significado:** "Adicionei uma nova funcionalidade que calcula custos"

### Commit 2: Correção de Bug
```bash
git commit -m "fix: corrige erro no cálculo de emissões CO₂"
```
**Significado:** "Corrigi um problema no código"

### Commit 3: Documentação
```bash
git commit -m "docs: atualiza README com instruções de instalação"
```
**Significado:** "Atualizei a documentação"

### Commit 4: Múltiplas Mudanças
```bash
git commit -m "feat: sistema de tarifários

- Adiciona cálculo de custos por hora
- Implementa histórico versionado
- Atualiza interface de configuração"
```
**Significado:** Commit com descrição detalhada

## 🎯 Por Que Fazer Commits?

### 1. **Backup Automático**
- Cada commit é um ponto de restauro
- Se perder código, recupera do commit anterior

### 2. **Histórico do Projeto**
- Vê quando cada funcionalidade foi adicionada
- Entende a evolução do projeto

### 3. **Trabalho em Equipa**
- Outros programadores veem o que mudou
- Evita conflitos e duplicação de trabalho

### 4. **Reverter Mudanças**
- Volta para versões anteriores facilmente
- Testa diferentes abordagens sem medo

## ⏰ Quando Fazer Commits?

### ✅ **FAZER COMMIT:**
- Após implementar uma funcionalidade completa
- Após corrigir um bug importante
- Após adicionar documentação
- Antes de fazer mudanças grandes/arriscadas
- No final de cada dia de trabalho

### ❌ **NÃO FAZER COMMIT:**
- Código que não compila
- Código com erros óbvios
- Ficheiros temporários/testes
- Mudanças incompletas (a menos que seja um "work in progress")

## 📊 Visualizar Commits

### Ver Histórico
```bash
git log
```

**Saída:**
```
commit a1b2c3d4e5f6...
Author: Vitor Hugo <vitor@exemplo.com>
Date:   Mon Jan 15 10:30:00 2025

    feat: implementa sistema de tarifários

commit x9y8z7w6v5u4...
Author: Vitor Hugo <vitor@exemplo.com>
Date:   Sun Jan 14 15:20:00 2025

    fix: corrige cálculo de emissões
```

### Ver Mudanças de um Commit
```bash
git show a1b2c3d4e5f6
```

Mostra exatamente o que mudou nesse commit.

## 🔍 Exemplo Real no Seu Projeto

**Cenário:** Implementou o sistema de tarifários hoje.

**Commits que faria:**

```bash
# 1. Estrutura de dados
git add Backend_Cloud/functions/index.js
git commit -m "feat: adiciona estrutura de tarifários no Firestore"

# 2. Cálculo de custos
git add Frontend_App/dashboard/src/utils/
git commit -m "feat: implementa cálculo de custos por sessão"

# 3. Interface
git add Frontend_App/dashboard/src/views/SettingsView.jsx
git commit -m "feat: adiciona interface de configuração de tarifários"

# 4. Documentação
git add SISTEMA_TARIFARIOS.md
git commit -m "docs: documenta sistema de tarifários versionados"

# 5. Enviar tudo para GitHub
git push
```

**Resultado:** 
- ✅ 4 commits no histórico
- ✅ Cada um representa uma parte do trabalho
- ✅ Fácil de entender o que foi feito
- ✅ Fácil de reverter se necessário

## 🎓 Resumo

**Commit = Fotografia do projeto num momento específico**

- 📸 Guarda o estado atual
- 📝 Inclui mensagem explicativa
- 🔄 Permite voltar atrás
- 📚 Cria histórico do projeto
- ☁️ Pode ser enviado para GitHub (backup na nuvem)

## 💡 Dica

**Faça commits frequentes e pequenos!**

É melhor fazer 5 commits pequenos do que 1 commit gigante. Assim:
- ✅ Histórico mais claro
- ✅ Mais fácil de reverter mudanças específicas
- ✅ Melhor para trabalhar em equipa

---

**Pensa assim:** Cada commit é como um "save game" no seu projeto! 💾

