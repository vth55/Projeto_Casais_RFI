# ADR 002: Integração Estratégica com ERP Procore

## Estado
Aceite ✅

## Contexto
O projeto Casais Fleet Intelligence nasceu como uma ferramenta isolada. Contudo, para ter valor real numa grande empresa como o Grupo Casais, os dados de campo (sessões, horas, custos) precisam de ser injetados no sistema de gestão corporativo (ERP) de forma automática para evitar erros manuais.

## Decisão
Decidimos utilizar o **Procore** como a fonte de verdade para projetos e equipamentos, e como destino final dos registos de atividade (Timecards e Daily Logs).

## Consequências
- **Vantagens**: 
  - Elimina o trabalho administrativo de transcrever horas.
  - Sincronização automática de custos (€/h) reais da obra.
  - Aumenta a probabilidade de adoção corporativa.
- **Desvantagens**: 
  - Dependência de APIs externas.
  - Necessidade de mapeamento (fuzzy matching) entre IDs do Procore e IDs Locais (RFID).

## Referências
- `Backend_Cloud/functions/procore/`
- `DOCS_ROADMAP.md` (Fases 0-7)
