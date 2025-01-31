# Fichier: main.py
import network
import urequests
import dht
import time
import machine

# **************************************
# Configuration des broches et périphériques
dht_sensor = dht.DHT11(machine.Pin(4))  # Capteur DHT11 sur GPIO4
clim_relay = machine.Pin(5, machine.Pin.OUT)  # Relais pour contrôler la climatisation (GPIO5)

# **************************************
# Identifiants Wi-Fi
SSID = "Residence Swisse 4eme"
PASSWORD = "swiss2020"

# **************************************
# Configuration Wi-Fi en tant que STAtion
def connect_wifi():
    """
    Connecte l'appareil au réseau Wi-Fi.
    """
    sta = network.WLAN(network.STA_IF)  # Création de l'objet station Wi-Fi
    sta.active(True)                   # Activation du mode station
    sta.connect(SSID, PASSWORD)        # Connexion au réseau
    print("Connexion Wi-Fi en cours...")
    while not sta.isconnected():       # Boucle jusqu'à connexion
        time.sleep(1)
    print("Connecté au réseau Wi-Fi")
    print("Configuration réseau:", sta.ifconfig())

# **************************************
# Constantes et variables
HTTP_HEADERS = {'Content-Type': 'application/json'}
THINGSPEAK_WRITE_API_KEY = 'IKDDZ3P5T31O02D4'  # Clé API d'écriture
THINGSPEAK_READ_API_KEY = 'FOQB2Z8U8DY136Q0'   # Clé API de lecture
UPDATE_TIME_INTERVAL = 5000  # Intervalle de mise à jour (en ms)
last_update = time.ticks_ms()  # Timestamp initial pour la synchronisation

# **************************************
# Fonctions pour interfacer avec ThingSpeak

def send_to_thingspeak(temp, humidity):
    """
    Envoie les données de température et d'humidité à ThingSpeak.
    """
    url = "http://api.thingspeak.com/update"
    payload = {
        "api_key": THINGSPEAK_WRITE_API_KEY,
        "field1": temp,
        "field2": humidity
    }
    try:
        response = urequests.post(url, json=payload, headers=HTTP_HEADERS)
        print("Données envoyées à ThingSpeak:", response.text)
        response.close()
    except Exception as e:
        print("Erreur d'envoi:", e)

def get_clim_status():
    """
    Lit l'état actuel de la climatisation depuis ThingSpeak.
    Retourne :
        - 0 : éteint
        - 1 : allumé
    """
    url = f"http://api.thingspeak.com/channels/2791799/fields/field3/last.json?api_key={THINGSPEAK_READ_API_KEY}"
    try:
        response = urequests.get(url)
        data = response.json()
        response.close()
        return int(data['field3'])
    except Exception as e:
        print("Erreur lors de la lecture de l'état de la climatisation:", e)
        return None

def get_target_temperature():
    """
    Lit la température cible définie par l'utilisateur via ThingSpeak.
    Retourne :
        - Température cible en float
    """
    url = f"http://api.thingspeak.com/channels/2791799/fields/field4/last.json?api_key={THINGSPEAK_READ_API_KEY}"
    try:
        response = urequests.get(url)
        data = response.json()
        response.close()
        return float(data['field4'])
    except Exception as e:
        print("Erreur lors de la lecture de la température cible:", e)
        return None

# **************************************
# Fonction principale
def main():
    """
    Boucle principale pour le contrôle de la climatisation et l'envoi des données.
    """
    connect_wifi()  # Connexion au Wi-Fi
    global last_update

    # Initialisation
    current_temp = None
    clim_relay.value(0)  # Assurez-vous que la climatisation est éteinte au démarrage

    while True:
        try:
            # Lecture de la température cible depuis ThingSpeak
            target_temp = get_target_temperature()
            if target_temp is not None:
                print(f"Température cible reçue : {target_temp}°C")

            # Lecture de l'état de la climatisation
            clim_status = get_clim_status()
            if clim_status is not None:
                if clim_status == 1:
                    clim_relay.value(1)  # Allumer la climatisation
                    print("Climatisation : Allumée")
                else:
                    clim_relay.value(0)  # Éteindre la climatisation
                    print("Climatisation : Éteinte")

            # Synchronisation de l'intervalle d'envoi
            if time.ticks_diff(time.ticks_ms(), last_update) > UPDATE_TIME_INTERVAL:
                # Lecture des données du capteur DHT11
                dht_sensor.measure()
                current_temp = dht_sensor.temperature()
                humidity = dht_sensor.humidity()
                print(f"Température actuelle: {current_temp}°C, Humidité: {humidity}%")

                # Envoi des données à ThingSpeak
                send_to_thingspeak(current_temp, humidity)

                # Mise à jour du dernier envoi
                last_update = time.ticks_ms()

        except Exception as e:
            print("Erreur dans la boucle principale:", e)

# **************************************
if __name__ == "__main__":
    main()