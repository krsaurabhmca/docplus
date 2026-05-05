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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [doctor, setDoctor] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'templates' | 'history'>('new');
  
  const [form, setForm] = useState({
    name: '', // For saving template
    var1: '',
    var2: '',
    var3: '',
    category_ids: [] as number[]
  });
  
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      
      // Fetch Logs
      const resLogs = await fetch(`${CONFIG.API_BASE}?route=campaigns`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const resultLogs = await resLogs.json();
      
      // Fetch Categories
      const resCats = await fetch(`${CONFIG.API_BASE}?route=categories`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const resultCats = await resCats.json();

      // Fetch Saved Templates
      const resTemps = await fetch(`${CONFIG.API_BASE}?route=whatsapp-templates`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const resultTemps = await resTemps.json();

      // Fetch Profile for Photo
      const resProfile = await fetch(`${CONFIG.API_BASE}?route=profile`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const resultProfile = await resProfile.json();

      if (resultLogs.success) setLogs(resultLogs.data);
      if (resultCats.success) setCategories(resultCats.data);
      if (resultTemps.success) setTemplates(resultTemps.data);
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
      Alert.alert('Required', 'Please fill all 3 variables for the WhatsApp template.');
      return;
    }

    setSending(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=campaigns`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-API-Token': token
        },
        body: JSON.stringify({
          var1: form.var1,
          var2: form.var2,
          var3: form.var3,
          category_ids: form.category_ids
        })
      });
      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', `WhatsApp Campaign launched for ${result.recipients_count} recipients.`);
        setActiveTab('history');
        fetchData();
      } else {
        Alert.alert('Error', result.message || 'Failed to start campaign.');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed.');
    } finally {
      setSending(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!form.name || !form.var1 || !form.var2 || !form.var3) {
      Alert.alert('Required', 'Please provide a template name and fill all variables.');
      return;
    }

    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=whatsapp-templates`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-API-Token': token
        },
        body: JSON.stringify({
          name: form.name,
          var1: form.var1,
          var2: form.var2,
          var3: form.var3
        })
      });
      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', 'Template saved successfully.');
        setForm(prev => ({ ...prev, name: '' }));
        fetchData();
        setActiveTab('templates');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const useTemplate = (t: Template) => {
    setForm({
      ...form,
      var1: t.var1,
      var2: t.var2,
      var3: t.var3
    });
    setActiveTab('new');
  };

  const deleteTemplate = async (id: number) => {
    Alert.alert('Delete Template', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
        await fetch(`${CONFIG.API_BASE}?route=whatsapp-templates&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
        });
        fetchData();
      }}
    ]);
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
        title: 'WhatsApp Campaigns', 
        headerShadowVisible: false,
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: '700' }
      }} />

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'new' && styles.tabActive]} onPress={() => setActiveTab('new')}>
          <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'templates' && styles.tabActive]} onPress={() => setActiveTab('templates')}>
          <Text style={[styles.tabText, activeTab === 'templates' && styles.tabTextActive]}>Templates</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.tabActive]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#12836f" />}
      >
        {activeTab === 'new' && (
          <View>
            <View style={styles.formCard}>
              <Text style={styles.sectionHeader}>1. Compose WhatsApp Message</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Template Variable 1 (Greeting/Header)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Hope you are doing well."
                  value={form.var1}
                  onChangeText={val => setForm(prev => ({ ...prev, var1: val }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Template Variable 2 (Main Content)</Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  placeholder="e.g. Your health is our priority. Please visit us for a follow-up."
                  multiline
                  value={form.var2}
                  onChangeText={val => setForm(prev => ({ ...prev, var2: val }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Template Variable 3 (Closing/Call to Action)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Call us at +91... for booking."
                  value={form.var3}
                  onChangeText={val => setForm(prev => ({ ...prev, var3: val }))}
                />
              </View>

              <Text style={styles.sectionHeader}>2. Preview Message</Text>
              <View style={styles.previewContainer}>
                <View style={styles.whatsappBubble}>
                  {doctor?.photo_path ? (
                    <Image source={{ uri: `${CONFIG.BASE_URL}/${doctor.photo_path}` }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.previewImagePlaceholder}>
                      <Ionicons name="image" size={32} color="#cbd5e1" />
                    </View>
                  )}
                  <View style={styles.previewTextContent}>
                    <Text style={styles.previewText}><Text style={styles.bold}>Hello</Text></Text>
                    <Text style={styles.previewText}>{form.var1 || '{{Variable 1}}'}</Text>
                    <Text style={styles.previewText}>{form.var2 || '{{Variable 2}}'}</Text>
                    <Text style={styles.previewText}>{form.var3 || '{{Variable 3}}'}</Text>
                    <Text style={styles.previewFooter}>Thank you for your valuable time and kind consideration.</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionHeader}>3. Target Categories</Text>
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
                    <Text style={[styles.catChipText, form.category_ids.includes(cat.id) && styles.catChipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.actionRow}>
                <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
                  <TextInput
                    style={[styles.input, { borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                    placeholder="Template Name..."
                    value={form.name}
                    onChangeText={val => setForm(prev => ({ ...prev, name: val }))}
                  />
                </View>
                <TouchableOpacity 
                  style={styles.saveBtn} 
                  onPress={handleSaveTemplate}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="save" size={20} color="#fff" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.launchBtn, sending && { opacity: 0.7 }]} 
                onPress={handleLaunch}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.launchBtnText}>Launch WhatsApp Campaign</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'templates' && (
          <View>
            {templates.length > 0 ? (
              templates.map(t => (
                <View key={t.id} style={styles.templateCard}>
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateName}>{t.name}</Text>
                    <TouchableOpacity onPress={() => deleteTemplate(t.id)}>
                      <Ionicons name="trash-outline" size={20} color="#f43f5e" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.templatePreview} numberOfLines={2}>
                    {t.var1} | {t.var2} | {t.var3}
                  </Text>
                  <TouchableOpacity style={styles.useBtn} onPress={() => useTemplate(t)}>
                    <Text style={styles.useBtnText}>Use this Template</Text>
                    <Ionicons name="arrow-forward" size={16} color="#12836f" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>No saved templates yet.</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View>
            {logs.length > 0 ? (
              logs.map(log => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View style={styles.channelBadge}>
                      <Ionicons name="logo-whatsapp" size={10} color="#12836f" style={{ marginRight: 4 }} />
                      <Text style={styles.channelBadgeText}>{log.channel}</Text>
                    </View>
                    <Text style={styles.logDate}>{new Date(log.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.logMessage} numberOfLines={3}>{log.message}</Text>
                  <View style={styles.logFooter}>
                    <Text style={styles.logTarget}>
                      Target: {log.category_name || 'Group/Multiple'}
                    </Text>
                    <View style={styles.statsRow}>
                      <Text style={styles.logRecipients}>{log.recipients_count} Recipients</Text>
                      <View style={[styles.statusDot, { backgroundColor: log.status === 'Sent' ? '#10b981' : '#f59e0b' }]} />
                      <Text style={styles.logStatus}>{log.status}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="megaphone-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>No previous campaigns found.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 6,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#f1f5f9',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
  },
  scroll: {
    padding: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#12836f',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  previewContainer: {
    backgroundColor: '#efeae2', // WhatsApp background color
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  whatsappBubble: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  previewImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9',
  },
  previewImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTextContent: {
    padding: 12,
  },
  previewText: {
    fontSize: 14,
    color: '#111b21',
    lineHeight: 20,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
  },
  previewFooter: {
    fontSize: 13,
    color: '#667781',
    marginTop: 8,
    fontStyle: 'italic',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipActive: {
    backgroundColor: '#12836f',
    borderColor: '#12836f',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  catChipTextActive: {
    color: '#fff',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#64748b',
    padding: 14,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  launchBtn: {
    backgroundColor: '#12836f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#12836f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  launchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  templatePreview: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  useBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  useBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#12836f',
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  channelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#12836f',
  },
  logDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  logMessage: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 12,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 12,
  },
  logTarget: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logRecipients: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  logStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  }
});
