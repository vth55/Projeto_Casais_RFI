# 🎓 APRENDIZAGENS E TENTATIVAS

> Coisas que aprendemos, tentativas que falharam e soluções encontradas

---

## 🔄 TENTATIVAS E APRENDIZAGENS

### **Frontend não atualizava logs:**
- **Problema:** Tentativa de mostrar `unregistered_scans` na UI causava problemas
- **Solução:** Remover da UI, manter no backend
- **Razão:** Logs apenas para auditoria, não precisam estar na interface
- **Impacto:** UI mais limpa, logs preservados

---

### **Scan_buffer vs Unregistered_scans:**
- **Problema Inicial:** Tentativa de usar apenas `unregistered_scans` para auto-fill
- **Conflito:** Misturava "scans para registo" com "tentativas de acesso"
- **Solução:** Separar concerns
  - `scan_buffer/latest` → Auto-fill (último scan, sempre atualiza)
  - `unregistered_scans` → Logs segurança (tentativas bloqueadas)
- **Aprendizado:** Separar concerns é crucial. Um doc para "último scan", outro para "logs de segurança"

---

### **Escalabilidade múltiplas máquinas:**
- **Pergunta:** Sistema preparado para múltiplas máquinas?
- **Análise:** Verificamos arquitetura completa
- **Decisão:** Sistema JÁ preparado
- **Razão:** Arquitetura foi desenhada corretamente desde o início
- **Aprendizado:** Planeamento inicial bom evita refactoring futuro

---

## 🎓 APRENDIZAGENS TÉCNICAS

### **Hardware:**
- LEDs precisam resistores de 220Ω (não ligar direto!)
- Arduino Serial.print() é bloqueante (usar com cuidado)
- ESP32 tem muito mais pinos que Arduino Uno
- Delay() para LEDs: 150ms é suficiente para ver piscar
- Fechar Monitor Serial **obrigatório** para Python funcionar

---

### **Firebase:**
- onSnapshot() é mais eficiente que ler constantemente
- Firestore é mais rápido que Realtime Database para este caso
- Cloud Functions têm timeout de 60s (mais que suficiente)
- Documentos com `.` no nome causam problemas - usar `/` na path
- Timestamp do Firestore precisa `.toDate()` para usar no JavaScript
- `merge: true` evita sobrescrever campos não mencionados

---

### **React:**
- useEffect() com dependências corretas evita loops
- Filtros de data são mais eficientes com memoization
- Toasts são melhores que alerts() nativos
- useEffect com array vazio `[]` = executa 1 vez (mount)
- useEffect sem array = executa sempre (evitar!)
- Toasts precisam de state separado para re-renderizar
- `key` em listas TEM de ser único (não usar index se ordem muda)

---

### **Arduino/Python:**
- Python Serial precisa de `\n` no final para `readStringUntil()` funcionar
- Serial.print() é **bloqueante** - não fazer loops dentro
- Fechar Monitor Serial **obrigatório** para Python funcionar

---

### **CSV Export:**
- UTF-8 BOM (`\uFEFF`) necessário para Excel PT abrir corretamente
- Aspas duplas em células: `"${cell}"`
- Vírgulas em células: envolver em aspas
- `Blob` com `type: 'text/csv;charset=utf-8;'`

---

## 🔧 COMANDOS ÚTEIS

```bash
# Ver portas COM disponíveis
python -m serial.tools.list_ports

# Testar Firebase local (antes de deploy)
firebase emulators:start

# Ver logs do backend em tempo real
firebase functions:log --only handleSessionTrigger

# Build de produção (testar antes de deploy)
npm run build
```

---

## ⚠️ PROBLEMAS CONHECIDOS

### **Firebase Auth - Configuração Pendente**
- **Status:** Não crítico - pode ser feito depois
- **Erro atual:** `auth/configuration-not-found`
- **Impacto:** Aplicação funciona normalmente, apenas avisos na consola
- **Como configurar (quando necessário):**
  1. Ir ao Firebase Console
  2. Selecionar projeto: `casais-rfid`
  3. Navegar para: **Authentication** → **Get Started**
  4. Ativar método: **Anonymous** (Sign-in method)
  5. Salvar

**Nota:** A aplicação está preparada para funcionar sem Auth. O login anónimo é opcional e apenas melhora a segurança das regras do Firestore.

---

## 📊 MÉTRICAS DO PROJETO

**Ficheiros criados:** ~30+  
**Linhas de código (aprox):** ~3000+  
**Tecnologias usadas:** React, Firebase, Python, Arduino/ESP32  
**Tempo de desenvolvimento:** [A preencher quando terminares]

---

## 🛡️ NOTAS DE SEGURANÇA

### **Proteção de Ficheiros Temporários**
- NUNCA apagar sem ordem EXPLÍCITA do Vitor
- SEMPRE exigir DUPLA CONFIRMAÇÃO antes de apagar
- Ficheiros críticos:
  - APAGAR_ANTES_ENTREGAR_DevLog.md (CRÍTICO - Memória principal!)
  - INICIAR_NOVA_SESSAO.txt
  - NOTAS_RAPIDAS.txt
  - FLUXO_SISTEMA.txt
  - ROADMAP_6_MESES.md
  - INDEX_FICHEIROS.txt

---

## ✅ CHECKLIST ANTES DE ENTREGAR

1. Apagar este ficheiro (APAGAR_ANTES_ENTREGAR_DevLog.md)
2. Apagar outros ficheiros temporários
3. Limpar código (console.logs, TODOs)
4. Verificar documentação final
5. Testar tudo
6. Fazer deploy final
7. **APAGAR TODOS OS DADOS MOCK** (via Configurações ou Firebase Console)

---

**Ver também:**
- [APAGAR_ANTES_ENTREGAR_DevLog_DECISOES.md](APAGAR_ANTES_ENTREGAR_DevLog_DECISOES.md)
- [DOCUMENTACAO_PROJETO.md](../DOCUMENTACAO_PROJETO.md)

