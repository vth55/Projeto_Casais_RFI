# 🛠️ Guia de Troubleshooting & Edge Cases

Este guia documenta erros comuns, comportamentos surpresivos e as suas soluções. 

---

## 🔌 Hardware (Arduino & Python Bridge)

### 🔴 Erro: "Port Busy" ou "Access Denied" na Python Bridge
- **Causa**: O Monitor Serial do Arduino IDE está aberto.
- **Solução**: Fecha o Monitor Serial no IDE antes de iniciar o ficheiro `.bat` da ponte.

### 🟡 Problema: Cartão RFID não detetado (LED não pisca)
- **Causa**: Cabo SDA ou RST mal conectado (Jumper solto devido a vibração da máquina).
- **Solução**: Verifica a pinagem no `arduino_rfid_simple/README.md`. Bate levemente no leitor para testar a conexão.

---

## ☁️ Cloud & Backend (Firebase)

### 🔴 Erro: "Email not sent" no Log das Functions
- **Causa**: Variáveis de ambiente SMTP (`EMAIL_PASS`) não configuradas ou token expirado.
- **Solução**: Executa `firebase functions:secrets:set EMAIL_PASS=xxxxx`.

### 🟡 Problema: Sessão não fecha automaticamente
- **Causa**: Threshold de fadiga ou auto-close alterado no Firestore e não propagado.
- **Solução**: Verifica a coleção `settings/alertConfig` no Firestore.

---

## 🏗️ Integração Procore

### 🔴 Erro: "401 Unauthorized" nos Logs de Exportação
- **Causa**: O Access Token do Procore expirou e o Refresh falhou (conta de dev pendente).
- **Solução**: Reiniciar o processo de autorização manual via rota `/procore/auth` (quando disponível).

### 🟡 Problema: Timecard não sincronizado
- **Causa**: O ID do Cartão RFID não tem um mapeamento correspondente no Diretório do Procore (Mismatch de nomes/email).
- **Solução**: Garante que o email do operador na PWA é IDENTICO ao email no Procore.

---

> **Dica do Futuro**: Se encontrares um bug novo, documenta-o aqui imediatamente.
