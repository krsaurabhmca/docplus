import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';

type Template = {
  id: number;
  name: string;
  var1: string;
  var2: string;
  var3: string;
};

export default function CampaignsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [internalTemplates, setInternalTemplates] = useState<any[]>([]);
  const [doctor, setDoctor] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    var1: '',
    var2: '',
    var3: '',
    category_ids: [] as number[]
  });
  
  const [sending, setSending] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      
      const resLogs = await fetch(`${CONFIG.API_BASE}?route=campaigns&limit=3`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const resultLogs = await resLogs.json();
      
      const resCats = await fetch(`${CONFIG.API_BASE}?route=categories`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const resultCats = await resCats.json();

      const resTemps = await fetch(`${CONFIG.API_BASE}?route=campaign-templates`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const resultTemps = await resTemps.json();

      const resProfile = await fetch(`${CONFIG.API_BASE}?route=profile`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const resultProfile = await resProfile.json();

      if (resultLogs.success) setLogs(resultLogs.data);
      if (resultCats.success) setCategories(resultCats.data);
      if (resultTemps.success) setInternalTemplates(resultTemps.data);
      if (resultProfile.success) setDoctor(resultProfile.data);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const toggleCategory = (id: number) => {
    setForm(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(id) 
        ? prev.category_ids.filter(i => i !== id) 
        : [...prev.category_ids, id]
    }));
  };

  const handleLaunch = async () => {
    if (!form.var1 || !form.var2 || !form.var3) {
      Alert.alert('Required', 'Please fill all 3 variables.');
      return;
    }

    setSending(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      
      // If save as template is checked
      if (saveAsTemplate && form.name) {
        await fetch(`${CONFIG.API_BASE}?route=campaign-templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-API-Token': token },
          body: JSON.stringify({
            name: form.name,
            var1: form.var1,
            var2: form.var2,
            var3: form.var3
          })
        });
      }

      const response = await fetch(`${CONFIG.API_BASE}?route=campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-API-Token': token },
        body: JSON.stringify({
          var1: form.var1,
          var2: form.var2,
          var3: form.var3,
          category_ids: form.category_ids
        })
      });
      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', `Campaign launched for ${result.recipients_count} recipients.`);
        fetchData();
        setForm({ ...form, name: '', var1: '', var2: '', var3: '', category_ids: [] });
        setSaveAsTemplate(false);
      } else {
        Alert.alert('Error', result.message || 'Failed to start campaign.');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed.');
    } finally {
      setSending(false);
    }
  };

  const loadInternalTemplate = (it: any) => {
    setForm({
      ...form,
      var1: it.var1,
      var2: it.var2,
      var3: it.var3
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#12836f" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ 
        headerShown: true, 
        title: 'WhatsApp Campaign', 
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: '900' }
      }} />

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#12836f" />}
      >
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>1</Text></View>
            <Text style={styles.sectionTitle}>Target Audience</Text>
          </View>
          <View style={styles.catGrid}>
            <TouchableOpacity 
              style={[styles.catChip, form.category_ids.length === 0 && styles.catChipActive]}
              onPress={() => setForm(prev => ({ ...prev, category_ids: [] }))}
            >
              <Text style={[styles.catChipText, form.category_ids.length === 0 && styles.catChipTextActive]}>All Patients</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.catChip, form.category_ids.includes(cat.id) && styles.catChipActive]}
                onPress={() => toggleCategory(cat.id)}
              >
                <Text style={[styles.catChipText, form.category_ids.includes(cat.id) && styles.catChipTextActive]}>
                  {cat.name} ({cat.patient_count || 0})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { marginTop: 20 }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>2</Text></View>
            <Text style={styles.sectionTitle}>Campaign Content</Text>
          </View>

          {internalTemplates.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.label}>Quick Load Template</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                {internalTemplates.map(it => (
                  <TouchableOpacity 
                    key={it.id} 
                    style={styles.internalTemplateChip}
                    onPress={() => loadInternalTemplate(it)}
                  >
                    <Text style={styles.internalTemplateChipText}>{it.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Greeting / Header</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Hope you are doing well."
              value={form.var1}
              onChangeText={val => setForm(prev => ({ ...prev, var1: val }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Main Content</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="e.g. Your health is our priority. Please visit us for a follow-up."
              multiline
              value={form.var2}
              onChangeText={val => setForm(prev => ({ ...prev, var2: val }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Closing / CTA</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Call us at +91... for booking."
              value={form.var3}
              onChangeText={val => setForm(prev => ({ ...prev, var3: val }))}
            />
          </View>

          <View style={styles.previewContainer}>
            <View style={styles.previewHeaderRow}>
              <Ionicons name="logo-whatsapp" size={14} color="#64748b" />
              <Text style={styles.previewHeaderText}>WhatsApp Preview</Text>
            </View>
            <View style={styles.whatsappBubble}>
              <View style={styles.bubbleTail} />
              {doctor?.photo_path && (
                <Image source={{ uri: `${CONFIG.BASE_URL}/${doctor.photo_path}` }} style={styles.previewImage} />
              )}
              <View style={styles.previewTextContent}>
                <Text style={styles.previewText}>Hello,{"\n\n"}{form.var1 || '{{Var 1}}'}{"\n\n"}{form.var2 || '{{Var 2}}'}{"\n\n"}{form.var3 || '{{Var 3}}'}{"\n\n"}Regards, DocPlus</Text>
                <Text style={styles.previewTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>
          </View>

          <View style={styles.saveTemplateSection}>
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => setSaveAsTemplate(!saveAsTemplate)}
            >
              <Ionicons 
                name={saveAsTemplate ? "checkbox" : "square-outline"} 
                size={20} 
                color={saveAsTemplate ? "#12836f" : "#cbd5e1"} 
              />
              <Text style={styles.checkboxLabel}>Save as internal template</Text>
            </TouchableOpacity>
            
            {saveAsTemplate && (
              <TextInput 
                style={[styles.input, { marginTop: 12 }]} 
                placeholder="Template Name..."
                value={form.name}
                onChangeText={val => setForm(prev => ({ ...prev, name: val }))}
              />
            )}
          </View>

          <TouchableOpacity 
            style={[styles.launchBtn, sending && { opacity: 0.7 }]} 
            onPress={handleLaunch}
            disabled={sending}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.launchBtnText}>Launch Campaign</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 30 }}>
          <Text style={styles.sectionTitleMain}>Recent Activity</Text>
          {logs.length > 0 ? (
            logs.map(log => (
              <View key={log.id} style={styles.logCardMin}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.logCardTitle}>{log.channel} Campaign</Text>
                  <Text style={styles.logCardDate}>{new Date(log.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.logCardResult}>
                  {log.api_response ? log.api_response.split('. Logs:')[0] : log.status}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent activity</Text>
          )}
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/campaign-history')}>
            <Text style={styles.viewAllText}>View Detailed History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#12836f', justifyContent: 'center', alignItems: 'center' },
  sectionNumberText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sectionTitleMain: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  catChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  catChipText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  catChipTextActive: { color: '#fff' },
  label: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  inputGroup: { marginBottom: 20 },
  input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, fontSize: 14, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  internalTemplateChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  internalTemplateChipText: { fontSize: 11, fontWeight: '800', color: '#6366f1' },
  previewContainer: { backgroundColor: '#e5ddd5', borderRadius: 24, padding: 16, marginVertical: 10 },
  previewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  previewHeaderText: { fontSize: 9, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  whatsappBubble: { backgroundColor: '#fff', borderRadius: 12, borderTopLeftRadius: 0, padding: 8, maxWidth: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1, alignSelf: 'flex-start', position: 'relative' },
  bubbleTail: { position: 'absolute', left: -8, top: 0, width: 0, height: 0, borderTopWidth: 0, borderRightWidth: 10, borderBottomWidth: 10, borderLeftWidth: 0, borderTopColor: 'transparent', borderRightColor: '#fff', borderBottomColor: 'transparent', borderLeftColor: 'transparent' },
  previewImage: { width: '100%', height: 100, borderRadius: 8, marginBottom: 8, backgroundColor: '#f1f5f9' },
  previewTextContent: { padding: 2 },
  previewText: { fontSize: 13, color: '#111b21', lineHeight: 18 },
  previewTime: { fontSize: 9, color: '#667781', alignSelf: 'flex-end', marginTop: 4 },
  saveTemplateSection: { marginVertical: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  launchBtn: { backgroundColor: '#10b981', borderRadius: 20, padding: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  launchBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  logCardMin: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  logCardTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  logCardDate: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  logCardResult: { fontSize: 12, fontWeight: '800', color: '#12836f', marginTop: 4 },
  viewAllBtn: { alignItems: 'center', padding: 12 },
  viewAllText: { fontSize: 13, color: '#6366f1', fontWeight: '800' },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 13, marginVertical: 20 }
});
