---
name: screenshot
description: Tira screenshot de um URL usando npx playwright e guarda num ficheiro
---

Tira um screenshot usando o Playwright CLI.

Uso: `/screenshot URL ficheiro`
Exemplo: `/screenshot http://localhost:5173 docs/sessions/screenshot.png`

Executa:
```bash
npx playwright screenshot --browser chromium "$URL" "$FICHEIRO"
```

Se não houver argumento, usa `http://localhost:5173` como URL e `docs/sessions/screenshot-$(date +%Y%m%d-%H%M).png` como ficheiro.

Após tirar o screenshot, confirma o path onde foi guardado.

Nota: para inspecionar conteúdo do browser (DOM, texto, estado), usar MCP Playwright em vez deste comando.
