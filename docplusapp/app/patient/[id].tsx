import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=patients/${id}/profile`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-API-Token': token
        }
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#12836f" /></View>;

  const { patient, ledger, history } = data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <Stack.Screen options={{ 
          headerShown: true, 
          title: patient.name, 
          headerShadowVisible: false,
          headerTintColor: '#0f172a',
          headerTitleStyle: { fontWeight: '700' }
        }} />
        <ScrollView 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetails(); }} color="#12836f" />}
        >
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{patient.name.charAt(0)}</Text>
            </View>
            <Text style={styles.name}>{patient.name}</Text>
            <Text style={styles.meta}>{patient.gender}, {patient.age}y • {patient.mobile}</Text>
            <Text style={styles.address}>{patient.address || 'No address provided'}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{ledger.visit_count}</Text>
                <Text style={styles.statLabel}>Visits</Text>
              </View>
              <View style={[styles.stat, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f1f5f9' }]}>
                <Text style={styles.statVal}>₹{ledger.ledger_total}</Text>
                <Text style={styles.statLabel}>Total Paid</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{patient.category_name || 'General'}</Text>
                <Text style={styles.statLabel}>Category</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Visit History</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push({ pathname: '/appointment-form', params: { patient_id: patient.id, patient_name: patient.name } })}>
                <Ionicons name="add-circle" size={20} color="#12836f" />
                <Text style={styles.addBtnText}>New Visit</Text>
              </TouchableOpacity>
            </View>

            {history.length > 0 ? (
              history.map((item: any) => (
                <View key={item.id} style={styles.visitCard}>
                  <View style={styles.visitHeader}>
                    <Text style={styles.visitDate}>{new Date(item.appointment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                    <View style={[styles.badge, item.appointment_type === 'Old' ? styles.badgeOld : styles.badgeNew]}>
                      <Text style={[styles.badgeText, item.appointment_type === 'Old' ? styles.badgeTextOld : styles.badgeTextNew]}>{item.appointment_type}</Text>
                    </View>
                  </View>
                  <Text style={styles.remarks}>{item.remarks || 'No remarks added'}</Text>
                  <View style={styles.visitFooter}>
                    <Text style={styles.visitFee}>Fee: ₹{item.fee}</Text>
                    {item.next_followup_date && (
                      <Text style={styles.followup}>Next: {new Date(item.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No previous visits recorded.</Text>
              </View>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#f8fafc',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e9f8f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#12836f',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  meta: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  address: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    width: '100%',
  },
  stat: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  section: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12836f',
  },
  visitCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visitDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeNew: { backgroundColor: '#ecfdf5' },
  badgeOld: { backgroundColor: '#eff6ff' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextNew: { color: '#059669' },
  badgeTextOld: { color: '#2563eb' },
  remarks: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  visitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  visitFee: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  followup: {
    fontSize: 13,
    fontWeight: '700',
    color: '#12836f',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  }
});
