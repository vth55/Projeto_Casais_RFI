# 🧪 PLANO DE TESTES - CASAIS FLEET INTELLIGENCE (V2)

> **Protocolo de Validação:** Como testar a infraestrutura industrial do Futuro (V2).

---

## 1. TESTE DE RESILIÊNCIA "DATA HARVESTING"
**Objetivo:** Garantir que nenhum dado é perdido em zonas sem rede.

| Passo | Ação | Resultado Esperado |
| :--- | :--- | :--- |
| 1 | Desligar Wi-Fi/4G do telemóvel da empresa (Mobile Hub). | App fica em modo `Offline`. |
| 2 | Simular registo de sessão sem rede. | O PWA recolhe o dado e guarda em `IndexedDB` (Persistent Storage). |
| 3 | Ligar Wi-Fi/4G no telemóvel. | O Service Worker deteta rede e envia o scan para o Firebase. |
| 4 | Verificar Dashboard Online. | A sessão aparece com o timestamp original correto. |

---

## 2. TESTE DE SEGURANÇA (API GATEWAY)
**Objetivo:** Validar se a Cloud Function está protegida contra injeção de dados falsos.

| Passo | Ação | Resultado Esperado |
| :--- | :--- | :--- |
| 1 | Enviar POST via Postman para o endpoint IoT (sem API-KEY). | Resposta: `401 Unauthorized`. |
| 2 | Enviar POST com API-KEY inválida. | Resposta: `403 Forbidden`. |
| 3 | Enviar POST com API-KEY correta. | Resposta: `200 OK` (Scan processado). |

---

## 3. TESTE DE IDEMPOTÊNCIA (DUPLICADOS)
**Objetivo:** Garantir que múltiplos envios do mesmo dado não criam lixo na base de dados.

| Passo | Ação | Resultado Esperado |
| :--- | :--- | :--- |
| 1 | Enviar o MESMO scan (ID_Máquina + Timestamp) de 5 dispositivos diferentes. | Todos os pedidos são aceites (200 OK). |
| 2 | Consultar Firestore em `sessions/`. | Apenas **existe 1 documento** correspondente a esse scan. |
| 3 | Verificar Dashboard Financeiro. | O custo da sessão foi contabilizado apenas uma vez. |

---

## 4. TESTE DE STRESS E ARQUIVO (BIGQUERY)
**Objetivo:** Validar a performance da PWA com dados históricos pesados.

| Passo | Ação | Resultado Esperado |
| :--- | :--- | :--- |
| 1 | Injetar 10.000 sessões fake no BigQuery (Data: 2024). | Sucesso na inserção. |
| 2 | Abrir View "Análises" na PWA → Escolher Jan 2024. | Loading spinner aparece e os dados são carregados do BQ. |
| 3 | Abrir View "Dashboard" (Dados Quentes). | A performance do Dashboard atual deve manter-se instantânea (<100ms). |

---

## 📅 CALENDÁRIO DE TESTES SUGERIDO
1. **Teste 2 (Segurança):** Imediato (fácil implementação).
2. **Teste 1 (Resiliência):** Após migração para ESP32 Firmware V2.
3. **Teste 3 (Idempotência):** Durante o Beta-Release da Fase 2.

---

> **Nota Crítica:** Estes testes devem ser realizados em dispositivos reais de campo e não apenas em emuladores, para validar a interferência de sinal Bluetooth em cabines de máquinas pesadas.
