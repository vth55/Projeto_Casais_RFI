# 🔧 Instalar e Configurar Git via Terminal

## Passo 1: Instalar Git

### Opção A: Download Manual (Recomendado)

1. **Baixar Git:**
   - Acesse: https://git-scm.com/download/win
   - Clique em "Download for Windows"
   - Execute o instalador

2. **Durante a instalação:**
   - ✅ Use opções padrão (Next, Next, Next...)
   - ✅ Marque "Git from the command line and also from 3rd-party software"
   - ✅ Use "Use bundled OpenSSH"
   - ✅ Use "Use the OpenSSL library"
   - ✅ Use "Checkout Windows-style, commit Unix-style line endings"
   - ✅ Use "Use Windows' default console window"
   - ✅ Use "Default (fast-forward or merge)"
   - ✅ Use "Git Credential Manager"

3. **Após instalar:**
   - **FECHE e REABRA o terminal** (PowerShell)
   - Execute: `git --version` para verificar

### Opção B: Via Winget (Windows 10/11)

```powershell
winget install --id Git.Git -e --source winget
```

Depois, **feche e reabra o terminal**.

---

## Passo 2: Verificar Instalação

```powershell
git --version
```

**Deve mostrar:** `git version 2.x.x`

---

## Passo 3: Configurar Git (Primeira Vez)

```powershell
# Configurar nome
git config --global user.name "Seu Nome"

# Configurar email
git config --global user.email "seu.email@exemplo.com"

# Verificar configuração
git config --list
```

---

## Passo 4: Inicializar Repositório no Projeto

```powershell
# Ir para a pasta do projeto (já deve estar lá)
cd "C:\Users\vitor\OneDrive\Área de Trabalho\Projeto_Casais_RFI"

# Inicializar Git
git init

# Verificar status
git status
```

---

## Passo 5: Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. **Repository name:** `Projeto_Casais_RFI`
3. **Description:** "Sistema de Gestão Inteligente de Frotas - Grupo Casais"
4. ✅ Marque **"Private"** (recomendado)
5. ❌ **NÃO marque** "Add a README file"
6. Clique em **"Create repository"**

---

## Passo 6: Conectar e Fazer Primeiro Push

```powershell
# Adicionar todos os arquivos
git add .

# Fazer commit inicial
git commit -m "Initial commit: CASAIS FLEET INTELLIGENCE"

# Adicionar remote (substitua SEU_USERNAME)
git remote add origin https://github.com/SEU_USERNAME/Projeto_Casais_RFI.git

# Renomear branch para main
git branch -M main

# Fazer push (vai pedir login do GitHub)
git push -u origin main
```

**Nota:** Na primeira vez, vai pedir credenciais do GitHub. Use:
- **Username:** seu username do GitHub
- **Password:** use um **Personal Access Token** (não a senha normal)

### Criar Personal Access Token:

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Marque: `repo` (acesso completo a repositórios)
4. Generate token
5. **Copie o token** (só aparece uma vez!)
6. Use este token como senha no terminal

---

## ✅ Pronto!

Agora o projeto está no GitHub! Para futuros commits:

```powershell
git add .
git commit -m "mensagem do que mudou"
git push
```

