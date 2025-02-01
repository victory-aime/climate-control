import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Button,
  StyleSheet,
  StatusBar,
} from "react-native";
import axios from "axios";

const THINGSPEAK_WRITE_API_KEY = "IKDDZ3P5T31O02D4";
const THINGSPEAK_READ_API_KEY = "FOQB2Z8U8DY136Q0";
const CHANNEL_ID = "2791799";

const App = () => {
  const [currentTemp, setCurrentTemp] = useState(null);
  const [currentHumidity, setCurrentHumidity] = useState(null);
  const [fakeClimTemp, setFakeClimTemp] = useState(null);
  const [targetTemp, setTargetTemp] = useState(0);
  const [climStatus, setClimStatus] = useState(0);

  /**
   * Charger les données depuis ThingSpeak
   * field 1 recupere la temperature
   * field 2 recupere l'humidite
   * field 3 recupere la fake temp de la clim
   * field 4 recupere l'etat de la clim eteint ou allumee
   */

  const fetchData = async () => {
    try {
      const response = await axios.get(
        `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds/last.json?api_key=${THINGSPEAK_READ_API_KEY}`
      );
      const data = response.data;
      setCurrentTemp(data.field1);
      setCurrentHumidity(data.field2);
      setFakeClimTemp(data.field3);
      setClimStatus(data.field4);
    } catch (error) {
      console.error("Erreur lors du chargement des données :", error);
    }
  };

  // Mettre à jour la température de la fake clim
  const updateTargetTemperature = async (newTemp: number) => {
    setTargetTemp(newTemp);
    try {
      await axios.post("https://api.thingspeak.com/update", {
        api_key: THINGSPEAK_WRITE_API_KEY,
        field3: newTemp,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
    }
  };

  // Allumer ou éteindre la climatisation
  const toggleClim = async () => {
    try {
      const newStatus = climStatus === 1 ? 0 : 1;
      await axios.post("https://api.thingspeak.com/update", {
        api_key: THINGSPEAK_WRITE_API_KEY,
        field4: newStatus,
      });
      setClimStatus(newStatus);
    } catch (error) {
      console.error("Erreur lors du changement d’état :", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Rafraîchir toutes les 60 secondes
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contrôle Climatisation</Text>
      <Text style={styles.info}>
        Température actuelle : {currentTemp ?? "--"} °C
      </Text>
      <Text style={styles.info}>
        Humidité actuelle : {currentHumidity ?? "--"} %
      </Text>
      <Text style={styles.info}>
        Température Clim (Fake) : {fakeClimTemp ?? "--"} °C
      </Text>

      <View style={styles.tempControl}>
        <Button
          title="-"
          onPress={() => updateTargetTemperature(targetTemp - 1)}
        />
        <Text style={styles.tempText}>{targetTemp} °C</Text>
        <Button
          title="+"
          onPress={() => updateTargetTemperature(targetTemp + 1)}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.climButton,
          { backgroundColor: climStatus === 1 ? "red" : "green" },
        ]}
        onPress={toggleClim}
      >
        <Text style={styles.climButtonText}>
          {climStatus === 1
            ? "Éteindre la climatisation"
            : "Allumer la climatisation"}
        </Text>
      </TouchableOpacity>

      <StatusBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#060021",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  info: {
    fontSize: 18,
    color: "white",
    textAlign: "center",
    marginVertical: 5,
  },
  tempControl: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  tempText: {
    fontSize: 30,
    color: "white",
    marginHorizontal: 15,
  },
  climButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  climButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default App;
