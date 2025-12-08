# 🤖 Configuração Gemini para Desenvolvimento (Claude Code)

Este documento explica como o Gemini está configurado para uso como agente auxiliar no desenvolvimento, através do Claude Code.

## 📋 Visão Geral

O **Gemini NÃO é usado no PWA** (aplicação web). Ele é usado por **VOCÊ** (desenvolvedor) através do **Claude Code** como agente auxiliar para:
- ✅ Poupar tokens do Claude (usar Gemini para consultas simples)
- ✅ Code reviews (economizar tokens)
- ✅ Análises e discussões técnicas
- ✅ Explicações de código

## 🔧 Configuração Atual

### 1. API Key Configurada

A API key está no arquivo `.env` na raiz do projeto:
```
GEMINI_API_KEY=AIzaSyBV-AGKOeiiyp_edXHMesNxIV-CJE2cCVs
```

### 2. Claude Code Settings

O arquivo `.claude/settings.json` está configurado para:
- ✅ Permitir uso do MCP server do Gemini
- ✅ Ler a variável `GEMINI_API_KEY` do `.env`

```json
{
  "permissions": {
    "allow": [
      "mcp__gemini-api__*"
    ]
  },
  "env": {
    "GEMINI_API_KEY": "${GEMINI_API_KEY}"
  }
}
```

### 3. Comandos Personalizados

Você tem comandos configurados em `.claude/commands/`:

- **`/gemini [pergunta]`** - Consultar Gemini para análise ou discussão
- **`/review [ficheiro]`** - Code review com Gemini (economiza tokens Claude)
- **`/explain [código]`** - Explicar código ou conceito com Gemini

## 🚀 Como Usar

### Uso Básico

No Claude Code, você pode usar os comandos:

```
/gemini Como implementar autenticação Firebase no React?
```

```
/review Frontend_App/dashboard/src/components/Button.jsx
```

```
/explain Como funciona o sistema de sessões no backend?
```

### Workflow Recomendado

1. **Planeamento/Discussão**: Use `/gemini` (gratuito, poupa tokens Claude)
2. **Implementação**: Use Claude diretamente (melhor para código)
3. **Code Review**: Use `/review` antes de commit (economiza tokens)

## 💰 Custos

### Modelo Usado
- **Gemini 2.0 Flash** (através do MCP server)
- **Custo**: **GRATUITO** ✅ (tier gratuito para estudantes)

### Limites do Tier Gratuito
- ~15 requests por minuto
- ~1000 requests por dia
- Suficiente para desenvolvimento

### Por Que Usar Gemini?
- **Economia**: Cada consulta ao Gemini poupa tokens do Claude
- **Gratuito**: Gemini 2.0 Flash é gratuito para estudantes
- **Eficiência**: Use Gemini para tarefas simples, Claude para código complexo

## 🔍 Verificar Configuração

### 1. Verificar API Key

```bash
# No terminal (raiz do projeto)
cat .env | grep GEMINI_API_KEY
```

Deve mostrar:
```
GEMINI_API_KEY=AIzaSyBV-AGKOeiiyp_edXHMesNxIV-CJE2cCVs
```

### 2. Verificar MCP Server

O MCP server do Gemini deve estar configurado em:
- **Linux/WSL**: `/home/vitor/gemini-mcp-server/`
- **Windows**: Verificar configuração do Claude Code

### 3. Testar Comando

No Claude Code, tente:
```
/gemini Teste de conexão
```

Se funcionar, está tudo configurado! ✅

## ⚠️ Notas Importantes

1. **Não é para o PWA**: O Gemini não é usado na aplicação web, apenas no desenvolvimento
2. **MCP Server**: O Gemini funciona através do MCP (Model Context Protocol) server
3. **Variável de Ambiente**: O Claude Code lê `GEMINI_API_KEY` do `.env`
4. **Comandos**: Use `/gemini`, `/review`, `/explain` no Claude Code

## 🐛 Troubleshooting

### Erro: "GEMINI_API_KEY não encontrada"

**Solução**:
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Verifique se a chave está correta
3. Reinicie o Claude Code

### Comandos não funcionam

**Solução**:
1. Verifique se o MCP server do Gemini está instalado e rodando
2. Verifique as permissões em `.claude/settings.json`
3. Verifique os logs do Claude Code

### Gemini não responde

**Solução**:
1. Verifique sua conexão com a internet
2. Verifique se a API key é válida em https://aistudio.google.com
3. Verifique se não excedeu os limites do tier gratuito

## 📚 Referências

- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [MCP Protocol](https://modelcontextprotocol.io/)

## ✅ Status Atual

- [x] API Key configurada no `.env`
- [x] Claude Code settings configurados
- [x] Comandos personalizados criados
- [x] Permissões MCP configuradas
- [ ] MCP server instalado e rodando (verificar)
- [ ] Testar comandos no Claude Code

---

**Última atualização**: 2025-01-15
**Status**: ✅ Configuração básica completa

