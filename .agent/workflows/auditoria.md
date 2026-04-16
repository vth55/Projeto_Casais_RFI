---
description: Como realizar uma auditoria completa de documentos e código (O Protocolo Arqueólogo)
---

# 🕵️ Workflow: Auditoria de Memória Técnica

Este workflow deve ser seguido sempre que houver necessidade de limpar pastas, consolidar documentos ou entender a evolução do projeto nos últimos 2 anos.

## 1. Mapeamento de Terreno
- Executa `list_dir` na pasta alvo.
- Identifica ficheiros com nomes suspeitos ou datados (`archive`, `old`, `backup`).

## 2. Leitura Exaustiva (O Coração da Arqueologia)
- Abre cada ficheiro usando `view_file`.
- Se o ficheiro for longo, lê-o em blocos de 800 linhas.
- **NÃO SALTES LINHAS.** Toma notas mentais de lógicas, IDs e rascunhos.

## 3. Investigação de Raízes (Git Check)
- Verifica o histórico do ficheiro (`git log --patch -- <file>`) para ver o que mudou e porquê.
- Procura por "Dangling objects" se houver suspeita de ficheiros perdidos.

## 4. Comparação com a "Frente de Obra" (Código)
- Para cada lógica encontrada no Documento, procura a implementação real no código ou no Firestore.
- Anota discrepâncias: "O Doc diz que o preço é X, mas o código usa Y".

## 5. Extração de Ouro
- Copia a informação vital para os documentos mestre (`DOCS_ARCHITECTURE.md`, `DOCS_OPERATIONS.md`).
- Marca o que é "Ideia Futura" e adiciona ao `DOCS_ROADMAP.md` na secção de Estratégia.

## 6. Relatório Final e Autorização
- Apresenta ao Vitor Hugo o relatório detalhado das descobertas.
- **Pára** e aguarda pela palavra "APROVADO" ou "OK" antes de mover ou apagar qualquer ficheiro original.

---
> **Lema**: Só apaga quem compreende.
