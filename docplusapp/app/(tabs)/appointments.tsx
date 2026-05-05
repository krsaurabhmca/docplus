import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../../constants/Config';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewType, setViewType] = useState<'visit' | 'followup'>('visit');
  const [markedDates, setMarkedDates] = useState<any>({});
  const [dayCounts, setDayCounts] = useState<any>({});
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const fetchMonthData = async (date: string) => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const year = date.split('-')[0];
      const month = date.split('-')[1];
      const from = `${year}-${month}-01`;
      const to = `${year}-${month}-31`;

      const response = await fetch(`${CONFIG.API_BASE}?route=appointments&from=${from}&to=${to}&date_type=${viewType}&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        const counts: any = {};
        result.data.forEach((app: any) => {
          const d = viewType === 'followup' ? app.next_followup_date : app.appointment_date;
          if (d) counts[d] = (counts[d] || 0) + 1;
        });

        setDayCounts(counts);

        const marks: any = {};
        Object.keys(counts).forEach(d => {
          marks[d] = {
            marked: true,
            selected: d === selectedDate,
            selectedColor: viewType === 'followup' ? '#6366f1' : '#12836f'
          };
        });
        
        if (!marks[selectedDate]) {
          marks[selectedDate] = {
            selected: true,
            selectedColor: viewType === 'followup' ? '#6366f1' : '#12836f'
          };
        }

        setMarkedDates(marks);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDayAppointments = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=appointments&from=${selectedDate}&to=${selectedDate}&date_type=${viewType}&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        setAppointments(result.data);
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
      fetchMonthData(selectedDate);
      fetchDayAppointments();
    }, [selectedDate, viewType])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMonthData(selectedDate);
    fetchDayAppointments();
  }, [selectedDate, viewType]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/patient/${item.patient_id}`)}>
        <View style={styles.cardHeader}>
          <Text style={styles.patientName}>{item.patient_name}</Text>
          <View style={[styles.badge, item.appointment_type === 'Old' ? styles.badgeOld : styles.badgeNew]}>
            <Text style={[styles.badgeText, item.appointment_type === 'Old' ? styles.badgeTextOld : styles.badgeTextNew]}>{item.appointment_type}</Text>
          </View>
        </View>

        <Text style={styles.mobile}>{item.mobile}</Text>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.footerLabel}>Fee Paid</Text>
            <Text style={styles.fee}>₹{item.fee}</Text>
          </View>
          {item.next_followup_date && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.footerLabel}>Next Follow-up</Text>
              <Text style={styles.followup}>{new Date(item.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      {viewType === 'followup' && (
        <TouchableOpacity 
          style={styles.visitedBtn}
          onPress={() => router.push({
            pathname: '/appointment-form',
            params: { patient_id: item.patient_id, patient_name: item.patient_name, appointment_type: 'Old' }
          })}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.visitedBtnText}>Mark Visited</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['left', 'right']}>
      <View style={styles.container}>
        <View style={styles.toggleRow}>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewType === 'visit' && styles.toggleBtnActive]} 
            onPress={() => setViewType('visit')}
          >
            <Text style={[styles.toggleText, viewType === 'visit' && styles.toggleTextActive]}>Visits</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewType === 'followup' && styles.toggleBtnActive]} 
            onPress={() => setViewType('followup')}
          >
            <Text style={[styles.toggleText, viewType === 'followup' && styles.toggleTextActive]}>Follow-ups</Text>
          </TouchableOpacity>
        </View>

        <Calendar
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#b6c1cd',
            selectedDayBackgroundColor: viewType === 'followup' ? '#6366f1' : '#12836f',
            selectedDayTextColor: '#ffffff',
            todayTextColor: viewType === 'followup' ? '#6366f1' : '#12836f',
            dayTextColor: '#2d4150',
            monthTextColor: '#0f172a',
            textDayFontWeight: '600',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 12
          }}
          onDayPress={day => {
            setSelectedDate(day.dateString);
            if (dayCounts[day.dateString] > 0) {
              setShowModal(true);
            }
          }}
          markedDates={markedDates}
          dayComponent={({ date, state, marking }: any) => {
            const count = dayCounts[date.dateString];
            const isSelected = marking?.selected;
            return (
              <TouchableOpacity 
                style={[styles.dayContainer, isSelected && { backgroundColor: viewType === 'followup' ? '#6366f1' : '#12836f' }]}
                onPress={() => {
                  setSelectedDate(date.dateString);
                  if (count > 0) {
                    setShowModal(true);
                  }
                }}
              >
                <Text style={[
                  styles.dayText, 
                  state === 'disabled' ? { color: '#d9e1e8' } : { color: '#0f172a' },
                  isSelected && { color: '#fff' }
                ]}>
                  {date.day}
                </Text>
                {count > 0 && (
                  <View style={[styles.dayBadge, isSelected && { backgroundColor: '#fff' }]}>
                    <Text style={[styles.dayBadgeText, isSelected && { color: viewType === 'followup' ? '#6366f1' : '#12836f' }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        <Modal
          visible={showModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              
              <View style={styles.listHeader}>
                <View>
                  <Text style={styles.listTitle}>
                    {viewType === 'visit' ? 'Visits' : 'Follow-ups'}
                  </Text>
                  <Text style={styles.listSubtitle}>
                    {new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close-circle" size={32} color="#cbd5e1" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={appointments}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#12836f" />}
                ListHeaderComponent={
                  <View style={styles.modalStats}>
                    <Text style={[styles.count, viewType === 'followup' && { color: '#6366f1', backgroundColor: '#eef2ff' }]}>
                      {appointments.length} Patients Total
                    </Text>
                  </View>
                }
                ListEmptyComponent={
                  !loading ? (
                    <View style={styles.empty}>
                      <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
                      <Text style={styles.emptyText}>No {viewType} records found</Text>
                    </View>
                  ) : null
                }
              />
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.fab} onPress={() => router.push('/appointment-form')}>
          <Ionicons name="calendar" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  dayContainer: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#12836f',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  dayBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    borderColor: '#12836f',
    borderWidth: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#12836f',
  },
  visitedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  visitedBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  listSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  modalStats: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: '#12836f',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  list: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeNew: {
    backgroundColor: '#ecfdf5',
  },
  badgeOld: {
    backgroundColor: '#eff6ff',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextNew: {
    color: '#059669',
  },
  badgeTextOld: {
    color: '#2563eb',
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  mobile: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fee: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12836f',
  },
  followup: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#12836f',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#12836f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  empty: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  }
});
