// app/onboarding.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import OnboardingScreen from './components/OnboardingScreen';

const ONBOARDING_KEY = '@sip_match_onboarding_complete';

export default function Onboarding() {
  const router = useRouter();

  const handleComplete = async () => {
    try {
      // Mark onboarding as complete
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      
      // Navigate to auth screen
      router.replace('/auth');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      Alert.alert(
        'Error',
        'Failed to save your progress. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: handleComplete,
          },
          {
            text: 'Skip',
            onPress: () => router.replace('/auth'),
            style: 'cancel',
          },
        ]
      );
    }
  };

  return <OnboardingScreen onComplete={handleComplete} />;
}