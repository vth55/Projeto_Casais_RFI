import serial
import requests
import time

# --- CONFIGURAÇÃO ---
# Mude para a porta do seu Arduino (COM3, COM4, etc.)
SERIAL_PORT = 'COM4' 
BAUD_RATE = 9600

# URL do Backend (JÁ ATUALIZADO COM O TEU LINK REAL)
SERVER_URL = "https://handlesessiontrigger-mtaqaropqq-uc.a.run.app"
MACHINE_ID = "M_ARDUINO_PC_02"

def send_to_cloud(card_id, ser):
    payload = { "cardId": card_id, "machineId": MACHINE_ID }
    try:
        print(f"Enviando {card_id} para a Cloud...")
        # O pedido é enviado para o teu servidor na Google Cloud
        response = requests.post(SERVER_URL, json=payload, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ SUCESSO! Status: {response.status_code}")
            print(f"   Resposta: {response.text}")
            
            # Enviar feedback para o Arduino (LED)
            try:
                data = response.json()
                status = data.get('status', '')
                
                if status == 'START':
                    ser.write(b'START\n')
                    print("   → LED VERDE (Sessão Iniciada)")
                elif status == 'STOP':
                    ser.write(b'STOP\n')
                    print("   → LED VERDE PISCANTE (Sessão Encerrada)")
                else:
                    ser.write(b'OK\n')
            except:
                pass
                
        elif response.status_code == 403:
            print(f"🚫 ACESSO NEGADO: Cartão não registado")
            print(f"   Resposta: {response.text}")
            # Enviar comando para LED VERMELHO
            try:
                ser.write(b'DENIED\n')
                print("   → LED VERMELHO (Acesso Bloqueado)")
            except:
                pass
        else:
            print(f"⚠️ AVISO: Status {response.status_code}")
            print(f"   Erro: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        # Sinalizar erro ao Arduino
        try:
            ser.write(b'ERROR\n')
        except:
            pass

def main():
    try:
        # Tenta conectar ao Arduino
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"--- PONTE LIGADA NA PORTA {SERIAL_PORT} ---")
        print(f"A ligar ao servidor: {SERVER_URL}")
        print("Podes passar o cartão no Arduino agora...")
        
        while True:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8').strip()
                # O Arduino envia algo como "CARD: ABC12345"
                if "CARD:" in line:
                    parts = line.split(":")
                    if len(parts) > 1:
                        card_id = parts[1].strip()
                        if card_id:
                            send_to_cloud(card_id, ser)
            time.sleep(0.1)

    except serial.SerialException:
        print(f"❌ ERRO CRÍTICO: Não consigo abrir a porta {SERIAL_PORT}.")
        print("1. Verifica se o cabo USB está bem ligado.")
        print("2. Verifica se fechaste o Monitor Serial do Arduino IDE (é obrigatório fechar).")
    except Exception as e:
        print(f"Erro inesperado: {e}")

if __name__ == "__main__":
    main()