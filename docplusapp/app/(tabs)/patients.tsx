import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../../constants/Config';
import { useRouter, useFocusEffect, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function PatientsScreen() {
  const params = useLocalSearchParams();
  const [patients, setPatients] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>((params.category_id as string) || '');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (params.category_id) {
      setCategoryId(params.category_id as string);
    }
  }, [params.category_id]);

  const fetchFiltersData = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const res = await fetch(`${CONFIG.API_BASE}?route=categories`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await res.json();
      if (result.success) setCategories(result.data);
    } catch (e) {}
  };

  const fetchPatients = async (reset = false) => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const currentPage = reset ? 1 : page;
      
      let url = `${CONFIG.API_BASE}?route=patients&q=${search}&page=${currentPage}&limit=20`;
      if (categoryId) url += `&category_id=${categoryId}`;
      if (minAge) url += `&min_age=${minAge}`;
      if (maxAge) url += `&max_age=${maxAge}`;
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();

      if (result.success) {
        if (reset) {
          setPatients(result.data);
          setHasMore(result.data.length === 20);
          setPage(2);
        } else {
          setPatients(prev => {
            const newPatients = result.data.filter((p: any) => !prev.some(existing => existing.id === p.id));
            return [...prev, ...newPatients];
          });
          setHasMore(result.data.length === 20);
          setPage(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPatients(true);
    }, [search, categoryId, minAge, maxAge, fromDate, toDate])
  );

  const resetFilters = () => {
    setCategoryId('');
    setMinAge('');
    setMaxAge('');
    setFromDate('');
    setToDate('');
    setShowFilters(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPatients(true);
  }, [search, categoryId, minAge, maxAge, fromDate, toDate]);

  const deletePatient = async (id: number) => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=patients&id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Patient deleted.');
        fetchPatients(true);
      }
    } catch (error) {}
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push(`/patient/${item.id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.gender}, {item.age} years • {item.mobile}</Text>
        <Text style={styles.categoryBadgeText} numberOfLines={1}>{item.category_name || 'No Category'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <Stack.Screen options={{
        headerShown: true,
        title: 'Patients',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTitleStyle: { fontWeight: '900', color: '#0f172a' },
        headerRight: () => (
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={{ marginRight: 16 }}>
            <Ionicons name="filter" size={22} color={showFilters || categoryId || minAge || fromDate ? '#12836f' : '#64748b'} />
          </TouchableOpacity>
        )
      }} />

      <View style={styles.container}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or mobile..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>

        {showFilters && (
          <View style={styles.filterDrawer}>
            <View style={styles.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <TouchableOpacity 
                    style={[styles.filterChip, categoryId === '' && styles.filterChipActive]}
                    onPress={() => setCategoryId('')}
                  >
                    <Text style={[styles.filterChipText, categoryId === '' && styles.filterChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {categories.map(cat => (
                    <TouchableOpacity 
                      key={cat.id} 
                      style={[styles.filterChip, categoryId === cat.id.toString() && styles.filterChipActive]}
                      onPress={() => setCategoryId(cat.id.toString())}
                    >
                      <Text style={[styles.filterChipText, categoryId === cat.id.toString() && styles.filterChipTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.filterLabel}>Age (Min-Max)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={styles.miniInput} placeholder="0" value={minAge} onChangeText={setMinAge} keyboardType="numeric" />
                  <TextInput style={styles.miniInput} placeholder="100" value={maxAge} onChangeText={setMaxAge} keyboardType="numeric" />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>Join Date (YYYY-MM-DD)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={styles.miniInput} placeholder="From" value={fromDate} onChangeText={setFromDate} />
                  <TextInput style={styles.miniInput} placeholder="To" value={toDate} onChangeText={setToDate} />
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
              <Text style={styles.resetBtnText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={patients}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#12836f" />}
          onEndReached={() => hasMore && fetchPatients()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>No patients found</Text>
                <Text style={styles.emptySub}>Try adjusting your filters or search query.</Text>
              </View>
            ) : null
          }
        />
        
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/patient-form')}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 16, borderRadius: 16, height: 50, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#0f172a' },
  filterDrawer: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterRow: { marginBottom: 16 },
  filterLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1f5f9', marginRight: 8 },
  filterChipActive: { backgroundColor: '#12836f' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  filterChipTextActive: { color: '#fff' },
  miniInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 8, fontSize: 13, borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a' },
  resetBtn: { alignItems: 'center', padding: 8 },
  resetBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '800' },
  list: { padding: 16, paddingTop: 0, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0fdfa', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#12836f' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  categoryBadgeText: { fontSize: 10, fontWeight: '800', color: '#0ea5e9', marginTop: 4, textTransform: 'uppercase' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#12836f', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  empty: { padding: 60, alignItems: 'center' },
  emptyText: { marginTop: 12, color: '#0f172a', fontSize: 16, fontWeight: '800' },
  emptySub: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 4 }
});
