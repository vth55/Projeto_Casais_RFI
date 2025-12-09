# CASAIS FLEET INTELLIGENCE

## LEITURA OBRIGATÓRIA
**Antes de qualquer tarefa, ler `MEMORIA.md`** - contém estado atual, bugs conhecidos e tarefas pendentes.

## Contexto Rápido
| Item | Valor |
|------|-------|
| Projeto | PWA Gestão de Frotas Industriais |
| Cliente | Grupo Casais (empresa real) |
| Prazo | Junho 2025 |
| Stack | React 19 + Vite + Firebase + Zustand + Tailwind + Recharts |
| Cor Casais | #005EB8 (azul) |
| Versão Estável | v1.1.0-stable (commit ad4c4d1) |

## Comandos
```bash
cd Frontend_App/dashboard && npm run dev --host   # Frontend (porta 5173)
cd Backend_Cloud && firebase deploy               # Backend
```

## BUGS CONHECIDOS (Verificar antes de mudar código)
1. **Objects as React child**: `machine.category` e `machine.location` são OBJETOS no Firestore
   - Solução: `typeof x === 'object' ? x?.name : x`
2. **Tela branca**: ErrorBoundary já implementado em App.jsx

## Estruturas de Dados Importantes
```javascript
// machine.category é OBJETO:
{ id: 'escavadoras', name: 'Escavadoras', code: 'ESC' }

// machine.location é OBJETO:
{ workId: 'obra_porto', workName: 'Obra Porto 2025', gps: { lat, lng } }
```

## Prioridades Atuais
1. **RFID de Localização** - Cartões para mudar localização de máquinas
2. **Cargos de Funcionários** - Encarregado de Obra, Operador, etc.
3. **Auto-assign funcionários a obras** - Baseado em uso de máquinas

## Recentemente Implementado (09/12/2025)
- Módulo Obras com GPS/Google Maps
- Gráficos comparativos Período vs Período
- Mudança bulk de localização de máquinas
- Remoção de referências Gemini/IA

## Regras
- Código enterprise-level
- UI profissional e impactante (NÃO minimalista)
- Commits frequentes
- **Atualizar MEMORIA.md após cada sessão**
