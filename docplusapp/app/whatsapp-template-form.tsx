import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function WhatsAppTemplateFormScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [form, setForm] = useState({
    template_name: '',
    variable_count: '0',
    header_type: 'None',
    body_text: ''
  });
  const router = useRouter();

  useEffect(() => {
    if (id) fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=whatsapp-templates&id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        setForm({
          template_name: result.data.template_name,
          variable_count: result.data.variable_count.toString(),
          header_type: result.data.header_type,
          body_text: result.data.body_text || ''
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch template details');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.template_name) {
      Alert.alert('Required', 'Please enter the Template Name');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const url = id 
        ? `${CONFIG.API_BASE}?route=whatsapp-templates&id=${id}`
        : `${CONFIG.API_BASE}?route=whatsapp-templates`;
      
      const response = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-API-Token': token },
        body: JSON.stringify({
          ...form,
          variable_count: parseInt(form.variable_count) || 0
        })
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', id ? 'Template updated.' : 'Template registered.', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const headerTypes = ['None', 'Text', 'Image', 'Video', 'Document'];

  if (fetching) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#12836f" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ title: id ? 'Edit Meta Template' : 'Register Meta Template', headerShadowVisible: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Template Name (From Meta)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. appointment_confirmation" 
                value={form.template_name} 
                onChangeText={val => setForm(prev => ({ ...prev, template_name: val }))}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Body Variables</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Number of tags" 
                value={form.variable_count} 
                onChangeText={val => setForm(prev => ({ ...prev, variable_count: val.replace(/[^0-9]/g, '') }))}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Header Type</Text>
              <View style={styles.typeGrid}>
                {headerTypes.map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.typeBtn, form.header_type === type && styles.typeBtnActive]}
                    onPress={() => setForm(prev => ({ ...prev, header_type: type }))}
                  >
                    <Text style={[styles.typeText, form.header_type === type && styles.typeTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Body Text (for Reference)</Text>
              <TextInput 
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                placeholder="Paste the body text here..." 
                multiline
                value={form.body_text} 
                onChangeText={val => setForm(prev => ({ ...prev, body_text: val }))}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{id ? 'Update Template' : 'Register Template'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  typeBtnActive: { backgroundColor: '#12836f', borderColor: '#12836f' },
  typeText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  typeTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#10b981', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 12 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});
