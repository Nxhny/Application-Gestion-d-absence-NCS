import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../services/supabaseClient";

const { width } = Dimensions.get("window");

interface AbsenceRequest {
  id_demande: string;
  absence_date: string;
  date_remplacement?: string | null;
  raison: string;
  statut: "en_attente" | "acceptee" | "refusee";
  commentaire?: string | null;
  date_creation: string;
  date_maj: string;
  auth_id: string;
}

export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AbsenceRequest | null>(null);
  const [editedRaison, setEditedRaison] = useState("");
  const [editedAbsenceDate, setEditedAbsenceDate] = useState("");
  const [editedRemplacementDate, setEditedRemplacementDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUserRole = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return;

    const { data, error: roleError } = await supabase
      .from("utilisateur")
      .select("role")
      .eq("auth_id", user.id)
      .single();

    if (!roleError && data) setRole(data.role);
  };

  const fetchRequests = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from("demande_absence")
        .select("*")
        .eq("auth_id", user.id)
        .order("date_creation", { ascending: false });

      if (!error) setRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchUserRole();
    })();
  }, []);

  useEffect(() => {
    if (role !== "manager") fetchRequests();
  }, [role]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, []);

  const openEditModal = (item: AbsenceRequest) => {
    setSelectedRequest(item);
    setEditedRaison(item.raison);
    // Gérer correctement le fuseau horaire pour éviter le décalage d'un jour
    const absenceDate = new Date(item.absence_date);
    absenceDate.setMinutes(absenceDate.getMinutes() + absenceDate.getTimezoneOffset());
    setEditedAbsenceDate(absenceDate.toISOString().split('T')[0]);
    
    if (item.date_remplacement) {
      const remplacementDate = new Date(item.date_remplacement);
      remplacementDate.setMinutes(remplacementDate.getMinutes() + remplacementDate.getTimezoneOffset());
      setEditedRemplacementDate(remplacementDate.toISOString().split('T')[0]);
    } else {
      setEditedRemplacementDate("");
    }
    setEditModalVisible(true);
  };

  const saveRequest = async () => {
    if (!editedRaison.trim()) {
      Alert.alert("Erreur", "La raison est obligatoire.");
      return;
    }

    if (!editedAbsenceDate.trim()) {
      Alert.alert("Erreur", "La date d'absence est obligatoire.");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("demande_absence")
        .update({
          raison: editedRaison.trim(),
          absence_date: editedAbsenceDate,
          date_remplacement: editedRemplacementDate.trim() || null,
          date_maj: new Date().toISOString(),
        })
        .eq("id_demande", selectedRequest?.id_demande);

      if (error) throw error;

      Alert.alert("Succès", "Demande modifiée avec succès.");
      setEditModalVisible(false);
      fetchRequests();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Erreur", err.message || "Impossible de modifier la demande.");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: AbsenceRequest }) => {
    const statusColor =
      item.statut === "acceptee"
        ? "#4caf50"
        : item.statut === "refusee"
        ? "#f44336"
        : "#000";

    return (
      <View style={styles.card}>
        <Text style={styles.raison}>{item.raison}</Text>
        <Text style={styles.date}>Absence : {item.absence_date.split('T')[0]}</Text>
        {item.date_remplacement && (
          <Text style={styles.date}>
            Remplacement : {item.date_remplacement.split('T')[0]}
          </Text>
        )}
        {item.commentaire && (
          <Text style={styles.commentaire}>Commentaire : {item.commentaire}</Text>
        )}
        <Text style={[styles.status, { color: statusColor }]}>
          {item.statut === "en_attente" ? "En attente" : item.statut === "acceptee" ? "Acceptée" : "Refusée"}
        </Text>
        <Text style={styles.date}>
          Créé le : {item.date_creation.split('T')[0]}
        </Text>
        {item.statut === "en_attente" && (
          <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes Demandes</Text>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id_demande}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={requests.length === 0 ? styles.center : { paddingVertical: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Aucune demande pour l'instant.</Text>}
      />

      {/* Modal d'édition */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Modifier ma demande</Text>

              <Text style={styles.inputLabel}>Raison</Text>
              <TextInput
                style={styles.input}
                value={editedRaison}
                onChangeText={setEditedRaison}
                placeholder="Raison de l'absence"
                multiline
              />

              <Text style={styles.inputLabel}>Date d'absence</Text>
              <TextInput
                style={styles.input}
                value={editedAbsenceDate}
                onChangeText={setEditedAbsenceDate}
                placeholder="AAAA-MM-JJ"
              />

              <Text style={styles.inputLabel}>Date de remplacement (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={editedRemplacementDate}
                onChangeText={setEditedRemplacementDate}
                placeholder="AAAA-MM-JJ"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveRequest}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: "#1d2452ff",
    marginBottom: 15,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  empty: { fontSize: 16, color: "#fff", textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    width: width * 0.85,
    alignSelf: "center",
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  raison: { fontSize: 18, fontWeight: "700", marginBottom: 4, color: "#1d2452" },
  date: { fontSize: 14, color: "#555", marginBottom: 4 },
  commentaire: { fontSize: 14, color: "#333", fontStyle: "italic", marginBottom: 4 },
  status: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  unauthorizedTitle: { fontSize: 28, fontWeight: "700", color: "#000", marginTop: 15 },
  unauthorizedSubtext: { fontSize: 16, color: "#fff", textAlign: "center", marginTop: 10 },
  highlightText: { color: "#9dc2fa", fontWeight: "700" },
  backButton: {
    marginTop: 25,
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d2452', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginTop: 12, gap: 6 },
  editButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', maxWidth: width * 0.9, maxHeight: '85%', borderRadius: 12, padding: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#1d2452' },
  inputLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, backgroundColor: '#fff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#666' },
  saveButton: { backgroundColor: '#4caf50' },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
