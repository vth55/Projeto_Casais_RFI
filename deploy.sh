#!/bin/bash
ROOT="/mnt/c/Users/vitor/OneDrive/Área de Trabalho/Projeto_Casais_RFI"

echo "[1/2] A fazer build e deploy do frontend..."
cd "$ROOT/Frontend_App/dashboard" && npm run build && mkdir -p "$ROOT/Backend_Cloud/public" && cp -r dist/. "$ROOT/Backend_Cloud/public/" && cd "$ROOT/Backend_Cloud" && firebase deploy --only hosting

echo ""
echo "[2/2] A tentar deploy das functions (requer plano Blaze)..."
FUNCTIONS_DISCOVERY_TIMEOUT=30000 firebase deploy --only functions || echo "⚠  Functions não foram atualizadas (ativar billing em console.firebase.google.com)"
