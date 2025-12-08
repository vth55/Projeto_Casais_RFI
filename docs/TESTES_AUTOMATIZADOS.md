# 🧪 TESTES AUTOMATIZADOS - CASAIS FLEET INTELLIGENCE

> Script de testes automatizados usando browser automation
> **Data:** 2025-01-XX
> **Status:** Pronto para executar

---

## ⚙️ PRÉ-REQUISITOS

1. **Servidor Frontend a correr:**
   ```bash
   cd Frontend_App/dashboard
   npm run dev
   ```
   → Deve estar acessível em `http://localhost:5173`

2. **Firebase configurado:**
   - Firestore ativo
   - Regras de segurança permitem leitura

---

## 🧪 CHECKLIST DE TESTES

### ✅ TESTE 1: Carregamento Inicial
**Objetivo:** Verificar se a aplicação carrega sem erros

**Passos:**
1. Navegar para `http://localhost:5173`
2. Aguardar carregamento completo
3. Verificar:
   - [ ] Página carrega sem erros visíveis
   - [ ] Logo Casais aparece
   - [ ] Dashboard mostra KPIs
   - [ ] Gráficos aparecem
   - [ ] Não há erros no console

**Resultado Esperado:** ✅ Página carrega completamente, todos os elementos visíveis

---

### ✅ TESTE 2: Navegação Desktop
**Objetivo:** Verificar navegação e comportamento accordion

**Passos:**
1. Clicar em "Máquinas" no sidebar
   - [ ] Submenu expande
2. Clicar em "Sessões" no sidebar
   - [ ] "Máquinas" fecha automaticamente (accordion)
   - [ ] "Sessões" expande
3. Clicar em "Sessões Ativas" (submenu)
   - [ ] Página de Sessões abre
   - [ ] Tab "Ativas" está ativa
4. Clicar em tab "Histórico"
   - [ ] Tab alterna corretamente
   - [ ] Conteúdo muda

**Resultado Esperado:** ✅ Navegação funciona, accordion fecha/abre corretamente, tabs alternam

---

### ✅ TESTE 3: Responsividade Mobile
**Objetivo:** Verificar menu hamburger e responsividade

**Passos:**
1. Redimensionar janela para mobile (< 768px)
   - [ ] Botão hamburger (☰) aparece no header
   - [ ] Sidebar está oculto
2. Clicar no botão hamburger
   - [ ] Sidebar abre como overlay
   - [ ] Backdrop escuro aparece
3. Clicar fora do sidebar
   - [ ] Sidebar fecha
4. Clicar em um item do menu
   - [ ] Sidebar fecha automaticamente
   - [ ] Página navega corretamente

**Resultado Esperado:** ✅ Menu hamburger funciona, sidebar overlay correto, fecha ao navegar

---

### ✅ TESTE 4: Dados Mock
**Objetivo:** Verificar criação e visualização de dados mock

**Passos:**
1. Navegar para "Configurações"
   - [ ] Página carrega
2. Clicar em "Criar Dados Mock"
   - [ ] Botão responde
   - [ ] Mensagem de sucesso aparece
3. Aguardar alguns segundos (criação de dados)
4. Navegar para "Dashboard"
   - [ ] KPIs mostram dados
   - [ ] Gráficos têm dados
5. Navegar para "Máquinas"
   - [ ] Lista de máquinas aparece
   - [ ] Pelo menos 4 máquinas visíveis
6. Navegar para "Sessões" → "Histórico"
   - [ ] Tabela de sessões aparece
   - [ ] Sessões têm dados

**Resultado Esperado:** ✅ Dados mock criados, aparecem em todas as views

---

### ✅ TESTE 5: Console e Erros
**Objetivo:** Verificar se há erros no console

**Passos:**
1. Abrir DevTools (F12)
2. Ir ao tab "Console"
3. Verificar:
   - [ ] Não há erros vermelhos
   - [ ] Avisos são apenas informativos (se houver)
   - [ ] Firebase conecta corretamente
4. Verificar header da aplicação:
   - [ ] "LIGAÇÃO ATIVA" aparece (se implementado)
   - [ ] Status de conexão Firebase visível

**Resultado Esperado:** ✅ Console limpo, sem erros críticos

---

### ✅ TESTE 6: Tabs em Páginas
**Objetivo:** Verificar sistema de tabs nas páginas

**Páginas a testar:**
1. **Máquinas:**
   - [ ] Tab "Lista" funciona
   - [ ] Tab "Categorias" funciona
   - [ ] Tab "Localizações" funciona
   - [ ] Alternância entre tabs é suave

2. **Sessões:**
   - [ ] Tab "Ativas" mostra sessões em tempo real
   - [ ] Tab "Histórico" mostra sessões fechadas
   - [ ] Tab "Validações" existe (mesmo que vazio)

3. **Manutenção:**
   - [ ] Tab "Alertas" funciona
   - [ ] Tab "Calendário" funciona
   - [ ] Tab "Avarias" funciona

4. **Análises:**
   - [ ] Tab "Geral" funciona
   - [ ] Tab "Emissões" funciona
   - [ ] Tab "Custos" funciona

**Resultado Esperado:** ✅ Todas as tabs funcionam, alternância suave

---

## 📊 RELATÓRIO DE TESTES

**Data de Execução:** _______________

**Resultados:**

| Teste | Status | Observações |
|-------|--------|-------------|
| 1. Carregamento Inicial | ⬜ | |
| 2. Navegação Desktop | ⬜ | |
| 3. Responsividade Mobile | ⬜ | |
| 4. Dados Mock | ⬜ | |
| 5. Console e Erros | ⬜ | |
| 6. Tabs em Páginas | ⬜ | |

**Problemas Encontrados:**
- 

**Próximos Passos:**
- 

---

## 🔧 COMO EXECUTAR TESTES AUTOMATIZADOS

**Opção 1: IA Executa (Recomendado)**
1. Certifica-te que servidor está a correr: `npm run dev`
2. Diz-me: "Executa os testes automatizados"
3. Eu navego pela aplicação e verifico tudo automaticamente

**Opção 2: Execução Manual**
1. Segue o checklist acima
2. Marca cada item conforme testas
3. Reporta problemas encontrados

---

## 🐛 PROBLEMAS COMUNS

**Servidor não inicia:**
- Verifica se porta 5173 está livre
- Verifica se `node_modules` está instalado (`npm install`)
- Verifica erros no terminal

**Página não carrega:**
- Verifica se Firebase está configurado
- Verifica console do browser (F12)
- Verifica se há erros de rede

**Dados mock não aparecem:**
- Verifica se Firebase Firestore está ativo
- Verifica regras de segurança do Firestore
- Verifica console por erros de permissão

---

**FIM DO DOCUMENTO DE TESTES**

