# ADR 003: Parâmetros Operacionais Dinâmicos

**Status**: Aceito
**Data**: 2026-04-16

## Contexto
Anteriormente, valores como o preço do diesel (€1.65/L), o fator de CO₂ (2.68 kg/L) e o intervalo de manutenção (150h) estavam hardcoded no frontend ou backend. Isto impedia a adaptação rápida às flutuações de mercado e às especificidades de máquinas pesadas que podem exigir revisões mais frequentes.

## Decisão
Implementar um sistema de parâmetros tri-camada:

1. **Camada Global**: Coleção `settings/system` no Firestore, editável por administradores no Dashboard.
2. **Camada de Equipamento**: Campos opcionais `co2Factor` e `maintenanceInterval` em cada máquina para casos específicos.
3. **Camada de Fallback**: Valores pré-definidos no código para garantir o funcionamento em caso de erro de leitura do DB.

## Consequências
- **Flexibilidade**: Gestores podem ajustar custos e metas de CO2 em tempo real.
- **Precisão**: Alertas de manutenção tornam-se específicos para cada tipo de ativo.
- **Complexidade**: Exige uma lógica de resolução de valores (helper functions) em vez de uso direto de constantes.

## Referências
- Implementado em: `Frontend_App/dashboard/src/store/useStore.js`
- Interface: `Frontend_App/dashboard/src/views/ConfiguracoesView.jsx`
