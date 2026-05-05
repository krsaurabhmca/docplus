import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PatientFormScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    mobile: '',
    address: '',
    category_ids: [] as number[]
  });
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchPatient();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=categories`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPatient = async () => {
    setFetching(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=patients/${id}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        setForm({
          name: result.data.name,
          age: result.data.age?.toString() || '',
          gender: result.data.gender,
          mobile: result.data.mobile || '',
          address: result.data.address || '',
          category_ids: result.data.category_ids || []
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch patient details.');
    } finally {
      setFetching(false);
    }
  };

  const toggleCategory = (catId: number) => {
    setForm(prev => {
      const exists = prev.category_ids.includes(catId);
      if (exists) {
        return { ...prev, category_ids: prev.category_ids.filter(i => i !== catId) };
      } else {
        return { ...prev, category_ids: [...prev.category_ids, catId] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.mobile) {
      Alert.alert('Required Fields', 'Name and Mobile are mandatory.');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const url = id ? `${CONFIG.API_BASE}?route=patients/${id}` : `${CONFIG.API_BASE}?route=patients`;
      const response = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-API-Token': token
        },
        body: JSON.stringify(form)
      });
      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', id ? 'Patient updated successfully.' : 'Patient added successfully.');
        router.back();
      } else {
        Alert.alert('Error', result.message || 'Failed to save patient.');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#12836f" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <Stack.Screen options={{ 
          headerShown: true, 
          title: id ? 'Edit Patient' : 'Add New Patient', 
          headerShadowVisible: false,
          headerTintColor: '#0f172a',
          headerTitleStyle: { fontWeight: '700' }
        }} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Jonas Campbell"
                value={form.name}
                onChangeText={val => setForm(prev => ({ ...prev, name: val }))}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Age"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={form.age}
                  onChangeText={val => {
                    const num = val.replace(/[^0-9]/g, '');
                    if (num === '' || parseInt(num) <= 99) {
                      setForm(prev => ({ ...prev, age: num }));
                    }
                  }}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1.5 }]}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderRow}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <TouchableOpacity 
                      key={g} 
                      style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
                      onPress={() => setForm(prev => ({ ...prev, gender: g }))}
                    >
                      <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile"
                keyboardType="phone-pad"
                maxLength={10}
                value={form.mobile}
                onChangeText={val => {
                  const num = val.replace(/[^0-9]/g, '');
                  setForm(prev => ({ ...prev, mobile: num }));
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Patient Categories (Select Multiple)</Text>
              <View style={styles.catGrid}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[styles.catBtn, form.category_ids.includes(cat.id) && styles.catBtnActive]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <Ionicons 
                      name={form.category_ids.includes(cat.id) ? "checkmark-circle" : "add-circle-outline"} 
                      size={16} 
                      color={form.category_ids.includes(cat.id) ? "#12836f" : "#64748b"} 
                    />
                    <Text style={[styles.catText, form.category_ids.includes(cat.id) && styles.catTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Optional address details"
                multiline
                value={form.address}
                onChangeText={val => setForm(prev => ({ ...prev, address: val }))}
              />
            </View>

            <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={() => {
              if (form.mobile.length !== 10) {
                Alert.alert('Invalid Mobile', 'Mobile number must be exactly 10 digits.');
                return;
              }
              const ageNum = parseInt(form.age);
              if (form.age && (isNaN(ageNum) || ageNum > 99)) {
                Alert.alert('Invalid Age', 'Age must be between 0 and 99.');
                return;
              }
              handleSubmit();
            }} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Patient Profile</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  genderBtnActive: {
    backgroundColor: '#12836f',
    borderColor: '#12836f',
  },
  genderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  genderTextActive: {
    color: '#fff',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catBtnActive: {
    backgroundColor: '#f1fdfb',
    borderColor: '#12836f',
  },
  catText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  catTextActive: {
    color: '#0369a1',
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
  }
});
