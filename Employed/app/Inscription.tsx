import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../services/supabaseClient";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { Picker } from "@react-native-picker/picker";

const { width, height } = Dimensions.get("window");

// --- Animation cercles ---
function AnimatedCircles() {
  const circles = Array.from({ length: 6 }).map(() => ({
    x: useRef(new Animated.Value(Math.random() * width)).current,
    y: useRef(new Animated.Value(Math.random() * height)).current,
    size: 20 + Math.random() * 40,
  }));

  useEffect(() => {
    circles.forEach(({ x, y }) => {
      const loop = () => {
        Animated.parallel([
          Animated.timing(x, {
            toValue: Math.random() * width,
            duration: 8000,
            useNativeDriver: false,
          }),
          Animated.timing(y, {
            toValue: Math.random() * height,
            duration: 8000,
            useNativeDriver: false,
          }),
        ]).start(loop);
      };
      loop();
    });
  }, []);

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {circles.map((c, i) => (
        <AnimatedCircle
          key={i}
          cx={c.x}
          cy={c.y}
          r={c.size}
          fill="rgba(255,255,255,0.16)"
        />
      ))}
    </Svg>
  );
}

// --- Écran d'inscription ---
export default function RegisterScreen() {
  const [nom, setNom] = useState(""); 
  const [prenom, setPrenom] = useState(""); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation(); 

  const handleRegister = async () => {
    if (!nom || !prenom || !email || !password || !confirmPassword) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    if (password.length < 12) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 12 caractères.");
      return;
    }

    const hasNumber = /\d/.test(password);
    if (!hasNumber) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins un chiffre.");
      return;
    }

    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasSpecialChar) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins un caractère spécial.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      const { error: profileError } = await supabase
        .from("utilisateur")
        .insert([{
          auth_id: data.user?.id,
          nom,
          prenom,
          role,
          email  
        }]);

      if (profileError) throw profileError;

      Alert.alert(
        "Succès",
        "Compte créé avec succès ! Vérifiez votre email pour confirmer.",
      );
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}> 
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <LinearGradient
          colors={["#1d2452", "#1d2452"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <AnimatedCircles />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Text style={styles.title}>Créer un compte</Text>

            <TextInput
              style={styles.input}
              placeholder="Nom"
              placeholderTextColor="#ccc"
              value={nom}
              onChangeText={setNom}
            />
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              placeholderTextColor="#ccc"
              value={prenom}
              onChangeText={setPrenom}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#ccc"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#ccc"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirmer mot de passe"
              placeholderTextColor="#ccc"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={role}
                onValueChange={(itemValue) => setRole(itemValue)}
                style={styles.picker}
                dropdownIconColor="#ffffff"
              >
                <Picker.Item label="Enseignant" value="enseignant" />
                <Picker.Item label="Agent" value="agent" />
              </Picker>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>

            <View style={{ marginTop: 20, alignItems: "center" }}>
              <Link href="/" style={{ color: "#ffffffd6", fontSize: 16 }}>
                J'ai déjà un compte, me connecter !
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 30,
    textAlign: "center",
    color: "white", 
  },
  input: {
    height: 40,
    marginBottom: 15,
    fontSize: 14,
    color: "#fff",
    borderBottomWidth: 1,
    borderColor: "#fff",
    paddingHorizontal: 8,
    width: "80%",
    alignSelf: "center",
  },
  pickerContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    marginBottom: 20,
    width: "80%",
    alignSelf: "center",
  },
  picker: { 
    height: 55,  
    color: "#fff",
  },
  button: {
    backgroundColor: "#000", // remplacé orange -> noir
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    width: "80%",
    alignSelf: "center",
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
