#!/bin/bash
source ~/.nvm/nvm.sh
PROMPT=$(cat CLAUDE_TASK.txt)
yes 'y' | claude -p "$PROMPT" > CLAUDE_REPLY.txt 2>&1
