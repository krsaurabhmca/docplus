import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function CampaignHistoryScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchLogs = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=campaigns`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        setLogs(result.data);
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
      fetchLogs();
    }, [])
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.channelBadge}>
          <Ionicons name={item.channel === 'WhatsApp' ? "logo-whatsapp" : "mail-outline"} size={12} color="#12836f" style={{ marginRight: 6 }} />
          <Text style={styles.channelBadgeText}>{item.channel}</Text>
        </View>
        <Text style={styles.logDate}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
      </View>
      
      <Text style={styles.logMessage} numberOfLines={3}>{item.message}</Text>
      
      <View style={styles.logFooter}>
        <View style={{ flex: 1 }}>
          <Text style={styles.logTarget}>
            Target: <Text style={{ color: '#0f172a' }}>{item.category_name || 'Global/All'}</Text>
          </Text>
          {item.api_response && (
            <Text style={styles.logDetailResult}>
              {item.api_response.split('. Logs:')[0]}
            </Text>
          )}
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statusDot, { backgroundColor: item.status === 'Completed' ? '#10b981' : '#f59e0b' }]} />
          <Text style={styles.logStatus}>{item.status}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ 
        headerShown: true,
        title: 'Campaign History', 
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTitleStyle: { fontSize: 18, fontWeight: '900', color: '#0f172a' }
      }} />

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs(); }} color="#12836f" />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="megaphone-outline" size={40} color="#94a3b8" />
              </View>
              <Text style={styles.emptyText}>No Campaigns Yet</Text>
              <Text style={styles.emptySub}>When you launch a campaign, its delivery status and logs will appear here.</Text>
            </View>
          ) : <ActivityIndicator color="#12836f" style={{ marginTop: 40 }} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 20 },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  channelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#12836f',
    textTransform: 'uppercase',
  },
  logDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
  logMessage: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 16,
  },
  logTarget: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  logDetailResult: {
    fontSize: 13,
    fontWeight: '800',
    color: '#12836f',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  logStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  empty: { padding: 60, alignItems: 'center' },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  emptyText: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 20 }
});
