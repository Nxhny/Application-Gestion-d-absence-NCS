import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from "react-native";
import { supabase } from "../services/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

interface RemplacementItem {
  id_remplacement: string;
  id_demande: number;
  cours: string;
  date_remplacement: string;
  heure_debut: string;
  heure_fin: string;
  salle: string;
  classe: string;
  remplacant_id: string;
  date_creation: string;
  is_remplaced: "wait" | "yes" | "no";
  raison?: string;
  prof_absent?: string;
  prof_remplacant?: string;
}

export default function RemplacementCours() {
  const [loading, setLoading] = useState(true);
  const [propositions, setPropositions] = useState<RemplacementItem[]>([]);
  const [filteredPropositions, setFilteredPropositions] = useState<RemplacementItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "wait" | "yes" | "no">("all");

  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: replacements, error: replacementsError } = await supabase
        .from("remplacement_cours")
        .select(`
          *,
          demande:demande_absence(
            auth_id,
            raison,
            is_remplaced,
            date_creation
          )
        `)
        .order("created_at", { ascending: false });

      if (replacementsError) {
        console.error(replacementsError);
        Alert.alert("Erreur", "Impossible de charger les propositions.");
        return;
      }

      const { data: users, error: usersError } = await supabase
        .from("utilisateur")
        .select("auth_id, nom, prenom");

      if (usersError) {
        console.error(usersError);
        Alert.alert("Erreur", "Impossible de récupérer les utilisateurs.");
        return;
      }

      const usersMap = new Map(users.map((u: any) => [u.auth_id, `${u.prenom} ${u.nom}`]));

      const mappedData = (replacements || []).map((item: any) => ({
        id_remplacement: item.id_remplacement,
        id_demande: item.id_demande,
        cours: item.cours,
        date_remplacement: item.date_remplacement,
        heure_debut: item.heure_debut,
        heure_fin: item.heure_fin,
        salle: item.salle,
        classe: item.classe,
        remplacant_id: item.remplacant_id,
        date_creation: item.created_at,
        is_remplaced: item.demande?.is_remplaced || "wait",
        raison: item.demande?.raison,
        prof_absent: usersMap.get(item.demande?.auth_id) || item.demande?.auth_id,
        prof_remplacant: usersMap.get(item.remplacant_id) || item.remplacant_id,
      }));

      setPropositions(mappedData);
      setFilteredPropositions(mappedData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrage et recherche
  useEffect(() => {
    let filtered = [...propositions];
    if (filterStatus !== "all") {
      filtered = filtered.filter((p) => p.is_remplaced === filterStatus);
    }
    if (searchText.trim() !== "") {
      filtered = filtered.filter(
        (p) =>
          p.prof_absent?.toLowerCase().includes(searchText.toLowerCase()) ||
          p.prof_remplacant?.toLowerCase().includes(searchText.toLowerCase()) ||
          p.cours.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    setFilteredPropositions(filtered);
  }, [filterStatus, searchText, propositions]);

  const renderItem = ({ item }: { item: RemplacementItem }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.name}>{item.prof_absent}</Text>
        <Text
          style={{
            color:
              item.is_remplaced === "yes"
                ? "#4caf50"
                : item.is_remplaced === "no"
                ? "#f44336"
                : "#000",
            fontWeight: "700",
          }}
        >
          {item.is_remplaced === "wait"
            ? "⏳ En attente"
            : item.is_remplaced === "yes"
            ? "✅ Acceptée"
            : "❌ Refusée"}
        </Text>
      </View>
      <Text style={styles.info}>Remplaçant: {item.prof_remplacant}</Text>
      <Text style={styles.info}>Cours: {item.cours}</Text>
      <Text style={styles.info}>
        {item.heure_debut} → {item.heure_fin} | Salle: {item.salle} | Classe: {item.classe}
      </Text>
      {item.raison && <Text style={styles.info}>Raison: {item.raison}</Text>}
    </View>
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );

  return (
    <View style={styles.container}>
      {/* Header avec retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Propositions de remplacement</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Barre de recherche */}
      <TextInput
        placeholder="Rechercher par prof ou cours..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.searchInput}
      />

      {/* Filtre statut */}
      <View style={styles.filterContainer}>
        {["all", "wait", "yes", "no"].map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
            onPress={() => setFilterStatus(status as "all" | "wait" | "yes" | "no")}
          >
            <Text style={filterStatus === status ? styles.filterTextActive : styles.filterText}>
              {status === "all"
                ? "Toutes"
                : status === "wait"
                ? "⏳ En attente"
                : status === "yes"
                ? "✅ Acceptées"
                : "❌ Refusées"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredPropositions}
        keyExtractor={(item) => item.id_remplacement}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 10 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 50 },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1d2452", textAlign: "center" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 10,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#eee",
    margin: 4,
  },
  filterButtonActive: { backgroundColor: "#000" },
  filterText: { color: "#1d2452", fontWeight: "600" },
  filterTextActive: { color: "#fff", fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  name: { fontWeight: "700", fontSize: 16, color: "#1d2452" },
  info: { fontSize: 13, color: "#555", marginTop: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
