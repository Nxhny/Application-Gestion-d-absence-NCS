// ManagerScreen.tsx
import { useUserRole } from "@/hooks/useUserRole";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
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
import { supabase } from "../services/supabaseClient";

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
  requesterName?: string;
}

const { width } = Dimensions.get("window");

export default function ManagerScreen() {
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole();

  const [searchText, setSearchText] = useState("");
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AbsenceRequest | null>(null);
  const [managerComment, setManagerComment] = useState("");
  const [actionType, setActionType] = useState<"acceptee" | "refusee">("acceptee");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "en_attente" | "acceptee" | "refusee">("all");
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    if (!roleLoading && role !== "manager") {
      router.replace("/MonProfil");
    }
  }, [roleLoading, role]);

  const fetchAllRequests = useCallback(async () => {
    try {
      const { data: demandes, error: demandesError } = await supabase
        .from("demande_absence")
        .select("*")
        .order("date_creation", { ascending: false });

      if (demandesError) {
        console.error("Fetch demandes error:", demandesError);
        setRequests([]);
        return;
      }

      const tablesToTry = ["utilisateur", "users", "utilisateurs"];
      let users: any[] = [];

      for (const table of tablesToTry) {
        const { data, error } = await supabase.from(table).select("auth_id, nom, prenom");
        if (data && data.length > 0) {
          users = data;
          break;
        }
      }

      const usersMap = new Map((users || []).map((u) => [u.auth_id, u]));

      const merged = (demandes || []).map((d) => {
        const u = usersMap.get(d.auth_id);
        const name = u ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() : d.auth_id;
        return { ...d, requesterName: name };
      });

      setRequests(merged);
    } catch (err) {
      console.error("Erreur:", err);
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      !searchText ||
      (r.requesterName && r.requesterName.toLowerCase().includes(searchText.toLowerCase())) ||
      r.auth_id.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = selectedStatus === "all" || r.statut === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllRequests();
  }, [fetchAllRequests]);

  const handleActionPress = (request: AbsenceRequest, action: "acceptee" | "refusee") => {
    setSelectedRequest(request);
    setActionType(action);
    setManagerComment("");
    setIsModalVisible(true);
  };

  const confirmAction = useCallback(async () => {
    if (!selectedRequest) return;
    if (actionType === "refusee" && !managerComment.trim()) {
      Alert.alert("Erreur", "Le motif du refus est obligatoire.");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("demande_absence")
        .update({
          statut: actionType,
          commentaire: managerComment.trim() || null,
          date_maj: new Date().toISOString(),
        })
        .eq("id_demande", selectedRequest.id_demande)
        .select();

      if (error) {
        Alert.alert("Erreur Supabase", error.message || JSON.stringify(error));
        await fetchAllRequests();
        return;
      }

      const updatedRow = Array.isArray(data) && data.length ? data[0] : null;
      if (updatedRow) {
        setRequests((prev) =>
          prev.map((r) => (r.id_demande === updatedRow.id_demande ? { ...r, ...updatedRow } : r))
        );
      } else {
        await fetchAllRequests();
      }

      Alert.alert("Succès", `Demande ${actionType === "acceptee" ? "approuvée" : "refusée"} avec succès.`);
      setIsModalVisible(false);
      setSelectedRequest(null);
      setManagerComment("");
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      Alert.alert("Erreur", String(err));
      await fetchAllRequests();
    } finally {
      setLoading(false);
    }
  }, [selectedRequest, actionType, managerComment, fetchAllRequests]);

  const performLogout = async () => {
    try {
      setLogoutLoading(true);
      await supabase.auth.signOut();
      router.replace("/");
    } catch (e) {
      console.error("Erreur déconnexion", e);
      Alert.alert("Déconnexion", "Une erreur est survenue");
    } finally {
      setLogoutLoading(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Confirmer", style: "destructive", onPress: performLogout },
      ]
    );
  };

  if (role !== "manager") {
    return (
      <LinearGradient colors={["#1d2452ff", "#1d2452ff"]} style={styles.gradient}>
        <View style={styles.unauthorized}>
          <Ionicons name="alert-circle-outline" size={80} color="#000" />
          <Text style={styles.unauthorizedTitle}>Accès refusé</Text>
          <Text style={styles.unauthorizedSubtext}>
            Veuillez vous connecter à un compte{"\n"}
            <Text style={styles.highlightText}>Manager</Text> ou{" "} pour avoir accès à aux demandes.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace("/MonProfil")}
          >
            <Text style={styles.backButtonText}>Retour au profil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} disabled={logoutLoading}>
            {logoutLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.logoutText}>Se déconnecter</Text>}
          </TouchableOpacity>
        </View> 
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#f5f5f5", "#e2e2e2"]} style={styles.gradient}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={confirmLogout}
          disabled={logoutLoading}
          style={styles.logoutIconButton}
        >
          {logoutLoading ? (
            <ActivityIndicator color="#fff" size={20} />
          ) : (
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          )}
        </TouchableOpacity>
        <Text style={styles.title}>Gestion des demandes</Text>
        <TouchableOpacity
          onPress={() => router.push("/remplacement_manager")}
          style={styles.navIconButton}
        >
          <Ionicons name="swap-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Rechercher par nom ou prénom..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.searchInput}
      />

      <View style={styles.statusSelector}>
        {["all", "en_attente", "acceptee", "refusee"].map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.statusButton, selectedStatus === status && styles.statusButtonActive]}
            onPress={() => setSelectedStatus(status as any)}
          >
            <Text style={selectedStatus === status ? styles.statusButtonTextActive : styles.statusButtonText}>
              {status === "all" ? "Toutes" : status === "en_attente" ? "En attente" : status === "acceptee" ? "Acceptée" : "Refusée"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id_demande}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.employeeName}>{item.requesterName}</Text>
              <Text style={[styles.status, { color: item.statut === "acceptee" ? "#4caf50" : item.statut === "refusee" ? "#f44336" : "#ff9800" }]}>
                {item.statut === "acceptee" ? "Acceptée" : item.statut === "refusee" ? "Refusée" : "En attente"}
              </Text>
            </View>
            <Text style={styles.raison}>{item.raison}</Text>
            <Text style={styles.date}>Absence : {new Date(item.absence_date).toLocaleDateString("fr-FR")}</Text>
            {item.date_remplacement && <Text style={styles.date}>Remplacement : {new Date(item.date_remplacement).toLocaleDateString("fr-FR")}</Text>}
            {item.commentaire && <Text style={styles.commentaire}>Commentaire : {item.commentaire}</Text>}
            <Text style={styles.creationDate}>Créé le : {new Date(item.date_creation).toLocaleDateString("fr-FR")}</Text>

            {item.statut !== "acceptee" && item.statut !== "refusee" && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleActionPress(item, "acceptee")}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Approuver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleActionPress(item, "refusee")}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Refuser</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptySection}>Aucune demande trouvée.</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* Modal action */}
      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{actionType === "acceptee" ? "Approuver" : "Refuser"} la demande</Text>
              {selectedRequest && (
                <View style={styles.modalRequestInfo}>
                  <Text>Employé : {selectedRequest.requesterName}</Text>
                  <Text>Raison : {selectedRequest.raison}</Text>
                </View>
              )}
              <Text style={styles.commentLabel}>{actionType === "refusee" ? "Motif du refus :" : "Commentaire (optionnel) :"}</Text>
              <TextInput
                style={styles.commentInput}
                value={managerComment}
                onChangeText={setManagerComment}
                placeholder="Votre commentaire..."
                multiline
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, actionType === "acceptee" ? styles.confirmApproveButton : styles.confirmRejectButton, actionType === "refusee" && !managerComment.trim() && styles.disabledButton]}
                onPress={confirmAction}
                disabled={actionType === "refusee" && !managerComment.trim()}
              >
                <Text style={styles.modalButtonText}>{actionType === "acceptee" ? "Approuver" : "Refuser"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

// --- Styles adoptés depuis RemplacementCours ---
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", color: "#1d2452" },
  searchInput: { 
    backgroundColor: "#fff", 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16, 
    marginHorizontal: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: "#ddd" 
  },
  statusSelector: { flexDirection: "row", justifyContent: "center", marginBottom: 12, marginHorizontal: 10 },
  statusButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#eee", marginHorizontal: 4 },
  statusButtonActive: { backgroundColor: "#000" },
  statusButtonText: { color: "#1d2452", fontWeight: "600" },
  statusButtonTextActive: { color: "#fff", fontWeight: "700" },
  emptySection: { backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", padding: 12, borderRadius: 8, textAlign: "center" },
  
  // --- Cards ---
  card: { 
    backgroundColor: "#fff", 
    width: width * 0.9, 
    alignSelf: "center", 
    marginVertical: 8, 
    padding: 16, 
    borderRadius: 12, 
    elevation: 3, 
    shadowColor: "#000", 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    shadowOffset: { width: 0, height: 2 } 
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 8 },
  employeeName: { fontSize: 18, fontWeight: "bold", color: "#1d2452", flex: 1 },
  status: { fontSize: 14, fontWeight: "600", textTransform: "uppercase" },
  raison: { fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#333" },
  date: { fontSize: 14, color: "#666", marginBottom: 4 },
  commentaire: { fontSize: 14, color: "#555", fontStyle: "italic", marginBottom: 8 },
  creationDate: { fontSize: 12, color: "#999", marginTop: 8 },
  actionButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8 },
  approveButton: { backgroundColor: "#4caf50" },
  rejectButton: { backgroundColor: "#f44336" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // --- Modal ---
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: "#fff", width: "100%", maxWidth: width * 0.9, maxHeight: "85%", borderRadius: 12, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalTitle: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 15, marginTop: 20, marginHorizontal: 20, color: "#1d2452" },
  modalRequestInfo: { backgroundColor: "#f5f5f5", padding: 12, borderRadius: 8, marginBottom: 15, marginHorizontal: 20 },
  commentLabel: { fontSize: 16, fontWeight: "600", marginBottom: 8, marginHorizontal: 20, color: "#333" },
  commentInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 20, marginHorizontal: 20, minHeight: 100, maxHeight: 150, backgroundColor: "#fff" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", padding: 20, paddingTop: 0, borderTopWidth: 1, borderTopColor: "#eee", backgroundColor: "#fff", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  cancelButton: { backgroundColor: "#666" },
  confirmApproveButton: { backgroundColor: "#4caf50" },
  confirmRejectButton: { backgroundColor: "#f44336" },
  disabledButton: { backgroundColor: "#ccc", opacity: 0.6 },
  modalButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },

  // --- Header ---
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 55, paddingBottom: 12 },
  logoutIconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  navIconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },

  // --- Accès refusé ---
  unauthorized: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  unauthorizedTitle: { fontSize: 28, fontWeight: 'bold', color: '#000', marginTop: 15 },
  unauthorizedSubtext: { fontSize: 16, color: '#555', textAlign: 'center', marginTop: 10 },
  highlightText: { color: '#000', fontWeight: 'bold' },
  backButton: { marginTop: 25, backgroundColor: '#000', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logoutButton: { marginTop: 20, backgroundColor: '#000', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignSelf: 'center', width: width * 0.9 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
});
