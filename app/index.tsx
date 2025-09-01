import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';

export default function Index() {
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (userToken) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.replace('/login');
    }
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <ActivityIndicator size="large" color={Colors.white} />
    </View>
  );
}
