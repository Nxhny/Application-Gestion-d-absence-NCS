import React, { useEffect, useState, useCallback } from "react";
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, 
  RefreshControl, Alert, TextInput, Platform, Modal, ScrollView, KeyboardAvoidingView 
} from "react-native";
import { supabase } from "../../services/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

interface Absence {
  id_demande: number;
  absence_date: string;
  date_remplacement: string;
  auth_id: string;
  requesterName?: string;
  is_remplaced: "yes" | "no" | "wait";
}

interface RemplacementForm {
  cours: string;
  salle: string;
  classe: string;
  date_remplacement: Date;
  heure_debut: Date;
  heure_fin: Date;
}

export default function RemplacementScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [absences, setAbsences] = useState<Absence[]>([]);
  const [filteredAbsences, setFilteredAbsences] = useState<Absence[]>([]);
  const [userId, setUserId] = useState<string>("");

  const [filterOwner, setFilterOwner] = useState<"mine" | "others">("mine");
  const [filterReplaced, setFilterReplaced] = useState<"all" | "replaced" | "notReplaced" | "wait">("all");

  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<RemplacementForm>({
    cours: "",
    salle: "",
    classe: "",
    date_remplacement: new Date(),
    heure_debut: new Date(),
    heure_fin: new Date(),
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<"debut" | "fin" | null>(null);

  // Récupération user
  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  // Récupérer les absences acceptées
  const fetchAbsences = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("demande_absence")
      .select("*, utilisateur(nom, prenom)")
      .eq("statut", "acceptee")
      .order("absence_date", { ascending: true });

    if (!error && data) {
      const mapped = data.map((d: any) => ({
        ...d,
        requesterName: d.utilisateur ? `${d.utilisateur.prenom} ${d.utilisateur.nom}` : d.auth_id,
        is_remplaced: d.is_remplaced || "no",
      }));
      setAbsences(mapped);
      setLoading(false);
      setRefreshing(false);
    } else {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchAbsences();
  }, []);

  // Filtrage
  useEffect(() => {
    let filtered = absences;
    if (filterOwner === "mine") filtered = filtered.filter(a => a.auth_id === userId);
    if (filterOwner === "others") filtered = filtered.filter(a => a.auth_id !== userId);

    if (filterReplaced === "replaced") filtered = filtered.filter(a => a.is_remplaced === "yes");
    if (filterReplaced === "notReplaced") filtered = filtered.filter(a => a.is_remplaced === "no");
    if (filterReplaced === "wait") filtered = filtered.filter(a => a.is_remplaced === "wait");

    setFilteredAbsences(filtered);
  }, [filterOwner, filterReplaced, absences, userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAbsences();
  }, []);

  // Ouverture modal
  const openReplacementModal = (absence: Absence) => {
    setSelectedAbsence(absence);
    setFormData({
      cours: "",
      salle: "",
      classe: "",
      date_remplacement: new Date(),
      heure_debut: new Date(),
      heure_fin: new Date(),
    });
    setModalVisible(true);
  };

  const submitReplacement = async () => {
    if (!selectedAbsence) return;
    const { cours, salle, classe, date_remplacement, heure_debut, heure_fin } = formData;
    if (!cours || !salle || !classe || !heure_debut || !heure_fin) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    const formatTime = (date: Date) => date.toTimeString().slice(0,5);

    const { error } = await supabase
      .from("remplacement_cours")
      .insert([{
        id_demande: selectedAbsence.id_demande,
        remplacant_id: userId,
        cours,
        date_remplacement: date_remplacement.toISOString().split("T")[0],
        heure_debut: formatTime(heure_debut),
        heure_fin: formatTime(heure_fin),
        salle,
        classe,
      }]);

    if (!error) {

      await supabase
        .from("demande_absence")
        .update({ is_remplaced: "wait" })
        .eq("id_demande", selectedAbsence.id_demande);

      Alert.alert("Succès", "Proposition de remplacement envoyée !");
      fetchAbsences();
      setModalVisible(false);
    } else {
      Alert.alert("Erreur", "Impossible de proposer le remplacement.");
      console.error(error);
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && selectedDate >= new Date()) {
      setFormData({ ...formData, date_remplacement: selectedDate });
    }
  };

  const onChangeTime = (event: any, selectedTime?: Date) => {
    if (!selectedTime) {
      setShowTimePicker(null);
      return;
    }
    if (showTimePicker === "debut") setFormData({...formData, heure_debut: selectedTime});
    if (showTimePicker === "fin") setFormData({...formData, heure_fin: selectedTime});
    setShowTimePicker(null);
  };

  const renderAbsence = ({ item }: { item: Absence }) => (
    <TouchableOpacity style={styles.card} onPress={() => openReplacementModal(item)}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.name}>{item.requesterName}</Text>
        <Text style={{
          color: item.is_remplaced === "yes" ? "#4caf50" : item.is_remplaced === "no" ? "#f44336" : "#000",
          fontWeight:'700'
        }}>
          {item.is_remplaced === "yes" ? "✅ Remplacée" : item.is_remplaced === "no" ? "❌ Non remplacée" : "⏳ En attente"}
        </Text>
      </View>
      <Text style={styles.info}>Absence: {new Date(item.absence_date).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><Ionicons name="hourglass" size={50} color="#fff"/></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Remplacements</Text>
      {/* Trieur multi-lignes */}
      <View style={styles.filterContainer}>
        {["mine", "others"].map(owner => (
          <TouchableOpacity
            key={owner}
            style={[
              styles.filterButtonFlex,
              filterOwner === owner && styles.filterButtonActive
            ]}
            onPress={() => setFilterOwner(owner as "mine" | "others")}
          >
            <Text style={filterOwner === owner ? styles.filterTextActive : styles.filterText}>
              {owner === "mine" ? "Mes absences" : "Autres profs"}
            </Text>
          </TouchableOpacity>
        ))}
        {["notReplaced","replaced","wait","all"].map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButtonFlex,
              filterReplaced === status && styles.filterButtonActive
            ]}
            onPress={() => setFilterReplaced(status as "all" | "replaced" | "notReplaced" | "wait")}
          >
            <Text style={filterReplaced === status ? styles.filterTextActive : styles.filterText}>
              {status === "notReplaced" ? "❌ Non remplacées" :
               status === "replaced" ? "✅ Remplacées" :
               status === "wait" ? "⏳ En attente" : "Toutes"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredAbsences}
        keyExtractor={(item) => item.id_demande.toString()}
        renderItem={renderAbsence}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 10 }}
      />

      {/* Modal remplacement */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={styles.modalOverlay}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>Proposer un remplacement</Text>

              <Text style={styles.label}>Cours</Text>
              <TextInput style={styles.input} value={formData.cours} onChangeText={(text) => setFormData({...formData, cours:text})}/>

              <Text style={styles.label}>Salle</Text>
              <TextInput style={styles.input} value={formData.salle} onChangeText={(text) => setFormData({...formData, salle:text})}/>

              <Text style={styles.label}>Classe</Text>
              <TextInput style={styles.input} value={formData.classe} onChangeText={(text) => setFormData({...formData, classe:text})}/>

              <Text style={styles.label}>Date du remplacement</Text>
              <TouchableOpacity onPress={()=>setShowDatePicker(true)} style={styles.input}>
                <Text>{formData.date_remplacement.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showDatePicker && <DateTimePicker value={formData.date_remplacement} mode="date" minimumDate={new Date()} onChange={onChangeDate}/>}

              <Text style={styles.label}>Heure début</Text>
              <TouchableOpacity onPress={()=>setShowTimePicker("debut")} style={styles.input}>
                <Text>{formData.heure_debut.toTimeString().slice(0,5)}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Heure fin</Text>
              <TouchableOpacity onPress={()=>setShowTimePicker("fin")} style={styles.input}>
                <Text>{formData.heure_fin.toTimeString().slice(0,5)}</Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={showTimePicker==="debut"?formData.heure_debut:formData.heure_fin}
                  mode="time"
                  is24Hour
                  display="spinner"
                  onChange={onChangeTime}
                />
              )}

              <TouchableOpacity style={styles.submitButton} onPress={submitReplacement}>
                <Text style={styles.submitText}>Proposer</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitButton, {backgroundColor:'#999', marginTop:10}]} onPress={()=>setModalVisible(false)}>
                <Text style={styles.submitText}>Annuler</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1, backgroundColor:'#fff', paddingTop:50},
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: "#1d2452ff",
    marginBottom: 15,
  },
  center:{flex:1,justifyContent:'center',alignItems:'center'},
  card:{backgroundColor:'#fff',marginVertical:6,padding:12,borderRadius:12,shadowColor:'#000',shadowOpacity:0.1,shadowOffset:{width:0,height:2},elevation:3},
  name:{fontWeight:'700',fontSize:16,color:'#1d2452'},
  info:{fontSize:13,color:'#555',marginTop:2},
  filterContainer:{
    flexDirection:'row',
    flexWrap:'wrap',
    justifyContent:'space-between',
    marginHorizontal:10,
    marginVertical:10,
  },
  filterButtonFlex:{
    flex:1,
    minWidth:120,
    paddingHorizontal:12,
    paddingVertical:6,
    borderRadius:20,
    backgroundColor:'#eee',
    margin:4,
    alignItems:'center',
  },
  filterButtonActive:{backgroundColor:'#000'},
  filterText:{color:'#1d2452',fontWeight:'600'},
  filterTextActive:{color:'#fff',fontWeight:'700'},
  modalOverlay:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(0,0,0,0.5)',padding:20},
  modal:{backgroundColor:'#fff',borderRadius:12,padding:16,width:'100%',maxWidth:width*0.9,maxHeight:'90%'},
  modalTitle:{fontSize:20,fontWeight:'700',color:'#1d2452',textAlign:'center',marginBottom:16},
  label:{fontSize:14,fontWeight:'600',marginTop:8,marginBottom:4,color:'#333'},
  input:{borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:12,fontSize:14,backgroundColor:'#fff'},
  submitButton:{backgroundColor:'#000',borderRadius:8,paddingVertical:12,alignItems:'center',marginTop:16},
  submitText:{color:'#fff',fontWeight:'700',fontSize:16},
});
