import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../services/supabaseClient";

const { width } = Dimensions.get("window");

interface UserProfile {
  nom: string;
  prenom: string;
  email: string;
  date_creation: string;
}

interface RequestStats {
  acceptee: number;
  en_attente: number;
  refusee: number;
  total: number;
}

export default function UserProfileScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<RequestStats>({
    acceptee: 0,
    en_attente: 0,
    refusee: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedNom, setEditedNom] = useState("");
  const [editedPrenom, setEditedPrenom] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedPassword, setEditedPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("Utilisateur non connecté");

      const { data: userData, error: userDataError } = await supabase
        .from("utilisateur")
        .select("nom, prenom, email, date_creation")
        .eq("email", user.email)
        .maybeSingle();

      if (userDataError || !userData) throw userDataError || new Error("Profil introuvable");

      setUserProfile(userData);

      const { data: demandes, error: demandesError } = await supabase
        .from("demande_absence")
        .select("statut")
        .eq("auth_id", user.id);

      if (demandesError) throw demandesError;

      const statsData: RequestStats = { acceptee: 0, en_attente: 0, refusee: 0, total: 0 };
      demandes.forEach((req) => {
        switch (req.statut) {
          case "acceptee": statsData.acceptee++; break;
          case "en_attente": statsData.en_attente++; break;
          case "refusee": statsData.refusee++; break;
        }
        statsData.total++;
      });

      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUserData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchUserData(); }, []);

  const performLogout = async () => {
    try {
      setLogoutLoading(true);
      await supabase.auth.signOut();
      router.replace("/");
      setUserProfile(null);
    } catch (e) {
      console.error("Erreur déconnexion", e);
      Alert.alert("Erreur", "La déconnexion a échoué.");
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

  const openEditModal = () => {
    setEditedNom(userProfile?.nom || "");
    setEditedPrenom(userProfile?.prenom || "");
    setEditedEmail(userProfile?.email || "");
    setEditedPassword("");
    setEditModalVisible(true);
  };

  const saveProfile = async () => {
    if (!editedNom.trim() || !editedPrenom.trim() || !editedEmail.trim()) {
      Alert.alert("Erreur", "Le nom, le prénom et l'email sont obligatoires.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editedEmail.trim())) {
      Alert.alert("Erreur", "L'email n'est pas valide.");
      return;
    }

    if (editedPassword.trim() && editedPassword.trim().length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      const oldEmail = user.email;
      const emailChanged = editedEmail.trim() !== oldEmail;
      const passwordChanged = editedPassword.trim().length > 0;

      // Mise à jour auth (email et/ou mot de passe)
      if (emailChanged || passwordChanged) {
        const updateData: any = {};
        if (emailChanged) updateData.email = editedEmail.trim();
        if (passwordChanged) updateData.password = editedPassword.trim();

        const { error: authError } = await supabase.auth.updateUser(updateData);
        if (authError) throw authError;
      }

      // Mise à jour table utilisateur
      const { error: dbError } = await supabase
        .from("utilisateur")
        .update({ 
          nom: editedNom.trim(), 
          prenom: editedPrenom.trim(),
          email: editedEmail.trim()
        })
        .eq("email", oldEmail);

      if (dbError) throw dbError;

      setUserProfile(prev => prev ? { 
        ...prev, 
        nom: editedNom.trim(), 
        prenom: editedPrenom.trim(),
        email: editedEmail.trim()
      } : null);

      Alert.alert(
        "Succès", 
        emailChanged 
          ? "Profil mis à jour. Vérifiez votre nouvelle adresse email pour confirmer le changement."
          : "Profil mis à jour avec succès."
      );
      setEditModalVisible(false);
      
      if (emailChanged) {
        setTimeout(() => {
          Alert.alert(
            "Déconnexion requise",
            "Pour des raisons de sécurité, vous allez être déconnecté.",
            [{ text: "OK", onPress: performLogout }]
          );
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Erreur", err.message || "Impossible de mettre à jour le profil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fb7955ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={confirmLogout}
          disabled={logoutLoading}
          style={styles.logoutIconButton}
          accessibilityLabel="Déconnexion"
        >
          {logoutLoading ? (
            <ActivityIndicator color="#fff" size={20} />
          ) : (
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          )}
        </TouchableOpacity>
        <Text style={styles.title}>Mon Profil</Text>
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fb7955ff" />}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
      >

        {/* Carte profil */}
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <Image
              source={{ uri: "https://static.vecteezy.com/ti/vecteur-libre/p1/2318271-icone-de-profil-utilisateur-vectoriel.jpg" }}
              style={styles.avatarImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.infoText}><Text style={styles.infoLabel}>Nom :</Text> {userProfile?.nom || "-"}</Text>
              <Text style={styles.infoText}><Text style={styles.infoLabel}>Prénom :</Text> {userProfile?.prenom || "-"}</Text>
              <Text style={styles.infoText}><Text style={styles.infoLabel}>Email :</Text> {userProfile?.email || "-"}</Text>
              <Text style={styles.infoText}><Text style={styles.infoLabel}>Membre depuis :</Text> {userProfile?.date_creation ? new Date(userProfile.date_creation).toLocaleDateString("fr-FR") : "-"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
        </View>

        {/* Carte statistiques */}
        <View style={styles.card}>
          <Text style={styles.statsTitle}>Statistiques des demandes</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statItem, styles.statBorder]}>
              <Text style={[styles.statNumber, { color: "#4caf50" }]}>{stats.acceptee}</Text>
              <Text style={styles.statLabel}>Acceptées</Text>
            </View>
            <View style={[styles.statItem, styles.statBorder]}>
              <Text style={[styles.statNumber, { color: "#ff9800" }]}>{stats.en_attente}</Text>
              <Text style={styles.statLabel}>En attente</Text>
            </View>
            <View style={[styles.statItem, styles.statBorder]}>
              <Text style={[styles.statNumber, { color: "#f44336" }]}>{stats.refusee}</Text>
              <Text style={styles.statLabel}>Refusées</Text>
            </View>
          </View>
        </View>
      </ScrollView>

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
            <Text style={styles.modalTitle}>Modifier mon profil</Text>

            <Text style={styles.inputLabel}>Nom</Text>
            <TextInput
              style={styles.input}
              value={editedNom}
              onChangeText={setEditedNom}
              placeholder="Nom"
            />

            <Text style={styles.inputLabel}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={editedPrenom}
              onChangeText={setEditedPrenom}
              placeholder="Prénom"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={editedEmail}
              onChangeText={setEditedEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Nouveau mot de passe (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={editedPassword}
              onChangeText={setEditedPassword}
              placeholder="Laisser vide pour ne pas changer"
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveProfile}
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
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 55, paddingBottom: 12 },
  logoutIconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  navIconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: '#1d2452ff', flex: 2 },
  card: {
    backgroundColor: '#fff',
    width: width * 0.9,
    alignSelf: 'center',
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarImage: { width: 70, height: 70, borderRadius: 35, marginRight: 20 },
  profileInfo: { flex: 1 },
  infoText: { fontSize: 15, color: '#1d2452', marginBottom: 8 },
  infoLabel: { fontWeight: '700', color: '#000000ff' },
  statsTitle: { fontSize: 18, fontWeight: '700', color: '#1d2452', textAlign: 'center', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: '#e0e0e0' },
  statNumber: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center' },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d2452', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginTop: 16, gap: 8 },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', maxWidth: width * 0.9, borderRadius: 12, padding: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#1d2452' },
  inputLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, backgroundColor: '#fff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#666' },
  saveButton: { backgroundColor: '#4caf50' },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
