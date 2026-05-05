import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Modal, FlatList } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';

export default function CampaignFormScreen() {
  const [loading, setLoading] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [internalTemplates, setInternalTemplates] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [selectedMetaTemplate, setSelectedMetaTemplate] = useState<any>(null);
  
  const [variables, setVariables] = useState<string[]>([]);
  const [headerMedia, setHeaderMedia] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
    fetchMetaTemplates();
    fetchInternalTemplates();
    fetchLogs();
  }, []);

  const fetchInternalTemplates = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=campaign-templates`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) setInternalTemplates(result.data);
    } catch (error) {}
  };

  const fetchLogs = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=campaigns&limit=3`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) setLogs(result.data);
    } catch (error) {}
  };

  const fetchCategories = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=categories`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) setCategories(result.data);
    } catch (error) {}
  };

  const fetchMetaTemplates = async () => {
    setFetchingTemplates(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=whatsapp-templates`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) setWhatsappTemplates(result.data);
    } catch (error) {}
    setFetchingTemplates(false);
  };

  const selectMetaTemplate = (t: any) => {
    setSelectedMetaTemplate(t);
    setVariables(new Array(t.variable_count).fill(''));
    setHeaderMedia('');
    setShowMetaModal(false);
  };

  const pickMedia = async () => {
    if (!selectedMetaTemplate) return;
    const type = selectedMetaTemplate.header_type;
    
    let result;
    if (type === 'Image') {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.7 });
    } else if (type === 'Video') {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: true });
    } else {
      Alert.alert('Unsupported', 'Document picker not implemented in demo');
      return;
    }

    if (!result.canceled) {
      uploadMedia(result.assets[0].uri);
    }
  };

  const uploadMedia = async (uri: string) => {
    setUploading(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const formData = new FormData();
      const fileName = uri.split('/').pop() || 'upload.bin';
      const fileType = fileName.split('.').pop() || 'jpg';
      
      formData.append('photo', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: fileName,
        type: `application/octet-stream`,
      } as any);

      const response = await fetch(`${CONFIG.API_BASE}?route=upload-photo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setHeaderMedia(result.path);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMetaTemplate) {
      Alert.alert('Required', 'Please select a Meta Template first');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-API-Token': token },
        body: JSON.stringify({
          template_name: selectedMetaTemplate.template_name,
          header_type: selectedMetaTemplate.header_type,
          header_media: headerMedia,
          variables: variables,
          category_ids: selectedCategories
        })
      });
      const result = await response.json();
      if (result.success) {
        if (saveAsTemplate && templateName) {
          // Also save as an internal template for reuse
          await fetch(`${CONFIG.API_BASE}?route=campaign-templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-API-Token': token },
            body: JSON.stringify({
              name: templateName,
              var1: variables[0] || '',
              var2: variables[1] || '',
              var3: variables[2] || '',
              image_path: headerMedia
            })
          });
        }
        fetchLogs();
        Alert.alert('Launched', `Campaign queued for ${result.recipients_count} recipients.`);
      }
    } catch (error) {}
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ 
        headerShown: true,
        title: 'Meta Campaign Builder', 
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: '800' }
      }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>1</Text></View>
              <Text style={styles.sectionTitle}>Target Audience</Text>
            </View>
            <View style={styles.categoryGrid}>
              <TouchableOpacity style={[styles.catBadge, selectedCategories.length === 0 && styles.catBadgeActive]} onPress={() => setSelectedCategories([])}>
                <Text style={[styles.catText, selectedCategories.length === 0 && styles.catTextActive]}>All Patients</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity key={cat.id} style={[styles.catBadge, selectedCategories.includes(cat.id) && styles.catBadgeActive]} onPress={() => setSelectedCategories(prev => prev.includes(cat.id) ? prev.filter(i => i !== cat.id) : [...prev, cat.id])}>
                  <Text style={[styles.catText, selectedCategories.includes(cat.id) && styles.catTextActive]}>
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
            
            <TouchableOpacity style={styles.templatePicker} onPress={() => setShowMetaModal(true)}>
              <Ionicons name="logo-whatsapp" size={24} color="#12836f" />
              <View style={{ flex: 1 }}>
                <Text style={styles.templatePickerLabel}>Selected Meta Template</Text>
                <Text style={styles.templatePickerText}>
                  {selectedMetaTemplate ? selectedMetaTemplate.template_name : 'Select a Meta template...'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>

            {internalTemplates.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.label}>Quick Load Saved</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 5 }}>
                  {internalTemplates.map(it => (
                    <TouchableOpacity 
                      key={it.id} 
                      style={styles.internalTemplateChip}
                      onPress={() => {
                        setVariables([it.var1, it.var2, it.var3]);
                        setHeaderMedia(it.image_path || '');
                      }}
                    >
                      <Text style={styles.internalTemplateChipText}>{it.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {selectedMetaTemplate && (
              <View style={styles.templateDetails}>
                {selectedMetaTemplate.header_type !== 'None' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Header Media ({selectedMetaTemplate.header_type})</Text>
                    {selectedMetaTemplate.header_type === 'Text' ? (
                      <TextInput 
                        style={styles.input} 
                        placeholder="Enter header text..." 
                        value={headerMedia} 
                        onChangeText={setHeaderMedia} 
                      />
                    ) : (
                      <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}>
                        {headerMedia ? (
                          <View style={styles.selectedMediaBox}>
                            <Ionicons name={selectedMetaTemplate.header_type === 'Image' ? "image" : "videocam"} size={24} color="#12836f" />
                            <Text style={styles.mediaSelectedText} numberOfLines={1}>{headerMedia.split('/').pop()}</Text>
                            <TouchableOpacity onPress={() => setHeaderMedia('')}><Ionicons name="close-circle" size={24} color="#94a3b8" /></TouchableOpacity>
                          </View>
                        ) : (
                          <View style={{ alignItems: 'center' }}>
                            <Ionicons name="cloud-upload-outline" size={32} color="#cbd5e1" />
                            <Text style={styles.mediaPickerText}>Upload {selectedMetaTemplate.header_type}</Text>
                          </View>
                        )}
                        {uploading && <ActivityIndicator color="#12836f" style={styles.loader} />}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Message Variables</Text>
                  <View style={styles.variableContainer}>
                    <Text style={styles.staticText}>Hello,</Text>
                    {variables.map((val, idx) => (
                      <TextInput 
                        key={idx}
                        style={styles.variableInput} 
                        placeholder={`Variable {{${idx + 1}}}`} 
                        value={val}
                        onChangeText={text => {
                          const newVars = [...variables];
                          newVars[idx] = text;
                          setVariables(newVars);
                        }}
                        multiline
                      />
                    ))}
                    <Text style={styles.staticText}>Regards, DocPlus</Text>
                  </View>
                </View>

                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <Ionicons name="logo-whatsapp" size={14} color="#64748b" />
                    <Text style={styles.previewHeaderText}>Real-Time Preview</Text>
                  </View>
                  
                  <View style={styles.whatsappBubble}>
                    <View style={styles.bubbleTail} />
                    <Text style={styles.previewContent}>
                      Hello,{"\n\n"}
                      {variables.map((v, i) => (v || `{{${i+1}}}`)).join("\n\n")}{"\n\n"}
                      Regards, DocPlus
                    </Text>
                    <Text style={styles.previewTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                </View>
              </View>
            )}

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
                <Text style={styles.checkboxLabel}>Save this message as a template</Text>
              </TouchableOpacity>
              
              {saveAsTemplate && (
                <TextInput 
                  style={[styles.input, { marginTop: 10 }]} 
                  placeholder="Enter template name (e.g. Follow-up Promo)"
                  value={templateName}
                  onChangeText={setTemplateName}
                />
              )}
            </View>

            <TouchableOpacity 
              style={[styles.sendBtn, (!selectedMetaTemplate || loading) && { opacity: 0.6 }]} 
              onPress={handleSubmit} 
              disabled={!selectedMetaTemplate || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>Launch Campaign</Text>}
            </TouchableOpacity>
          </View>

          {/* Recent History Section */}
          <View style={{ marginTop: 30 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Recent Campaigns</Text>
            {logs.length > 0 ? (
              logs.map((log) => (
                <View key={log.id} style={[styles.card, { padding: 16, marginBottom: 12, borderStyle: 'dotted' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{log.channel} Campaign</Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(log.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#12836f', fontWeight: '800' }}>
                    {log.api_response ? log.api_response.split('. Logs:')[0] : log.status}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No recent campaigns found.</Text>
            )}
            <TouchableOpacity style={{ alignItems: 'center', padding: 10 }} onPress={() => router.push('/campaigns')}>
              <Text style={{ fontSize: 13, color: '#6366f1', fontWeight: '700' }}>View All History</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showMetaModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Meta Template</Text>
              <TouchableOpacity onPress={() => setShowMetaModal(false)}><Ionicons name="close" size={24} color="#0f172a" /></TouchableOpacity>
            </View>
            {fetchingTemplates ? <ActivityIndicator color="#12836f" style={{ margin: 40 }} /> : (
              <FlatList
                data={whatsappTemplates}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.templateItem} onPress={() => selectMetaTemplate(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.templateName}>{item.template_name}</Text>
                      <Text style={styles.templateMeta}>{item.variable_count} Variables • {item.header_type} Header</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={styles.emptyText}>No registered Meta templates found.</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => { setShowMetaModal(false); router.push('/whatsapp-template-form'); }}>
                      <Text style={styles.addBtnText}>Register New Template</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 50 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#12836f', justifyContent: 'center', alignItems: 'center' },
  sectionNumberText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  catBadgeActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  catText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  catTextActive: { color: '#fff' },
  templatePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdfa', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#ccfbf1', gap: 12 },
  templatePickerLabel: { fontSize: 10, fontWeight: '800', color: '#12836f', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  templatePickerText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  templateDetails: { marginTop: 24 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  variableContainer: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  staticText: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginVertical: 6 },
  variableInput: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', marginVertical: 6 },
  mediaPicker: { height: 120, backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  mediaPickerText: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginTop: 8 },
  selectedMediaBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  mediaSelectedText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#12836f' },
  loader: { position: 'absolute' },
  previewCard: { backgroundColor: '#e5ddd5', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#d1d5db', overflow: 'hidden' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  previewHeaderText: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  whatsappBubble: { backgroundColor: '#fff', borderRadius: 12, borderTopLeftRadius: 0, padding: 8, maxWidth: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1, alignSelf: 'flex-start', position: 'relative' },
  bubbleTail: { position: 'absolute', left: -8, top: 0, width: 0, height: 0, borderTopWidth: 0, borderRightWidth: 10, borderBottomWidth: 10, borderLeftWidth: 0, borderTopColor: 'transparent', borderRightColor: '#fff', borderBottomColor: 'transparent', borderLeftColor: 'transparent' },
  previewContent: { fontSize: 14, color: '#111b21', lineHeight: 20 },
  previewTime: { fontSize: 10, color: '#667781', alignSelf: 'flex-end', marginTop: 4 },
  sendBtn: { backgroundColor: '#10b981', borderRadius: 20, padding: 18, alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 4 },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  saveTemplateSection: { marginVertical: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkboxLabel: { fontSize: 14, fontWeight: '700', color: '#475569' },
  internalTemplateChip: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  internalTemplateChipText: { fontSize: 12, fontWeight: '800', color: '#6366f1' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  templateItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  templateName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  templateMeta: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  addBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e6f4f1', borderRadius: 10 },
  addBtnText: { color: '#12836f', fontWeight: '700' }
});
