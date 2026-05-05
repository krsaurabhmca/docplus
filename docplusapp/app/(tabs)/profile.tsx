import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../../constants/Config';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function ProfileScreen() {
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=profile`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-API-Token': token
        }
      });
      const result = await response.json();

      if (result.success) {
        setDoctor(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const shareReport = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      const response = await fetch(`${CONFIG.API_BASE}?route=reports`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        const t = result.data.today;
        const msg = `*DocPlus Daily Report*\nDate: ${new Date().toLocaleDateString()}\n\nNew Patients: ${t.new}\nScheduled Follow-ups: ${t.scheduled}\nActual Re-visits: ${t.actual}\n\nTotal Income: ₹${Math.round(result.data.summary.total_income)}`;
        
        const fileUri = FileSystem.cacheDirectory + 'daily_report.txt';
        await FileSystem.writeAsStringAsync(fileUri, msg, { encoding: FileSystem.EncodingType.UTF8 });
        
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: 'Share Daily Report',
            UTI: 'public.plain-text'
          });
        } else {
          Alert.alert('Sharing Not Available', 'Sharing is not supported on this device.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate daily report.');
    }
  };

  const exportCSV = async () => {
    try {
      const token = await SecureStore.getItemAsync(CONFIG.API_TOKEN_KEY);
      // Fetching with high limit for full export
      const response = await fetch(`${CONFIG.API_BASE}?route=patients&limit=2000`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-API-Token': token }
      });
      const result = await response.json();
      if (result.success) {
        const patients = result.data;
        if (!patients || patients.length === 0) {
          Alert.alert('Empty', 'No patients found to export.');
          return;
        }

        const header = 'Name,Mobile,Age,Gender,Address,Category\n';
        const rows = patients.map((p: any) => 
          `"${p.name}","${p.mobile}","${p.age}","${p.gender}","${(p.address || '').replace(/"/g, '""')}","${(p.category_name || '').replace(/"/g, '""')}"`
        ).join('\n');
        
        const csv = header + rows;
        const fileUri = FileSystem.cacheDirectory + 'patients_database.csv';
        
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Patient Database',
            UTI: 'public.comma-separated-values-text'
          });
        } else {
          Alert.alert('Sharing Not Available', 'Sharing is not supported on this device.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export CSV database.');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of DocPlus?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out', 
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync(CONFIG.API_TOKEN_KEY);
          router.replace('/login');
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#12836f" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['left', 'right']}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarLarge}>
              {doctor?.photo_path ? (
                <Image source={{ uri: `${CONFIG.BASE_URL}/${doctor.photo_path}` }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLargeText}>{doctor?.name?.charAt(0)}</Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{doctor?.name || 'Dr. Name'}</Text>
                <TouchableOpacity 
                  style={styles.editBtnSmall}
                  onPress={() => router.push('/profile-edit')}
                >
                  <Ionicons name="create-outline" size={18} color="#12836f" />
                </TouchableOpacity>
              </View>
              <Text style={styles.qualification}>{doctor?.qualification}</Text>
              <View style={styles.specializationBadge}>
                <Text style={styles.specializationText}>{doctor?.specialization}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Clinic Information</Text>
            <TouchableOpacity onPress={() => router.push('/profile-edit')}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/profile-edit')}
            activeOpacity={0.7}
          >
            <View style={styles.infoRow}>
              <Ionicons name="business" size={20} color="#64748b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Clinic Name</Text>
                <Text style={styles.infoValue}>{doctor?.clinic_name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#64748b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{doctor?.clinic_address}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Ionicons name="card" size={20} color="#64748b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Consultation Fee</Text>
                <Text style={styles.infoValue}>₹{doctor?.fee}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reports & Data</Text>
          <TouchableOpacity style={styles.menuItem} onPress={shareReport}>
            <Ionicons name="share-social-outline" size={22} color="#0f172a" />
            <Text style={styles.menuText}>Share Daily Report</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={exportCSV}>
            <Ionicons name="download-outline" size={22} color="#0f172a" />
            <Text style={styles.menuText}>Export Patients CSV</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/whatsapp-template-list')}>
            <Ionicons name="logo-whatsapp" size={22} color="#12836f" />
            <Text style={styles.menuText}>Meta WhatsApp Templates</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile-edit')}>
            <Ionicons name="person-outline" size={22} color="#12836f" />
            <Text style={styles.menuText}>Edit Profile Details</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            <Text style={[styles.menuText, { color: '#ef4444' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.version}>App Version 1.0.0 (Build 2026)</Text>
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
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#12836f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#12836f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 24,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editBtnSmall: {
    backgroundColor: '#e6f4f1',
    padding: 8,
    borderRadius: 10,
  },
  qualification: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  specializationBadge: {
    backgroundColor: '#e0f2fe',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  specializationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12836f',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  menuText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  version: {
    textAlign: 'center',
    marginTop: 32,
    color: '#94a3b8',
    fontSize: 12,
  }
});
