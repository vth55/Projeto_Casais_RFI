# ADR 005: Industrialização e Blindagem de Segurança (Fase 6)

## Status
Proposto (Abril 2026)

## Contexto
Durante a auditoria técnica da Fase 5, foram identificados pontos de fragilidade e oportunidades de otimização essenciais para a transição de um protótipo operacional para um sistema industrial de larga escala (target: frotas > 50 máquinas).

## Decisão
Fica estabelecido o plano de execução para a **Fase 6 (Industrialização)**, focada em quatro pilares fundamentais:

### 1. Auditoria e Rastreabilidade (ISO 55001)
- **Implementação**: Criação de uma coleção de auditoria no Firestore.
- **Lógica**: Sempre que parâmetros operacionais (Preço Diesel, Fator CO2, Intervalos de Manutenção) forem alterados via Dashboard, deve ser registado o `userId`, `oldValue`, `newValue` e `timestamp`.

### 2. Blindagem de Autenticação (PIN)
- **Implementação**: Migração da validação de Passcode do cliente para uma **Cloud Function v2**.
- **Segurança**: Implementação de *Rate Limiting* por IP/Operador para mitigar ataques de força bruta aos PINs de 4 dígitos.

### 3. Resiliência de Campo (Offline-First)
- **Implementação**: Mecanismo de cache local de hash de PIN no Mobile Hub.
- **Objetivo**: Permitir que operadores em áreas sem cobertura de rede realizem login nas máquinas e reportem avarias, com sincronização postergada.

### 4. Performance e Escalabilidade de Dados
- **Implementação**: Migração dos cálculos de KPIs (Horas, Combustível, CO2) do Dashboard de "on-the-fly" (client-side) para pré-calculados via **Scheduled Functions**.
- **Objetivo**: Garantir fluidez na UI quando o volume de sessões arquivadas ultrapassar os limites de processamento do browser.

## Consequências
- **Positivas**: Maior segurança, conformidade com normas ISO, escalabilidade e resiliência em campo.
- **Negativas**: Aumenta ligeiramente a complexidade do backend e o custo operacional de leitura/escrita no Firestore (compensado pela eficiência na leitura de KPIs pré-calculados).
