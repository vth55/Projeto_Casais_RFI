#!/bin/bash

PROJETO="/mnt/c/Users/vitor/OneDrive/Área de Trabalho/Projeto_Casais_RFI/Frontend_App/dashboard"
PORT=5173

echo ""
echo "======================================"
echo "  CASAIS FLEET — Mobile Hub Launcher  "
echo "======================================"
echo ""

# 1. Matar processos antigos
echo "[1/4] A limpar processos antigos..."
pkill -f "vite" 2>/dev/null
pkill -f "ngrok" 2>/dev/null
sleep 2

# 2. Instalar dependências se necessário
echo "[2/4] A verificar dependências..."
cd "$PROJETO" && npm install --silent 2>/dev/null

# 3. Iniciar Vite na porta fixa 5173
echo "[3/4] A iniciar servidor frontend na porta $PORT..."
npm run dev -- --host --port $PORT > /tmp/vite_output.log 2>&1 &
VITE_PID=$!

# Esperar o servidor arrancar (máx 15 segundos)
echo "      A aguardar arranque..."
for i in $(seq 1 15); do
    sleep 1
    if grep -q "Local:" /tmp/vite_output.log 2>/dev/null; then
        break
    fi
done

# 4. Iniciar ngrok
echo "[4/4] A criar túnel público..."
echo ""

# Trap para matar tudo quando o script fechar
trap "echo ''; echo 'A parar tudo...'; kill $VITE_PID 2>/dev/null; pkill -f ngrok 2>/dev/null; exit" INT TERM EXIT

ngrok http $PORT --log=stdout | while IFS= read -r line; do
    echo "$line"
    if echo "$line" | grep -q "Forwarding"; then
        URL=$(echo "$line" | grep -oP 'https://[^ ]+')
        echo ""
        echo "============================================"
        echo "  ABRE ESTE LINK NO TELEMOVEL (Chrome):"
        echo ""
        echo "  Ver app normal:  $URL"
        echo "  Ver como maquina: $URL/mobile-hub"
        echo "============================================"
        echo ""
    fi
done
