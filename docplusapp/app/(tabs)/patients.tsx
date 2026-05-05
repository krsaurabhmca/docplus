import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../../constants/Config';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PatientsScreen() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  const fetchPatients = async (reset = false) => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const currentPage = reset ? 1 : page;
      
      const response = await fetch(`${CONFIG.API_BASE}?route=patients&q=${search}&page=${currentPage}&limit=20`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-API-Token': token
        }
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

  useFocusEffect(
    useCallback(() => {
      fetchPatients(true);
    }, [search])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPatients(true);
  }, [search]);

  const deletePatient = async (id: number) => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=patients/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-API-Token': token
        }
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Patient deleted.');
        fetchPatients(true);
      } else {
        Alert.alert('Error', result.message || 'Failed to delete patient.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Connection failed.');
    }
  };

  const showOptions = (item: any) => {
    Alert.alert(
      item.name,
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => router.push(`/patient-form?id=${item.id}`) },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            Alert.alert(
              'Confirm Delete',
              `Are you sure you want to delete ${item.name}? This action cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deletePatient(item.id) }
              ]
            );
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push(`/patient/${item.id}`)}
      onLongPress={() => showOptions(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.gender}, {item.age} years • {item.mobile}</Text>
        <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['left', 'right']}>
      <View style={styles.container}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients by name or mobile..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
        </View>

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
              </View>
            ) : null
          }
          ListFooterComponent={
            hasMore && !loading ? <ActivityIndicator style={{ margin: 20 }} color="#12836f" /> : null
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  list: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#12836f',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  address: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
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
