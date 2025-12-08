# Script: Configurar Git e Enviar Projeto para GitHub
# Execute este script DEPOIS de instalar o Git

Write-Host "🚀 Configurando Git e Enviando Projeto para GitHub" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Git está instalado
Write-Host "📦 Verificando Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Git não encontrado"
    }
    Write-Host "✅ $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git não está instalado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale o Git primeiro:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "2. Baixe e instale" -ForegroundColor White
    Write-Host "3. Feche e reabra o terminal" -ForegroundColor White
    Write-Host "4. Execute este script novamente" -ForegroundColor White
    Read-Host "`nPressione Enter para sair"
    exit 1
}

Write-Host ""

# Configurar Git (se necessário)
Write-Host "⚙️  Configurando Git..." -ForegroundColor Yellow
$currentName = git config --global user.name 2>$null
$currentEmail = git config --global user.email 2>$null

if (-not $currentName -or -not $currentEmail) {
    Write-Host "📝 Configure seu Git:" -ForegroundColor Yellow
    $nome = Read-Host "Digite seu nome"
    $email = Read-Host "Digite seu email"
    
    git config --global user.name "$nome"
    git config --global user.email "$email"
    Write-Host "✅ Git configurado!" -ForegroundColor Green
} else {
    Write-Host "✅ Git já configurado: $currentName <$currentEmail>" -ForegroundColor Green
}

Write-Host ""

# Inicializar repositório
Write-Host "📁 Inicializando repositório..." -ForegroundColor Yellow
if (Test-Path .git) {
    Write-Host "✅ Repositório já inicializado" -ForegroundColor Green
} else {
    git init
    Write-Host "✅ Repositório inicializado!" -ForegroundColor Green
}

Write-Host ""

# Verificar .gitignore
Write-Host "🔒 Verificando segurança..." -ForegroundColor Yellow
if (Test-Path .gitignore) {
    $envInGitignore = Select-String -Path .gitignore -Pattern "^\.env$" -Quiet
    if ($envInGitignore) {
        Write-Host "✅ Arquivo .env está protegido" -ForegroundColor Green
    } else {
        Add-Content -Path .gitignore -Value "`n.env"
        Write-Host "✅ Proteção adicionada ao .env" -ForegroundColor Green
    }
} else {
    Write-Host ".env" | Out-File -FilePath .gitignore -Encoding utf8
    Write-Host "✅ .gitignore criado com proteção do .env" -ForegroundColor Green
}

Write-Host ""

# Adicionar arquivos
Write-Host "📝 Adicionando arquivos..." -ForegroundColor Yellow
git add .
$status = git status --short

if ($status) {
    Write-Host "✅ Arquivos preparados para commit" -ForegroundColor Green
    Write-Host ""
    
    # Fazer commit
    Write-Host "💾 Fazendo commit inicial..." -ForegroundColor Yellow
    git commit -m "Initial commit: CASAIS FLEET INTELLIGENCE - Estado atual do projeto" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Commit criado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Nenhuma mudança para commitar" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  Nenhuma mudança para commitar" -ForegroundColor Cyan
}

Write-Host ""

# Conectar ao GitHub
Write-Host "☁️  Configurando GitHub..." -ForegroundColor Yellow
$remote = git remote get-url origin 2>$null

if ($remote) {
    Write-Host "✅ Remote já configurado: $remote" -ForegroundColor Green
    Write-Host ""
    $alterar = Read-Host "Deseja alterar o remote? (s/N)"
    if ($alterar -eq "s" -or $alterar -eq "S") {
        git remote remove origin
        $remote = $null
    }
}

if (-not $remote) {
    Write-Host ""
    Write-Host "📋 ANTES DE CONTINUAR:" -ForegroundColor Yellow
    Write-Host "   Crie um repositório no GitHub:" -ForegroundColor White
    Write-Host "   https://github.com/new" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Configurações recomendadas:" -ForegroundColor Yellow
    Write-Host "   - Nome: Projeto_Casais_RFI" -ForegroundColor White
    Write-Host "   - Visibilidade: Private" -ForegroundColor White
    Write-Host "   - NÃO marque 'Add a README'" -ForegroundColor White
    Write-Host ""
    
    $username = Read-Host "Digite seu username do GitHub"
    $repoName = Read-Host "Digite o nome do repositório (Enter para 'Projeto_Casais_RFI')"
    
    if ([string]::IsNullOrWhiteSpace($repoName)) {
        $repoName = "Projeto_Casais_RFI"
    }
    
    git remote add origin "https://github.com/$username/$repoName.git"
    Write-Host "✅ Remote adicionado!" -ForegroundColor Green
    
    # Renomear branch
    git branch -M main 2>$null
}

Write-Host ""

# Fazer push
Write-Host "🚀 Preparando para enviar ao GitHub..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANTE - Credenciais:" -ForegroundColor Yellow
Write-Host "   Na primeira vez, vai pedir:" -ForegroundColor White
Write-Host "   - Username: seu username do GitHub" -ForegroundColor White
Write-Host "   - Password: use um Personal Access Token (NÃO a senha normal)" -ForegroundColor White
Write-Host ""
Write-Host "   Como criar token:" -ForegroundColor Cyan
Write-Host "   1. GitHub → Settings → Developer settings" -ForegroundColor White
Write-Host "   2. Personal access tokens → Tokens (classic)" -ForegroundColor White
Write-Host "   3. Generate new token (classic)" -ForegroundColor White
Write-Host "   4. Marque 'repo' (acesso completo)" -ForegroundColor White
Write-Host "   5. Generate e copie o token" -ForegroundColor White
Write-Host ""
Write-Host "   Ou use GitHub Desktop (mais fácil):" -ForegroundColor Cyan
Write-Host "   https://desktop.github.com/" -ForegroundColor White
Write-Host ""

$fazerPush = Read-Host "Deseja fazer push agora? (S/n)"
if ($fazerPush -ne "n" -and $fazerPush -ne "N") {
    Write-Host ""
    Write-Host "📤 Enviando para GitHub..." -ForegroundColor Yellow
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 SUCESSO! Projeto enviado para GitHub!" -ForegroundColor Green
        Write-Host ""
        $remote = git remote get-url origin 2>$null
        if ($remote) {
            $url = $remote -replace '\.git$', ''
            Write-Host "📍 Seu projeto está em:" -ForegroundColor Cyan
            Write-Host "   $url" -ForegroundColor White
        }
    } else {
        Write-Host ""
        Write-Host "❌ Erro no push. Verifique:" -ForegroundColor Red
        Write-Host "   - Credenciais (use Personal Access Token)" -ForegroundColor White
        Write-Host "   - Repositório criado no GitHub" -ForegroundColor White
        Write-Host "   - URL do remote está correta" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "⏭️  Push cancelado. Execute 'git push -u origin main' quando estiver pronto." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Para futuros commits:" -ForegroundColor Cyan
Write-Host "   git add ." -ForegroundColor Yellow
Write-Host "   git commit -m 'mensagem'" -ForegroundColor Yellow
Write-Host "   git push" -ForegroundColor Yellow
Write-Host ""

