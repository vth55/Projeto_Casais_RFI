# Script Completo: Instalar e Configurar Git + GitHub
# Execute este script no PowerShell

Write-Host "🚀 Configuração Completa Git + GitHub" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# PASSO 1: Verificar/Instalar Git
# ============================================
Write-Host "📦 Passo 1: Verificando Git..." -ForegroundColor Yellow

try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Git já está instalado: $gitVersion" -ForegroundColor Green
    } else {
        throw "Git não encontrado"
    }
} catch {
    Write-Host "❌ Git não está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Tentando instalar via Winget..." -ForegroundColor Yellow
    
    # Tentar instalar via winget
    try {
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
        Write-Host "✅ Git instalado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANTE: Feche e reabra o terminal, depois execute este script novamente!" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Pressione Enter para sair"
        exit
    } catch {
        Write-Host "❌ Não foi possível instalar automaticamente" -ForegroundColor Red
        Write-Host ""
        Write-Host "📥 Por favor, instale manualmente:" -ForegroundColor Yellow
        Write-Host "   1. Acesse: https://git-scm.com/download/win" -ForegroundColor White
        Write-Host "   2. Baixe e instale o Git" -ForegroundColor White
        Write-Host "   3. Feche e reabra o terminal" -ForegroundColor White
        Write-Host "   4. Execute este script novamente" -ForegroundColor White
        Write-Host ""
        Read-Host "Pressione Enter para sair"
        exit
    }
}

Write-Host ""

# ============================================
# PASSO 2: Configurar Git (se necessário)
# ============================================
Write-Host "⚙️  Passo 2: Configurando Git..." -ForegroundColor Yellow

$currentName = git config --global user.name 2>$null
$currentEmail = git config --global user.email 2>$null

if ($currentName -and $currentEmail) {
    Write-Host "✅ Git já configurado:" -ForegroundColor Green
    Write-Host "   Nome: $currentName" -ForegroundColor White
    Write-Host "   Email: $currentEmail" -ForegroundColor White
    Write-Host ""
    $configurar = Read-Host "Deseja alterar? (s/N)"
    if ($configurar -ne "s" -and $configurar -ne "S") {
        Write-Host "✅ Mantendo configuração atual" -ForegroundColor Green
    } else {
        $currentName = $null
        $currentEmail = $null
    }
}

if (-not $currentName -or -not $currentEmail) {
    Write-Host ""
    Write-Host "📝 Configure seu Git:" -ForegroundColor Yellow
    $nome = Read-Host "Digite seu nome"
    $email = Read-Host "Digite seu email"
    
    git config --global user.name "$nome"
    git config --global user.email "$email"
    
    Write-Host "✅ Git configurado!" -ForegroundColor Green
}

Write-Host ""

# ============================================
# PASSO 3: Inicializar Repositório
# ============================================
Write-Host "📁 Passo 3: Inicializando repositório Git..." -ForegroundColor Yellow

if (Test-Path .git) {
    Write-Host "✅ Repositório Git já inicializado" -ForegroundColor Green
} else {
    git init
    Write-Host "✅ Repositório inicializado!" -ForegroundColor Green
}

Write-Host ""

# ============================================
# PASSO 4: Verificar .gitignore
# ============================================
Write-Host "🔒 Passo 4: Verificando segurança (.gitignore)..." -ForegroundColor Yellow

if (Test-Path .gitignore) {
    $envInGitignore = Select-String -Path .gitignore -Pattern "^\.env$" -Quiet
    if ($envInGitignore) {
        Write-Host "✅ Arquivo .env está protegido (não será enviado ao GitHub)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  .env não está no .gitignore - adicionando..." -ForegroundColor Yellow
        Add-Content -Path .gitignore -Value "`n.env"
        Write-Host "✅ Proteção adicionada!" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  .gitignore não encontrado - criando..." -ForegroundColor Yellow
    Write-Host ".env" | Out-File -FilePath .gitignore -Encoding utf8
    Write-Host "✅ .gitignore criado!" -ForegroundColor Green
}

Write-Host ""

# ============================================
# PASSO 5: Adicionar arquivos e fazer commit
# ============================================
Write-Host "📝 Passo 5: Preparando commit inicial..." -ForegroundColor Yellow

git add .
$status = git status --short

if ($status) {
    Write-Host "✅ Arquivos preparados para commit" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Arquivos que serão commitados:" -ForegroundColor Cyan
    git status --short | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
    Write-Host ""
    
    $fazerCommit = Read-Host "Deseja fazer commit inicial? (S/n)"
    if ($fazerCommit -ne "n" -and $fazerCommit -ne "N") {
        git commit -m "Initial commit: CASAIS FLEET INTELLIGENCE"
        Write-Host "✅ Commit inicial criado!" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Commit cancelado" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  Nenhuma mudança para commitar" -ForegroundColor Cyan
}

Write-Host ""

# ============================================
# PASSO 6: Conectar ao GitHub
# ============================================
Write-Host "☁️  Passo 6: Conectar ao GitHub..." -ForegroundColor Yellow

$remote = git remote get-url origin 2>$null

if ($remote) {
    Write-Host "✅ Remote já configurado: $remote" -ForegroundColor Green
    Write-Host ""
    $alterar = Read-Host "Deseja alterar? (s/N)"
    if ($alterar -eq "s" -or $alterar -eq "S") {
        git remote remove origin
        $remote = $null
    }
}

if (-not $remote) {
    Write-Host ""
    Write-Host "📋 ANTES DE CONTINUAR:" -ForegroundColor Yellow
    Write-Host "   1. Crie um repositório no GitHub:" -ForegroundColor White
    Write-Host "      https://github.com/new" -ForegroundColor Cyan
    Write-Host "   2. Nome: Projeto_Casais_RFI" -ForegroundColor White
    Write-Host "   3. Visibilidade: Private (recomendado)" -ForegroundColor White
    Write-Host "   4. NÃO marque 'Add a README'" -ForegroundColor White
    Write-Host ""
    
    $username = Read-Host "Digite seu username do GitHub"
    $repoName = Read-Host "Digite o nome do repositório (ou Enter para 'Projeto_Casais_RFI')"
    
    if ([string]::IsNullOrWhiteSpace($repoName)) {
        $repoName = "Projeto_Casais_RFI"
    }
    
    git remote add origin "https://github.com/$username/$repoName.git"
    Write-Host "✅ Remote adicionado!" -ForegroundColor Green
    
    # Renomear branch para main
    git branch -M main 2>$null
    
    Write-Host ""
    Write-Host "🚀 Pronto para fazer push!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "   Na primeira vez, vai pedir credenciais do GitHub." -ForegroundColor White
    Write-Host "   Use um Personal Access Token (não a senha normal)." -ForegroundColor White
    Write-Host ""
    Write-Host "   Como criar token:" -ForegroundColor Cyan
    Write-Host "   1. GitHub → Settings → Developer settings" -ForegroundColor White
    Write-Host "   2. Personal access tokens → Tokens (classic)" -ForegroundColor White
    Write-Host "   3. Generate new token (classic)" -ForegroundColor White
    Write-Host "   4. Marque 'repo' (acesso completo)" -ForegroundColor White
    Write-Host "   5. Generate e copie o token" -ForegroundColor White
    Write-Host ""
    
    $fazerPush = Read-Host "Deseja fazer push agora? (S/n)"
    if ($fazerPush -ne "n" -and $fazerPush -ne "N") {
        Write-Host ""
        Write-Host "📤 Fazendo push para GitHub..." -ForegroundColor Yellow
        git push -u origin main
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "🎉 SUCESSO! Projeto enviado para GitHub!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Erro no push. Verifique as credenciais." -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Próximos passos:" -ForegroundColor Cyan
Write-Host "   Para fazer commits futuros:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Yellow
Write-Host "   git commit -m 'mensagem'" -ForegroundColor Yellow
Write-Host "   git push" -ForegroundColor Yellow
Write-Host ""

