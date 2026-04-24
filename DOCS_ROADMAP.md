# 🗺️ DOCS_ROADMAP - Requisitos vs Execução

Este documento é a "Fonte de Verdade" para o progresso do projeto. Combina a visão estratégica com a auditoria técnica de cada funcionalidade pedida.

---

## 📊 RESUMO DE SAÚDE DO PROJETO
> **Última Atualização:** 24 Abril 2026  
> **Foco Atual:** Fase 6 - Industrialização & Blindagem (Conclusão Manutenção)  
> **Estado Geral:** ✅ 99% Concluído (Deploy Industrial & Auditoria OK)

---

## ✅ CONCLUÍDO (O que já está em Produção)

### 🏗️ Integração Procore (Enterprise)
- [x] **Fase 0-2**: OAuth2 Bridge e Sincronização de Directório/Equipamentos.
- [x] **Fase 3-4**: Writeback automático de Daily Logs, Custos e Resiliência (LIVE).
- [x] **Interface**: Aba de Integrações, Badges de Sync e Auth Sandbox Procore.

### 📱 Mobile Hub & Hardware
- [x] **Tecnologia**: Smartphone-as-Machine (NFC Nativo) concluído.
- [x] **Arduino**: Retrofit com RFID e LEDs de feedback visual funcionais.
- [x] **Auto-ID**: Geração de chaves `M_MOB_...` e auto-registo.

### ⚙️ Engine de BI & UX
- [x] **RBAC**: 5 perfis de acesso com dashboards dinâmicos.
- [x] **Métricas**: Cálculo de CO2, Consumo, MTBF operacional e Taxa de Utilização.
- [x] **PWA**: Suporte offline completo, Service Worker estável e instalável.

---

## 🎯 MATRIZ DETALHADA (Pedidos vs. Código)

| Funcionalidade | Status | Garantido no Código | Falta / Impedimentos |
|----------------|--------|---------------------|----------------------|
| **Controlo de Anomalias** | ✅ FEITO | Backend deteta sessões >5h e >14h. Link de validação por email funcional. | UI de visualização de anomalias (`QualidadeView`) precisa de refinamento visual. |
| **Cálculo Dinâmico de Custos** | ✅ FEITO | Usa `consumptionRate` da máquina e `pricePerLitre` do Firestore. | - |
| **Gestão de Parâmetros PWA** | ✅ FEITO | UI nas Configurações para editar Diesel, CO2 e Manutenção (via RBAC). | - |
| **Manutenção Preditiva Sede** | ✅ FEITO | Projeção, Agendamento, Export CSV e Histórico auditados (Blocos 1-9). | Dots de Previsão/Agendamento invisíveis na grelha do calendário. |
| **Galeria de Fotos (Manutenção)** | 🔴 PLANEADO | Novo modal de detalhe já implementado. | Adicionar visualização de anexos (Antes/Depois) no modal. |
| **Gestão em Massa** | 🟡 EM CURSO | Edição de tarifários, categorias e localizações de múltiplas máquinas simultaneamente. | Mudança de localização em massa em `MaquinasView`. |
| **Login por Passcode** | 🔴 PLANEADO | Atualmente utiliza `signInAnonymously`. Lógica de verificação de PIN 4-dígitos pendente. | Prioridade máxima para a próxima Sprint técnica. |
| **Segurança API (Hardware)** | 🟡 EM CURSO | Proteção básica via Cloud Functions. | Implementar validação de X-API-KEY no `index.js` e Bridge Python. |
| **Checklist de Segurança** | 🔴 PLANEADO | Criar pop-up de pré-utilização no PWA do Operador. | Requisito de compliance. |
| **Feedback (Toasts)** | 🔴 PLANEADO | Implementar avisos visuais de sucesso/erro em `SessoesCorrigidasView`. | Melhoria de UX. |
| **Higiene de Produção** | 🟡 EM CURSO | Flag para esconder DevTools e remoção de MockData. | Preparação para demonstração final. |
| **Validação de Perfis** | 🔴 PLANEADO | Testar permissões (Guards) via Modo Demo nas Configurações. | Verificar se Encarregado e Sustentabilidade vêem o que devem. |
| **Nomenclatura Inteligente** | 🟡 EM CURSO | Gerador `{CAT}-{NUM} - {OBRA}` para apoiar criação manual na PWA. | Facilitar gestão enquanto aguardamos Procore. |
| **Audit Trail (Settings)** | 🔴 PLANEADO (F6) | Registo de quem e quando alterou diesel/CO2/manutenção. | Requisito ISO 55001. |
| **PIN Security** | 🔴 PLANEADO (F6) | Cloud Functions intermediária com Rate Limit. | Proteção contra Bruteforce. |
| **Offline-First Login** | 🔴 PLANEADO (F6) | Cache local do PIN (hash) no Mobile Hub. | Operação em áreas sem rede. |
| **Data Performance** | 🔴 PLANEADO (F6) | Pré-cálculo de KPIs via Cloud Functions (scheduled). | Preparação para frotas > 50 máquinas. |

---

- [ ] **Fase 6: Industrialização & Blindagem de Segurança**:
    - [ ] Implementar Audit Trail para configurações sensíveis.
    - [ ] Refatorar auth PIN para Cloud Functions com Rate Limit.
    - [ ] Implementar Offline-First para o Mobile Hub.
    - [ ] Otimizar performance de KPIs (Pre-calculation).
- [ ] **Offline Sync (Human-Relay)**: Sincronização via Bluetooth entre telemóveis.
- [ ] **Segurança BLE**: Alertas de proximidade entre máquinas e pessoal.
- [ ] **AI Predict**: Previsão de avarias baseado em histórico de telemetria.
- [ ] **Notificações Push**: Alertas reais via Service Worker (Browser notifications).
- [ ] **Login Biométrico**: (Ideia) FaceID/Fingerprint no Mobile Hub.

---
> **Instrução Permanente:** Este ficheiro substitui `STATUS_PROJETO.md` e `MATRIZ_ACOMPANHAMENTO.md`.
