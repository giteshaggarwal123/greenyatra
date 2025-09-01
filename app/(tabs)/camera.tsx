import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { MediaItem } from '../../types';
import { locationService } from '../../services/location';
import uuid from 'react-native-uuid';

const { width } = Dimensions.get('window');

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>('back');
  const [capturedMedia, setCapturedMedia] = useState<MediaItem[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    getCurrentLocation();
    // Add some demo photos to match the design
    const demoMedia: MediaItem[] = [
      {
        id: '1',
        uri: 'https://img-wrapper.vercel.app/image?url=https://placehold.co/400x400/e0e0e0/666666?text=Photo+1',
        type: 'photo',
        latitude: 28.6139,
        longitude: 77.2090,
        timestamp: new Date(Date.now() - 60000).toISOString(), // 1 min ago
      },
      {
        id: '2',
        uri: 'https://img-wrapper.vercel.app/image?url=https://placehold.co/400x400/e0e0e0/666666?text=Photo+2',
        type: 'photo',
        latitude: 28.6139,
        longitude: 77.2090,
        timestamp: new Date(Date.now() - 120000).toISOString(), // 2 min ago
      },
      {
        id: '3',
        uri: 'https://img-wrapper.vercel.app/image?url=https://placehold.co/400x400/e0e0e0/666666?text=Video+1',
        type: 'video',
        latitude: 28.6139,
        longitude: 77.2090,
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      },
      {
        id: '4',
        uri: 'https://img-wrapper.vercel.app/image?url=https://placehold.co/400x400/e0e0e0/666666?text=Photo+3',
        type: 'photo',
        latitude: 28.6139,
        longitude: 77.2090,
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 min ago
      },
    ];
    setCapturedMedia(demoMedia);
  }, []);

  const getCurrentLocation = async () => {
    const location = await locationService.getCurrentLocation();
    if (location) {
      setCurrentLocation({ lat: location.latitude, lng: location.longitude });
    } else {
      // Demo coordinates for Delhi (matching the design)
      setCurrentLocation({ lat: 28.6139, lng: 77.2090 });
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        const mediaItem: MediaItem = {
          id: uuid.v4() as string,
          uri: photo.uri,
          type: 'photo',
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng,
          timestamp: new Date().toISOString(),
        };

        setCapturedMedia(prev => [mediaItem, ...prev]);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const attachToDataEntry = () => {
    if (capturedMedia.length === 0) {
      Alert.alert('No Media', 'Please capture some photos first');
      return;
    }

    // Navigate to data entry screen with captured media
    router.push({
      pathname: '/(tabs)/add-data',
      params: { mediaItems: JSON.stringify(capturedMedia) }
    });
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to capture field photos
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatCoordinates = (lat?: number, lng?: number) => {
    if (!lat || !lng) return 'GPS: Unavailable';
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `GPS: ${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)} min ago`;
  };

  const renderMediaItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <View style={styles.mediaItem}>
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      <View style={styles.mediaOverlay}>
        <Text style={styles.mediaLabel}>
          {item.type === 'photo' ? `Photo ${index + 1}` : `Video ${index + 1}`}
        </Text>
        <Text style={styles.mediaTime}>{getTimeAgo(item.timestamp)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Camera</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Viewfinder */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          type={type}
          ref={cameraRef}
        />
        
        <View style={styles.cameraOverlay}>
          <View style={styles.viewfinderContent}>
            <Ionicons name="camera-outline" size={48} color={Colors.white} />
            <Text style={styles.viewfinderText}>Camera Viewfinder</Text>
            <Text style={styles.gpsText}>
              {formatCoordinates(currentLocation?.lat, currentLocation?.lng)}
            </Text>
          </View>
        </View>
      </View>

      {/* Capture Button */}
      <View style={styles.captureSection}>
        <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
          <Ionicons name="camera" size={32} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Media Gallery */}
      <View style={styles.mediaSection}>
        <FlatList
          data={capturedMedia}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.mediaGrid}
          showsVerticalScrollIndicator={false}
        />
        
        <Text style={styles.capturedText}>
          {capturedMedia.length} items captured for current session
        </Text>
        
        <TouchableOpacity style={styles.attachButton} onPress={attachToDataEntry}>
          <Text style={styles.attachButtonText}>Attach to Data Entry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  doneText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
    textAlign: 'right',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.background,
  },
  permissionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  cameraContainer: {
    height: 280,
    backgroundColor: Colors.black,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  viewfinderContent: {
    alignItems: 'center',
    gap: 12,
  },
  viewfinderText: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    color: Colors.white,
  },
  gpsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.white,
    opacity: 0.9,
  },
  captureSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.white,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mediaSection: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: 16,
  },
  mediaGrid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mediaItem: {
    flex: 1,
    margin: 6,
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 1,
  },
  thumbnail: {
    width: '100%',
    height: '70%',
    backgroundColor: Colors.border,
  },
  mediaOverlay: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
    textAlign: 'center',
  },
  mediaTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  capturedText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: 16,
  },
  attachButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  attachButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
