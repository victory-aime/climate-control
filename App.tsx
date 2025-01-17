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

const CustomButton = ({
  title,
  onPress,
  climStatus,
}: {
  title?: string;
  climStatus?: number;
  onPress?: () => void;
}) => {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: climStatus === 1 ? "red" : "green",
        padding: 10,
        borderRadius: 5,
        alignItems: "center",
      }}
      onPress={onPress}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  );
};

const App = () => {
  const [currentTemp, setCurrentTemp] = useState(null);
  const [currentHumidity, setCurrentHumidity] = useState(null);
  const [targetTemp, setTargetTemp] = useState(0);
  const [climStatus, setClimStatus] = useState(0);

  const THINGSPEAK_READ_API_KEY = "<Votre API Key Read>";
  const THINGSPEAK_WRITE_API_KEY = "<Votre API Key Write>";
  const CHANNEL_ID = "<Votre Channel ID>";

  // Charger les données depuis ThingSpeak
  const fetchData = async () => {
    try {
      const tempResponse = await axios.get(
        `https://api.thingspeak.com/channels/${CHANNEL_ID}/fields/1/last.json?api_key=${THINGSPEAK_READ_API_KEY}`
      );
      const humidityResponse = await axios.get(
        `https://api.thingspeak.com/channels/${CHANNEL_ID}/fields/2/last.json?api_key=${THINGSPEAK_READ_API_KEY}`
      );
      const climResponse = await axios.get(
        `https://api.thingspeak.com/channels/${CHANNEL_ID}/fields/3/last.json?api_key=${THINGSPEAK_READ_API_KEY}`
      );
      const targetResponse = await axios.get(
        `https://api.thingspeak.com/channels/${CHANNEL_ID}/fields/4/last.json?api_key=${THINGSPEAK_READ_API_KEY}`
      );

      setCurrentTemp(tempResponse.data.field1);
      setCurrentHumidity(humidityResponse.data.field2);
      setClimStatus(parseInt(climResponse.data.field3));
      setTargetTemp(targetResponse.data.field4);
    } catch (error) {
      console.error("Erreur lors du chargement des données :", error);
    }
  };

  // Envoyer une nouvelle température cible
  const updateTargetTemperature = async () => {
    try {
      await axios.post("https://api.thingspeak.com/update", {
        api_key: THINGSPEAK_WRITE_API_KEY,
        field4: targetTemp,
      });
      alert("Température cible mise à jour !");
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
      setTargetTemp(0);
    }
  };

  // Allumer ou éteindre la climatisation
  const toggleClim = async () => {
    try {
      const newStatus = climStatus === 1 ? 0 : 1;
      await axios.post("https://api.thingspeak.com/update", {
        api_key: THINGSPEAK_WRITE_API_KEY,
        field3: newStatus,
      });
      setClimStatus(newStatus);
      alert(`Climatisation ${newStatus === 1 ? "allumée" : "éteinte"}`);
    } catch (error) {
      console.error("Erreur lors du changement d’état :", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      <View style={styles.container}>
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            marginTop: 20,
          }}
        >
          <Text style={styles.title}>Controle climatisation</Text>
        </View>
        <View style={{ marginTop: 50, gap: 10 }}>
          <Text style={{ color: "white", fontSize: 20 }}>
            Température actuelle : {currentTemp ?? 0} °C
          </Text>
          <Text style={{ color: "white", fontSize: 20 }}>
            Humidité actuelle : {currentHumidity ?? 8} %
          </Text>
        </View>
        <View
          style={{
            marginTop: 100,
            flexDirection: "row",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-around",
          }}
        >
          <Button
            title="up"
            onPress={() => {
              setTargetTemp(targetTemp + 1);
              updateTargetTemperature();
            }}
          />
          <Text style={{ fontSize: 36, color: "white" }}>{targetTemp} °C</Text>
          <Button
            title="down"
            onPress={() => {
              setTargetTemp(targetTemp - 1);
              updateTargetTemperature();
            }}
          />
        </View>
        <View style={{ marginTop: 50 }}>
          <CustomButton
            onPress={toggleClim}
            climStatus={climStatus}
            title={
              climStatus === 1
                ? "Éteindre la climatisation"
                : "Allumer la climatisation"
            }
          />
        </View>
      </View>
      <StatusBar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
    backgroundColor: "#060021",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
});

export default App;
