import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../services/supabaseClient';

const motifs = ['Maladie', 'Congé annuel', 'Formation', 'Autre'];

const DemandeAbsence = () => {
  const [dateDebut, setDateDebut] = useState(new Date());
  const [dateFin, setDateFin] = useState(new Date());
  const [showDebut, setShowDebut] = useState(false);
  const [showFin, setShowFin] = useState(false);
  const [motif, setMotif] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 13);
    return maxDate;
  };

  const handleDebutChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDebut(false);
    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      const maxDate = getMaxDate();
      maxDate.setHours(23, 59, 59, 999);

      if (selected < today) {
        Alert.alert('Erreur', 'La date de début ne peut pas être antérieure à aujourd\'hui.');
        return;
      }
      if (selected > maxDate) {
        Alert.alert('Erreur', 'La date de début ne peut pas dépasser 2 mois à partir d\'aujourd\'hui.');
        return;
      }

      setDateDebut(selected);
      if (dateFin < selected) {
        setDateFin(selected);
      }
    }
  };

  const handleFinChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowFin(false);
    if (selectedDate) {
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      if (selected < dateDebut) {
        Alert.alert('Erreur', 'La date de fin ne peut pas être inférieure à la date de début.');
        return;
      }
      setDateFin(selected);
    }
  };

  const handleSubmit = async () => {
    if (!motif) return Alert.alert('Erreur', 'Veuillez sélectionner un motif.');
    if (dateFin < dateDebut)
      return Alert.alert('Erreur', 'La date de fin ne peut pas être inférieure à la date de début.');

    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Erreur', "Impossible d'identifier l'utilisateur.");
        return;
      }

      const { error } = await supabase.from('demande_absence').insert([
        {
          auth_id: user.id,
          absence_date: dateDebut.toISOString().split('T')[0],
          date_remplacement: dateFin.toISOString().split('T')[0],
          raison: motif,
          commentaire: commentaire || null,
          statut: 'en_attente',
        },
      ]);

      if (error) {
        console.error(error);
        Alert.alert('Erreur', "Une erreur est survenue lors de l'envoi de la demande.");
      } else {
        Alert.alert('Succès', 'Votre demande d\'absence a été envoyée avec succès !');
        setMotif('');
        setCommentaire('');
        setDateDebut(new Date());
        setDateFin(new Date());
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', "Impossible d'envoyer la demande.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Demande d'absence</Text>

        <View style={styles.card}>
          {/* Date début */}
          <Text style={styles.label}>Date de début</Text>
          <TouchableOpacity onPress={() => setShowDebut(true)} style={styles.inputField}>
            <Text style={styles.inputText}>{dateDebut.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDebut && (
            <DateTimePicker
              value={dateDebut}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDebutChange}
              minimumDate={new Date()}
              maximumDate={getMaxDate()}
            />
          )}

          {/* Date fin */}
          <Text style={styles.label}>Date de fin</Text>
          <TouchableOpacity onPress={() => setShowFin(true)} style={styles.inputField}>
            <Text style={styles.inputText}>{dateFin.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showFin && (
            <DateTimePicker
              value={dateFin}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleFinChange}
              minimumDate={dateDebut}
            />
          )}

          {/* Motif */}
          <Text style={styles.label}>Motif</Text>
          <View style={styles.motifContainer}>
            {motifs.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.motifBtn, motif === item && styles.motifBtnSelected]}
                onPress={() => setMotif(item)}
              >
                <Text style={motif === item ? styles.motifTextSelected : styles.motifText}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Commentaire */}
          <Text style={styles.label}>Commentaire (optionnel)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ajouter un commentaire"
            placeholderTextColor="#999"
            value={commentaire}
            onChangeText={setCommentaire}
            multiline
          />

          {/* Bouton d'envoi */}
          {loading ? (
            <ActivityIndicator size="large" color="#000" style={{ marginTop: 15 }} />
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.btnText}>Envoyer la demande</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', paddingTop: 50, paddingHorizontal: 20 },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    textAlign: 'center', 
    color: '#1d2452', 
    marginVertical: 30 
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  label: { 
    fontSize: 16, 
    color: '#1d2452', 
    marginBottom: 6, 
    marginTop: 10, 
    fontWeight: '600' 
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f8f8f8',
  },
  inputText: { color: '#1d2452', fontSize: 15 },
  motifContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motifBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    backgroundColor: '#f8f8f8',
    marginRight: 8,
    marginBottom: 8,
  },
  motifBtnSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  motifText: { color: '#1d2452', fontWeight: '500' },
  motifTextSelected: { color: '#fff', fontWeight: '600' },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f8f8f8',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: { marginTop: 20, borderRadius: 30, backgroundColor: '#000', paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default DemandeAbsence;
