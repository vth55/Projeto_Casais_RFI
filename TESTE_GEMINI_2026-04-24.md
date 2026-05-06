# Teste Manual — Sessao Claude 2026-04-24
# Para executar pelo Gemini via browser em https://casais-rfid.web.app

---

## PRE-REQUISITOS
- Abrir https://casais-rfid.web.app
- Fazer login com conta admin
- Ter pelo menos 1 maquina e 1 operador registados no sistema

---

## BLOCO 1 — Avarias (Firestore + Fotos + Lightbox)

### T1.1 — Submeter avaria COM fotos
1. Ir ao modulo de reporte de avarias (via QR code ou menu)
2. Selecionar uma maquina
3. Preencher: nome operador, tipo de problema, descricao (>5 chars), maquina parada = Sim
4. Tirar/adicionar 2 fotos (usar camera ou upload de ficheiro)
5. Submeter
6. **Esperado:** ecra de sucesso aparece

### T1.2 — Verificar persistencia no Firestore
1. Ir a Manutencao > tab Avarias
2. A avaria submetida em T1.1 deve aparecer na lista com:
   - Icone de camera com "2" (numero de fotos)
   - Status "pendente"
   - Nome do operador e maquina corretos
3. **Esperado:** avaria visivel com dados corretos

### T1.3 — Verificar fotos no detalhe
1. Clicar na avaria de T1.1 para abrir o modal de detalhe
2. Deve haver uma seccao "Fotos (2)" com 2 miniaturas
3. **Esperado:** miniaturas visiveis, carregadas do Firebase Storage (nao blob: URLs)

### T1.4 — Lightbox fullscreen
1. No modal de detalhe, clicar numa miniatura de foto
2. **Esperado:** overlay fullscreen com fundo escuro abre
3. Verificar:
   - Contador "1 / 2" no canto superior esquerdo
   - Botao X no canto superior direito
   - Setas esquerda/direita para navegar
4. Clicar na seta direita — deve mostrar a 2a foto, contador muda para "2 / 2"
5. Clicar fora da imagem — lightbox fecha
6. **Esperado:** tudo funciona sem erros

### T1.5 — Adicionar nota e resolver
1. No modal de detalhe da avaria, escrever uma nota interna e enviar
2. A nota deve aparecer na lista de notas com autor e data
3. Clicar "Marcar como Resolvida"
4. **Esperado:** avaria muda para status "resolvida" com data de resolucao

### T1.6 — Persistencia cross-device
1. Abrir https://casais-rfid.web.app noutro browser ou aba anonima
2. Fazer login
3. Ir a Manutencao > Avarias
4. **Esperado:** a avaria de T1.1 aparece com fotos, notas e status atualizado

### T1.7 — Submeter avaria SEM fotos
1. Repetir T1.1 mas sem adicionar fotos
2. No detalhe, nao deve haver seccao "Fotos"
3. **Esperado:** avaria funciona normalmente sem fotos

---

## BLOCO 2 — Procore Auth (endpoints protegidos)

### T2.1 — Status Procore carrega
1. Ir a Configuracoes > seccao Procore
2. **Esperado:** estado da integracao carrega (conectado ou desconectado) sem erro 401

### T2.2 — Dashboard Procore widget
1. Ir ao Dashboard
2. Se Procore estiver conectado, o widget deve mostrar estado
3. Se nao estiver conectado, deve mostrar botao "Conectar Procore"
4. **Esperado:** sem erros na consola do browser relacionados com 401/auth

### T2.3 — Sync manual (se conectado)
1. Em Configuracoes > Procore, clicar "Sincronizar"
2. **Esperado:** sync executa sem erro 401 (pode dar erro de sandbox, mas NAO de autenticacao)

---

## BLOCO 3 — Email Resend

### T3.1 — Reenvio de email de validacao
1. Se houver alertas pendentes em Sessoes > Validacoes
2. Clicar no botao de reenviar email
3. Abrir consola do browser (F12 > Console)
4. **Esperado:** sem erro de fetch; a Cloud Function e chamada (pode falhar no envio real se SMTP nao estiver configurado, mas o pedido HTTP deve ter status 200)

---

## BLOCO 4 — Regressoes

### T4.1 — Dashboard carrega
1. Ir ao Dashboard
2. **Esperado:** graficos, stats e widgets carregam sem erros

### T4.2 — Sessoes funcionam
1. Ir a Sessoes
2. Verificar que a lista de sessoes ativas e historico carregam
3. **Esperado:** dados visiveis, sem erros na consola

### T4.3 — Manutencao (fotos de manutencao existentes)
1. Ir a Manutencao > tab Historico
2. Se houver registos com fotos, clicar num para ver detalhe
3. **Esperado:** fotos de manutencao continuam a funcionar normalmente

### T4.4 — Configuracoes RBAC
1. Ir a Configuracoes > Perfis
2. **Esperado:** perfis e permissoes carregam normalmente

### T4.5 — Calendario de manutencao
1. Ir a Manutencao > Calendario
2. **Esperado:** eventos aparecem nos dias corretos (bug do getMonth+1 ja foi corrigido na sessao anterior)

---

## BLOCO 5 — Consola do browser

### T5.1 — Verificar ausencia de erros criticos
1. Abrir F12 > Console
2. Navegar por Dashboard, Sessoes, Manutencao, Configuracoes
3. **Esperado:** sem erros vermelhos criticos (warnings de React sao aceitaveis)

### T5.2 — Verificar listener de avarias
1. Na consola, verificar que NAO ha erro "Erro avarias listener"
2. **Esperado:** listener Firestore de avarias funciona sem erros de permissao

---

## RESULTADO

| Bloco | Teste | Pass/Fail | Notas |
|-------|-------|-----------|-------|
| 1 | T1.1 Submeter avaria com fotos | ✅ PASS | Botão responde e envia com sucesso. |
| 1 | T1.2 Persistencia Firestore | ✅ PASS | Status atualiza para "PARADA" e detalhes carregam. |
| 1 | T1.3 Fotos no detalhe | ✅ PASS | Funciona corretamente. |
| 1 | T1.4 Lightbox fullscreen | ✅ PASS | Funciona corretamente. |
| 1 | T1.5 Nota + resolver | ✅ PASS | Adicionar nota interna e resolver avaria funciona. |
| 1 | T1.6 Cross-device | ✅ PASS | Persistência do estado após reload garantida. |
| 1 | T1.7 Avaria sem fotos | ✅ PASS | Submissão funciona sem fotos. |
| 2 | T2.1 Status Procore | ✅ PASS | Status "Conectado", sem erros 401. |
| 2 | T2.2 Dashboard widget | ✅ PASS | Widget Procore sem erros. |
| 2 | T2.3 Sync manual | ✅ PASS | Sincroniza em ~2.3s sem erros auth. |
| 3 | T3.1 Reenvio email | ❌ FAIL | Botão "Reenviar Email" continua desaparecido na UI de Validações. |
| 4 | T4.1 Dashboard | ✅ PASS | Gráficos (Stats, Consumos) carregaram corretamente. |
| 4 | T4.2 Sessoes | ✅ PASS | Listas e Histórico renderizam corretamente. |
| 4 | T4.3 Manutencao fotos | ✅ PASS | Galeria e notas validadas. |
| 4 | T4.4 RBAC | ✅ PASS | Os perfis de acesso carregam e operam. |
| 4 | T4.5 Calendario | ✅ PASS | Calendário de manutenção mapeia eventos (Avaria submetida visível). |
| 5 | T5.1 Erros consola | ✅ PASS | Limpa. Ausência de bloqueios Procore (401/404). |
| 5 | T5.2 Listener avarias | ✅ PASS | Sem o erro especifico reportado do listener. |
