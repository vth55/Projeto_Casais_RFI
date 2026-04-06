═══════════════════════════════════════════════════════════════════════════════
  CASAIS FLEET INTELLIGENCE - FLUXO DO SISTEMA
═══════════════════════════════════════════════════════════════════════════════


🎯 FLUXO 1: REGISTAR NOVO OPERADOR (SCAN-TO-REGISTER)
═══════════════════════════════════════════════════════════════════════════════

1. Operador passa CARTÃO NÃO REGISTADO no leitor
   │
   ▼
2. Arduino lê RFID → Envia para Python
   │
   ▼
3. Python → POST para Cloud Function
   │
   ▼
4. Backend verifica: "Este cartão está registado?"
   │
   ├─ SIM → Inicia/Para sessão (vai para FLUXO 2)
   │
   └─ NÃO → Retorna erro 403 (Acesso Negado)
              │
              ▼
         5. Backend escreve em scan_buffer/latest:
            {
              cardId: "A1B2C3D4",
              machineId: "M_ARDUINO_PC_02",
              timestamp: now()
            }
              │
              ▼
         6. Frontend (OperatorsView) ESCUTA scan_buffer/latest
              │
              ▼
         7. Campo "ID do Cartão" é PREENCHIDO AUTOMATICAMENTE
              │
              ▼
         8. Admin escreve nome → Clica "Guardar Ficha"
              │
              ▼
         9. Operador registado! ✅
              │
              ▼
        10. Backend marca scan como "resolved: true"


═══════════════════════════════════════════════════════════════════════════════


🎯 FLUXO 2: INICIAR/PARAR SESSÃO (OPERADOR REGISTADO)
═══════════════════════════════════════════════════════════════════════════════

CENÁRIO A: INICIAR SESSÃO (1º SCAN)
────────────────────────────────────────────────────────────────────────────────

1. Operador registado passa cartão
   │
   ▼
2. Arduino → LED Amarelo pisca 2x (cartão detetado)
   │
   ▼
3. Python → Cloud Function
   │
   ▼
4. Backend verifica:
   "Há sessão ABERTA nesta máquina?"
   │
   └─ NÃO (máquina está IDLE)
      │
      ▼
   5. Backend verifica:
      "Este cartão está registado?"
      │
      └─ SIM ✅
         │
         ▼
      6. Backend cria nova sessão:
         {
           cardId: "A1B2C3D4",
           machineId: "M_ARDUINO_PC_02",
           startTime: now(),
           endTime: null,
           status: "OPEN"
         }
         │
         ▼
      7. Backend atualiza máquina:
         {
           status: "ACTIVE",
           lastOperator: "A1B2C3D4"
         }
         │
         ▼
      8. Backend retorna: { status: "START" }
         │
         ▼
      9. Python envia "START" para Arduino
         │
         ▼
     10. Arduino → LED VERDE acende 2 segundos
         │
         ▼
     11. Arduino volta ao LED AMARELO (aguardar)
         │
         ▼
     12. Frontend atualiza em tempo real:
         - StatCard "Máquinas Ativas" +1
         - Tabela mostra sessão ABERTA


────────────────────────────────────────────────────────────────────────────────

CENÁRIO B: PARAR SESSÃO (2º SCAN DO MESMO CARTÃO)
────────────────────────────────────────────────────────────────────────────────

1. MESMO operador passa cartão novamente
   │
   ▼
2. Backend verifica:
   "Há sessão ABERTA nesta máquina?"
   │
   └─ SIM (status: "OPEN")
      │
      ▼
   3. Backend verifica:
      "O cartão é o MESMO que iniciou?"
      │
      └─ SIM ✅
         │
         ▼
      4. Backend calcula duração:
         endTime = now()
         duration = (endTime - startTime) em horas
         │
         ▼
      5. Backend fecha sessão:
         {
           endTime: now(),
           durationHours: 2.35,  // exemplo
           status: "CLOSED"
         }
         │
         ▼
      6. Backend atualiza máquina:
         {
           status: "IDLE",
           totalHours: totalHours + 2.35
         }
         │
         ▼
      7. Backend retorna: { status: "STOP", duration: "2.35" }
         │
         ▼
      8. Python envia "STOP" para Arduino
         │
         ▼
      9. Arduino → LED VERDE pisca 3 vezes
         │
         ▼
     10. Arduino volta ao LED AMARELO
         │
         ▼
     11. Frontend atualiza:
         - StatCard "Máquinas Ativas" -1
         - Tabela mostra sessão FECHADA
         - Duração: "2h 21m"
         - Máquina volta a "PARADO"


────────────────────────────────────────────────────────────────────────────────

CENÁRIO C: ERRO - OUTRO CARTÃO TENTA PARAR
────────────────────────────────────────────────────────────────────────────────

1. Operador B passa cartão (mas sessão foi iniciada por Operador A)
   │
   ▼
2. Backend verifica:
   sessionDoc.cardId !== cardId passado
   │
   ▼
3. Backend retorna erro 403:
   "Sessão iniciada por outro cartão"
   │
   ▼
4. Arduino → LED VERMELHO acende 3 segundos
   │
   ▼
5. Sessão continua ABERTA (só Operador A pode fechar)


═══════════════════════════════════════════════════════════════════════════════


🎯 FLUXO 3: ALERTAS DE MANUTENÇÃO (LÓGICA PREDITIVA)
═══════════════════════════════════════════════════════════════════════════════

1. Cada STOP de sessão adiciona horas à máquina
   totalHours = totalHours + durationHours
   │
   ▼
2. Frontend calcula progresso:
   progress = (totalHours / threshold) × 100
   │
   ├─ < 60%  → VERDE   (OK)
   ├─ 60-79% → AZUL    (Acompanhar)
   ├─ 80-99% → LARANJA (Manutenção Preventiva)
   └─ ≥ 100% → VERMELHO (URGENTE!)
      │
      ▼
3. Alerta aparece em:
   - Dashboard (topo)
   - Menu "Configuração"
   │
   ▼
4. Admin faz manutenção → Reseta totalHours manualmente no Firestore


═══════════════════════════════════════════════════════════════════════════════


🎯 FLUXO 4: CÁLCULO DE EMISSÕES CO₂
═══════════════════════════════════════════════════════════════════════════════

1. Admin configura consumo da máquina
   (Menu "Configuração" → campo L/h)
   │
   ▼
2. Máquina acumula horas:
   M_GRUAC_01: 45.5h
   Consumo: 12.5 L/h
   │
   ▼
3. Frontend calcula emissões:
   CO₂ = 45.5h × 12.5 L/h × 2.68 kg/L
   CO₂ = 1,523.25 kg
   │
   ▼
4. Se CO₂ > 500kg:
   - Alerta laranja/vermelho no Dashboard
   - StatCard fica vermelho
   │
   ▼
5. Export CSV inclui valor de CO₂ por máquina


═══════════════════════════════════════════════════════════════════════════════


🎯 FLUXO 5: FILTROS DE DATA E BI
═══════════════════════════════════════════════════════════════════════════════

1. Admin seleciona filtro (ex: "Esta Semana")
   │
   ▼
2. Frontend filtra sessões:
   sessions.filter(s => s.startTime >= (hoje - 7 dias))
   │
   ▼
3. Calcula métricas:
   - Total de sessões: 24
   - Horas totais: 156.7h
   - Máquinas únicas: 3
   - Operadores únicos: 5
   │
   ▼
4. Calcula eficiência:
   Horas disponíveis = 5 dias × 8h = 40h
   Horas trabalhadas = 156.7h (pode ser > 100% se várias máquinas)
   Eficiência = (156.7 / 40) × 100 = 391%
   │
   ▼
5. Atualiza StatCards e tabela


═══════════════════════════════════════════════════════════════════════════════


🎯 FLUXO 6: EXPORT PARA CSV
═══════════════════════════════════════════════════════════════════════════════

1. Admin clica "Exportar Sessões"
   │
   ▼
2. Frontend processa sessões:
   Para cada sessão:
     - Procura operador pelo cardId
     - Substitui ID pelo NOME
     - Formata datas em PT-PT
   │
   ▼
3. Cria CSV com encoding UTF-8 BOM:
   "Equipamento","Operador","ID do Cartão","Data de Início",...
   "M_GRUAC_01","João Silva","A1B2C3D4","07/12/2024 09:30",...
   │
   ▼
4. Download automático:
   casais_fleet_sessoes_2024-12-07.csv
   │
   ▼
5. Abre perfeitamente no Excel (sem problemas de encoding!)


═══════════════════════════════════════════════════════════════════════════════


📊 ESTADOS DA MÁQUINA
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                         IDLE                                │
│                    (Máquina Parada)                         │
│                                                             │
│  LED: 🟡 Amarelo (fixo)                                     │
│  status: "IDLE"                                             │
│  Aguarda cartão registado...                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Operador registado passa cartão
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        ACTIVE                               │
│                  (Sessão em Curso)                          │
│                                                             │
│  LED: 🟡 Amarelo (volta após verde)                         │
│  status: "ACTIVE"                                           │
│  Sessão OPEN                                                │
│  Horas a contar...                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ MESMO operador passa cartão
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         IDLE                                │
│                   (Sessão Fechada)                          │
│                                                             │
│  LED: 🟢 Verde (pisca 3x) → 🟡 Amarelo                      │
│  status: "IDLE"                                             │
│  Sessão CLOSED                                              │
│  totalHours atualizado                                      │
└─────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════


🔐 SEGURANÇA E LOGS
═══════════════════════════════════════════════════════════════════════════════

Tentativa de acesso NÃO AUTORIZADO:
───────────────────────────────────────────────────────────────────────────────

Cartão não registado tenta START
   │
   ▼
Backend guarda em unregistered_scans:
{
  id: "X9Y8Z7W6",
  machineId: "M_GRUAC_01",
  timestamp: now(),
  type: "access_attempt",
  resolved: false
}
   │
   ▼
LED VERMELHO 3 segundos
   │
   ▼
Se depois registares esse cartão:
  → resolved: true
  → Era só um scan de registo, não tentativa maliciosa

Se nunca registares:
  → resolved: false
  → Fica em log permanente para auditoria


═══════════════════════════════════════════════════════════════════════════════
FIM DO FLUXO DO SISTEMA
═══════════════════════════════════════════════════════════════════════════════

