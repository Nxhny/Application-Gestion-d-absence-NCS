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
} from "react-native";
import { useRouter, Link } from "expo-router";
import { supabase } from "../services/supabaseClient";
import Svg, { Circle } from "react-native-svg";

const { width, height } = Dimensions.get("window");

// Cercles animés
function AnimatedCircles() {
  const circles = Array.from({ length: 8 }).map(() => ({
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("../(tabs)/MonProfil");
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("../(tabs)/MonProfil");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error("Utilisateur non trouvé.");

      const { data: utilisateur, error: roleError } = await supabase
        .from("utilisateur")
        .select("role")
        .eq("auth_id", user.id)
        .single();

      if (!roleError && utilisateur?.role === "manager") {
        router.replace("/manager");
      } else {
        router.replace("../(tabs)/MonProfil");
      }
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Fond bleu Remplacement */}
      <View style={styles.blueBackground} />
      <AnimatedCircles />

      <View style={styles.container}>
        <Text style={styles.title}>Connexion</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#ccc"
          keyboardType="email-address"
          autoCapitalize="none"
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

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Se connecter</Text>}
        </TouchableOpacity>

        <View style={{ marginTop: 20, alignItems: "center" }}>
          <Link href="/Inscription" style={{ color: "white", fontSize: 16 }}>
            Vous n'avez pas de compte ? S’inscrire
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blueBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1d2452", // Fond bleu Remplacement
  },
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 30, textAlign: "center", color: "white" },
  input: {
    height: 40,
    marginBottom: 15,
    fontSize: 14,
    color: "white",
    borderBottomWidth: 1,
    borderColor: "#ffffffb2",
    paddingHorizontal: 8,
    width: "80%",
    alignSelf: "center",
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    width: "80%",
    alignSelf: "center",
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
