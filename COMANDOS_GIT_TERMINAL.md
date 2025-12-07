# 🖥️ Comandos Git via Terminal - Passo a Passo

## ⚠️ PRIMEIRO: Instalar Git

### Opção 1: Download Manual (Recomendado)
1. Acesse: https://git-scm.com/download/win
2. Baixe e execute o instalador
3. **Use opções padrão** (Next, Next, Next...)
4. **FECHE e REABRA o terminal** após instalar

### Opção 2: Via PowerShell (como Administrador)
```powershell
# Abra PowerShell como Administrador (botão direito → "Executar como administrador")
winget install --id Git.Git -e --source winget
```

Depois, **feche e reabra o terminal**.

---

## ✅ Verificar Instalação

```powershell
git --version
```

**Deve mostrar:** `git version 2.x.x`

---

## 🔧 CONFIGURAÇÃO INICIAL (Uma vez só)

### 1. Configurar Nome e Email

```powershell
git config --global user.name "Vitor Hugo"
git config --global user.email "seu.email@exemplo.com"
```

### 2. Verificar Configuração

```powershell
git config --list
```

---

## 📁 CONFIGURAR SEU PROJETO

### 1. Ir para a Pasta do Projeto

```powershell
cd "C:\Users\vitor\OneDrive\Área de Trabalho\Projeto_Casais_RFI"
```

### 2. Inicializar Git

```powershell
git init
```

### 3. Verificar Status

```powershell
git status
```

---

## 📤 PRIMEIRO COMMIT E PUSH

### 1. Adicionar Todos os Arquivos

```powershell
git add .
```

### 2. Fazer Commit Inicial

```powershell
git commit -m "Initial commit: CASAIS FLEET INTELLIGENCE"
```

### 3. Criar Repositório no GitHub

**Antes de continuar:**
1. Acesse: https://github.com/new
2. **Repository name:** `Projeto_Casais_RFI`
3. **Description:** "Sistema de Gestão Inteligente de Frotas - Grupo Casais"
4. ✅ Marque **"Private"**
5. ❌ **NÃO marque** "Add a README file"
6. Clique em **"Create repository"**

### 4. Conectar ao GitHub

**Substitua `SEU_USERNAME` pelo seu username do GitHub:**

```powershell
git remote add origin https://github.com/SEU_USERNAME/Projeto_Casais_RFI.git
```

### 5. Renomear Branch

```powershell
git branch -M main
```

### 6. Fazer Push (Enviar para GitHub)

```powershell
git push -u origin main
```

**⚠️ IMPORTANTE:** Na primeira vez, vai pedir credenciais:
- **Username:** seu username do GitHub
- **Password:** use um **Personal Access Token** (não a senha normal)

#### Como Criar Personal Access Token:

1. GitHub → **Settings** (canto superior direito)
2. **Developer settings** (no final do menu lateral)
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token** → **Generate new token (classic)**
5. **Note:** "Projeto Casais"
6. **Expiration:** 90 days (ou No expiration)
7. ✅ Marque: **`repo`** (acesso completo a repositórios)
8. Clique em **"Generate token"**
9. **COPIE O TOKEN** (só aparece uma vez!)
10. Use este token como senha no terminal

---

## 🔄 COMMITS FUTUROS (Depois do primeiro push)

### Workflow Normal:

```powershell
# 1. Ver o que mudou
git status

# 2. Adicionar arquivos modificados
git add .

# 3. Fazer commit com mensagem
git commit -m "feat: adiciona sistema de tarifários"

# 4. Enviar para GitHub
git push
```

### Exemplos de Mensagens de Commit:

```powershell
git commit -m "feat: implementa cálculo de custos por sessão"
git commit -m "fix: corrige bug no cálculo de emissões"
git commit -m "docs: atualiza documentação de tarifários"
git commit -m "refactor: melhora estrutura do código"
```

---

## 📊 COMANDOS ÚTEIS

### Ver Histórico de Commits

```powershell
git log
```

### Ver Mudanças Não Commitadas

```powershell
git diff
```

### Ver Status Atual

```powershell
git status
```

### Ver Remotes Configurados

```powershell
git remote -v
```

### Ver Branches

```powershell
git branch
```

---

## 🆘 PROBLEMAS COMUNS

### Erro: "git: command not found"
**Solução:** Git não está instalado ou não está no PATH. Reinstale o Git e reinicie o terminal.

### Erro: "fatal: not a git repository"
**Solução:** Execute `git init` na pasta do projeto.

### Erro: "Permission denied" no push
**Solução:** 
- Verifique se está usando Personal Access Token (não senha)
- Verifique se o token tem permissão `repo`

### Erro: "remote origin already exists"
**Solução:**
```powershell
git remote remove origin
git remote add origin https://github.com/SEU_USERNAME/Projeto_Casais_RFI.git
```

### Esqueci de fazer commit e perdi código
**Solução:**
```powershell
# Ver histórico
git reflog

# Recuperar commit perdido
git checkout COMMIT_HASH
```

---

## ✅ CHECKLIST

- [ ] Git instalado (`git --version` funciona)
- [ ] Nome e email configurados
- [ ] Repositório inicializado (`git init`)
- [ ] Repositório criado no GitHub
- [ ] Remote adicionado
- [ ] Commit inicial feito
- [ ] Push realizado com sucesso

---

## 🎯 RESUMO RÁPIDO

```powershell
# Configuração inicial (uma vez)
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"

# No projeto (primeira vez)
git init
git add .
git commit -m "Initial commit: CASAIS FLEET INTELLIGENCE"
git remote add origin https://github.com/SEU_USERNAME/Projeto_Casais_RFI.git
git branch -M main
git push -u origin main

# Commits futuros
git add .
git commit -m "mensagem do que mudou"
git push
```

---

**Pronto!** Agora você tem controle de versão completo! 🎉

