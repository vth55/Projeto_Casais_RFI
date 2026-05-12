#!/bin/bash
# Bloqueia comandos git destrutivos antes de executar

COMMAND=$(cat)

# Bloqueia skip de hooks
if echo "$COMMAND" | grep -q '\-\-no-verify'; then
  echo "BLOQUEADO: --no-verify não é permitido neste projecto. Corrige o problema que o hook detectou." >&2
  exit 1
fi

# Bloqueia force push para main/master
if echo "$COMMAND" | grep -qE 'git push.*(--force|-f).*(main|master)'; then
  echo "BLOQUEADO: force push para main/master não é permitido. Usa uma branch separada." >&2
  exit 1
fi

# Bloqueia reset hard sem confirmação explícita
if echo "$COMMAND" | grep -qE 'git reset --hard'; then
  echo "AVISO: git reset --hard detectado. Confirma que tens tudo commitado ou stashed antes de continuar." >&2
  # Não bloqueia — só avisa
fi

# Passa o comando original
echo "$COMMAND"
