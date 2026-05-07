---
name: Playwright Usage
description: Quando usar MCP vs CLI para Playwright neste projecto
type: project
relevance: playwright, screenshot, browser, mcp, teste, visual
---

# Playwright Usage

## MCP (sessão interativa — Claude vê o conteúdo da página)
Usar quando Claude precisa de **ler** o que está no browser (texto, estrutura, estado).
Exemplos:
- Navegar no Procore sandbox e verificar se Equipment Tool está ativa
- Fazer OAuth callback e confirmar que token foi guardado
- Debug visual de UI — Claude vê o DOM

Comandos disponíveis via MCP: `mcp__playwright__browser_navigate`, `browser_snapshot`, `browser_click`, etc.

**Pedir login antes** de navegar em sites autenticados (Procore, Firebase Console).

## CLI (scripts / `/screenshot` skill)
Usar quando só precisa de tirar uma screenshot sem interação:
```bash
npx playwright screenshot --browser chromium URL ficheiro.png
```
Usado pelo skill `/screenshot` — Claude não vê o conteúdo, só captura.

## Regra simples
- Preciso de **ler/interagir** → MCP
- Preciso só de **capturar** → CLI via `/screenshot`
