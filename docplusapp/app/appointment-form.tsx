import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AppointmentFormScreen() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFollowupPicker, setShowFollowupPicker] = useState(false);
  
  const [selectedPatient, setSelectedPatient] = useState({
    id: params.patient_id || '',
    name: params.patient_name || ''
  });

  const [form, setForm] = useState({
    patient_id: params.patient_id || '',
    appointment_type: params.appointment_type || 'New',
    appointment_date: new Date().toISOString().split('T')[0],
    fee: '',
    next_followup_date: '',
    remarks: ''
  });
  const [defaultRevisit, setDefaultRevisit] = useState(15);
  const router = useRouter();

  useEffect(() => {
    fetchDoctorProfile();
    if (showPatientModal) {
      fetchPatients();
    }
  }, [showPatientModal, search]);

  const fetchDoctorProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=profile`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        setDefaultRevisit(result.data.default_revisit_days || 15);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPatients = async () => {
    setSearching(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=patients&q=${search}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        setPatients(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Auto calculate follow up
      const followup = new Date(selectedDate);
      followup.setDate(followup.getDate() + defaultRevisit);
      const followupStr = followup.toISOString().split('T')[0];
      
      setForm(prev => ({ 
        ...prev, 
        appointment_date: dateStr,
        next_followup_date: followupStr
      }));
    }
  };

  const onFollowupChange = (event: any, selectedDate?: Date) => {
    setShowFollowupPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setForm(prev => ({ ...prev, next_followup_date: dateStr }));
    }
  };

  const handleSubmit = async () => {
    if (!form.patient_id || !form.appointment_date) {
      Alert.alert('Required Fields', 'Patient and Date are mandatory.');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=appointments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-API-Token': token
        },
        body: JSON.stringify(form)
      });
      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', 'Visit recorded successfully.');
        router.back();
      } else {
        Alert.alert('Error', result.message || 'Failed to record visit.');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <Stack.Screen options={{ 
          headerShown: true, 
          title: 'Record Visit', 
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#f8fafc' },
          headerTintColor: '#0f172a',
          headerTitleStyle: { fontWeight: '800' }
        }} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Patient</Text>
              <TouchableOpacity 
                style={styles.patientBox} 
                onPress={() => setShowPatientModal(true)}
              >
                <Ionicons name="person" size={18} color="#12836f" />
                <Text style={styles.patientName}>{selectedPatient.name || 'Select Patient'}</Text>
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-down" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Visit Type</Text>
              <View style={styles.typeRow}>
                {['New', 'Old'].map(t => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.typeBtn, form.appointment_type === t && styles.typeBtnActive]}
                    onPress={() => setForm(prev => ({ ...prev, appointment_type: t }))}
                  >
                    <Text style={[styles.typeText, form.appointment_type === t && styles.typeTextActive]}>{t} Consultation</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>Visit Date</Text>
                <TouchableOpacity 
                  style={styles.input} 
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: form.appointment_date ? '#0f172a' : '#94a3b8' }}>
                    {form.appointment_date || 'Select Date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={form.appointment_date ? new Date(form.appointment_date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Consultation Fee</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0"
                  keyboardType="number-pad"
                  value={form.fee}
                  onChangeText={val => setForm(prev => ({ ...prev, fee: val }))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Follow-up Date (Optional)</Text>
              <TouchableOpacity 
                style={styles.input} 
                onPress={() => setShowFollowupPicker(true)}
              >
                <Text style={{ color: form.next_followup_date ? '#0f172a' : '#94a3b8' }}>
                  {form.next_followup_date || 'Select Follow-up Date'}
                </Text>
              </TouchableOpacity>
              {showFollowupPicker && (
                <DateTimePicker
                  value={form.next_followup_date ? new Date(form.next_followup_date) : new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={onFollowupChange}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Clinical Remarks</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Symptoms, diagnosis, or medicines..."
                multiline
                value={form.remarks}
                onChangeText={val => setForm(prev => ({ ...prev, remarks: val }))}
              />
            </View>

            <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Confirm Visit Details</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={showPatientModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPatientModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Patient</Text>
                <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalSearch}>
                <Ionicons name="search" size={18} color="#94a3b8" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search name or mobile..."
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              {searching ? (
                <ActivityIndicator style={{ margin: 20 }} color="#12836f" />
              ) : (
                <FlatList
                  data={patients}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.patientItem} 
                      onPress={() => {
                        setSelectedPatient({ id: item.id.toString(), name: item.name });
                        setForm(prev => ({ ...prev, patient_id: item.id.toString() }));
                        setShowPatientModal(false);
                      }}
                    >
                      <View>
                        <Text style={styles.itemPatientName}>{item.name}</Text>
                        <Text style={styles.itemPatientMeta}>{item.mobile} • {item.age}y</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.modalEmpty}>No patients found</Text>
                  }
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  patientBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    gap: 10,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#12836f',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  typeBtnActive: {
    backgroundColor: '#12836f',
    borderColor: '#12836f',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  typeTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#12836f',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  patientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemPatientMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  modalEmpty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#94a3b8',
    fontSize: 15,
  }
});
