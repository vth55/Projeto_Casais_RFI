# Script de Configuração Git para CASAIS FLEET INTELLIGENCE
# Execute este script após instalar o Git

Write-Host "🚀 Configurando Git para CASAIS FLEET INTELLIGENCE" -ForegroundColor Cyan
Write-Host ""

# Verificar se Git está instalado
try {
    $gitVersion = git --version
    Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git não está instalado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale o Git primeiro:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "2. Baixe e instale o Git para Windows" -ForegroundColor Yellow
    Write-Host "3. Reinicie o terminal e execute este script novamente" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Configuração Inicial" -ForegroundColor Cyan
Write-Host ""

# Verificar se já é um repositório Git
if (Test-Path .git) {
    Write-Host "✅ Repositório Git já inicializado" -ForegroundColor Green
} else {
    Write-Host "Inicializando repositório Git..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Repositório inicializado" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Próximos Passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure seu nome e email (se ainda não fez):" -ForegroundColor Yellow
Write-Host "   git config --global user.name 'Seu Nome'" -ForegroundColor White
Write-Host "   git config --global user.email 'seu.email@exemplo.com'" -ForegroundColor White
Write-Host ""
Write-Host "2. Crie um repositório no GitHub:" -ForegroundColor Yellow
Write-Host "   - Acesse: https://github.com/new" -ForegroundColor White
Write-Host "   - Nome: Projeto_Casais_RFI" -ForegroundColor White
Write-Host "   - Visibilidade: Private (recomendado)" -ForegroundColor White
Write-Host "   - NÃO marque 'Add a README'" -ForegroundColor White
Write-Host ""
Write-Host "3. Adicione os arquivos e faça commit:" -ForegroundColor Yellow
Write-Host "   git add ." -ForegroundColor White
Write-Host "   git commit -m 'Initial commit: CASAIS FLEET INTELLIGENCE'" -ForegroundColor White
Write-Host ""
Write-Host "4. Conecte ao GitHub (substitua USERNAME):" -ForegroundColor Yellow
Write-Host "   git remote add origin https://github.com/USERNAME/Projeto_Casais_RFI.git" -ForegroundColor White
Write-Host "   git branch -M main" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "📚 Para mais detalhes, veja: GITHUB_SETUP.md" -ForegroundColor Cyan
Write-Host ""

