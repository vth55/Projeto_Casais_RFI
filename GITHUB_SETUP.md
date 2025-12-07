# 🚀 Configuração GitHub - CASAIS FLEET INTELLIGENCE

Guia para conectar o projeto ao GitHub e fazer backup das versões.

## 📋 Pré-requisitos

### Opção 1: Git via Terminal (Recomendado)

1. **Instalar Git para Windows:**
   - Download: https://git-scm.com/download/win
   - Instalar com opções padrão
   - Reiniciar terminal após instalação

2. **Verificar instalação:**
   ```bash
   git --version
   ```

### Opção 2: GitHub Desktop (Mais Fácil)

1. **Instalar GitHub Desktop:**
   - Download: https://desktop.github.com/
   - Instalar e fazer login com conta GitHub

## 🔧 Configuração Inicial

### 1. Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. **Repository name:** `Projeto_Casais_RFI` (ou outro nome)
3. **Description:** "Sistema de Gestão Inteligente de Frotas - Grupo Casais"
4. **Visibility:** 
   - ✅ **Private** (recomendado - projeto acadêmico)
   - ⚠️ Public (se quiser compartilhar)
5. **NÃO marque** "Add a README file" (já temos)
6. Clique em **"Create repository"**

### 2. Configurar Git Localmente

**Se usar Git via Terminal:**

```bash
# 1. Inicializar repositório (se ainda não estiver)
git init

# 2. Configurar nome e email (primeira vez)
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"

# 3. Adicionar todos os arquivos
git add .

# 4. Fazer commit inicial
git commit -m "Initial commit: CASAIS FLEET INTELLIGENCE"

# 5. Adicionar remote do GitHub (substitua USERNAME pelo seu)
git remote add origin https://github.com/USERNAME/Projeto_Casais_RFI.git

# 6. Renomear branch principal para main (se necessário)
git branch -M main

# 7. Fazer push inicial
git push -u origin main
```

**Se usar GitHub Desktop:**

1. Abra GitHub Desktop
2. File → Add Local Repository
3. Escolha a pasta: `C:\Users\vitor\OneDrive\Área de Trabalho\Projeto_Casais_RFI`
4. Clique em "Publish repository"
5. Escolha nome, descrição e visibilidade
6. Clique em "Publish repository"

## 📝 Estrutura do .gitignore

O arquivo `.gitignore` já está configurado para **NÃO** commitar:
- ✅ `node_modules/` (dependências)
- ✅ `.env` (chaves API - **IMPORTANTE!**)
- ✅ Arquivos temporários
- ✅ Builds e logs
- ✅ Configurações locais

## 🔒 Segurança - Chaves API

**⚠️ IMPORTANTE:** O arquivo `.env` está no `.gitignore` e **NÃO será commitado**.

Isso significa:
- ✅ Sua `GEMINI_API_KEY` está segura
- ✅ Outras chaves não serão expostas
- ⚠️ **NUNCA** remova `.env` do `.gitignore`

## 📤 Workflow de Commits

### Commits Regulares

```bash
# 1. Ver o que mudou
git status

# 2. Adicionar arquivos modificados
git add .

# 3. Fazer commit com mensagem descritiva
git commit -m "feat: adiciona sistema de tarifários"

# 4. Enviar para GitHub
git push
```

### Mensagens de Commit (Convenções)

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Manutenção

**Exemplos:**
```bash
git commit -m "feat: implementa cálculo de custos por sessão"
git commit -m "fix: corrige bug no cálculo de emissões CO₂"
git commit -m "docs: atualiza documentação de tarifários"
```

## 🔄 Trabalhar com Branches (Opcional)

Para trabalhar em features sem afetar o código principal:

```bash
# Criar nova branch
git checkout -b feature/tarifarios

# Trabalhar normalmente...
# Fazer commits...

# Voltar para main
git checkout main

# Mesclar feature
git merge feature/tarifarios

# Enviar para GitHub
git push
```

## 📊 Ver Histórico

```bash
# Ver commits
git log

# Ver mudanças em um arquivo
git log --follow -- Frontend_App/dashboard/src/App.jsx

# Ver diferenças
git diff
```

## 🆘 Problemas Comuns

### Erro: "fatal: not a git repository"

**Solução:**
```bash
git init
```

### Erro: "remote origin already exists"

**Solução:**
```bash
# Ver remotes
git remote -v

# Remover e adicionar novamente
git remote remove origin
git remote add origin https://github.com/USERNAME/Projeto_Casais_RFI.git
```

### Erro: "Permission denied"

**Solução:**
1. Verificar se está logado no GitHub
2. Usar token de acesso pessoal (Settings → Developer settings → Personal access tokens)

### Esqueci de fazer commit e perdi código

**Solução:**
```bash
# Ver commits recentes
git reflog

# Recuperar commit perdido
git checkout COMMIT_HASH
```

## ✅ Checklist Antes do Primeiro Push

- [ ] Git instalado e configurado
- [ ] Repositório criado no GitHub
- [ ] `.gitignore` verificado (`.env` está lá?)
- [ ] Nome e email configurados
- [ ] Repositório local inicializado
- [ ] Commit inicial feito
- [ ] Remote adicionado
- [ ] Push realizado com sucesso

## 🎯 Próximos Passos

1. **Fazer commits regulares:**
   - Após cada feature implementada
   - Após correções importantes
   - Antes de fazer mudanças grandes

2. **Criar tags para versões:**
   ```bash
   git tag -a v1.0.0 -m "Versão inicial funcional"
   git push origin v1.0.0
   ```

3. **Usar Issues no GitHub:**
   - Para rastrear bugs
   - Para planejar features
   - Para documentar problemas

## 📚 Recursos

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

---

**Última atualização**: 2025-01-15
**Status**: ✅ Pronto para configurar

