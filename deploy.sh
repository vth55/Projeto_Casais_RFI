#!/bin/bash
ROOT="/mnt/c/Users/vitor/OneDrive/Área de Trabalho/Projeto_Casais_RFI"
cd "$ROOT/Frontend_App/dashboard" && npm run build && mkdir -p "$ROOT/Backend_Cloud/public" && cp -r dist/. "$ROOT/Backend_Cloud/public/" && cd "$ROOT/Backend_Cloud" && firebase deploy --only hosting,functions
