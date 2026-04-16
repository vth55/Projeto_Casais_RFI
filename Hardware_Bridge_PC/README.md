# 🌉 Hardware_Bridge_PC - Ponte Serial-to-Cloud

Este módulo contém o script Python responsável por ler os dados do leitor RFID (via Arduino) e enviá-los para a cloud em tempo real.

---

## 🛠️ Requisitos
- **Python 3.x**
- **pyserial**: Para comunicação com o Arduino.
- **requests**: Para chamadas à API HTTP das Cloud Functions.

```bash
pip install pyserial requests
```

---

## 📂 Ficheiros
- `serial_to_cloud_bridge.py`: Script principal que monitoriza a porta COM.

---

## ⚙️ Configuração
Antes de correr, verifica a porta COM no **Gestor de Dispositivos** e atualiza no script:
```python
# Linha 7 do serial_to_cloud_bridge.py
SERIAL_PORT = 'COM4'  # Exemplo Windows
```

---

## 🚦 Estados de Feedback (LEDs)
O script envia comandos de volta para o Arduino para controlar os LEDs de status:
- **Sucesso**: Pisca verde (Sessão iniciada/fechada).
- **Erro**: Pisca vermelho (Cartão não registado ou erro de API).

---

## 🚀 Como Correr
1. Liga o Arduino à porta USB.
2. Certifica-te que o Monitor Serial do Arduino IDE está **FECHADO**.
3. Executa:
```bash
python Hardware_Bridge_PC/serial_to_cloud_bridge.py
```

---
> **Nota**: Este script é essencial para máquinas "Retrofit". No caso do Mobile Hub, a ponte é feita nativamente pelo browser via NFC.
