# Fichier: main.py
import network
import urequests
import dht
import time
import machine
import config  # Import du fichier de configuration

# **************************************
# Configuration des broches et périphériques
dht_sensor = dht.DHT11(machine.Pin(4))  # Capteur DHT11 sur GPIO4
clim_relay = machine.Pin(5, machine.Pin.OUT)  # Relais pour contrôler la climatisation (GPIO5)

# **************************************
# Connexion Wi-Fi
def connect_wifi(timeout=20):
    """
    Connecte l'appareil au réseau Wi-Fi avec un timeout pour éviter une boucle infinie.
    """
    sta = network.WLAN(network.STA_IF)
    sta.active(True)
    sta.connect(config.SSID, config.PASSWORD)
    print("Connexion Wi-Fi en cours...")

    for _ in range(timeout):
        if sta.isconnected():
            print("Connecté au réseau Wi-Fi")
            print("Configuration réseau:", sta.ifconfig())
            return True
        time.sleep(1)
    print("Échec de la connexion Wi-Fi")
    return False

# **************************************
# Constantes et variables
HTTP_HEADERS = {'Content-Type': 'application/json'}
UPDATE_TIME_INTERVAL = 5000  # Intervalle de mise à jour (en ms)
last_update = time.ticks_ms()
TEMP_RANGE = (16, 30)  # Plage de température acceptable pour un climatiseur

# **************************************
# Fonctions pour interfacer avec ThingSpeak
def send_to_thingspeak(temp, humidity, fake_temp):
    """
    Envoie les données de température et d'humidité à ThingSpeak.
    """
    url = "http://api.thingspeak.com/update"
    payload = {
        "api_key": config.THINGSPEAK_WRITE_API_KEY,
        "field1": temp,
        "field2": humidity,
        "field3": fake_temp
    }
    try:
        response = urequests.post(url, json=payload, headers=HTTP_HEADERS)
        print("Données envoyées à ThingSpeak:", response.text)
        response.close()
    except Exception as e:
        print("Erreur d'envoi:", e)

def generate_fake_clim_temperature(real_temp):
    """
    Génère une température simulée de la climatisation en fonction de la température réelle.
    """
    return max(TEMP_RANGE[0], min(real_temp, TEMP_RANGE[1]))

def clim_status_thingspeak(status):
    url = "http://api.thingspeak.com/update"
    payload = {
        "api_key": config.THINGSPEAK_READ_API_KEY,
        "field4": status,
    }
    try:
        response = urequests.post(url, json=payload, headers=HTTP_HEADERS)
        print("Données envoyées à ThingSpeak:", response.text)
        response.close()
    except Exception as e:
        print('Status',status)
        print("Erreur d'envoi:", e)

# **************************************
# Fonction principale
def main():
    """
    Boucle principale pour le contrôle de la climatisation et l'envoi des données.
    """
    if not connect_wifi():
        return  # Arrêter si la connexion Wi-Fi échoue

    global last_update
    clim_relay.value(0)  # Assurez-vous que la climatisation est éteinte au démarrage

    while True:
        try:
            # Vérification de l'intervalle d'envoi
            if time.ticks_diff(time.ticks_ms(), last_update) > UPDATE_TIME_INTERVAL:
                # Lecture des données du capteur DHT11
                dht_sensor.measure()
                current_temp = dht_sensor.temperature()
                humidity = dht_sensor.humidity()
                
                if current_temp is not None and humidity is not None:
                    fake_clim_temp = generate_fake_clim_temperature(current_temp)
                    print(f"Température: {current_temp} °C, Humidité: {humidity}%, Fake Clim Temp: {fake_clim_temp} °C")
                    send_to_thingspeak(current_temp, humidity, fake_clim_temp)
                
                last_update = time.ticks_ms()
            # Allumer ou éteindre la clim pour indiquer l'état
            clim_relay.value(not clim_relay.value())
            clim_status_thingspeak(clim_relay.value())
            
            time.sleep(1)  # Éviter une consommation excessive du CPU
        
        except Exception as e:
            print("Erreur dans la boucle principale:", e)

# **************************************
if __name__ == "__main__":
    main()
