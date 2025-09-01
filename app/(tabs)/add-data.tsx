import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-datetimepicker/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-netinfo/netinfo';
import { Colors } from '../../constants/Colors';
import { DataEntry, MediaItem, Project } from '../../types';
import { databaseService } from '../../services/database';
import { locationService } from '../../services/location';
import uuid from 'react-native-uuid';

export default function AddDataScreen() {
  const params = useLocalSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [activityType, setActivityType] = useState<'Survey' | 'Plantation' | 'Maintenance'>('Survey');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saplingsCount, setSaplingsCount] = useState('');
  const [areaCovered, setAreaCovered] = useState('');
  const [weather, setWeather] = useState('Sunny');
  const [notes, setNotes] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    loadProjects();
    getCurrentLocation();
    checkNetworkStatus();
    
    // Load media items from camera if passed
    if (params.mediaItems) {
      try {
        const items = JSON.parse(params.mediaItems as string) as MediaItem[];
        setMediaItems(items);
      } catch (error) {
        console.error('Error parsing media items:', error);
      }
    }
  }, [params.mediaItems]);

  const loadProjects = async () => {
    try {
      // Create sample projects for demo
      const sampleProjects: Project[] = [
        {
          id: '1',
          name: 'Miyawaki Forest - Delhi',
          description: 'Urban forest plantation project',
          location: 'Delhi NCR',
          assignedDate: '2025-01-10',
          status: 'active',
        },
        {
          id: '2',
          name: 'Mangrove Restoration - Sundarbans',
          description: 'Coastal mangrove restoration',
          location: 'Sundarbans, West Bengal',
          assignedDate: '2025-01-08',
          status: 'active',
        },
      ];
      
      setProjects(sampleProjects);
      setSelectedProject(sampleProjects[0].id);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const getCurrentLocation = async () => {
    const location = await locationService.getCurrentLocation();
    if (location) {
      setCurrentLocation({ lat: location.latitude, lng: location.longitude });
    } else {
      // Demo coordinates for Delhi (matching the design)
      setCurrentLocation({ lat: 28.6139, lng: 77.2090 });
    }
  };

  const checkNetworkStatus = async () => {
    const netInfo = await NetInfo.fetch();
    setIsOnline(netInfo.isConnected ?? false);
    
    // Listen to network changes
    NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
  };

  const formatDateTime = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const formatCoordinates = () => {
    if (!currentLocation) return 'GPS: Unavailable';
    return `${currentLocation.lat.toFixed(4)}° N, ${currentLocation.lng.toFixed(4)}° E`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  };

  const openCamera = () => {
    router.push('/(tabs)/camera');
  };

  const saveDataEntry = async (isDraft: boolean = false) => {
    if (!selectedProject) {
      Alert.alert('Error', 'Please select a project');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Error', 'GPS location is required. Please enable location services.');
      return;
    }

    setLoading(true);

    try {
      const dataEntry: DataEntry = {
        id: uuid.v4() as string,
        projectId: selectedProject,
        activityType,
        date: currentDate.toISOString(),
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        weather,
        measurements: `Saplings: ${saplingsCount}, Area: ${areaCovered} sq.m`,
        notes: notes.trim(),
        photos: mediaItems,
        synced: false,
        createdAt: new Date().toISOString(),
      };

      await databaseService.saveDataEntry(dataEntry);

      Alert.alert(
        'Success',
        isDraft ? 'Data saved as draft!' : 'Data entry saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSaplingsCount('');
              setAreaCovered('');
              setNotes('');
              setMediaItems([]);
              setCurrentDate(new Date());
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving data entry:', error);
      Alert.alert('Error', 'Failed to save data entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isOnline ? 'Online - Data synced automatically' : 'Offline - Data will sync when online'}
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Field Data Entry</Text>
        <TouchableOpacity onPress={() => saveDataEntry(false)} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Selected Project */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Selected Project</Text>
          <View style={styles.projectContainer}>
            <Text style={styles.projectText}>
              {projects.find(p => p.id === selectedProject)?.name || 'Miyawaki Forest - Delhi'}
            </Text>
          </View>
        </View>

        {/* Activity */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Activity</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={activityType === 'Survey' ? 'Site Survey' : activityType}
              onValueChange={(value) => {
                if (value === 'Site Survey') setActivityType('Survey');
                else setActivityType(value as 'Survey' | 'Plantation' | 'Maintenance');
              }}
              style={styles.picker}
            >
              <Picker.Item label="Site Survey" value="Site Survey" />
              <Picker.Item label="Plantation" value="Plantation" />
              <Picker.Item label="Maintenance" value="Maintenance" />
            </Picker>
          </View>
        </View>

        {/* Location */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Location (Auto-detected)</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>{formatCoordinates()}</Text>
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Date & Time</Text>
          <TouchableOpacity 
            style={styles.dateContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDateTime(currentDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={currentDate}
              mode="datetime"
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>

        {/* Saplings Planted */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Saplings Planted</Text>
          <TextInput
            style={styles.input}
            value={saplingsCount}
            onChangeText={setSaplingsCount}
            placeholder="Enter count"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        {/* Area Covered */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Area Covered (sq.m)</Text>
          <TextInput
            style={styles.input}
            value={areaCovered}
            onChangeText={setAreaCovered}
            placeholder="Enter area"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        {/* Weather */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Weather</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={weather}
              onValueChange={setWeather}
              style={styles.picker}
            >
              <Picker.Item label="Sunny" value="Sunny" />
              <Picker.Item label="Cloudy" value="Cloudy" />
              <Picker.Item label="Rainy" value="Rainy" />
              <Picker.Item label="Windy" value="Windy" />
            </Picker>
          </View>
        </View>

        {/* Take Photos */}
        <TouchableOpacity style={styles.photoButton} onPress={openCamera}>
          <Ionicons name="camera" size={20} color={Colors.white} />
          <Text style={styles.photoButtonText}>Take Photos</Text>
        </TouchableOpacity>

        {/* Notes */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Field observations..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save Buttons */}
        <TouchableOpacity
          style={[styles.saveEntryButton, loading && styles.saveButtonDisabled]}
          onPress={() => saveDataEntry(false)}
          disabled={loading}
        >
          <Text style={styles.saveEntryButtonText}>
            {loading ? 'Saving...' : 'Save Entry'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveDraftButton, loading && styles.saveButtonDisabled]}
          onPress={() => saveDataEntry(true)}
          disabled={loading}
        >
          <Text style={styles.saveDraftButtonText}>Save as Draft</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statusBar: {
    backgroundColor: Colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 64,
  },
  backButton: {
    padding: 8,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  saveButton: {
    padding: 8,
    minWidth: 60,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
    marginBottom: 8,
  },
  projectContainer: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  projectText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: Colors.text,
  },
  locationContainer: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  dateContainer: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  photoButton: {
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  notesInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    height: 100,
    textAlignVertical: 'top',
  },
  saveEntryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveEntryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  saveDraftButton: {
    backgroundColor: Colors.textSecondary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveDraftButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
});
