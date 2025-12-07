# ⚡ Guia Rápido - Conectar ao GitHub

## 🎯 Opção Mais Fácil: GitHub Desktop

### 1. Instalar GitHub Desktop
- Download: https://desktop.github.com/
- Instalar e fazer login com sua conta GitHub

### 2. Publicar Projeto
1. Abra GitHub Desktop
2. **File** → **Add Local Repository**
3. Escolha: `C:\Users\vitor\OneDrive\Área de Trabalho\Projeto_Casais_RFI`
4. Clique em **"Publish repository"**
5. Nome: `Projeto_Casais_RFI`
6. Descrição: "Sistema de Gestão Inteligente de Frotas - Grupo Casais"
7. ✅ Marque **"Keep this code private"** (recomendado)
8. Clique em **"Publish repository"**

**Pronto!** Seu projeto está no GitHub! 🎉

---

## 🔧 Opção Avançada: Git via Terminal

### 1. Instalar Git
- Download: https://git-scm.com/download/win
- Instalar com opções padrão
- Reiniciar terminal

### 2. Executar Comandos

```powershell
# Verificar instalação
git --version

# Inicializar repositório
git init

# Configurar (primeira vez)
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"

# Adicionar arquivos
git add .

# Commit inicial
git commit -m "Initial commit: CASAIS FLEET INTELLIGENCE"

# Criar repositório no GitHub primeiro (https://github.com/new)
# Depois conectar:
git remote add origin https://github.com/SEU_USERNAME/Projeto_Casais_RFI.git
git branch -M main
git push -u origin main
```

---

## ⚠️ IMPORTANTE - Segurança

O arquivo `.env` com suas chaves API **NÃO será enviado** para o GitHub (está no `.gitignore`).

✅ **Seguro:** Suas chaves ficam apenas no seu computador.

---

## 📝 Depois do Primeiro Push

### Fazer Commits Regulares

**GitHub Desktop:**
1. Ver mudanças na aba "Changes"
2. Escrever mensagem de commit
3. Clicar em "Commit to main"
4. Clicar em "Push origin"

**Terminal:**
```bash
git add .
git commit -m "feat: adiciona nova funcionalidade"
git push
```

---

## 🆘 Problemas?

- **"Git não encontrado"** → Instale o Git primeiro
- **"Permission denied"** → Verifique login no GitHub
- **"Repository not found"** → Crie o repositório no GitHub primeiro

---

**Recomendação:** Use GitHub Desktop se não estiver familiarizado com Git! É muito mais fácil. 😊

