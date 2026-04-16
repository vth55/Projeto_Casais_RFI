# Script: Limpar Logs e Temporários
# Uso: Manutenção de higiene do diretório

Write-Host "🧹 Limpando ambiente..." -ForegroundColor Yellow

$paths = @(
    "*.log",
    "functions/*.log",
    "dashboard/dist",
    "Backend_Cloud/public/*.tmp"
)

foreach ($p in $paths) {
    if (Test-Path $p) {
        Remove-Item $p -Recurse -Force
        Write-Host "✅ Removido: $p" -ForegroundColor Green
    }
}

Write-Host "`n✨ Ambiente limpo!" -ForegroundColor Cyan
