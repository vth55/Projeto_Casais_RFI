# 🧪 LABORATORIO VIRTUAL DE BRAGA (Simulador ESP32)

Este guia permite-te testar o teu sistema de gestão de frotas sem tocar em hardware físico, enviando dados reais do **Wokwi** (emulador no browser) para o teu **Firebase**.

---

### 🚀 COMO COMEÇAR (PASSO-A-PASSO)

#### 1. Abrir o Simulador
1.  Cria uma conta em [Wokwi.com](https://wokwi.com).
2.  Cria um novo projeto **ESP32**.

#### 2. Copiar o Mapa de Fios (Diagram)
1.  No Wokwi, clica no ficheiro `diagram.json`.
2.  Apaga tudo o que lá está e cola o conteúdo do ficheiro:
    *   `Hardware_ESP32/wokwi_simulator/diagram.json`

#### 3. Copiar o Código
1.  Clica no ficheiro `sketch.ino`.
2.  Apaga tudo e cola o conteúdo do ficheiro:
    *   `Hardware_ESP32/wokwi_simulator/ESP32_SIMULATOR.ino`

#### 4. Executar o Teste
1.  Clica no botão **Play** (verde) no Wokwi.
2.  Verifica o Terminal (Serial Monitor) no fundo do ecrã.
3.  Quando disser "WiFi Conectado", aprova um cartão RFID.
4.  **Como aproximar cartões:**
    *   Clica no leitor RFID (quadrado azul).
    *   Clica no cartão para "simular proximidade".

#### 5. Verificar o teu PWA/Dashboard
*   Vais ver a sessão "M_GRUAC_01_SIMULADA" a acender em tempo real no dashboard do teu site!

---

### ⚠️ NOTA DE LIMPEZA
Este simulador é apenas para **desenvolvimento em Braga**. Assim que comprares o hardware real ou entregares o projeto, deves apagar a pasta `Hardware_ESP32/wokwi_simulator/` para que o projeto fique limpo.

---

> **Dica do Gemini (Arquiteto):** Se o LED amarelo piscar no simulador mas não aparecer nada no site, verifica o URL do teu Firebase no código do Simulador.
