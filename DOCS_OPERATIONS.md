# 🛠️ DOCS_OPERATIONS - Guia de Operações

Este documento centraliza todos os procedimentos de manutenção, publicação e montagem do hardware *Casais Fleet Intelligence*.

---

## 🚀 Comandos Rápidos

### Frontend & Backend
| Componente | Comando | Contexto |
|------------|---------|----------|
| PWA Dashboard | `npm run dev` | Desenvolvimento local em `localhost:5173` |
| PWA Build | `npm run build` | Preparar para produção |
| Cloud Functions | `firebase deploy --only functions` | Publicar lógica de backend |
| Hosting | `firebase deploy --only hosting` | Publicar frontend no servidor |

### Hardware (Bridge Python)
```bash
# Iniciar a ponte de comunicação entre Arduino e Cloud
# Configurar a porta COM no ficheiro se necessário (linha 7)
python Hardware_Bridge_PC/serial_to_cloud_bridge.py
```

---

## 🔌 Referência de Campo (Vitor - Hardmap)

Esta secção serve como memorando para a pinagem física usada no protótipo atual e expansões futuras.

### Pinagem RFID MFRC522 (Protocolo SPI)
- **SDA (SS)**: Pino 10
- **RST**: Pino 9
- **SCK**: Pino 13
- **MOSI**: Pino 11
- **MISO**: Pino 12

> **Nota de Expansão**: O sistema está preparado para suportar **Double-Sensor Expansion**. Caso queiras ligar dois sensores (ex: Entrada/Saída ou Machine-as-Hub), os pinos de dados (MOSI/MISO/SCK) são partilhados, alterando apenas o pino de SDA (SS) para cada módulo.

### Feedback Visual (LEDs de Status)
Mesmo que não uses LEDs físicos atualmente, a lógica do código reserva estes pinos para diagnóstico:
- **🟢 Verde (Pino 5)**
- **🟡 Amarelo (Pino 6)**
- **🔴 Vermelho (Pino 7)**

---

## 📂 Scripts Utilitários
Localização: `scripts/`

- **`scripts/BUILD_PRODUCAO.bat`**: Compila o frontend e prepara os assets.
- **`scripts/DEPLOY_FUNCTIONS.bat`**: Atalho rápido para publicar backend.
- **`scripts/system_utils/limpar_logs.ps1`**: Limpa ficheiros temporários.
- **`scripts/system_utils/testar-conetividade.ps1`**: Verifica Firewalls e Procore.

---

## 🔄 Fluxo de Atualização Recomendado
1. **Local**: Testar alteração em `npm run dev`.
2. **Build**: Executar `scripts/BUILD_PRODUCAO.bat`.
3. **Deploy**: Fazer deploy para o Firebase.
4. **Verificação**: Validar na aba "Integrações" da PWA se o sistema está online.

---
> **Aviso**: O deploy de hardware (Arduino) é realizado via cabo USB usando o ficheiro `arduino_rfid_led.ino`.

