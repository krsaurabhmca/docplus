import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function WhatsAppTemplateListScreen() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchTemplates = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=whatsapp-templates`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTemplates();
    }, [])
  );

  const deleteTemplate = (id: number) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this Meta template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
              const response = await fetch(`${CONFIG.API_BASE}?route=whatsapp-templates&id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
              });
              const result = await response.json();
              if (result.success) {
                fetchTemplates();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete template');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.template_name}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => router.push(`/whatsapp-template-form?id=${item.id}`)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={18} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteTemplate(item.id)} style={[styles.actionBtn, { borderColor: '#fee2e2' }]}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: '#f0fdf4' }]}>
          <Ionicons name="apps-outline" size={12} color="#15803d" />
          <Text style={[styles.badgeText, { color: '#15803d' }]}>{item.variable_count} Variables</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: '#f0f9ff' }]}>
          <Ionicons name={item.header_type === 'Image' ? "image-outline" : item.header_type === 'Video' ? "videocam-outline" : "text-outline"} size={12} color="#0369a1" />
          <Text style={[styles.badgeText, { color: '#0369a1' }]}>{item.header_type} Header</Text>
        </View>
      </View>

      {item.body_text ? (
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>MESSAGE PREVIEW</Text>
          <Text style={styles.previewText} numberOfLines={2}>{item.body_text}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ 
        title: 'Meta Templates', 
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTitleStyle: { fontSize: 18, fontWeight: '800', color: '#0f172a' }
      }} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Meta WhatsApp</Text>
          <Text style={styles.headerSubtitle}>Manage your pre-approved templates</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/whatsapp-template-form')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={templates}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTemplates(); }} color="#12836f" />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="logo-whatsapp" size={40} color="#12836f" />
              </View>
              <Text style={styles.emptyText}>No Templates Found</Text>
              <Text style={styles.emptySub}>Add templates provided by Meta to use them in your marketing campaigns.</Text>
            </View>
          ) : <ActivityIndicator color="#12836f" style={{ marginTop: 40 }} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  addBtn: { backgroundColor: '#12836f', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#12836f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  name: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  date: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  previewBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  previewLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', marginBottom: 6, letterSpacing: 0.5 },
  previewText: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  empty: { padding: 60, alignItems: 'center' },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 20 }
});
