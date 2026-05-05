import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../../constants/Config';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      if (!token) {
        router.replace('/login');
        return;
      }

      // Fetch reports for overview metrics
      const resReports = await fetch(`${CONFIG.API_BASE}?route=reports`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const reports = await resReports.json();

      // Fetch recent appointments for activity list
      const resRecent = await fetch(`${CONFIG.API_BASE}?route=appointments&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const recent = await resRecent.json();

      if (reports.success && recent.success) {
        setData({
          ...reports.data,
          recent: recent.data
        });
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
      fetchData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#12836f" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['left', 'right']}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#12836f" />}
      >
        {/* <View style={styles.header}>
        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.title}>Clinic Overview</Text>
      </View> */}

        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>Today's OPD Status</Text>
          <View style={styles.todayGrid}>
            <View style={styles.todayItem}>
              <Text style={styles.todayLabel}>New Patients</Text>
              <Text style={styles.todayValue}>{data?.today?.new || 0}</Text>
            </View>
            <View style={styles.todayItem}>
              <Text style={styles.todayLabel}>Scheduled</Text>
              <Text style={[styles.todayValue, { color: '#6366f1' }]}>{data?.today?.scheduled || 0}</Text>
            </View>
            <View style={styles.todayItem}>
              <Text style={styles.todayLabel}>Actual Revisit</Text>
              <Text style={[styles.todayValue, { color: '#12836f' }]}>{data?.today?.actual || 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="people-outline" size={24} color="#0369a1" />
            </View>
            <Text style={styles.metricLabel}>Total Patients</Text>
            <Text style={styles.metricValue}>{data?.total_patients || 0}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="cash-outline" size={24} color="#059669" />
            </View>
            <Text style={styles.metricLabel}>Month Income</Text>
            <Text style={styles.metricValue}>₹{Math.round(data?.summary?.total_income || 0)}</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="calendar-outline" size={24} color="#b45309" />
            </View>
            <Text style={styles.metricLabel}>Total Visits</Text>
            <Text style={styles.metricValue}>{data?.summary?.total_appointments || 0}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="stats-chart-outline" size={24} color="#7e22ce" />
            </View>
            <Text style={styles.metricLabel}>Today OPD</Text>
            <Text style={styles.metricValue}>{(data?.today?.new || 0) + (data?.today?.actual || 0)}</Text>
          </View>
        </View>

        {data?.future && data.future.length > 0 && (
          <View style={styles.futureSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Targets</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.futureGrid}>
              {data.future.map((f: any, i: number) => (
                <View key={i} style={styles.futureCard}>
                  <Text style={styles.futureDate}>{new Date(f.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                  <Text style={styles.futureCount}>{f.count} Patients</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/patient-form')}>
            <View style={[styles.actionIcon, { backgroundColor: '#12836f' }]}>
              <Ionicons name="person-add" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Add Patient</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/appointment-form')}>
            <View style={[styles.actionIcon, { backgroundColor: '#6366f1' }]}>
              <Ionicons name="calendar" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>New Visit</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionRow, { marginTop: -12 }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/category-list')}>
            <View style={[styles.actionIcon, { backgroundColor: '#ea580c' }]}>
              <Ionicons name="grid" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Categories</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/campaign-form')}>
            <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
              <Ionicons name="logo-whatsapp" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Campaign</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Outreach</Text>
          <TouchableOpacity onPress={() => router.push('/campaign-history')}>
            <Text style={styles.seeAll}>View Logs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          {data?.recent && data.recent.length > 0 ? (
            data.recent.map((item: any, index: number) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.activityItem, index === data.recent.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => router.push(`/patient/${item.patient_id}`)}
              >
                <View style={styles.activityInfo}>
                  <Text style={styles.activityPatient}>{item.patient_name}</Text>
                  <Text style={styles.activityMeta}>{item.appointment_type} Visit • {new Date(item.appointment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                </View>
                <Text style={styles.activityIncome}>₹{Math.round(item.fee)}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.empty}>No recent activity found.</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
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
    backgroundColor: '#f8fafc',
  },
  todayCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#12836f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  todayTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#12836f',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  todayGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  todayItem: {
    alignItems: 'center',
    flex: 1,
  },
  todayLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  todayValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  futureSection: {
    marginBottom: 24,
    marginTop: 8,
  },
  futureGrid: {
    paddingHorizontal: 20,
    gap: 10,
  },
  futureCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    minWidth: 110,
  },
  futureDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  futureCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6366f1',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  seeAll: {
    fontSize: 13,
    color: '#12836f',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  activityCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 30,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  activityInfo: {
    flex: 1,
  },
  activityPatient: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  activityMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  activityIncome: {
    fontSize: 15,
    fontWeight: '800',
    color: '#12836f',
  },
  empty: {
    padding: 30,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  }
});
