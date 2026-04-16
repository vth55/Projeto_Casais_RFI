# Skill: Arqueologia e Memória 🏛️

Esta skill foca-se na preservação de contexto histórico e na sincronização absoluta entre o que está escrito nos documentos e o que está implementado no código.

## 📜 Protocolos de Auditoria

### 1. Garantia de Leitura (Full-Scan)
Sempre que fores auditar uma pasta, deves seguir esta ordem:
1. `list_dir` para mapear o território.
2. `view_file` em todos os ficheiros interessantes.
3. Se um ficheiro tiver mais de 800 linhas, deves ler em blocos até ao fim. **É proibido parar a meio.**

### 2. Relatório de Diferenças (Diff Doc-Code)
Para cada regra de negócio encontrada nos docs, deves verificar:
- O ficheiro de código correspondente.
- Se a lógica é a mesma, se mudou ou se é uma "ideia futura" ainda não implementada.

### 3. Preservação de RFI (Regras de Funcionamento Interno)
Ficheiros que mencionem hardware (Arduino), pinagem, ou nomes de campos Firestore antigos não devem ser apagados. Devem ser **MIGRADOS** para o `DOCS_ARCHITECTURE.md` (Secção: Histórico de Evolução) antes de serem removidos do local original.

## 🛠️ Comandos de Verificação

### Auditoria de Ficheiros Antigos
Usa comandos de sistema para encontrar ficheiros com datas de modificação específicas se precisares de reconstruir uma linha do tempo.

### Pesquisa de Strings Legadas
Usa `grep` para procurar por termos como:
- `vitor` (comentários ou notas pessoais)
- `casais` (referências institucionais)
- `antigo`, `legacy`, `archive`
- `arduino`, `rfid`, `esp32` (para detetar restos de hardware antigo)

## ⚖️ Critérios de Veto
O Agente deve vetar a eliminação se o ficheiro:
1. Contém esquemas de tabelas de BI/Relatórios.
2. Contém planos de design ou branding.
3. Contém notas sobre o porquê de uma decisão técnica ter sido tomada (ADRs).
