# ADR 004: Industrialização da Manutenção e Refinamento de RBAC

## Status
Aceite

## Contexto
Para preparar o sistema para demonstração em larga escala em Junho, era necessário transitar de um sistema de manutenção puramente reativo para um modelo industrial preditivo (Sede) e garantir que o acesso às funcionalidades críticas é controlado por roles profissionais.

## Decisão
1.  **Modelo Preditivo**: Implementação de média móvel de 14 dias para projeção de datas de revisão no Dashboard da Sede.
2.  **Persistência**: Criação da coleção `maintenance_schedules` para agendamentos manuais que sobrepõem/complementam a IA.
3.  **Refinamento de RBAC**:
    - **Remoção do Role "Visualizador"**: Eliminado por ser redundante e simplificar a arquitetura de acesso.
    - **Encarregado de Obra**: Ganhou permissão de agendamento (`maintenance:schedule`) para coordenar paragens com a produção.
    - **Operador de Campo**: Restrito ao reporte de avarias (reativo), perdendo a capacidade de registar conclusões de manutenção técnica.
    - **Gestor de Sustentabilidade**: Acesso concedido a parâmetros operacionais para auditoria de emissões CO2.

## Consequências
- Maior integridade dos dados financeiros e técnicos (apenas técnicos e gestores registam custos).
- Redução de conflitos entre Manutenção e Produção (via Encarregado).
- Interface do PWA mais limpa para roles de campo.
- Código mais fácil de manter com menos roles no `permissions.js`.
