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
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [selectedMetaTemplate, setSelectedMetaTemplate] = useState<any>(null);
  
  const [variables, setVariables] = useState<string[]>([]);
  const [headerMedia, setHeaderMedia] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
    fetchMetaTemplates();
  }, []);

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
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
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
        Alert.alert('Launched', `Campaign queued for ${result.recipients_count} recipients.`, [{ text: 'OK', onPress: () => router.back() }]);
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
            <Text style={styles.sectionTitle}>1. Target Audience</Text>
            <View style={styles.categoryGrid}>
              <TouchableOpacity style={[styles.catBadge, selectedCategories.length === 0 && styles.catBadgeActive]} onPress={() => setSelectedCategories([])}>
                <Text style={[styles.catText, selectedCategories.length === 0 && styles.catTextActive]}>All Patients</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity key={cat.id} style={[styles.catBadge, selectedCategories.includes(cat.id) && styles.catBadgeActive]} onPress={() => setSelectedCategories(prev => prev.includes(cat.id) ? prev.filter(i => i !== cat.id) : [...prev, cat.id])}>
                  <Text style={[styles.catText, selectedCategories.includes(cat.id) && styles.catTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.card, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>2. Meta Template Configuration</Text>
            <TouchableOpacity style={styles.templatePicker} onPress={() => setShowMetaModal(true)}>
              <Ionicons name="logo-whatsapp" size={24} color="#12836f" />
              <View style={{ flex: 1 }}>
                <Text style={styles.templatePickerLabel}>Selected Template</Text>
                <Text style={styles.templatePickerText}>
                  {selectedMetaTemplate ? selectedMetaTemplate.template_name : 'Click to select template'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>

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
                            <Ionicons name={selectedMetaTemplate.header_type === 'Image' ? "image" : "videocam"} size={20} color="#12836f" />
                            <Text style={styles.mediaSelectedText} numberOfLines={1}>{headerMedia.split('/').pop()}</Text>
                            <TouchableOpacity onPress={() => setHeaderMedia('')}><Ionicons name="close-circle" size={18} color="#94a3b8" /></TouchableOpacity>
                          </View>
                        ) : (
                          <View style={{ alignItems: 'center' }}>
                            <Ionicons name="cloud-upload-outline" size={32} color="#94a3b8" />
                            <Text style={styles.mediaPickerText}>Upload {selectedMetaTemplate.header_type}</Text>
                          </View>
                        )}
                        {uploading && <ActivityIndicator color="#12836f" style={styles.loader} />}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Body Message Variables</Text>
                  <View style={styles.variableContainer}>
                    <Text style={styles.staticText}>Hello</Text>
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
                    <Text style={styles.staticText}>Thank you for your valuable time and kind consideration.</Text>
                  </View>
                </View>

                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <Ionicons name="eye-outline" size={14} color="#0369a1" />
                    <Text style={styles.previewHeaderText}>Final Message Preview</Text>
                  </View>
                  <Text style={styles.previewContent}>
                    Hello{"\n\n"}
                    {variables.map((v, i) => (v || `{{${i+1}}}`)).join("\n\n")}{"\n\n"}
                    Thank you for your valuable time and kind consideration.
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.sendBtn, (!selectedMetaTemplate || loading) && { opacity: 0.6 }]} 
              onPress={handleSubmit} 
              disabled={!selectedMetaTemplate || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>Launch Campaign</Text>}
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
  scroll: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  catBadgeActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  catText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  catTextActive: { color: '#fff' },
  templatePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdfa', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#ccfbf1', gap: 12 },
  templatePickerLabel: { fontSize: 11, fontWeight: '700', color: '#12836f', textTransform: 'uppercase', marginBottom: 2 },
  templatePickerText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  templateDetails: { marginTop: 24 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  variableContainer: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  staticText: { fontSize: 14, color: '#94a3b8', fontWeight: '600', marginVertical: 8 },
  variableInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', marginVertical: 4 },
  mediaPicker: { height: 100, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  mediaPickerText: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginTop: 4 },
  selectedMediaBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  mediaSelectedText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#12836f' },
  loader: { position: 'absolute' },
  previewCard: { backgroundColor: '#f0f9ff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#bae6fd' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  previewHeaderText: { fontSize: 11, fontWeight: '800', color: '#0369a1', textTransform: 'uppercase' },
  previewContent: { fontSize: 14, color: '#0c4a6e', lineHeight: 20 },
  sendBtn: { backgroundColor: '#10b981', borderRadius: 16, padding: 18, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  templateItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  templateName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  templateMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  addBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e6f4f1', borderRadius: 10 },
  addBtnText: { color: '#12836f', fontWeight: '700' }
});
