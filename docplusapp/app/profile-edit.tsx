import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';

export default function ProfileEditScreen() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    name: '',
    qualification: '',
    specialization: '',
    clinic_name: '',
    clinic_address: '',
    fee: '0',
    fee_repeat_days: '0',
    wa_instance_id: '',
    whatsapp_from: '',
    whatsapp_api_key: ''
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=profile`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        const d = result.data;
        setForm({
          name: d.name || '',
          qualification: d.qualification || '',
          specialization: d.specialization || '',
          clinic_name: d.clinic_name || '',
          clinic_address: d.clinic_address || '',
          fee: d.fee?.toString() || '0',
          fee_repeat_days: d.fee_repeat_days?.toString() || '0',
          wa_instance_id: d.wa_instance_id || '',
          whatsapp_from: d.whatsapp_from || '',
          whatsapp_api_key: d.whatsapp_api_key || ''
        });
        if (d.photo_path) setPhoto(`${CONFIG.BASE_URL}/${d.photo_path}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch profile');
    } finally {
      setFetching(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const formData = new FormData();
      formData.append('photo', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: 'profile.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch(`${CONFIG.API_BASE}?route=upload-photo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setPhoto(`${CONFIG.BASE_URL}/${result.path}`);
        Alert.alert('Success', 'Photo uploaded');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-API-Token': token },
        body: JSON.stringify({
          ...form,
          fee: parseFloat(form.fee) || 0,
          fee_repeat_days: parseInt(form.fee_repeat_days) || 0
        })
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Profile updated', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#12836f" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ 
        headerShown: true,
        title: 'Edit Profile', 
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: '800' }
      }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickImage}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Ionicons name="camera" size={40} color="#cbd5e1" />
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoLabel}>Professional Profile Photo</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>General Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="Dr. John Doe" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Qualification</Text>
              <TextInput style={styles.input} value={form.qualification} onChangeText={v => setForm(p => ({ ...p, qualification: v }))} placeholder="MBBS, MD" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specialization</Text>
              <TextInput style={styles.input} value={form.specialization} onChangeText={v => setForm(p => ({ ...p, specialization: v }))} placeholder="Cardiologist" />
            </View>
          </View>

          <View style={[styles.card, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Clinic Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Clinic Name</Text>
              <TextInput style={styles.input} value={form.clinic_name} onChangeText={v => setForm(p => ({ ...p, clinic_name: v }))} placeholder="DocPlus Clinic" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Clinic Address</Text>
              <TextInput style={[styles.input, { height: 80 }]} multiline value={form.clinic_address} onChangeText={v => setForm(p => ({ ...p, clinic_address: v }))} placeholder="Street, City" />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>OPD Fee (₹)</Text>
                <TextInput style={styles.input} value={form.fee} keyboardType="numeric" onChangeText={v => setForm(p => ({ ...p, fee: v }))} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Validity (Days)</Text>
                <TextInput style={styles.input} value={form.fee_repeat_days} keyboardType="numeric" onChangeText={v => setForm(p => ({ ...p, fee_repeat_days: v }))} />
              </View>
            </View>
          </View>

          <View style={[styles.card, { marginTop: 20, borderColor: '#ccfbf1', backgroundColor: '#f0fdfa' }]}>
            <Text style={[styles.sectionTitle, { color: '#12836f' }]}>WhatsApp API Configuration</Text>
            <Text style={styles.waHint}>Connect your official WhatsApp channel using the AOC Portal API credentials.</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WhatsApp From Number</Text>
              <TextInput style={styles.input} value={form.whatsapp_from} onChangeText={v => setForm(p => ({ ...p, whatsapp_from: v }))} placeholder="e.g. +91XXXXXXXXXX" autoCapitalize="none" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>AOC API Key</Text>
              <TextInput style={styles.input} value={form.whatsapp_api_key} onChangeText={v => setForm(p => ({ ...p, whatsapp_api_key: v }))} placeholder="Your official API key" secureTextEntry autoCapitalize="none" />
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Profile Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20 },
  photoSection: { alignItems: 'center', marginBottom: 24 },
  photo: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
  photoPlaceholder: { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#12836f', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  photoLabel: { marginTop: 12, fontSize: 13, color: '#64748b', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, fontSize: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row' },
  waHint: { fontSize: 12, color: '#12836f', marginBottom: 16, lineHeight: 18 },
  saveBtn: { backgroundColor: '#12836f', borderRadius: 16, padding: 18, alignItems: 'center', marginVertical: 30 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});
