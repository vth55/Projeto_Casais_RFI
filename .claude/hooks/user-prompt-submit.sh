#!/bin/bash
# Keyword routing: injeta memory files relevantes com base no prompt do utilizador

PROMPT=$(cat)
MEMORY_DIR="$(dirname "$0")/../memory"

inject() {
  local file="$1"
  if [ -f "$file" ]; then
    echo "--- MEMORY INJECT: $file ---"
    cat "$file"
    echo "---"
  fi
}

# Procore (só palavras inteiras — evita falsos positivos)
if echo "$PROMPT" | grep -qiE '\bprocore\b'; then
  inject "$MEMORY_DIR/project/procore.md"
fi

# Firestore / sessões / tarifários / obras / operadores
if echo "$PROMPT" | grep -qiE '\b(firestore|sess(oe|ã)o|sess(oe|õe)s|tarif|obra|operator)\b'; then
  inject "$MEMORY_DIR/project/architecture.md"
  inject "$MEMORY_DIR/patterns/firestore-quirks.md"
fi

# Deploy / build / hosting / functions
if echo "$PROMPT" | grep -qiE '\b(deploy|build|hosting|function)\b'; then
  inject "$MEMORY_DIR/patterns/deploy-workflow.md"
fi

# UI / CSS / Tailwind / branding / cor / design
if echo "$PROMPT" | grep -qiE '\b(tailwind|css|cor|color|brand|design|azul|verde|#005)\b'; then
  inject "$MEMORY_DIR/project/branding.md"
fi

# Playwright / screenshot / browser
if echo "$PROMPT" | grep -qiE '\b(playwright|screenshot|browser)\b'; then
  inject "$MEMORY_DIR/patterns/playwright-usage.md"
fi

# Gemini / opus / delegar / agente / workflow ai
if echo "$PROMPT" | grep -qiE '\b(gemini|opus|delegar|workflow.?ai)\b'; then
  inject "$MEMORY_DIR/project/ai_workflow.md"
fi

# FINDINGS.md grep — só as linhas relevantes ao prompt (evita dump do ficheiro todo)
FINDINGS="$(dirname "$0")/../../FINDINGS.md"
if [ -f "$FINDINGS" ]; then
  # Extrai keywords principais do prompt (palavras com 4+ chars)
  KEYWORDS=$(echo "$PROMPT" | grep -oE '\b[a-zA-Z]{4,}\b' | sort -u | head -5 | tr '\n' '|' | sed 's/|$//')
  if [ -n "$KEYWORDS" ]; then
    MATCHES=$(grep -iE "$KEYWORDS" "$FINDINGS" 2>/dev/null | head -5)
    if [ -n "$MATCHES" ]; then
      echo "--- FINDINGS.md matches ---"
      echo "$MATCHES"
      echo "---"
    fi
  fi
fi

# Re-emite o prompt original para o Claude
echo "$PROMPT"
