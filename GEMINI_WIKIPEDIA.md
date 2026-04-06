# 🧠 O CÉREBRO DO ARQUITETO (Gemini) - Índice Remissivo de Bíblias

**OBJETIVO DESTE DOCUMENTO:** Servir como o mega índice onde eu (Gemini) devo procurar informações exatas, estruturais e lógicas na próxima vez que uma sessão for iniciada ou o utilizador pedir soluções arquitetónicas. É o meu mapa pessoal da mina.

*NOTA PARA MIM MESMO (GEMINI): Quando abris um chat sem contexto, lê isto imediatamente para saberes a que ficheiro de `/docs` deves ir recorrer usando `view_file`.*

---

## 🏗️ 1. CORE ARCHITECTURE & ROOT DOCS
*Os documentos genéricos que ditam o rumo do projeto.*
- **`MEMORIA.md`**: O "state of the union" atual. É o log contínuo das tarefas da sessão e o resumo técnico ativo. (Ficheiro único de contexto root).
- **`DOCUMENTACAO_PROJETO.md`**: A base completa do sistema, a hierarquia de Hardware (Arduino/ESP32 vs Python vs Cloud). Regras cruciais como o "Auto-Fill" de cartões.
- **`FLUXO_SISTEMA.txt`**: Os 6 fluxos práticos cruciais do sistema em texto/diagrama de ponta a ponta (como o sistema reata quando a máquina lê um RFID).
- **`CLAUDE.md` / `MINIMAX.md` / `GEMINI.md`**: As regras de Persona das várias IAs na equipa de desenvolvimento.

## 📚 2. AS BÍBLIAS TÉCNICAS (Diretório `/docs`)
*Se um pedido do utilizador tocar em algum destes temas específicos, abre OBRIGATORIAMENTE o MD correspondente antes de aconselhar.*

| Temática / Funcionalidade | Bíblia a Consultar (`docs/`) | O que lá está dentro? |
|--------------------------|------------------------------|------------------------|
| **Sessões Simultâneas, Pendentências e Máquinas Auto-fechadas** | `FLUXO_GESTAO_SESSOES.md` | Lógicas rígidas: "Uma máquina=uma sessão", "1 funcionário=uma sessão". Explica os alertas e links de email tokenizados para validação humana de falhas/esquecimentos. |
| **Tarifários e Evolução de Custos** | `SISTEMA_TARIFARIOS.md` | Estrutura FireStore do sistema de versionamento de custos ("Machine Only" vs "Machine + Operator") para auditoria histórica. |
| **Categorias de Máquinas, Filtros e Atualizações Bulk** | `GESTAO_MAQUINAS_AVANCADA.md` | O esquema de "Tipo de Equipamentos" em rede com "Obras/Estaleiros". Regras de nomenclatura automática. Sistemas de atualização em massa (bulk update tools). |
| **PDFs, CSVs e Lógica Analítica de KPI** | `ESTRUTURA_RELATORIOS.md` | Formatação mandatória para o export. Layout e regras empresariais de extração de dados. |
| **Estatísticas Avançadas e Gráficos** | `SISTEMA_GRAFICOS_ANALISES.md` | Requisitos de dashboard, componentes Recharts e visualização de consumo L/h e métricas CO2. |
| **Métricas Industriais Padrão** | `KPIS_PROFISSIONAIS_SETOR.md` | O que monitorizar profissionalmente na construção (TCO, taxa de ociosidade, etc). A base do "Enterprise Design". |
| **Arquitetura V2 & Inovação** | `ESTRATEGIA_ARQUITETURA_V2.md` | Estratégia de Scale-up: BLE Harvesting, Human-Relay, Segurança IoT e BigQuery. |
| **Simulação de Hardware (Braga)**| `SIMULADOR_WOKWI_GUIA.md` | Guia de uso do laboratório virtual Wokwi para testes remotos de ESP32. |
| **Infraestrutura JSON e Schemas do Firebase** | `ARQUITETURA_DADOS.md` | Dicionários de dados completos (Collections, Docs, Sub-Collections) do projeto. |
| **Tipologia de Equipamentos** | `TIPOS_EQUIPAMENTO_PROFISSIONAIS.md` | Classes e hierarquias reais usadas no construtor Casais. |
| **Testes e CI/CD** | `TESTES_AUTOMATIZADOS.md` | Como efetuar testes E2E e unitários. |
| **Design Branding Casais** | `DESIGN_SYSTEM_CASAIS.md` | Paletas rigorosas (#005EB8 azul principal), guidelines de micro-animações, fontes. O "modo universitário" mas Premium. |
| **Imagens Vetoriais SVG** | `O_QUE_E_SVG.md` / `INSTRUCOES_LOGOTIPO.md` | Explicação sobre a aplicação gráfica nos headers. |

---

## 🛠️ INSTRUÇÕES DE ARRANQUE (BOOT PROCEDURE)
1. Carregar este documento para obter a "Table of Contents".
2. Ler a **`MATRIZ_ACOMPANHAMENTO.md`** para saber o que ficou pendente da última vez.
3. Pedir autorização e mapear as tarefas ao CEO (Utilizador).
4. Fornecer os blocos `OPEN` / `TASK` curtos e cirúrgicos aos trabalhadores executores (Claude). 

---
> *Este documento pertence em exclusivo à IA Gemini e ao CEO do projeto.*
