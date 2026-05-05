import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useLocalSearchParams, Stack, useRouter, useFocusEffect } from 'expo-router';
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

  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [id])
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#12836f" /></View>;
  if (!data) return <View style={styles.centered}><Text>Patient not found.</Text></View>;

  const { patient, ledger, history } = data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ 
        headerShown: true, 
        title: 'Patient Profile', 
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 }
      }} />

      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetails(); }} color="#12836f" />}
      >
        {/* Profile Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerMain}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTextLarge}>{patient.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <View style={styles.tagRow}>
                <View style={styles.genderTag}>
                  <Text style={styles.tagText}>{patient.gender}</Text>
                </View>
                <Text style={styles.ageText}>{patient.age} Years Old</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactItem}>
              <Ionicons name="call" size={16} color="#12836f" />
              <Text style={styles.contactText}>{patient.mobile}</Text>
            </TouchableOpacity>
            <View style={styles.contactDivider} />
            <View style={styles.contactItem}>
              <Ionicons name="location" size={16} color="#64748b" />
              <Text style={styles.contactText} numberOfLines={1}>{patient.address || 'No Address'}</Text>
            </View>
          </View>
        </View>

        {/* Ledger Summary */}
        <View style={styles.ledgerGrid}>
          <View style={[styles.ledgerCard, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="calendar" size={20} color="#2563eb" />
            <Text style={styles.ledgerVal}>{ledger.visit_count}</Text>
            <Text style={styles.ledgerLabel}>Total Visits</Text>
          </View>
          <View style={[styles.ledgerCard, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="wallet" size={20} color="#059669" />
            <Text style={styles.ledgerVal}>₹{Math.round(ledger.ledger_total)}</Text>
            <Text style={styles.ledgerLabel}>Total Paid</Text>
          </View>
          <View style={[styles.ledgerCard, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="pricetag" size={20} color="#ea580c" />
            <Text style={styles.ledgerVal}>{patient.category_name || 'General'}</Text>
            <Text style={styles.ledgerLabel}>Category</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.primaryAction} 
            onPress={() => router.push({ pathname: '/appointment-form', params: { patient_id: patient.id, patient_name: patient.name } })}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.primaryActionText}>New Visit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryAction}
            onPress={() => router.push({ pathname: '/patient-form', params: { id: patient.id } })}
          >
            <Ionicons name="create-outline" size={22} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Visit History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Medical History Timeline</Text>
          
          {history.length > 0 ? (
            <View style={styles.timeline}>
              {history.map((item: any, index: number) => (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, item.appointment_type === 'New' ? styles.dotNew : styles.dotOld]} />
                    {index !== history.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.visitHeader}>
                      <Text style={styles.visitDate}>
                        {new Date(item.appointment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                      <View style={[styles.typeBadge, item.appointment_type === 'Old' ? styles.badgeOld : styles.badgeNew]}>
                        <Text style={[styles.typeText, item.appointment_type === 'Old' ? styles.typeTextOld : styles.typeTextNew]}>
                          {item.appointment_type}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.visitRemarks}>{item.remarks || 'Routine checkup and consultation.'}</Text>
                    <View style={styles.visitMeta}>
                      <View style={styles.metaLeft}>
                        <Text style={styles.feeLabel}>Paid:</Text>
                        <Text style={styles.feeVal}>₹{Math.round(item.fee)}</Text>
                      </View>
                      {item.next_followup_date && (
                        <View style={styles.followupBadge}>
                          <Ionicons name="notifications-outline" size={12} color="#12836f" />
                          <Text style={styles.followupText}>
                            Follow-up: {new Date(item.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No previous visits found.</Text>
            </View>
          )}
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#f1fdfb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  avatarTextLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: '#12836f',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  patientName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  genderTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  ageText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  contactText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  contactDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#e2e8f0',
  },
  ledgerGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  ledgerCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'flex-start',
  },
  ledgerVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  ledgerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: '#12836f',
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#12836f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  secondaryAction: {
    width: 54,
    height: 54,
    backgroundColor: '#fff',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  historySection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 100,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: '#fff',
    marginTop: 4,
    zIndex: 1,
  },
  dotNew: { borderColor: '#10b981' },
  dotOld: { borderColor: '#6366f1' },
  timelineLine: {
    position: 'absolute',
    top: 18,
    bottom: -4,
    width: 2,
    backgroundColor: '#f1f5f9',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitDate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeNew: { backgroundColor: '#ecfdf5' },
  badgeOld: { backgroundColor: '#eef2ff' },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  typeTextNew: { color: '#059669' },
  typeTextOld: { color: '#4f46e5' },
  visitRemarks: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  visitMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feeLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  feeVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  followupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1fdfb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  followupText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#12836f',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  }
});

