import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-netinfo/netinfo';
import { Colors } from '../../constants/Colors';
import { DataEntry, SyncStatus } from '../../types';
import { databaseService } from '../../services/database';

export default function SyncScreen() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    pendingEntries: 0,
    pendingMedia: 0,
  });
  const [unsyncedEntries, setUnsyncedEntries] = useState<DataEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSyncStatus();
    
    // Listen to network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setSyncStatus(prev => ({
        ...prev,
        isOnline: state.isConnected ?? false,
      }));
    });

    return () => unsubscribe();
  }, []);

  const loadSyncStatus = async () => {
    setLoading(true);
    try {
      const netInfo = await NetInfo.fetch();
      const entries = await databaseService.getUnsyncedEntries();
      
      const totalMedia = entries.reduce((sum, entry) => sum + entry.photos.length, 0);
      
      setSyncStatus({
        isOnline: netInfo.isConnected ?? false,
        lastSyncDate: '2025-01-10T08:30:00Z', // Demo date
        pendingEntries: entries.length,
        pendingMedia: totalMedia,
      });
      
      setUnsyncedEntries(entries);
    } catch (error) {
      console.error('Error loading sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSync = async () => {
    if (!syncStatus.isOnline) {
      Alert.alert('No Internet', 'Please check your internet connection and try again.');
      return;
    }

    if (unsyncedEntries.length === 0) {
      Alert.alert('Nothing to Sync', 'All data is already synchronized.');
      return;
    }

    setSyncing(true);

    try {
      // Simulate API sync process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real app, you would:
      // 1. Upload each data entry to the server
      // 2. Upload associated media files
      // 3. Mark entries as synced in local database

      const entryIds = unsyncedEntries.map(entry => entry.id);
      await databaseService.markEntriesAsSynced(entryIds);

      setSyncStatus(prev => ({
        ...prev,
        lastSyncDate: new Date().toISOString(),
        pendingEntries: 0,
        pendingMedia: 0,
      }));

      setUnsyncedEntries([]);

      Alert.alert('Sync Complete', 'All data has been synchronized successfully!');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Failed', 'Failed to sync data. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderDataEntry = ({ item }: { item: DataEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entryIcon}>
          <Ionicons name="document-text" size={20} color={Colors.primary} />
        </View>
        <View style={styles.entryInfo}>
          <Text style={styles.entryTitle}>{item.activityType} Entry</Text>
          <Text style={styles.entryDate}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.entryBadge}>
          <Text style={styles.entryBadgeText}>{item.photos.length}</Text>
          <Ionicons name="camera" size={12} color={Colors.textSecondary} />
        </View>
      </View>
      
      <Text style={styles.entryNotes} numberOfLines={2}>
        {item.notes || 'No notes provided'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sync Status</Text>
        <Text style={styles.subtitle}>Manage data synchronization</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.connectionStatus}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: syncStatus.isOnline ? Colors.success : Colors.error }
              ]} />
              <Text style={styles.connectionText}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <TouchableOpacity onPress={loadSyncStatus} style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{syncStatus.pendingEntries}</Text>
              <Text style={styles.statLabel}>Pending Entries</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{syncStatus.pendingMedia}</Text>
              <Text style={styles.statLabel}>Pending Media</Text>
            </View>
          </View>

          <View style={styles.lastSyncContainer}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.lastSyncText}>
              Last sync: {formatDate(syncStatus.lastSyncDate)}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.syncButton,
              (!syncStatus.isOnline || syncing || unsyncedEntries.length === 0) && styles.syncButtonDisabled
            ]}
            onPress={performSync}
            disabled={!syncStatus.isOnline || syncing || unsyncedEntries.length === 0}
          >
            <Ionicons 
              name={syncing ? "sync" : "cloud-upload-outline"} 
              size={20} 
              color={Colors.white} 
            />
            <Text style={styles.syncButtonText}>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.entriesSection}>
          <Text style={styles.sectionTitle}>
            Pending Data Entries ({unsyncedEntries.length})
          </Text>
          
          {unsyncedEntries.length > 0 ? (
            <FlatList
              data={unsyncedEntries}
              renderItem={renderDataEntry}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={loadSyncStatus} />
              }
            />
          ) : (
            <View style={styles.noEntriesContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
              <Text style={styles.noEntriesText}>All data synchronized</Text>
              <Text style={styles.noEntriesSubtext}>
                No pending entries to sync
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.white,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  connectionText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  refreshButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  lastSyncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  lastSyncText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  syncButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  entriesSection: {
    flex: 1,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 16,
  },
  entryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  entryDate: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  entryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  entryBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  entryNotes: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  noEntriesContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noEntriesText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginTop: 16,
  },
  noEntriesSubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
