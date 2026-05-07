# Journey Into Projeto_Casais_RFI

*Relatório narrativo sobre o desenvolvimento do Casais Fleet Intelligence*
*Gerado em: 7 de maio de 2026*

---

## 1. Génese do Projeto

O Casais Fleet Intelligence nasceu de uma necessidade concreta: o Grupo Casais, uma das maiores construtoras portuguesas, opera frotas de maquinaria pesada espalhadas por múltiplas obras. Equipamentos de construção — gruas, escavadoras, compactadores — representam investimentos de capital elevados e custos operacionais que raramente são acompanhados com a precisão que merecem. O registo de horas de trabalho, a gestão de avarias, o cálculo de custos reais por sessão de utilização: tudo isto tendia a ficar disperso entre folhas de cálculo, chamadas telefónicas e memória humana.

O projeto surge no contexto académico de junho de 2025, mas com ambição enterprise desde o primeiro dia. A orientação é clara: o utilizador final é não-técnico — um encarregado de obra, um gestor de frota, alguém que precisa de informação fiável sem ter de perceber o que é uma base de dados. O sistema tem de ser robusto o suficiente para um ambiente industrial e simples o suficiente para ser usado num tablet numa obra.

A escolha de construir uma PWA (Progressive Web App) foi deliberada. Uma PWA funciona no browser, instala-se como aplicação nativa, e não exige que ninguém passe pela App Store. Numa obra, isto significa que qualquer tablet ou telemóvel com Chrome pode tornar-se um terminal de gestão de frota sem instalações especiais.

---

## 2. Evolução Arquitetural

A arquitectura do Casais Fleet Intelligence reflecte escolhas pragmáticas feitas com visão a longo prazo.

**No frontend**, a combinação React 19 + Vite + Tailwind CSS cobre os três eixos fundamentais: componentes reactivos, build rápido para desenvolvimento ágil, e estilização consistente sem esforço de manutenção de CSS customizado. O Recharts trata da visualização de dados — gráficos de sessões, tendências de custos, métricas de utilização — enquanto o Zustand gere o estado global da aplicação com uma simplicidade que o Redux nunca conseguiu. A estrutura de pastas é intencional: `views` para as páginas principais, `components` para elementos reutilizáveis, `hooks` para lógica partilhada, `store` para o estado global, `utils` para funções auxiliares.

**No backend**, Firebase Cloud Functions v2 com Node.js 24 oferecem serverless computing que escala sem gestão de infraestrutura. O Firestore como base de dados NoSQL permite flexibilidade no schema enquanto o projecto evolui — o que é crítico numa fase académica onde os requisitos se refinam iterativamente. O Firebase Storage trata dos ficheiros binários, nomeadamente as fotografias de avarias que os operadores tiram no campo.

Existem invariantes arquitecturais que funcionam como leis não escritas do sistema. As mais críticas: `sessions.tariffSnapshot` e `sessions.costs` nunca são alterados após o fecho de uma sessão — isto garante integridade histórica para auditoria. O `machines.tariffHistory[]` é append-only, nunca se apagam entradas. A cor de marca é #005EB8 — azul Casais — e verde nunca aparece na interface. Estas regras não existem por capricho; existem porque um sistema financeiro que permite alterar o passado não é um sistema de confiança.

A integração com o Procore — plataforma de gestão de construção usada pela indústria — representa a camada de interoperabilidade enterprise. Através de uma bridge de Cloud Functions, o sistema sincroniza dados bidirecionalmente com o ecossistema Procore do Grupo Casais, usando campos customizados e lógica de emparelhamento de equipamentos.

---

## 3. A Sessão Inaugural

A sessão de 6 de maio de 2026, entre as 23h06 e as 23h35, é a sessão fundadora do sistema de memória deste projecto. Em menos de trinta minutos de actividade registada, o agente de desenvolvimento percorreu a totalidade da codebase de forma sistemática — não ao acaso, mas com uma cadência que revela metodologia.

Tudo começa com reconhecimento (#1, #S1, #S2): antes de tocar em qualquer ficheiro, o sistema lê o contexto acumulado de sessões anteriores. O projecto já tem história — commits recentes incluem a sincronização Procore, o lightbox de fotografias de avarias, e a migração de dados. O agente não re-explica o que já foi feito; incorpora esse conhecimento e avança.

Entre as 23h07 e as 23h12, três funcionalidades recentes são catalogadas: a sincronização bidirecional com o Procore (#2), o lightbox fullscreen para fotografias de avarias (#3), e a migração de dados de avarias do localStorage para o Firestore com Firebase Storage (#4). São observações de verificação — o sistema confirma que estas features existem e estão integradas antes de proceder à exploração aprofundada.

A partir das 23h12, começa a análise arquitectural sistemática. O frontend é varrido ficheiro por ficheiro, view por view:

- **SessoesView** (#6) — o coração operacional da aplicação, onde as sessões de utilização de máquinas são registadas, visualizadas e filtradas
- **ManutencaoView** (#10, #14) — gestão de manutenções preventivas e correctivas, incluindo avarias com fotografias
- **FinanceiroView** (#19) — análise de custos, com os snapshots imutáveis de tarifários
- **SessoesCorrigidasView** (#26) — vista especializada para sessões que sofreram correcções, mantendo auditabilidade
- **MaquinasView** (#60) — catálogo de máquinas com estado, tarifários e histórico
- **ConfiguracoesView** (#74) — configuração da integração Procore, mapeamento de campos, tokens

Paralelamente, as stores Zustand são examinadas: `useAlertsStore` (#30) e `useAlertConfigStore` (#37) revelam o sistema de alertas — notificações automáticas quando máquinas atingem thresholds de custo ou utilização. O utilitário `dateFilters.js` (#44) documenta a lógica de filtragem de sessões por período.

No backend, dois componentes críticos são analisados: o Procore Session Exporter (#54), que formata e envia dados de sessões para o Procore, e a Procore Bridge (#63, #69), a camada de integração que gere autenticação OAuth, campos customizados, e a lógica de emparelhamento entre máquinas Casais e equipamentos Procore.

Às 23h30 e 23h35, as últimas duas observações (#76, #77) são sínteses — o sistema consolida o conhecimento adquirido durante a sessão numa visão coerente do projecto. A sessão termina não com código mas com compreensão.

---

## 4. Funcionalidades-Chave

Três funcionalidades marcam o estado actual do desenvolvimento, todas implementadas antes desta sessão inaugural de memória:

**Sincronização Bidirecional com o Procore**

A integração Procore é a funcionalidade de maior complexidade técnica. O Procore é o sistema de gestão de construção predominante na indústria, e o Grupo Casais já o utiliza. A sincronização bidirecional significa que dados de sessões de equipamentos no Casais Fleet Intelligence fluem para o Procore, e alterações feitas no Procore (como actualizações de estado de equipamentos) reflectem-se de volta na aplicação.

A implementação usa campos customizados do Procore — uma característica da plataforma que permite estender o schema standard com campos específicos do cliente. A lógica de emparelhamento resolve o problema de associar um equipamento no universo Casais ao seu equivalente no universo Procore, mesmo quando os identificadores são diferentes. A Cloud Function actua como bridge, gerindo tokens OAuth, rate limiting, e transformação de dados entre os dois formatos.

**Lightbox Fullscreen para Fotografias de Avarias**

Quando uma avaria ocorre, o operador tira fotografias no campo. O lightbox permite visualizar essas fotografias em fullscreen com navegação entre imagens — funcionalidade aparentemente simples mas crítica para o fluxo de trabalho de manutenção. Um técnico de manutenção a analisar remotamente uma avaria precisa de ver os detalhes da fotografia sem limitações de tamanho. A implementação inclui suporte para gestos de toque em dispositivos móveis, essencial num contexto industrial.

**Migração de Dados de Avarias para Firestore**

Esta foi uma refactorização arquitectural importante: os dados de avarias, que inicialmente eram guardados no localStorage do browser (solução temporária e frágil), foram migrados para o Firestore com as fotografias no Firebase Storage. A migração garante que os dados persistem entre dispositivos e sessões, que múltiplos utilizadores podem aceder à mesma informação, e que existe backup automático. É o tipo de trabalho invisível ao utilizador final mas fundamental para a fiabilidade do sistema.

---

## 5. Padrões de Trabalho

A sessão de 6 de maio revela padrões de desenvolvimento característicos que merecem nota.

**Leitura antes de escrita.** A proporção de observações de análise versus implementação é alta. Das 25 observações registadas, a maioria são de exploração e compreensão. Isto reflecte uma filosofia: entender o sistema antes de o alterar reduz bugs e evita duplicação de esforço.

**Varredura sistemática, não aleatória.** A sequência de análise das views segue uma lógica — operacional (sessões) → manutenção → financeiro → correctivo → máquinas → configuração. Não é ordem alfabética nem ordem de criação dos ficheiros; é ordem de importância para o utilizador final.

**Síntese no final.** As observações #76 e #77, ambas marcadas com ✅, representam consolidação de conhecimento. Depois de absorver 20+ componentes individuais, o sistema produz uma visão de conjunto. Este padrão — análise detalhada seguida de síntese — é característico de desenvolvimento sustentável em projectos de longa duração.

**Velocidade real.** Vinte e cinco observações em menos de trinta minutos, cobrindo frontend, backend, stores, utilitários e integrações. Isto é possível porque o contexto de sessões anteriores elimina a necessidade de re-aprender o que já foi compreendido. O sistema de memória não é um luxury — é um multiplicador de velocidade.

---

## 6. Economia de Tokens

Os números desta sessão fundadora são reveladores: 897.678 tokens de trabalho real, comprimidos em 7.479 tokens de sumários legíveis — uma poupança de 99%.

Para contextualizar: um token corresponde aproximadamente a 0,75 palavras em inglês. 897.678 tokens representam o equivalente a uma análise detalhada de centenas de ficheiros de código, múltiplas iterações de implementação, e raciocínio complexo sobre arquitectura e integração. Se cada sessão futura tivesse de re-processar esse contexto do zero, o custo (em tempo, em tokens de API, em latência) seria proibitivo.

O sistema de memória resolve este problema de forma elegante: em vez de re-ler o código fonte completo no início de cada sessão, o agente lê sumários estruturados que capturam o essencial. Uma view React com 400 linhas de código torna-se uma observação de 20 linhas que descreve o que faz, como funciona, e o que é relevante saber. A fidelidade suficiente preserva-se; o ruído descarta-se.

Com apenas uma sessão registada, a poupança acumulada é já de 890.199 tokens. Em sessões futuras, este número cresce de forma composta: cada nova sessão adiciona ao acervo de conhecimento sem re-processar o anterior. É um sistema de memória que melhora com o uso — exactamente o que um projecto de longa duração necessita.

---

## 7. Próximos Capítulos

O estado actual do projecto sugere várias direcções naturais de desenvolvimento:

**Consolidação da integração Procore.** A sincronização bidirecional está implementada, mas integrações enterprise têm sempre edge cases que só surgem em uso real. Testes com dados reais do Grupo Casais, tratamento de erros de rede, e logging detalhado para diagnóstico serão trabalho contínuo.

**Dashboard executivo.** As views existentes são orientadas para operação — sessões, avarias, manutenções. Um dashboard de nível executivo que agregue KPIs — custo por máquina por mês, taxa de disponibilidade, ROI de manutenção preventiva versus correctiva — tornaria o sistema valioso também para a gestão.

**Sistema de alertas avançado.** As stores `useAlertsStore` e `useAlertConfigStore` existem e estão analisadas. A evolução natural é alertas proactivos: notificação automática quando uma máquina ultrapassa horas de utilização sem manutenção, quando um custo mensal excede threshold, ou quando uma avaria recorrente sugere problema estrutural.

**Modo offline robusto.** Uma PWA numa obra de construção tem de funcionar com conectividade intermitente. O Service Worker existe (é uma PWA), mas sincronização offline-first — onde o operador regista sessões sem internet e elas sincronizam quando há ligação — é complexidade que pode ainda estar por implementar completamente.

**Relatórios exportáveis.** Gestores precisam de enviar dados para sistemas externos — ERP, contabilidade, relatórios de projecto. A capacidade de exportar dados em Excel ou PDF, com formatação adequada para contexto empresarial português, fecha o ciclo entre o sistema operacional e os processos administrativos.

O Casais Fleet Intelligence tem a arquitectura certa, as funcionalidades core implementadas, e um sistema de memória que permitirá desenvolvimento sustentável. O projecto está numa fase de maturidade crescente — o trabalho de infraestrutura está feito, e os próximos capítulos são de refinamento, expansão de funcionalidades, e validação com utilizadores reais no campo.

---

*Relatório gerado com base em 21 observações da sessão de 6 de maio de 2026.*
*897.678 tokens de trabalho | 7.479 tokens de memória | 99% de poupança.*
