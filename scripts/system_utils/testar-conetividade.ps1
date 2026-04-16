# Script: Testar Conetividade Casais Fleet Intelligence
# Uso: Diagnóstico rápido de rede em ambiente de obra

Write-Host "🔍 Iniciando Diagnóstico de Rede..." -ForegroundColor Cyan

$targets = @(
    @{ Name = "Google DNS"; Host = "8.8.8.8" },
    @{ Name = "Firebase Database"; Host = "firebaseio.com" },
    @{ Name = "Procore API"; Host = "api.procore.com" },
    @{ Name = "Firebase Cloud Functions"; Host = "cloudfunctions.net" }
)

foreach ($target in $targets) {
    Write-Host "Testing $($target.Name) ($($target.Host))..." -NoNewline
    if (Test-Connection -ComputerName $target.Host -Count 1 -Quiet) {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [FALHOU]" -ForegroundColor Red
    }
}

Write-Host "`n✅ Diagnóstico Concluído." -ForegroundColor Cyan
